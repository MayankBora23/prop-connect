import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { useCreateNotification } from './useNotifications';
import { useProfiles } from './useProfiles';

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

export interface AutoLead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  preferred_vehicle_type?: 'car' | 'bike' | null;
  preferred_brand?: string | null;
  preferred_model?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  financing_needed: boolean;
  insurance_needed: boolean;
  test_drive_requested: boolean;
  source?: string | null;
  status: string;
  notes: string[];
  tags: string[];
  assigned_to?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  last_contact?: string | null;
  company_id: string;
}

export type AutoLeadInsert = Omit<AutoLead, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type AutoLeadUpdate = Partial<AutoLeadInsert>;

export function useAutoLeads() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['auto_leads', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabaseAny
        .from('auto_leads')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any as AutoLead[];
    },
    enabled: !!company?.id,
  });
}

export function useAutoLead(id: string) {
  return useQuery({
    queryKey: ['auto_lead', id],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('auto_leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as any as AutoLead | null;
    },
  });
}

export function useCreateAutoLead() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();
  const createNotification = useCreateNotification();
  const { data: profiles } = useProfiles();

  return useMutation({
    mutationFn: async (lead: AutoLeadInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabaseAny
        .from('auto_leads')
        .insert({
          ...lead,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      const createdLead = data as any as AutoLead;

      // Create notification if auto lead is assigned to someone
      console.log('🚗 Checking auto lead notification creation:', {
        assigned_to: lead.assigned_to,
        hasProfiles: !!profiles
      });

      if (lead.assigned_to && profiles) {
        const assignedUser = profiles.find(p => p.user_id === lead.assigned_to);

        console.log('🚗 Auto lead notification details:', {
          assignedUser: assignedUser ? '✅ found' : '❌ not found',
          leadName: lead.name
        });

        if (assignedUser) {
          console.log('🚀 Creating auto lead notification for:', lead.assigned_to);
          try {
            await createNotification.mutateAsync({
              user_id: lead.assigned_to,
              type: 'task_assigned',
              title: 'New Auto Lead Assigned',
              message: `You have been assigned an auto lead: ${lead.name}`,
              related_id: createdLead.id,
            });
            console.log('✅ Auto lead notification created');
          } catch (notificationError) {
            console.error('❌ Failed to create auto lead notification:', notificationError);
          }
        }
      }

      return createdLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto_leads'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
    },
  });
}

export function useUpdateAutoLead() {
  const queryClient = useQueryClient();
  const createNotification = useCreateNotification();
  const { data: profiles } = useProfiles();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AutoLeadUpdate & { id: string }) => {
      // Get the current auto lead data before updating
      const { data: currentLead, error: fetchError } = await supabaseAny
        .from('auto_leads')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabaseAny
        .from('auto_leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const updatedLead = data as any as AutoLead;

      // Check if assigned_to changed and create notification for new assignee
      if (updates.assigned_to !== undefined &&
          updates.assigned_to !== currentLead.assigned_to &&
          updates.assigned_to &&
          profiles &&
          company) {

        const assignedUser = profiles.find(p => p.user_id === updates.assigned_to);

        if (assignedUser) {
          try {
            await createNotification.mutateAsync({
              user_id: updates.assigned_to,
              type: 'task_assigned',
              title: 'Auto Lead Assigned',
              message: `You have been assigned an auto lead: ${updatedLead.name}`,
              related_id: updatedLead.id,
            });
          } catch (notificationError) {
            console.warn('Failed to create auto lead reassignment notification:', notificationError);
          }
        }
      }

      return updatedLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto_leads'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread_count'] });
    },
  });
}

export function useDeleteAutoLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseAny
        .from('auto_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto_leads'] });
    },
  });
}
