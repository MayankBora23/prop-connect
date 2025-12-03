import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole, TeamMember } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useTeam() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTeam = async () => {
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Get lead counts per user
      const { data: leadCounts, error: leadsError } = await supabase
        .from('leads')
        .select('assigned_to');

      if (leadsError) throw leadsError;

      // Count leads per user
      const leadsPerUser = leadCounts?.reduce((acc, lead) => {
        if (lead.assigned_to) {
          acc[lead.assigned_to] = (acc[lead.assigned_to] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      // Count closed deals
      const { data: closedDeals, error: dealsError } = await supabase
        .from('leads')
        .select('assigned_to')
        .eq('stage', 'closed-won');

      if (dealsError) throw dealsError;

      const dealsPerUser = closedDeals?.reduce((acc, lead) => {
        if (lead.assigned_to) {
          acc[lead.assigned_to] = (acc[lead.assigned_to] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      // Combine all data
      const teamMembers: TeamMember[] = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'agent',
          leads_count: leadsPerUser[profile.user_id] || 0,
          deals_count: dealsPerUser[profile.user_id] || 0,
        };
      }) || [];

      setTeam(teamMembers);
    } catch (error: any) {
      console.error('Error fetching team:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (userId: string, updates: Partial<Profile>) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      
      setTeam(prev => prev.map(m => m.user_id === userId ? { ...m, ...data } : m));
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      return { data, error: null };
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
    fetchTeam();
  }, []);

  return {
    team,
    loading,
    fetchTeam,
    updateProfile,
  };
}
