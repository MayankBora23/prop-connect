import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

// Define notification types
export type NotificationType = 'task_assigned' | 'task_completed' | 'task_overdue' | 'follow_up_reminder' | 'system_alert';

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
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          return [];
        }
        throw error;
      }

      return data as Notification[];
    },
  });
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['notifications_unread_count', userId],
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!userId) return 0;

      const { count, error } = await (supabase as any)
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    },
  });
}

async function getUserCompanyId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;
  return data?.company_id || null;
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (notification: Omit<NotificationInsert, 'user_id' | 'company_id'> & { user_id?: string }) => {
      if (!userId) throw new Error('User not authenticated');

      const company_id = await getUserCompanyId(userId);
      const targetUserId = notification.user_id || userId;

      const notificationData = {
        ...notification,
        user_id: targetUserId,
        company_id: company_id || '00000000-0000-0000-0000-000000000000',
      };

      const { data, error } = await (supabase as any)
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count', userId] });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

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
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count', userId] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count', userId] });
    },
  });
}

export function useNotificationsRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const subscribedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    if (subscribedUserIdRef.current === userId) return;
    subscribedUserIdRef.current = userId;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
          queryClient.invalidateQueries({ queryKey: ['notifications_unread_count', userId] });
        }
      )
      .subscribe();

    return () => {
      subscribedUserIdRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
