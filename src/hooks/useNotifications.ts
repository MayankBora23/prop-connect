import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Define notification types
export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'follow_up_reminder'
  | 'system_alert'
  | 'whatsapp_reminder';

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
  scheduled_for?: string | null;
  is_reminder_fired?: boolean;
}

export interface NotificationInsert {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_id?: string;
  company_id: string;
  scheduled_for?: string | null;
  is_reminder_fired?: boolean;
  read?: boolean;
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
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!userId) return [];

      const now = new Date().toISOString();

      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .or(`type.neq.whatsapp_reminder,and(type.eq.whatsapp_reminder,or(is_reminder_fired.eq.true,scheduled_for.lte.${now}))`)
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
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!userId) return 0;

      const now = new Date().toISOString();

      const { count, error } = await (supabase as any)
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
        .or(`type.neq.whatsapp_reminder,and(type.eq.whatsapp_reminder,or(is_reminder_fired.eq.true,scheduled_for.lte.${now}))`);

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
    mutationFn: async (
      notification: Omit<NotificationInsert, 'user_id' | 'company_id'> & { user_id?: string }
    ) => {
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

interface PendingReminder {
  id: string;
  title: string;
  message: string;
  scheduled_for: string;
}

/** Client-side fallback when pg_cron / edge function is unavailable. */
export function useWhatsAppReminderPoller() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const firedIdsRef = useRef<Set<string>>(new Set());

  const invalidateNotifications = useCallback(() => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    queryClient.invalidateQueries({ queryKey: ['notifications_unread_count', userId] });
    queryClient.invalidateQueries({ queryKey: ['pending_whatsapp_reminders', userId] });
  }, [queryClient, userId]);

  const fireDueReminders = useCallback(async () => {
    if (!userId) return;

    const now = new Date().toISOString();
    const { data, error } = await (supabase as any)
      .from('notifications')
      .update({ is_reminder_fired: true })
      .eq('user_id', userId)
      .eq('type', 'whatsapp_reminder')
      .eq('is_reminder_fired', false)
      .lte('scheduled_for', now)
      .select('id, title, message');

    if (error) {
      console.error('Failed to fire WhatsApp reminders:', error);
      return;
    }

    const fired = (data as PendingReminder[]) || [];
    for (const reminder of fired) {
      if (firedIdsRef.current.has(reminder.id)) continue;
      firedIdsRef.current.add(reminder.id);
      toast.info(reminder.title, { description: reminder.message });
    }

    if (fired.length > 0) {
      invalidateNotifications();
    }
  }, [userId, invalidateNotifications]);

  const { data: pendingReminders } = useQuery({
    queryKey: ['pending_whatsapp_reminders', userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!userId) return [];

      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('id, title, message, scheduled_for')
        .eq('user_id', userId)
        .eq('type', 'whatsapp_reminder')
        .eq('is_reminder_fired', false)
        .gt('scheduled_for', now)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return (data as PendingReminder[]) || [];
    },
  });

  // Fire any already-overdue reminders on mount and every 30s as backup
  useEffect(() => {
    if (!userId) return;
    void fireDueReminders();
    const interval = setInterval(() => void fireDueReminders(), 30_000);
    return () => clearInterval(interval);
  }, [userId, fireDueReminders]);

  // Schedule precise timeouts for each upcoming reminder
  useEffect(() => {
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];

    if (!pendingReminders?.length) return;

    for (const reminder of pendingReminders) {
      const delay = new Date(reminder.scheduled_for).getTime() - Date.now();
      if (delay <= 0) continue;

      const timeoutId = setTimeout(() => {
        void fireDueReminders();
      }, delay + 500);

      timeoutIdsRef.current.push(timeoutId);
    }

    return () => {
      timeoutIdsRef.current.forEach(clearTimeout);
      timeoutIdsRef.current = [];
    };
  }, [pendingReminders, fireDueReminders]);
}
