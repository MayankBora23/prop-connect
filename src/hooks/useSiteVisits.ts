import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useCreateNotification } from './useNotifications';
import { useProfiles } from './useProfiles';
import { logTeamActivity } from '@/lib/logTeamActivity';

export type SiteVisit = Tables<'site_visits'>;
export type SiteVisitInsert = TablesInsert<'site_visits'>;
export type SiteVisitUpdate = TablesUpdate<'site_visits'>;

export type SiteVisitWithDetails = SiteVisit & {
  leads: { name: string } | null;
  properties: { title: string } | null;
};

export function useSiteVisits() {
  return useQuery({
    queryKey: ['site_visits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_visits')
        .select(`
          *,
          leads!site_visits_lead_id_fkey(name),
          properties!site_visits_property_id_fkey(title)
        `)
        .order('visit_date', { ascending: true });
      
      if (error) throw error;
      return data as SiteVisitWithDetails[];
    },
  });
}

async function getUserCompanyId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
  return data?.company_id || null;
}

export function useCreateSiteVisit() {
  const queryClient = useQueryClient();
  const createNotification = useCreateNotification();
  const { data: profiles } = useProfiles();

  return useMutation({
    mutationFn: async (visit: SiteVisitInsert) => {
      const company_id = await getUserCompanyId();
      if (!company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('site_visits')
        .insert({ ...visit, company_id })
        .select(`
          *,
          leads!site_visits_lead_id_fkey(name),
          properties!site_visits_property_id_fkey(title)
        `)
        .single();

      if (error) throw error;

      void logTeamActivity({
        action_type: 'site_visit_logged',
        description: 'Logged site visit activity',
        reference_id: data.id,
      });

      // Create notification if site visit is assigned to someone
      console.log('🏠 Checking site visit notification creation:', {
        assigned_to: visit.assigned_to,
        hasProfiles: !!profiles
      });

      if (visit.assigned_to && profiles) {
        const assignedUser = profiles.find(p => p.user_id === visit.assigned_to);
        const lead = data.leads;
        const property = data.properties;

        console.log('🏠 Site visit notification details:', {
          assignedUser: assignedUser ? '✅ found' : '❌ not found',
          lead: lead ? '✅ found' : '❌ not found',
          property: property ? '✅ found' : '❌ not found'
        });

        if (assignedUser && (lead || property)) {
          const visitTarget = property ? `property: ${property.title}` : `lead: ${lead?.name}`;
          console.log('🚀 Creating site visit notification for:', visit.assigned_to);
          try {
            await createNotification.mutateAsync({
              user_id: visit.assigned_to,
              type: 'task_assigned',
              title: 'New Site Visit Assigned',
              message: `You have been assigned a site visit for ${visitTarget}`,
              related_id: data.id,
            });
            console.log('✅ Site visit notification created');
          } catch (notificationError) {
            console.error('❌ Failed to create site visit notification:', notificationError);
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_visits'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
      queryClient.invalidateQueries({ queryKey: ['team-report'] });
      queryClient.invalidateQueries({ queryKey: ['team-member-detail'] });
    },
  });
}

export function useUpdateSiteVisit() {
  const queryClient = useQueryClient();
  const createNotification = useCreateNotification();
  const { data: profiles } = useProfiles();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SiteVisitUpdate & { id: string }) => {
      // Get the current site visit data before updating
      const { data: currentVisit, error: fetchError } = await supabase
        .from('site_visits')
        .select(`
          *,
          leads!site_visits_lead_id_fkey(name),
          properties!site_visits_property_id_fkey(title)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const company_id = await getUserCompanyId();
      if (!company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('site_visits')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          leads!site_visits_lead_id_fkey(name),
          properties!site_visits_property_id_fkey(title)
        `)
        .single();

      if (error) throw error;

      void logTeamActivity({
        action_type: 'site_visit_logged',
        description: 'Logged site visit activity',
        reference_id: data.id,
      });

      // Check if assigned_to changed and create notification for new assignee
      if (updates.assigned_to !== undefined &&
          updates.assigned_to !== currentVisit.assigned_to &&
          updates.assigned_to &&
          profiles) {

        const assignedUser = profiles.find(p => p.user_id === updates.assigned_to);
        const lead = data.leads;
        const property = data.properties;

        if (assignedUser && (lead || property)) {
          const visitTarget = property ? `property: ${property.title}` : `lead: ${lead?.name}`;
          try {
            await createNotification.mutateAsync({
              user_id: updates.assigned_to,
              type: 'task_assigned',
              title: 'Site Visit Assigned',
              message: `You have been assigned a site visit for ${visitTarget}`,
              related_id: data.id,
            });
          } catch (notificationError) {
            console.warn('Failed to create site visit reassignment notification:', notificationError);
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_visits'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
      queryClient.invalidateQueries({ queryKey: ['team-report'] });
      queryClient.invalidateQueries({ queryKey: ['team-member-detail'] });
    },
  });
}

export function useDeleteSiteVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('site_visits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site_visits'] });
    },
  });
}
