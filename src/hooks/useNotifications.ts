import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

// Define notification types
export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'follow_up_reminder'
  | 'system_alert'
  | 'ticket_created'
  | 'ticket_replied'
  | 'ticket_status_changed';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_id?: string;
  read: boolean;
  company_id: string;
  created_at: string;
}

export interface NotificationInsert {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_id?: string;
  company_id: string;
}

export interface NotificationUpdate {
  read?: boolean;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      console.log('Fetching notifications for user:', user.id);

      // First try to get company_id for additional filtering
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('User profile:', { company_id: profile?.company_id });

      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        // If table doesn't exist, return empty array
        if (error.code === '42P01') {
          console.warn('Notifications table does not exist. Please run the migration.');
          return [];
        }
        throw error;
      }

      console.log('Fetched notifications:', data?.length || 0, 'items');
      if (data && data.length > 0) {
        console.log('Sample notification:', data[0]);
      }
      return data as Notification[];
    },
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications_unread_count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await (supabase as any)
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    },
  });
}

async function getUserCompanyId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No authenticated user found');
    return null;
  }

  console.log('Getting company_id for user:', user.id);
  const { data, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error getting company_id:', error);
    return null;
  }

  console.log('Found company_id:', data?.company_id);
  return data?.company_id || null;
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: Omit<NotificationInsert, 'user_id' | 'company_id'> & { user_id?: string }) => {
      console.log('🔄 Creating notification:', notification);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Auth check:', { user: user?.id, authError });

      if (!user) throw new Error('User not authenticated');
      if (authError) throw new Error(`Auth error: ${authError.message}`);

      const company_id = await getUserCompanyId();
      console.log('📍 Company ID for notification:', company_id);

      if (!company_id) {
        console.warn('No company found for user, but proceeding anyway');
        // Don't throw error here, let RLS handle it
      }

      // Use the provided user_id or default to current user
      const targetUserId = notification.user_id || user.id;

      const notificationData = {
        ...notification,
        user_id: targetUserId,
        company_id: company_id || '00000000-0000-0000-0000-000000000000' // Fallback
      };
      console.log('📝 Full notification data:', notificationData);

      try {
        console.log('🔍 Attempting database insert...');
        console.log('Target table: notifications');
        console.log('Notification payload:', notificationData);

        const { data, error } = await (supabase as any)
          .from('notifications')
          .insert(notificationData)
          .select()
          .single();

        if (error) {
          console.error('❌ Database error creating notification:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });

          // Additional debugging for RLS issues
          if (error.code === '42501') {
            console.error('🔒 RLS Policy violation detected');
            console.error('Current user authenticated:', !!user);
            console.error('User ID:', user?.id);
            console.error('Auth role would be checked by Supabase');
          }

          throw error;
        }

        console.log('✅ Notification created successfully:', data);
        return data;
      } catch (dbError: any) {
        console.error('💥 Exception creating notification:', dbError);
        console.error('Exception details:', dbError);
        throw dbError;
      }
    },
    onSuccess: () => {
      console.log('Invalidating notification queries');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
    },
  });
}

export function useNotificationsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // Invalidate queries when notifications change
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
