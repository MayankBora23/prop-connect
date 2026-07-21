import { useQuery } from '@tanstack/react-query';
import { useFollowUps, FollowUpWithLead } from './useFollowUps';
import { useLeads } from './useLeads';
import { useSiteVisits } from './useSiteVisits';
import { useAutoLeads } from './useAutoLeads';
import { useCreateNotification } from './useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/hooks/useCompany';

// Define comprehensive task types
export interface TaskItem {
  id: string;
  type: 'follow_up' | 'lead' | 'site_visit' | 'auto_lead';
  title: string;
  description: string;
  status: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdDate: string;
  updatedDate?: string;
  assigned_to?: string;
  created_by?: string;
  metadata?: any;
}

export type Task = FollowUpWithLead; // Alias for backward compatibility
export type TaskStatus = 'assigned' | 'pending' | 'completed';

export interface TaskCategory {
  assigned: TaskItem[];
  pending: TaskItem[];
  completed: TaskItem[];
}

export function useTasks() {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;
  const { data: followUps, isLoading: followUpsLoading } = useFollowUps();
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: siteVisits, isLoading: siteVisitsLoading } = useSiteVisits();
  const { data: autoLeads, isLoading: autoLeadsLoading } = useAutoLeads();

  const isLoading = followUpsLoading || leadsLoading || siteVisitsLoading || autoLeadsLoading;

  return useQuery({
    queryKey: ['tasks', companyId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { assigned: [], pending: [], completed: [] };

      const tasks: TaskCategory = {
        assigned: [],
        pending: [],
        completed: []
      };

      // Process follow-ups
      (followUps || []).forEach(followUp => {
        const task: TaskItem = {
          id: followUp.id,
          type: 'follow_up',
          title: `Follow-up: ${followUp.leads?.name || 'Unknown Lead'}`,
          description: followUp.notes || `${followUp.type} follow-up`,
          status: followUp.status,
          priority: followUp.type === 'meeting' ? 'high' : followUp.type === 'call' ? 'medium' : 'low',
          dueDate: followUp.follow_up_date,
          createdDate: followUp.created_at,
          updatedDate: followUp.updated_at,
          assigned_to: followUp.assigned_to,
          created_by: followUp.created_by,
          metadata: {
            leadId: followUp.lead_id,
            leadName: followUp.leads?.name,
            followUpType: followUp.type,
            followUpTime: followUp.follow_up_time
          }
        };

        if (followUp.assigned_to === user.id) {
          if (followUp.status === 'completed') {
            tasks.completed.push(task);
          } else {
            tasks.assigned.push(task);
          }
        } else if (!followUp.assigned_to && followUp.status === 'pending') {
          tasks.pending.push(task);
        }
      });

      // Process leads
      (leads || []).forEach(lead => {
        const leadWithAssignment = lead as any; // Type assertion for missing fields
        if (leadWithAssignment.assigned_to === user.id) {
          const task: TaskItem = {
            id: lead.id,
            type: 'lead',
            title: `Lead: ${lead.name}`,
            description: `Phone: ${lead.phone}${lead.email ? ` | Email: ${lead.email}` : ''}`,
            status: lead.stage === 'closed-won' || lead.stage === 'closed-lost' ? 'completed' : 'assigned',
            priority: lead.lead_status === 'hot' ? 'high' : lead.lead_status === 'warm' ? 'medium' : 'low',
            createdDate: lead.created_at,
            updatedDate: lead.updated_at,
            assigned_to: leadWithAssignment.assigned_to,
            created_by: leadWithAssignment.created_by,
            metadata: {
              phone: lead.phone,
              email: lead.email,
              location: leadWithAssignment.address || leadWithAssignment.city || lead.location,
              budget: lead.budget || `${leadWithAssignment.budget_min || 0} - ${leadWithAssignment.budget_max || 0}`,
              stage: lead.stage,
              leadStatus: lead.lead_status
            }
          };

          if (task.status === 'completed') {
            tasks.completed.push(task);
          } else {
            tasks.assigned.push(task);
          }
        }
      });

      // Process site visits
      (siteVisits || []).forEach(visit => {
        if (visit.assigned_to === user.id) {
          const task: TaskItem = {
            id: visit.id,
            type: 'site_visit',
            title: `Site Visit: ${visit.properties?.title || 'Unknown Property'}`,
            description: `Visit scheduled for ${visit.visit_date} at ${visit.visit_time}`,
            status: visit.status === 'completed' ? 'completed' : visit.status === 'cancelled' ? 'completed' : 'assigned',
            priority: 'medium',
            dueDate: visit.visit_date,
            createdDate: visit.created_at,
            updatedDate: visit.updated_at,
            assigned_to: visit.assigned_to,
            created_by: visit.created_by,
            metadata: {
              propertyId: visit.property_id,
              propertyTitle: visit.properties?.title,
              leadId: visit.lead_id,
              visitTime: visit.visit_time,
              feedback: visit.feedback
            }
          };

          if (task.status === 'completed') {
            tasks.completed.push(task);
          } else {
            tasks.assigned.push(task);
          }
        }
      });

      // Process auto leads
      (autoLeads || []).forEach(autoLead => {
        if (autoLead.assigned_to === user.id) {
          const task: TaskItem = {
            id: autoLead.id,
            type: 'auto_lead',
            title: `Auto Lead: ${autoLead.name}`,
            description: `Phone: ${autoLead.phone}${autoLead.email ? ` | Email: ${autoLead.email}` : ''}`,
            status: autoLead.status === 'sold' ? 'completed' : 'assigned',
            priority: 'medium', // Default priority since lead_status might not be available
            createdDate: autoLead.created_at,
            updatedDate: autoLead.updated_at,
            assigned_to: autoLead.assigned_to,
            created_by: autoLead.created_by,
            metadata: {
              phone: autoLead.phone,
              email: autoLead.email,
              vehicleInterest: autoLead.preferred_vehicle_type,
              budget: `${autoLead.budget_min || 0} - ${autoLead.budget_max || 0}`,
              status: autoLead.status,
              financingNeeded: autoLead.financing_needed,
              insuranceNeeded: autoLead.insurance_needed
            }
          };

          if (task.status === 'completed') {
            tasks.completed.push(task);
          } else {
            tasks.assigned.push(task);
          }
        }
      });

      // Sort tasks
      const sortByDate = (a: TaskItem, b: TaskItem) => {
        const dateA = a.dueDate || a.updatedDate || a.createdDate;
        const dateB = b.dueDate || b.updatedDate || b.createdDate;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      };

      tasks.assigned.sort(sortByDate);
      tasks.pending.sort(sortByDate);
      tasks.completed.sort(sortByDate);

      return tasks;
    },
    enabled: !!companyId && !isLoading,
  });
}

// Hook to create notifications when tasks are assigned
export function useCreateTaskAssignmentNotification() {
  const createNotification = useCreateNotification();

  return async (task: Task, assignedUserId: string, _assignedByUserId: string) => {
    try {
      await createNotification.mutateAsync({
        user_id: assignedUserId,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned a new follow-up task for ${task.leads?.name || 'Unknown Lead'}`,
        related_id: task.id,
      });
    } catch (error) {
      console.error('Failed to create task assignment notification:', error);
    }
  };
}

// Hook to create notifications when tasks are completed
export function useCreateTaskCompletionNotification() {
  const createNotification = useCreateNotification();

  return async (task: Task, completedByUserId: string) => {
    try {
      // Notify task creator if different from completer
      if (task.created_by && task.created_by !== completedByUserId) {
        await createNotification.mutateAsync({
          user_id: task.created_by,
          type: 'task_completed',
          title: 'Task Completed',
          message: `Follow-up task for ${task.leads?.name || 'Unknown Lead'} has been completed`,
          related_id: task.id,
        });
      }
    } catch (error) {
      console.error('Failed to create task completion notification:', error);
    }
  };
}
