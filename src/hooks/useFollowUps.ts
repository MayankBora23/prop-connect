import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FollowUp } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useFollowUps() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFollowUps = async () => {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select(`
          *,
          lead:leads(*)
        `)
        .order('follow_up_date', { ascending: true });

      if (error) throw error;
      setFollowUps((data as FollowUp[]) || []);
    } catch (error: any) {
      console.error('Error fetching follow-ups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load follow-ups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createFollowUp = async (followUp: Partial<FollowUp>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        lead_id: followUp.lead_id!,
        type: followUp.type!,
        follow_up_date: followUp.follow_up_date!,
        follow_up_time: followUp.follow_up_time!,
        notes: followUp.notes,
        status: followUp.status || 'pending',
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('follow_ups')
        .insert(insertData)
        .select(`
          *,
          lead:leads(*)
        `)
        .single();

      if (error) throw error;
      
      setFollowUps(prev => [...prev, data as FollowUp]);
      toast({
        title: 'Success',
        description: 'Follow-up created successfully',
      });
      return { data: data as FollowUp, error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateFollowUp = async (id: string, updates: Partial<FollowUp>) => {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          lead:leads(*)
        `)
        .single();

      if (error) throw error;
      
      setFollowUps(prev => prev.map(f => f.id === id ? data as FollowUp : f));
      toast({
        title: 'Success',
        description: 'Follow-up updated successfully',
      });
      return { data: data as FollowUp, error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const markComplete = async (id: string) => {
    return updateFollowUp(id, { status: 'completed' });
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  return {
    followUps,
    loading,
    fetchFollowUps,
    createFollowUp,
    updateFollowUp,
    markComplete,
  };
}
