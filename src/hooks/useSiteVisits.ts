import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SiteVisit, SiteVisitStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useSiteVisits() {
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSiteVisits = async () => {
    try {
      const { data, error } = await supabase
        .from('site_visits')
        .select(`
          *,
          lead:leads(*),
          property:properties(*)
        `)
        .order('visit_date', { ascending: true });

      if (error) throw error;
      setSiteVisits((data as SiteVisit[]) || []);
    } catch (error: any) {
      console.error('Error fetching site visits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load site visits',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSiteVisit = async (visit: Partial<SiteVisit>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        lead_id: visit.lead_id!,
        property_id: visit.property_id!,
        visit_date: visit.visit_date!,
        visit_time: visit.visit_time!,
        assigned_to: visit.assigned_to,
        status: visit.status || 'scheduled',
        feedback: visit.feedback,
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('site_visits')
        .insert(insertData)
        .select(`
          *,
          lead:leads(*),
          property:properties(*)
        `)
        .single();

      if (error) throw error;
      
      setSiteVisits(prev => [...prev, data as SiteVisit]);
      toast({
        title: 'Success',
        description: 'Site visit scheduled successfully',
      });
      return { data: data as SiteVisit, error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateSiteVisit = async (id: string, updates: Partial<SiteVisit>) => {
    try {
      const { data, error } = await supabase
        .from('site_visits')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          lead:leads(*),
          property:properties(*)
        `)
        .single();

      if (error) throw error;
      
      setSiteVisits(prev => prev.map(v => v.id === id ? data as SiteVisit : v));
      toast({
        title: 'Success',
        description: 'Site visit updated successfully',
      });
      return { data: data as SiteVisit, error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateStatus = async (id: string, status: SiteVisitStatus, feedback?: string) => {
    return updateSiteVisit(id, { status, feedback });
  };

  useEffect(() => {
    fetchSiteVisits();
  }, []);

  return {
    siteVisits,
    loading,
    fetchSiteVisits,
    createSiteVisit,
    updateSiteVisit,
    updateStatus,
  };
}
