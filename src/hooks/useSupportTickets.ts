import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useCurrentCompany } from './useCompany';
import { useCurrentProfile } from './useProfiles';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high';
export type SupportTicketCategory = 'bug' | 'feature_request' | 'help' | 'integration';
export type SupportTicketSenderType = 'client' | 'admin';

export type SupportTicket = {
  id: string;
  company_id: string;
  user_id: string;
  industry_type: string;
  title: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: SupportTicketCategory;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportTicketMessage = {
  id: string;
  ticket_id: string;
  sender_type: SupportTicketSenderType;
  sender_user_id: string;
  message: string;
  created_at: string;
};

export type SupportTicketInternalNote = {
  id: string;
  ticket_id: string;
  admin_user_id: string;
  note: string;
  created_at: string;
};

async function getUserCompanyAndIndustry(): Promise<{
  userId: string;
  companyId: string;
  industry: string;
}> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.company_id) throw new Error('No company found for user');

  const { data: company } = await supabase
    .from('companies')
    .select('industry')
    .eq('id', profile.company_id)
    .maybeSingle();

  if (!company?.industry) throw new Error('No industry found for company');

  return { userId: user.id, companyId: profile.company_id, industry: company.industry as string };
}

async function insertNotification(input: {
  user_id: string;
  type: any;
  title: string;
  message: string;
  related_id?: string | null;
  company_id?: string;
}) {
  const payload = {
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    message: input.message,
    related_id: input.related_id ?? null,
    company_id: input.company_id ?? null,
  };

  const { data, error } = await (supabase as any)
    .from('notifications')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getCompanyAdminRecipients(companyId: string): Promise<string[]> {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('company_id', companyId)
    .in('role', ['admin', 'manager', 'super_admin']);

  const ids = new Set((roles || []).map((r) => r.user_id));
  return Array.from(ids);
}

async function getSuperAdminRecipients(): Promise<string[]> {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'super_admin');

  return (roles || []).map((r) => r.user_id);
}

// Internal CRM: fetch all tickets across tenants (direct from support_tickets)
export function useInternalCrmTickets() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['internal_crm_tickets'],
    queryFn: async () => {
      if (!company || company.industry !== 'internal_crm') return [];

      const { data, error } = await (supabase as any)
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch internal CRM tickets:', error);
        return [];
      }

      return (data || []) as SupportTicket[];
    },
    retry: false,
    throwOnError: false,
  });
}

export function useClientSupportTickets() {
  const { data: profile } = useCurrentProfile();
  const queryKey = ['support_tickets', 'client', profile?.user_id];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SupportTicket[];
    },
    enabled: !!profile,
    retry: false,
    throwOnError: false,
  });
}

export function useSupportTicketMessages(ticketId?: string | null) {
  return useQuery({
    queryKey: ['support_ticket_messages', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from('support_ticket_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });
        if (error) {
          console.error('Failed to load support ticket messages:', error);
          return [];
        }
        return (data || []) as SupportTicketMessage[];
      } catch (e) {
        console.error('Failed to load support ticket messages (exception):', e);
        return [];
      }
    },
    enabled: !!ticketId,
    retry: false,
    throwOnError: false,
  });
}

export function useSupportTicketInternalNotes(ticketId?: string | null) {
  return useQuery({
    queryKey: ['support_ticket_internal_notes', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from('support_ticket_internal_notes')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });
        if (error) {
          console.error('Failed to load support ticket internal notes:', error);
          return [];
        }
        return (data || []) as SupportTicketInternalNote[];
      } catch (e) {
        console.error('Failed to load support ticket internal notes (exception):', e);
        return [];
      }
    },
    enabled: !!ticketId,
    retry: false,
    throwOnError: false,
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  const companyQuery = useCurrentCompany();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      priority,
      category,
    }: {
      title: string;
      description: string;
      priority: SupportTicketPriority;
      category: SupportTicketCategory;
    }) => {
      const { userId, companyId, industry } = await getUserCompanyAndIndustry();

      const { data: ticket, error } = await (supabase as any)
        .from('support_tickets')
        .insert({
          company_id: companyId,
          user_id: userId,
          industry_type: industry,
          title,
          description,
          status: 'open',
          priority,
          category,
          assigned_to: null,
        })
        .select()
        .single();

      if (error) throw error;

      const { error: msgError } = await (supabase as any).from('support_ticket_messages').insert({
        ticket_id: ticket.id,
        sender_type: 'client',
        sender_user_id: userId,
        message: description,
      });

      if (msgError) throw msgError;

      // Notify company admins/managers (and super admins as fallback)
      const recipients = new Set<string>();
      (await getCompanyAdminRecipients(companyId)).forEach((id) => recipients.add(id));
      (await getSuperAdminRecipients()).forEach((id) => recipients.add(id));

      const message = `New ticket: ${title}`;
      await Promise.all(
        Array.from(recipients).map((recipientId) =>
          insertNotification({
            user_id: recipientId,
            company_id: companyId,
            type: 'ticket_created',
            title: 'Support ticket created',
            message,
            related_id: ticket.id,
          }).catch(() => undefined)
        )
      );

      return ticket as SupportTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets', 'client'] });
      queryClient.invalidateQueries({ queryKey: ['support_ticket_messages'] });
      companyQuery.refetch?.();
    },
  });
}

