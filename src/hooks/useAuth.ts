import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearCompanyIdCache } from './useTeamChat';
import { useQueryClient } from '@tanstack/react-query';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Clear caches when auth state changes (login/logout/sign in different user)
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
          clearCompanyIdCache();
          // Clear React Query cache for company and profile data
          queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
          queryClient.invalidateQueries({ queryKey: ['currentProfile'] });
          queryClient.invalidateQueries({ queryKey: ['profiles'] });
          queryClient.invalidateQueries({ queryKey: ['team_chat_messages'] });
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Sign in error:', authError);
      return { error: authError };
    }

    if (data.user) {
      // Security Check: Verify company and user allow_login status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('allow_login, company_id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        return { error: new Error('Account profile not found.') };
      }

      if (profile.allow_login === false) {
        await supabase.auth.signOut();
        return { error: new Error('Your individual account access has been suspended.') };
      }

      if (profile.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('allow_login')
          .eq('id', profile.company_id)
          .maybeSingle();

        if (companyError || (company && company.allow_login === false)) {
          await supabase.auth.signOut();
          return { error: new Error('Your company access has been suspended. Please contact your administrator.') };
        }
      }

      console.log('Sign in successful and access verified');
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Clear caches before signing out
    clearCompanyIdCache();
    queryClient.clear();

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
