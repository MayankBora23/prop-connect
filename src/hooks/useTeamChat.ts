import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useCallback } from 'react';
import { useIndustry } from './useIndustry';

// Define types for team chat messages
export interface TeamChatMessage {
  id: string;
  sender_id: string;
  content: string;
  message_type: string;
  company_id: string;
  industry: string;
  created_at: string;
}

export interface TeamChatMessageInsert {
  sender_id: string;
  content: string;
  message_type?: string;
  company_id: string;
  industry: string;
}

// Cache company_id to avoid repeated queries
let cachedCompanyId: string | null = null;
let companyIdPromise: Promise<string | null> | null = null;

// Function to clear cache (useful for logout/login scenarios)
export function clearCompanyIdCache() {
  cachedCompanyId = null;
  companyIdPromise = null;
}

async function getUserCompanyId(): Promise<string | null> {
  // Return cached value if available
  if (cachedCompanyId) return cachedCompanyId;

  // Return pending promise if already fetching
  if (companyIdPromise) return companyIdPromise;

  // Start new fetch
  companyIdPromise = (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      cachedCompanyId = data?.company_id || null;
      return cachedCompanyId;
    } catch (error) {
      console.error('Failed to get company ID:', error);
      return null;
    } finally {
      companyIdPromise = null;
    }
  })();

  return companyIdPromise;
}


