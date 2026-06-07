import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearCompanyIdCache } from './useTeamChat';
import { useQueryClient } from '@tanstack/react-query';

const PENDING_PASSWORD_SETUP_KEY = 'pending_password_setup';

function isPasswordSetupUrl() {
  const hash = window.location.hash;
  if (hash.includes('type=recovery') || hash.includes('type=invite')) {
    return true;
  }
  if (window.location.pathname === '/auth') {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code') || params.has('token_hash')) {
      return true;
    }
  }
  return false;
}

function readPendingPasswordSetup() {
  return isPasswordSetupUrl() || sessionStorage.getItem(PENDING_PASSWORD_SETUP_KEY) === 'true';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPasswordSetup, setPendingPasswordSetup] = useState(readPendingPasswordSetup);
  const queryClient = useQueryClient();

  const markPendingPasswordSetup = useCallback(() => {
    sessionStorage.setItem(PENDING_PASSWORD_SETUP_KEY, 'true');
    setPendingPasswordSetup(true);
  }, []);

  const clearPendingPasswordSetup = useCallback(() => {
    sessionStorage.removeItem(PENDING_PASSWORD_SETUP_KEY);
    setPendingPasswordSetup(false);
  }, []);

  useEffect(() => {
    if (isPasswordSetupUrl()) {
      markPendingPasswordSetup();
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          markPendingPasswordSetup();
        } else if (
          event === 'SIGNED_IN' &&
          window.location.pathname === '/auth' &&
          (isPasswordSetupUrl() || sessionStorage.getItem(PENDING_PASSWORD_SETUP_KEY) === 'true')
        ) {
          markPendingPasswordSetup();
        }

        // Clear caches when auth state changes (login/logout/sign in different user)
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
          clearCompanyIdCache();
          // Clear React Query cache for company and profile data
          queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
          queryClient.invalidateQueries({ queryKey: ['currentProfile'] });
          queryClient.invalidateQueries({ queryKey: ['team-members'] });
          queryClient.invalidateQueries({ queryKey: ['team_chat_messages'] });
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session retrieval/token refresh failed:', error);
        // Clear invalid session from local storage to prevent endless redirect or bad state
        if (
          error.message?.includes('Refresh Token Not Found') ||
          error.message?.includes('Invalid Refresh Token') ||
          error.status === 400
        ) {
          supabase.auth.signOut().then(() => {
            setSession(null);
            setUser(null);
            setLoading(false);
          });
          return;
        }
      }
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
    const redirectUrl = `${window.location.origin}/dashboard`;

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
    pendingPasswordSetup,
    markPendingPasswordSetup,
    clearPendingPasswordSetup,
    signIn,
    signUp,
    signOut,
  };
}