export function useClientReplyToTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error('User not authenticated');

      const { data: ticket } = await (supabase as any)
        .from('support_tickets')
        .select('id, company_id, assigned_to')
        .eq('id', ticketId)
        .eq('user_id', user.id)
        .single();

      if (!ticket) throw new Error('Ticket not found');

      const { error: msgError } = await (supabase as any).from('support_ticket_messages').insert({
        ticket_id: ticketId,
        sender_type: 'client',
        sender_user_id: user.id,
        message,
      });
      if (msgError) throw msgError;

      // bump updated_at
      await (supabase as any)
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      // notify admins (assigned_to if present, else admins/managers)
      const recipients = new Set<string>();
      if (ticket.assigned_to) recipients.add(ticket.assigned_to);
      (await getCompanyAdminRecipients(ticket.company_id)).forEach((id) => recipients.add(id));

      await Promise.all(
        Array.from(recipients).map((recipientId) =>
          insertNotification({
            user_id: recipientId,
            company_id: ticket.company_id,
            type: 'ticket_replied',
            title: 'New reply received',
            message: `Client replied on ticket ${ticketId}`,
            related_id: ticketId,
          }).catch(() => undefined)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_ticket_messages'] });
      queryClient.invalidateQueries({ queryKey: ['support_tickets', 'client'] });
    },
  });
}

export function useAdminTickets(filters: {
  company_id?: string | null;
  industry_type?: string | null;
  priority?: SupportTicketPriority | null;
}) {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['support_tickets', 'admin', filters],
    queryFn: async () => {
      // For internal_crm tenant, fetch via Edge Function to reliably get all tenant tickets.
      if (company?.industry === 'internal_crm') {
        const { data, error } = await supabase.functions.invoke('admin-tickets', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        } as any);

        if (error) {
          console.error('admin-tickets function error:', error);
          return [];
        }

        const tickets = (data?.tickets || []) as SupportTicket[];
        // Apply filters client-side (function also supports query params; this keeps it simple)
        return tickets.filter((t) => {
          if (filters.company_id && t.company_id !== filters.company_id) return false;
          if (filters.industry_type && t.industry_type !== filters.industry_type) return false;
          if (filters.priority && t.priority !== filters.priority) return false;
          return true;
        });
      }

      let query = (supabase as any).from('support_tickets').select('*');
      if (filters.company_id) query = query.eq('company_id', filters.company_id);
      else if (company?.id) query = query; // company admin RLS handles scoping

      if (filters.industry_type) query = query.eq('industry_type', filters.industry_type);
      if (filters.priority) query = query.eq('priority', filters.priority);

      query = query.order('updated_at', { ascending: false });

      try {
        const { data, error } = await query;
        if (error) {
          console.error('Failed to load admin support tickets:', error);
          return [];
        }
        return (data || []) as SupportTicket[];
      } catch (e) {
        console.error('Failed to load admin support tickets (exception):', e);
        return [];
      }
    },
    enabled: true,
    retry: false,
    throwOnError: false,
  });
}

export function useAdminAssignTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, assignedTo }: { ticketId: string; assignedTo: string | null }) => {
      const { error } = await (supabase as any)
        .from('support_tickets')
        .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets', 'admin'] });
    },
  });
}

