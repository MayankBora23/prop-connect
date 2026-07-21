import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';

async function readInviteFunctionError(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  const ctx = error.context;
  if (!(ctx instanceof Response)) return null;
  try {
    const text = (await ctx.text()).trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      return parsed.error ?? text;
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

function mapInviteErrorMessage(message: string): string {
  if (message.includes('rate limit')) {
    return 'Too many invitation attempts. Please wait about an hour before trying again, or contact support if you need help adding this user.';
  }
  if (message.includes('already been registered') || message.includes('already exists')) {
    return 'A user with this email already exists. They may already be on your team or registered with another company.';
  }
  if (message.includes('Team member limit') || message.includes('User Limit Reached')) {
    return message;
  }
  return message;
}

const SAFE_COMPANY_COLUMNS = `
  id, name, email, address, phone, logo_url, industry,
  created_at, updated_at, user_limit, pan_number, gst_number,
  allow_login, account_status, status_notes,
  webhook_token, meta_verify_token, enable_meta_leads,
  whatsapp_provider, meta_phone_number_id, meta_whatsapp_number, meta_waba_id
`;

export type Company = {
  id: string;
  name: string;
  email: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  industry: 'real_estate' | 'education' | 'automobile_dealers' | 'internal_crm';
  created_at: string;
  updated_at: string;
  user_limit: number;
  pan_number: string | null;
  gst_number: string | null;
  allow_login?: boolean;
  account_status?: 'active' | 'suspended';
  status_notes?: string | null;
  webhook_token?: string | null;
  meta_verify_token?: string | null;
  enable_meta_leads?: boolean | null;
  whatsapp_provider?: 'twilio' | 'meta' | null;
  meta_phone_number_id?: string | null;
  meta_whatsapp_number?: string | null;
  meta_waba_id?: string | null;
  meta_access_token?: string | null;
  meta_webhook_verify_token?: string | null;
};

export type AppRole = 'super_admin' | 'admin' | 'manager' | 'sales';

export function useCurrentCompany() {
  return useQuery({
    queryKey: ['currentCompany'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user's company_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.company_id) return null;

      const { data: company, error } = await supabase
        .from('companies')
        .select(SAFE_COMPANY_COLUMNS)
        .eq('id', profile.company_id)
        .maybeSingle();

      if (error) throw error;
      return company as Company;
    },
  });
}

export function useCreateCompanyWithUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyName,
      companyEmail,
      userName,
      userEmail,
      password,
      industry
    }: {
      companyName: string;
      companyEmail: string;
      userName: string;
      userEmail: string;
      password: string;
      industry: 'real_estate' | 'education' | 'automobile_dealers' | 'internal_crm';
    }) => {
      // Sign up the user with company info in metadata
      // The handle_new_user trigger will create the company
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: userEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: userName,
            company_name: companyName,
            company_email: companyEmail,
            role: 'super_admin',
            industry: industry,
          },
        },
      });

      if (signUpError) throw signUpError;

      return { user: authData.user };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
      queryClient.invalidateQueries({ queryKey: ['currentProfile'] });
    },
  });
}

export type CompanyUpdate = TablesUpdate<'companies'>;

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CompanyUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select(SAFE_COMPANY_COLUMNS)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
      queryClient.invalidateQueries({ queryKey: ['allCompanies'] });
    },
  });
}

export function useCompanyTeamCount(companyId: string) {
  return useQuery({
    queryKey: ['companyTeamCount', companyId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!companyId,
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      allow_login,
      account_status,
      user_limit,
      status_notes
    }: {
      id: string;
      allow_login: boolean;
      account_status: 'active' | 'suspended';
      user_limit: number;
      status_notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('companies')
        .update({
          allow_login,
          account_status,
          user_limit,
          status_notes
        })
        .eq('id', id)
        .select(SAFE_COMPANY_COLUMNS)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCompanies'] });
      queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
    },
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      name,
      role,
      companyId,
      password,
    }: {
      email: string;
      name: string;
      role: AppRole;
      companyId: string;
      password: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: {
          email: email.trim(),
          role,
          companyId,
          name: name.trim(),
          password,
        },
      });

      if (error) {
        const detail = await readInviteFunctionError(error);
        const raw = detail || error.message || 'Failed to invite team member';
        throw new Error(mapInviteErrorMessage(raw));
      }

      if (data?.error) {
        throw new Error(mapInviteErrorMessage(String(data.error)));
      }

      const invitedUser = data?.user;
      if (!invitedUser?.id) {
        throw new Error('Invitation completed but no user was returned. Please refresh the team list.');
      }

      return { user: invitedUser, emailSent: data?.emailSent !== false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['currentProfile'] });
      queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      queryClient.invalidateQueries({ queryKey: ['companyTeamCount'] });
    },
  });
}

export function useAllCompanies() {
  return useQuery({
    queryKey: ['allCompanies'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(SAFE_COMPANY_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Company[];
    },
  });
}
export function useUpdateTeamMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      companyId,
      role
    }: {
      userId: string;
      companyId: string;
      role: AppRole;
    }) => {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}


export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCompanies'] });
      queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
      console.log('Starting team member removal process:', { userId, companyId });

      // First, check if user has a role record in user_roles
      const { data: roleRecord } = await (supabase as any)
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .maybeSingle();

      // Remove from user_roles if record exists
      if (roleRecord) {
        console.log('Removing user role record');
        const { error: roleError } = await (supabase as any)
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('company_id', companyId);

        if (roleError) {
          console.error('Error deleting user role:', roleError);
          throw new Error(`Failed to remove user role: ${roleError.message}`);
        }
      }

      // Check if this user belongs to other companies
      const { data: otherRoles, error: otherRolesError } = await (supabase as any)
        .from('user_roles')
        .select('company_id')
        .eq('user_id', userId)
        .neq('company_id', companyId);

      if (otherRolesError) {
        console.error('Error checking other roles:', otherRolesError);
        throw new Error(`Failed to check user roles: ${otherRolesError.message}`);
      }

      // If user has roles in other companies, just remove company association
      if (otherRoles && otherRoles.length > 0) {
        console.log('User has roles in other companies, removing company association only');
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ company_id: null })
          .eq('user_id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw new Error(`Failed to remove company association: ${profileError.message}`);
        }
      } else {
        // User only belongs to this company, delete the profile entirely
        console.log('User only belongs to this company, deleting profile entirely');
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error deleting profile:', deleteError);
          throw new Error(`Failed to delete user profile: ${deleteError.message}`);
        }

        // Note: We cannot delete from auth.users as it requires admin privileges
        // The user will remain in auth.users but won't have a profile
      }

      console.log('Team member removal completed successfully');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['currentProfile'] });
      // Also invalidate any cached company data
      queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
    },
  });
}
