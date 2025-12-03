import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead, LeadStage } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data as Lead[]) || []);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createLead = async (lead: Partial<Lead>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        name: lead.name!,
        phone: lead.phone!,
        email: lead.email,
        budget: lead.budget,
        location: lead.location,
        property_type: lead.property_type,
        source: lead.source,
        stage: lead.stage || 'new',
        assigned_to: lead.assigned_to,
        tags: lead.tags || [],
        notes: lead.notes || [],
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      setLeads(prev => [data as Lead, ...prev]);
      toast({
        title: 'Success',
        description: 'Lead created successfully',
      });
      return { data: data as Lead, error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } as Lead : l));
      toast({
        title: 'Success',
        description: 'Lead updated successfully',
      });
      return { data: data as Lead, error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateLeadStage = async (id: string, stage: LeadStage) => {
    return updateLead(id, { stage, last_contact: new Date().toISOString() });
  };

  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setLeads(prev => prev.filter(l => l.id !== id));
      toast({
        title: 'Success',
        description: 'Lead deleted successfully',
      });
      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return {
    leads,
    loading,
    fetchLeads,
    createLead,
    updateLead,
    updateLeadStage,
    deleteLead,
  };
}
