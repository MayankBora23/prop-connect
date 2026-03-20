import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Note: This enum is backed by DB type `public.lead_history_interaction_type`,
// but we keep TS as a simple union to avoid depending on generated Supabase types.
export type InteractionType =
  | 'call'
  | 'whatsapp'
  | 'meeting'
  | 'note'
  | 'site_visit'
  | 'booking_discussion'
  | 'demo_class'
  | 'fee_discussion'
  | 'test_drive'
  | 'price_negotiation';

export type LeadHistoryEntry = {
  id: string;
  company_id: string;
  lead_id: string;
  industry_type: string;
  interaction_type: InteractionType | string;
  message: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
};

export type AutoLeadHistoryEntry = {
  id: string;
  company_id: string;
  auto_lead_id: string;
  industry_type: string;
  interaction_type: InteractionType | string;
  message: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
};

export type StudentHistoryEntry = {
  id: string;
  company_id: string;
  student_id: string;
  industry_type: string;
  interaction_type: InteractionType | string;
  message: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
};

export type InternalLeadHistoryEntry = {
  id: string;
  company_id: string;
  internal_lead_id: string;
  industry_type: string;
  interaction_type: InteractionType | string;
  message: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
};

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id as string;
}

// -----------------------------
// Real estate: leads
// -----------------------------
export function useLeadHistoryEntries(leadId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['lead_history', leadId],
    enabled: !!leadId,
    retry: false,
    throwOnError: false,
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data ?? []) as LeadHistoryEntry[];
    },
    initialData: [] as LeadHistoryEntry[],
    // keep previous data stable for realtime UX
    placeholderData: (prev) => prev ?? [],
  });
}

export function useLeadHistoryRealtime(leadId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead_history_${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_history',
        },
        (payload) => {
          const inserted = payload.new as any;
          if (!inserted) return;
          if (inserted.lead_id !== leadId) return;
          queryClient.invalidateQueries({ queryKey: ['lead_history', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);
}

export function useAddLeadHistoryEntry(leadId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { interaction_type: InteractionType; message: string }) => {
      if (!leadId) throw new Error('Missing leadId');

      const userId = await getCurrentUserId();

      const { data: lead, error: leadErr } = await supabase
        .from('leads')
        .select('company_id, assigned_to')
        .eq('id', leadId)
        .maybeSingle();

      if (leadErr || !lead) throw leadErr ?? new Error('Lead not found');

      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .select('industry')
        .eq('id', lead.company_id)
        .maybeSingle();

      if (companyErr || !company) throw companyErr ?? new Error('Company not found');

      const { data, error } = await supabase
        .from('lead_history')
        .insert({
          company_id: lead.company_id,
          lead_id: leadId,
          industry_type: company.industry,
          interaction_type: payload.interaction_type,
          message: payload.message,
          created_by: userId,
          assigned_to: lead.assigned_to ?? null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as LeadHistoryEntry;
    },
    onSuccess: (_, __) => {
      if (!leadId) return;
      queryClient.invalidateQueries({ queryKey: ['lead_history', leadId] });
    },
  });
}

// -----------------------------
// Automobile: auto_leads
// -----------------------------
export function useAutoLeadHistoryEntries(autoLeadId: string | null | undefined) {
  return useQuery({
    queryKey: ['auto_lead_history', autoLeadId],
    enabled: !!autoLeadId,
    retry: false,
    throwOnError: false,
    queryFn: async () => {
      if (!autoLeadId) return [];
      const { data, error } = await (supabase as any)
        .from('auto_lead_history')
        .select('*')
        .eq('auto_lead_id', autoLeadId)
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data ?? []) as AutoLeadHistoryEntry[];
    },
    initialData: [] as AutoLeadHistoryEntry[],
    placeholderData: (prev) => prev ?? [],
  });
}

export function useAutoLeadHistoryRealtime(autoLeadId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!autoLeadId) return;

    const channel = supabase
      .channel(`auto_lead_history_${autoLeadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auto_lead_history',
        },
        (payload) => {
          const inserted = payload.new as any;
          if (!inserted) return;
          if (inserted.auto_lead_id !== autoLeadId) return;
          queryClient.invalidateQueries({ queryKey: ['auto_lead_history', autoLeadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoLeadId, queryClient]);
}

export function useAddAutoLeadHistoryEntry(autoLeadId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { interaction_type: InteractionType; message: string }) => {
      if (!autoLeadId) throw new Error('Missing autoLeadId');

      const userId = await getCurrentUserId();

      const { data: lead, error: leadErr } = await (supabase as any)
        .from('auto_leads')
        .select('company_id, assigned_to')
        .eq('id', autoLeadId)
        .maybeSingle();

      if (leadErr || !lead) throw leadErr ?? new Error('Auto lead not found');

      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .select('industry')
        .eq('id', lead.company_id)
        .maybeSingle();

      if (companyErr || !company) throw companyErr ?? new Error('Company not found');

      const { data, error } = await (supabase as any)
        .from('auto_lead_history')
        .insert({
          company_id: lead.company_id,
          auto_lead_id: autoLeadId,
          industry_type: company.industry,
          interaction_type: payload.interaction_type,
          message: payload.message,
          created_by: userId,
          assigned_to: lead.assigned_to ?? null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as AutoLeadHistoryEntry;
    },
    onSuccess: (_, __) => {
      if (!autoLeadId) return;
      queryClient.invalidateQueries({ queryKey: ['auto_lead_history', autoLeadId] });
    },
  });
}

// -----------------------------
// Education / Coaching: students
// -----------------------------
export function useStudentHistoryEntries(studentId: string | null | undefined) {
  return useQuery({
    queryKey: ['student_history', studentId],
    enabled: !!studentId,
    retry: false,
    throwOnError: false,
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('student_history')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data ?? []) as StudentHistoryEntry[];
    },
    initialData: [] as StudentHistoryEntry[],
    placeholderData: (prev) => prev ?? [],
  });
}

export function useStudentHistoryRealtime(studentId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!studentId) return;

    const channel = supabase
      .channel(`student_history_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'student_history',
        },
        (payload) => {
          const inserted = payload.new as any;
          if (!inserted) return;
          if (inserted.student_id !== studentId) return;
          queryClient.invalidateQueries({ queryKey: ['student_history', studentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, queryClient]);
}

export function useAddStudentHistoryEntry(studentId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { interaction_type: InteractionType; message: string }) => {
      if (!studentId) throw new Error('Missing studentId');

      const userId = await getCurrentUserId();

      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('company_id, assigned_to')
        .eq('id', studentId)
        .maybeSingle();

      if (studentErr || !student || !student.company_id) throw studentErr ?? new Error('Student not found');

      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .select('industry')
        .eq('id', student.company_id)
        .maybeSingle();

      if (companyErr || !company) throw companyErr ?? new Error('Company not found');

      const { data, error } = await supabase
        .from('student_history')
        .insert({
          company_id: student.company_id,
          student_id: studentId,
          industry_type: company.industry,
          interaction_type: payload.interaction_type,
          message: payload.message,
          created_by: userId,
          assigned_to: student.assigned_to ?? null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as StudentHistoryEntry;
    },
    onSuccess: (_, __) => {
      if (!studentId) return;
      queryClient.invalidateQueries({ queryKey: ['student_history', studentId] });
    },
  });
}

// -----------------------------
// Internal CRM: internal_leads
// -----------------------------
export function useInternalLeadHistoryEntries(internalLeadId: string | null | undefined) {
  return useQuery({
    queryKey: ['internal_lead_history', internalLeadId],
    enabled: !!internalLeadId,
    retry: false,
    throwOnError: false,
    queryFn: async () => {
      if (!internalLeadId) return [];
      const { data, error } = await supabase
        .from('internal_lead_history')
        .select('*')
        .eq('internal_lead_id', internalLeadId)
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data ?? []) as InternalLeadHistoryEntry[];
    },
    initialData: [] as InternalLeadHistoryEntry[],
    placeholderData: (prev) => prev ?? [],
  });
}

