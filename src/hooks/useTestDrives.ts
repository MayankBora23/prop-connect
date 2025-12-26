import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { TestDriveWithRelations } from './useAutoTypes';

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

export type TestDrive = TestDriveWithRelations;
export type TestDriveInsert = Omit<TestDrive, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type TestDriveUpdate = Partial<TestDriveInsert>;

export function useTestDrives() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['test_drives', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabaseAny
        .from('test_drives')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email
          ),
          vehicles (
            id,
            brand,
            model,
            year,
            fuel_type
          )
        `)
        .eq('company_id', company.id)
        .order('test_drive_date', { ascending: false })
        .order('test_drive_time', { ascending: false });

      if (error) throw error;
      return data as TestDriveWithRelations[];
    },
    enabled: !!company?.id,
  });
}

export function useTestDrive(id: string) {
  return useQuery({
    queryKey: ['test_drive', id],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('test_drives')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email,
            preferred_brand,
            preferred_model
          ),
          vehicles (
            id,
            brand,
            model,
            year,
            fuel_type,
            transmission
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as TestDriveWithRelations[];
    },
  });
}

export function useCreateTestDrive() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (testDrive: TestDriveInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabaseAny
        .from('test_drives')
        .insert({
          ...testDrive,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TestDriveWithRelations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test_drives'] });
    },
  });
}

export function useUpdateTestDrive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TestDriveUpdate & { id: string }) => {
      const { data, error } = await supabaseAny
        .from('test_drives')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TestDriveWithRelations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test_drives'] });
    },
  });
}

export function useDeleteTestDrive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseAny
        .from('test_drives')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test_drives'] });
    },
  });
}