export function useTeamChatMessages(limit: number = 50) {
  const { data: industry, isLoaded } = useIndustry();

  return useQuery({
    queryKey: ['team_chat_messages', limit, industry],
    queryFn: async () => {
      // Clear cached company_id if industry changed (safety check)
      if (industry && cachedCompanyId) {
        // We can't easily check if the cached company matches the current user,
        // but we can at least ensure we have fresh data when industry changes
        const currentCompanyId = await getUserCompanyId();
        if (currentCompanyId !== cachedCompanyId) {
          clearCompanyIdCache();
        }
      }
      const companyId = await getUserCompanyId();
      if (!companyId || !industry) return [];

      try {
        console.log('Fetching team chat messages', { companyId, industry, limit });

        // Get messages
        const { data: messages, error } = await (supabase as any)
          .from('team_chat_messages')
          .select('*')
          .eq('company_id', companyId)
          .eq('industry', industry)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error || !messages) {
          if (error?.code === '42P01') {
            console.warn('team_chat_messages table does not exist. Please run the migration.');
          }
          return [];
        }

        if (error && error.code !== '42P01') {
          throw error;
        }

        console.log(`Fetched ${messages.length} team chat messages`);

        // Reverse to show oldest first (chronological order)
        return messages.reverse();
      } catch (error) {
        console.error('Failed to load team chat messages:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes (reduced for more frequent refetch)
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 10, // Poll every 10 seconds as fallback
    refetchIntervalInBackground: true, // Continue polling when tab is not active
    retry: (failureCount, error: any) => {
      // Don't retry if table doesn't exist
      if (error?.code === '42P01') return false;
      return failureCount < 3;
    },
    enabled: isLoaded && !!industry, // Only run query when industry is loaded and available
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  const { data: industry } = useIndustry();

  return useMutation({
    mutationFn: async (message: Omit<TeamChatMessageInsert, 'sender_id' | 'company_id' | 'industry'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Always get fresh company_id to avoid stale cache issues
      const company_id = await getUserCompanyId();
      if (!company_id) throw new Error('No company found');

      if (!industry) throw new Error('Industry not found');

      console.log('Sending message with:', {
        user_id: user.id,
        company_id,
        industry,
        message_type: message.message_type || 'text'
      });

      const messageData = {
        ...message,
        sender_id: user.id,
        company_id,
        industry,
        message_type: message.message_type || 'text'
      };

      const { data, error } = await (supabase as any)
        .from('team_chat_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        // If table doesn't exist, provide helpful error message
        if (error.code === '42P01') {
          throw new Error('Team chat is not available. Please contact your administrator to set up the chat feature.');
        }
        throw error;
      }

      return data;
    },
    onSuccess: (newMessage) => {
      // Optimistically update the cache instead of invalidating
      queryClient.setQueryData(['team_chat_messages', 50, industry], (oldData: TeamChatMessage[] | undefined) => {
        if (!oldData) return [newMessage];
        // Avoid duplicates
        if (oldData.some(m => m.id === newMessage.id)) return oldData;
        return [...oldData, newMessage];
      });
    },
    onError: () => {
      // Invalidate on error to refetch correct data
      queryClient.invalidateQueries({ queryKey: ['team_chat_messages'] });
    },
  });
}

export function useTeamChatRealtime(onNewMessage?: (message: TeamChatMessage) => void) {
  const queryClient = useQueryClient();
  const { data: industry, isLoaded } = useIndustry();

  useEffect(() => {
    let channel: any = null;
    let isSubscribed = false;
    let retryTimeout: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const maxRetries = 3;

    const setupRealtime = async () => {
      try {
        // Clean up existing subscription first
        if (channel) {
          console.log('Cleaning up existing team chat subscription');
          supabase.removeChannel(channel);
          channel = null;
          isSubscribed = false;
        }

        const companyId = await getUserCompanyId();
        if (!companyId || !industry) {
          console.log('Skipping realtime setup: companyId or industry not available', { companyId: !!companyId, industry });
          return;
        }

        console.log('Setting up team chat realtime subscription', { companyId, industry, retryCount });

        // Use a simpler channel name and no filters - rely on RLS policies
        channel = supabase
          .channel(`team_chat_messages_${companyId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'team_chat_messages',
            },
            async (payload) => {
              try {
                if (payload.new) {
                  console.log('Received real-time message:', payload.new.id);

                  // Fetch the complete message data - RLS will filter automatically
                  const { data, error } = await (supabase as any)
                    .from('team_chat_messages')
                    .select('*')
                    .eq('id', payload.new.id)
                    .single();

                  if (!error && data) {
                    const message = data as TeamChatMessage;

                    // Additional client-side filtering to ensure industry match
                    if (message.industry === industry) {
                      console.log('Processing real-time message:', message.id);

                      // Optimistically update the cache
                      queryClient.setQueryData(['team_chat_messages', 50, industry], (oldData: TeamChatMessage[] | undefined) => {
                        if (!oldData) return [message];
                        // Avoid duplicates
                        if (oldData.some(m => m.id === message.id)) return oldData;
                        return [...oldData, message];
                      });

                      // Call the callback if provided
                      onNewMessage?.(message);
                    } else {
                      console.log('Message filtered out - industry mismatch:', message.industry, '!==', industry);
                    }
                  } else {
                    console.warn('Failed to fetch message data:', error);
                  }
                }
              } catch (error) {
                console.error('Failed to process real-time message:', error);
              }
            }
          )
          .subscribe((status, err) => {
            console.log('Team chat subscription status:', status, err ? `Error: ${err}` : '');
            isSubscribed = status === 'SUBSCRIBED';

            if (status === 'CHANNEL_ERROR' && retryCount < maxRetries) {
              console.error('Real-time subscription failed, retrying:', err);
              retryCount++;
              retryTimeout = setTimeout(() => {
                setupRealtime();
              }, 2000 * retryCount); // Exponential backoff
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Real-time subscription failed permanently after', maxRetries, 'retries');
            }
          });
      } catch (error) {
        console.error('Failed to setup team chat realtime:', error);
      }
    };

    // Temporarily disable real-time due to CHANNEL_ERROR issues
    // TODO: Debug and re-enable real-time subscription
    // if (isLoaded && industry) {
    //   setupRealtime();
    // }

    return () => {
      if (channel) {
        console.log('Cleaning up team chat subscription on unmount/change');
        supabase.removeChannel(channel);
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [queryClient, onNewMessage, industry, isLoaded]);
}