export function useInternalLeadHistoryRealtime(internalLeadId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!internalLeadId) return;

    const channel = supabase
      .channel(`internal_lead_history_${internalLeadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_lead_history',
        },
        (payload) => {
          const inserted = payload.new as any;
          if (!inserted) return;
          if (inserted.internal_lead_id !== internalLeadId) return;
          queryClient.invalidateQueries({
            queryKey: ['internal_lead_history', internalLeadId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [internalLeadId, queryClient]);
}

export function useAddInternalLeadHistoryEntry(internalLeadId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { interaction_type: InteractionType; message: string }) => {
      if (!internalLeadId) throw new Error('Missing internalLeadId');

      const userId = await getCurrentUserId();

      // Resolve company + industry from the current internal CRM user
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileErr || !profile?.company_id) throw profileErr ?? new Error('Profile not found');

      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .select('industry')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (companyErr || !company) throw companyErr ?? new Error('Company not found');

      const { data: entry, error } = await supabase
        .from('internal_lead_history')
        .insert({
          company_id: profile.company_id,
          internal_lead_id: internalLeadId,
          industry_type: company.industry,
          interaction_type: payload.interaction_type,
          message: payload.message,
          created_by: userId,
          assigned_to: userId, // for internal leads we treat creator as current "owner" at that time
        })
        .select('*')
        .single();

      if (error) throw error;
      return entry as InternalLeadHistoryEntry;
    },
    onSuccess: (_, __) => {
      if (!internalLeadId) return;
      queryClient.invalidateQueries({ queryKey: ['internal_lead_history', internalLeadId] });
    },
  });
}

// -----------------------------
// Lightweight UI helpers
// -----------------------------
export function formatInteractionType(type: string) {
  return type
    .split('_')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ');
}

export function formatDateSeparator(d: Date) {
  const today = new Date();
  const yday = new Date();
  yday.setDate(yday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yday)) return 'Yesterday';
  // Use a readable day-month format; keep it stable across locales
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

