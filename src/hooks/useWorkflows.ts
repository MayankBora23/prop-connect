import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Workflow, WorkflowStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows((data as Workflow[]) || []);
    } catch (error: any) {
      console.error('Error fetching workflows:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workflows',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async (workflow: Partial<Workflow>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        name: workflow.name!,
        trigger_event: workflow.trigger_event!,
        action: workflow.action!,
        status: workflow.status || 'active',
        runs_count: 0,
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('workflows')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      setWorkflows(prev => [data as Workflow, ...prev]);
      toast({
        title: 'Success',
        description: 'Workflow created successfully',
      });
      return { data: data as Workflow, error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const toggleWorkflow = async (id: string, currentStatus: WorkflowStatus) => {
    const newStatus: WorkflowStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const { data, error } = await supabase
        .from('workflows')
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setWorkflows(prev => prev.map(w => w.id === id ? data as Workflow : w));
      toast({
        title: 'Success',
        description: `Workflow ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
      });
      return { data: data as Workflow, error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  return {
    workflows,
    loading,
    fetchWorkflows,
    createWorkflow,
    toggleWorkflow,
  };
}