export function useAdminChangeTicketStatus() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: SupportTicketStatus }) => {
      // Internal CRM can change status via Edge Function (cross-tenant safe).
      if (company?.industry === 'internal_crm') {
        const { data, error } = await supabase.functions.invoke('tickets-status', {
          body: { ticket_id: ticketId, status },
        });
        if (error) throw error;
        return data;
      }

      // Fetch ticket owner for notification
      const { data: ticket } = await (supabase as any)
        .from('support_tickets')
        .select('id, user_id, company_id')
        .eq('id', ticketId)
        .single();

      if (!ticket) throw new Error('Ticket not found');

      const { error } = await (supabase as any)
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      await insertNotification({
        user_id: ticket.user_id,
        company_id: ticket.company_id,
        type: 'ticket_status_changed',
        title: 'Ticket status updated',
        message: `Your ticket status changed to: ${status}`,
        related_id: ticketId,
      }).catch(() => undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['support_tickets', 'client'] });
      queryClient.invalidateQueries({ queryKey: ['support_ticket_messages'] });
    },
  });
}

export function useAdminAddInternalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, note }: { ticketId: string; note: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await (supabase as any)
        .from('support_ticket_internal_notes')
        .insert({
          ticket_id: ticketId,
          admin_user_id: user.id,
          note,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_ticket_internal_notes'] });
    },
  });
}

export function useAdminReplyToTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error('User not authenticated');

      const { data: ticket } = await (supabase as any)
        .from('support_tickets')
        .select('id, user_id, company_id')
        .eq('id', ticketId)
        .single();

      if (!ticket) throw new Error('Ticket not found');

      const { error: msgError } = await (supabase as any).from('support_ticket_messages').insert({
        ticket_id: ticketId,
        sender_type: 'admin',
        sender_user_id: user.id,
        message,
      });
      if (msgError) throw msgError;

      await (supabase as any)
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      await insertNotification({
        user_id: ticket.user_id,
        company_id: ticket.company_id,
        type: 'ticket_replied',
        title: 'New support reply',
        message: `Admin replied on ticket ${ticketId}`,
        related_id: ticketId,
      }).catch(() => undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_ticket_messages'] });
      queryClient.invalidateQueries({ queryKey: ['support_tickets', 'admin'] });
      queryClient.invalidateQueries({ queryKey: ['support_tickets', 'client'] });
    },
  });
}

// Realtime (Supabase Realtime; used instead of Socket.IO due to lack of a Node/socket backend)
export function useSupportTicketsRealtimeClient() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();
  const { data: profile } = useCurrentProfile();

  useEffect(() => {
    if (!company || !profile?.user_id) return;

    let channel: any = null;

    // Tickets list updates
    channel = supabase
      .channel(`support_client_${company.id}_${profile.user_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${profile.user_id}`,
        } as any,
        () => {
          queryClient.invalidateQueries({ queryKey: ['support_tickets', 'client'] });
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`support_messages_client_${company.id}_${profile.user_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
        } as any,
        async (payload) => {
          if (!payload.new) return;
          const messageId = payload.new.id;

          // RLS ensures we only fetch messages the client is allowed to see
          const { data } = await (supabase as any)
            .from('support_ticket_messages')
            .select('*')
            .eq('id', messageId)
            .maybeSingle();

          if (data?.ticket_id) {
            queryClient.invalidateQueries({ queryKey: ['support_ticket_messages', data.ticket_id] });
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (messagesChannel) supabase.removeChannel(messagesChannel);
    };
  }, [company?.id, profile?.user_id, queryClient]);
}

export function useSupportTicketsRealtimeAdmin() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentProfile();

  useEffect(() => {
    if (!profile) return;

    // Super-admin will receive events for all supported tables that it can read
    const ticketsChannel = supabase
      .channel(`support_admin_tickets_${profile.user_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' } as any,
        () => {
          queryClient.invalidateQueries({ queryKey: ['support_tickets', 'admin'] });
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`support_admin_messages_${profile.user_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_ticket_messages' } as any,
        async (payload) => {
          if (!payload.new) return;
          const messageId = payload.new.id;
          const { data } = await (supabase as any)
            .from('support_ticket_messages')
            .select('*')
            .eq('id', messageId)
            .maybeSingle();

          if (data?.ticket_id) {
            queryClient.invalidateQueries({ queryKey: ['support_ticket_messages', data.ticket_id] });
          }
        }
      )
      .subscribe();

    const internalNotesChannel = supabase
      .channel(`support_admin_notes_${profile.user_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_ticket_internal_notes' } as any,
        () => {
          queryClient.invalidateQueries({ queryKey: ['support_ticket_internal_notes'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(internalNotesChannel);
    };
  }, [profile?.user_id, queryClient]);
}

