import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useCreateNotification } from './useNotifications';
import { useProfiles } from './useProfiles';
import { logTeamActivity } from '@/lib/logTeamActivity';
import { getCompanyId } from '@/lib/getCompanyId';
import { useCurrentCompany } from '@/hooks/useCompany';

export type FollowUp = Tables<'follow_ups'>;
export type FollowUpInsert = TablesInsert<'follow_ups'>;
export type FollowUpUpdate = TablesUpdate<'follow_ups'>;

export type FollowUpWithLead = FollowUp & {
  leads: { name: string; phone?: string | null; email?: string | null } | null;
};

export function useFollowUps() {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['follow_ups', companyId],
    enabled: !!companyId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_ups')
        .select(`
          *,
          leads!follow_ups_lead_id_fkey(name)
        `)
        .order('follow_up_date', { ascending: true });
      
      if (error) throw error;
      return data as FollowUpWithLead[];
    },
  });
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();
  const createNotification = useCreateNotification();
  const { data: profiles } = useProfiles();

  return useMutation({
    mutationFn: async (followUp: FollowUpInsert) => {
      const company_id = await getCompanyId();
      if (!company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('follow_ups')
        .insert({ ...followUp, company_id })
        .select(`
          *,
          leads!follow_ups_lead_id_fkey(name)
        `)
        .single();

      if (error) throw error;

      void logTeamActivity({
        action_type: 'follow_up_created',
        description: 'Created new follow-up task',
        reference_id: data.id,
      });

      // Create notification if task is assigned to someone
      console.log('🔍 Checking for notification creation:', {
        assigned_to: followUp.assigned_to,
        hasProfiles: !!profiles,
        profilesCount: profiles?.length || 0,
        followUpData: followUp
      });

      if (followUp.assigned_to && profiles) {
        const assignedUser = profiles.find(p => p.user_id === followUp.assigned_to);
        const lead = data.leads;

        console.log('📋 Notification check details:', {
          assignedUser: assignedUser ? '✅ found' : '❌ not found',
          lead: lead ? '✅ found' : '❌ not found',
          assignedUserId: followUp.assigned_to,
          leadName: lead?.name,
          assignedUserData: assignedUser
        });

        if (assignedUser && lead) {
          console.log('🚀 Creating notification for user:', followUp.assigned_to, 'lead:', lead.name);
          try {
            const notificationResult = await createNotification.mutateAsync({
              user_id: followUp.assigned_to,
              type: 'task_assigned',
              title: 'New Task Assigned',
              message: `You have been assigned a ${followUp.type} follow-up with ${lead.name}`,
              related_id: data.id,
            });
            console.log('✅ Notification created successfully:', notificationResult);
          } catch (notificationError) {
            console.error('❌ Failed to create notification:', notificationError);
            // Don't fail the follow-up creation if notification fails
          }
        } else {
          console.log('⏭️ Skipping notification creation - missing assignedUser or lead');
        }
      } else {
        console.log('⏭️ Skipping notification creation - no assigned_to or no profiles');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
      queryClient.invalidateQueries({ queryKey: ['team-report'] });
      queryClient.invalidateQueries({ queryKey: ['team-member-detail'] });
    },
  });
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient();
  const createNotification = useCreateNotification();
  const { data: profiles } = useProfiles();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FollowUpUpdate & { id: string }) => {
      // Get the current follow-up data before updating
      const { data: currentFollowUp, error: fetchError } = await supabase
        .from('follow_ups')
        .select(`
          *,
          leads!follow_ups_lead_id_fkey(name)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const company_id = await getCompanyId();
      if (!company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('follow_ups')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          leads!follow_ups_lead_id_fkey(name)
        `)
        .single();

      if (error) throw error;

      if (updates.status === 'completed') {
        void logTeamActivity({
          action_type: 'follow_up_completed',
          description: 'Completed follow-up task',
          reference_id: data.id,
        });
      }

      // Check if assigned_to changed and create notification for new assignee
      if (updates.assigned_to !== undefined &&
          updates.assigned_to !== currentFollowUp.assigned_to &&
          updates.assigned_to &&
          profiles) {

        const assignedUser = profiles.find(p => p.user_id === updates.assigned_to);
        const lead = data.leads;

        if (assignedUser && lead) {
          try {
            await createNotification.mutateAsync({
              user_id: updates.assigned_to,
              type: 'task_assigned',
              title: 'Task Assigned',
              message: `You have been assigned a ${data.type} follow-up with ${lead.name}`,
              related_id: data.id,
            });
          } catch (notificationError) {
            console.warn('Failed to create notification for reassigned task:', notificationError);
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
      queryClient.invalidateQueries({ queryKey: ['team-report'] });
      queryClient.invalidateQueries({ queryKey: ['team-member-detail'] });
    },
  });
}

export function useDeleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('follow_ups')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups'] });
    },
  });
}
