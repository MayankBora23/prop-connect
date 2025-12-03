import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalLeads: number;
  newLeadsToday: number;
  hotLeads: number;
  closedWon: number;
  closedLost: number;
  conversionRate: number;
  leadsBySource: { source: string; count: number }[];
  leadsByStage: { stage: string; count: number }[];
  pendingFollowUps: number;
  scheduledVisits: number;
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    try {
      // Fetch all leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*');

      if (leadsError) throw leadsError;

      // Fetch follow-ups
      const { data: followUps, error: followUpsError } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('status', 'pending');

      if (followUpsError) throw followUpsError;

      // Fetch site visits
      const { data: visits, error: visitsError } = await supabase
        .from('site_visits')
        .select('*')
        .eq('status', 'scheduled');

      if (visitsError) throw visitsError;

      const today = new Date().toISOString().split('T')[0];
      
      const totalLeads = leads?.length || 0;
      const newLeadsToday = leads?.filter(l => l.created_at.startsWith(today)).length || 0;
      const hotLeads = leads?.filter(l => l.tags?.includes('Hot Lead')).length || 0;
      const closedWon = leads?.filter(l => l.stage === 'closed-won').length || 0;
      const closedLost = leads?.filter(l => l.stage === 'closed-lost').length || 0;
      const conversionRate = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100 * 10) / 10 : 0;

      // Group by source
      const sourceGroups = leads?.reduce((acc, lead) => {
        const source = lead.source || 'Unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const leadsBySource = Object.entries(sourceGroups)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      // Group by stage
      const stageMap: Record<string, string> = {
        'new': 'New',
        'contacted': 'Contacted',
        'follow-up': 'Follow-up',
        'site-visit': 'Site Visit',
        'negotiation': 'Negotiation',
        'closed-won': 'Closed Won',
        'closed-lost': 'Closed Lost',
      };

      const stageGroups = leads?.reduce((acc, lead) => {
        const stage = stageMap[lead.stage] || lead.stage;
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const leadsByStage = Object.entries(stageGroups)
        .map(([stage, count]) => ({ stage, count }));

      setAnalytics({
        totalLeads,
        newLeadsToday,
        hotLeads,
        closedWon,
        closedLost,
        conversionRate,
        leadsBySource,
        leadsByStage,
        pendingFollowUps: followUps?.length || 0,
        scheduledVisits: visits?.length || 0,
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return {
    analytics,
    loading,
    fetchAnalytics,
  };
}
