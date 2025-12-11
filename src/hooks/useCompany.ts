import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Company = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type AppRole = 'super_admin' | 'admin' | 'manager' | 'sales';

export function useCurrentCompany() {
  return useQuery({
    queryKey: ['currentCompany'],
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
        .select('*')
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
      password 
    }: { 
      companyName: string;
      companyEmail: string;
      userName: string;
      userEmail: string;
      password: string;
    }) => {
      // Sign up the user with company info in metadata
      // The handle_new_user trigger will create the company
      const redirectUrl = `${window.location.origin}/`;
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

export function useInviteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      email, 
      name, 
      role,
      companyId 
    }: { 
      email: string;
      name: string;
      role: AppRole;
      companyId: string;
    }) => {
      const redirectUrl = `${window.location.origin}/`;
      
      // Generate a temporary password - user will need to reset
      const tempPassword = crypto.randomUUID();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            company_id: companyId,
            role,
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
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
      const { data, error } = await supabase
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
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
      // Remove from user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', companyId);

      if (roleError) throw roleError;

      // Update profile to remove company association
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: null })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}
