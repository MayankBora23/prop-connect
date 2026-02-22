import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';

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
        .select()
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
        .select()
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
      password
    }: {
      email: string;
      name: string;
      role: AppRole;
      companyId: string;
      password?: string;
    }) => {
      const redirectUrl = `${window.location.origin}/`;

      // Use provided password or generate a secure one
      const userPassword = password || generateSecurePassword();

      // For team member invitations, we'll create the user without requiring email confirmation
      // This allows immediate login with the provided credentials
      // For team member invitations, we want immediate access without email confirmation
      // We'll try to create the user account with auto-confirmation
      console.log('Creating team member with email:', email, 'password length:', userPassword.length);

      const { data, error } = await supabase.auth.signUp({
        email,
        password: userPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            company_id: companyId,
            role,
            temp_password: userPassword, // Store for email sending
          },
        },
      });

      // If signup fails due to email confirmation being required,
      // we'll try a different approach
      if (error && error.message.includes('Email not confirmed')) {
        console.log('Email confirmation required, trying alternative approach');

        // For now, we'll throw an error explaining the issue
        throw new Error('Team member invitations require email confirmation. Please ask the team member to check their email and confirm their account before signing in.');
      }

      if (error) {
        console.error('Signup error:', error);
        throw new Error(`Failed to create user account: ${error.message}`);
      }

      console.log('Signup result:', {
        user: data.user ? 'created' : 'not created',
        emailConfirmed: data.user?.email_confirmed_at ? true : false,
        userId: data.user?.id,
        userData: data.user
      });

      if (data.user) {
        console.log('User metadata:', data.user.user_metadata);
        console.log('User app metadata:', data.user.app_metadata);
      }

      // Wait a moment for the database trigger to execute
      console.log('Waiting for database trigger to create profile and role records...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if profile was created
      const { data: profileCheck, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, company_id')
        .eq('user_id', data.user?.id)
        .maybeSingle();

      console.log('Profile creation check:', {
        profile: profileCheck ? 'created' : 'not found',
        profileData: profileCheck,
        profileError
      });

      // Check if user role was created
      const { data: roleCheck, error: roleError } = await (supabase as any)
        .from('user_roles')
        .select('role, company_id')
        .eq('user_id', data.user?.id)
        .maybeSingle();

      console.log('Role creation check:', {
        role: roleCheck ? 'created' : 'not found',
        roleData: roleCheck,
        roleError
      });

      // If the user was created but not confirmed, we'll still proceed
      // The user should be able to sign in with the provided credentials

      // Manual fallback: Ensure profile and role records exist
      if (data.user && !profileCheck) {
        console.log('Profile not found, creating manually...');
        try {
          const { error: manualProfileError } = await supabase
            .from('profiles')
            .insert({
              user_id: data.user.id,
              name: name,
              email: email,
              company_id: companyId
            });

          if (manualProfileError) {
            console.error('Failed to create profile manually:', manualProfileError);
          } else {
            console.log('Profile created manually');
          }
        } catch (err) {
          console.error('Error creating profile manually:', err);
        }
      }

      if (data.user && !roleCheck) {
        console.log('Role not found, creating manually...');
        try {
          const { error: manualRoleError } = await (supabase as any)
            .from('user_roles')
            .insert({
              user_id: data.user.id,
              company_id: companyId,
              role: role
            });

          if (manualRoleError) {
            console.error('Failed to create role manually:', manualRoleError);
          } else {
            console.log('Role created manually');
          }
        } catch (err) {
          console.error('Error creating role manually:', err);
        }
      }

      if (error) throw error;

      // Send welcome email with login credentials and confirmation instructions
      try {
        await sendWelcomeEmail(email, name, userPassword, role, !data.user?.email_confirmed_at);
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError);
        // Don't fail the invitation if email fails
      }

      return { ...data, password: userPassword };
    },
    onSuccess: (data) => {
      console.log('Invitation successful, refreshing data...', data);
      // Force refresh of profiles and related data
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['currentProfile'] });
      queryClient.invalidateQueries({ queryKey: ['currentCompany'] });

      // Also refresh any cached user role data
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
    },
  });
}

// Generate a secure random password
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Send welcome email with login credentials
async function sendWelcomeEmail(email: string, name: string, password: string, role: AppRole, needsConfirmation: boolean = false): Promise<void> {
  // For now, we'll log the email details. In production, you'd integrate with an email service
  console.log('Sending welcome email:', {
    to: email,
    subject: 'Welcome to RealCRM - Your Account Details',
    body: `
      Hi ${name},

      Welcome to RealCRM! Your account has been created successfully.

      ${needsConfirmation ? `
      IMPORTANT: Please check your email and click the confirmation link before attempting to sign in.
      ` : ''}

      Login Details:
      Email: ${email}
      Password: ${password}
      Role: ${role.replace('_', ' ')}

      Please log in at ${window.location.origin}/auth and change your password immediately.

      best regards,
      RealCRM Team
    `
  });

  // TODO: Integrate with email service like SendGrid, Mailgun, etc.
}

export function useAllCompanies() {
  return useQuery({
    queryKey: ['allCompanies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
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
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
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
      // Force refetch of profiles to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['currentProfile'] });
      // Also invalidate any cached company data
      queryClient.invalidateQueries({ queryKey: ['currentCompany'] });
    },
  });
}
