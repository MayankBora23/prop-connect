import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { AppRole } from './useCompany';
import { useCurrentCompany } from '@/hooks/useCompany';
import type {
  NewTicketInput,
  SupportMessage,
  SupportTicket,
  SupportTicketFilters,
  TicketStats,
  TicketStatus,
} from '@/types/support';

type AuthContext = {
  userId: string;
  profileId: string;
  companyId: string;
  role: AppRole | null;
  companyIndustry: string | undefined;
  /** Any user whose company is the internal CRM platform (sees all client tickets). */
  isInternalPlatform: boolean;
  /** internal_crm company + admin role (sidebar unread badge, strict admin tools). */
  isInternalCrmAdmin: boolean;
};

async function getAuthContext(): Promise<AuthContext | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.company_id) return null;

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('company_id', profile.company_id)
    .maybeSingle();

  const { data: company } = await supabase
    .from('companies')
    .select('industry')
    .eq('id', profile.company_id)
    .maybeSingle();

  const role = (roleData?.role ?? null) as AppRole | null;
  const companyIndustry = company?.industry as string | undefined;
  const isInternalPlatform = companyIndustry === 'internal_crm';
  const isInternalCrmAdmin =
    isInternalPlatform && (role === 'super_admin' || role === 'admin');

  return {
    userId: user.id,
    profileId: profile.id,
    companyId: profile.company_id,
    role,
    companyIndustry,
    isInternalPlatform,
    isInternalCrmAdmin,
  };
}

function escapeIlike(q: string): string {
  return q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

type ProfileBrief = {
  name?: string | null;
  email?: string | null;
  user_id?: string | null;
};

function mapTicketRow(row: Record<string, unknown>): SupportTicket {
  const companies = row.companies as { name?: string; email?: string | null } | null;
  const creator = row.creator as ProfileBrief | null;
  const assignee = row.assignee as { name?: string | null } | null;
  const { companies: _c, creator: _cr, assignee: _a, ...rest } = row;
  return {
    ...(rest as Omit<
      SupportTicket,
      | 'creator_name'
      | 'creator_email'
      | 'creator_user_id'
      | 'assignee_name'
      | 'company_name'
      | 'company_contact_email'
      | 'creator_role'
    >),
    company_name: companies?.name,
    company_contact_email: companies?.email ?? undefined,
    creator_name: creator?.name ?? undefined,
    creator_email: creator?.email ?? undefined,
    creator_user_id: creator?.user_id ?? undefined,
    assignee_name: assignee?.name ?? undefined,
  };
}

/** List query: avoid nested profile embeds (can return zero rows with RLS). Resolve names in a second query. */
export function useTickets(filters?: SupportTicketFilters) {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['support-tickets', companyId, filters ?? {}],
    enabled: !!companyId,
    staleTime: 30_000,
    queryFn: async () => {
      const ctx = await getAuthContext();
      if (!ctx) return [];

      const companyNameFilter = filters?.company?.trim() ?? '';
      const useCompanyNameFilter = !!companyNameFilter && !!filters?.company;

      let q = supabase.from('support_tickets').select(
        useCompanyNameFilter ? '*, companies!inner(name)' : '*'
      );

      if (!ctx.isInternalPlatform) {
        q = q.eq('company_id', ctx.companyId);
      }

      if (filters?.status) q = q.eq('status', filters.status as TicketStatus);
      if (filters?.priority) q = q.eq('priority', filters.priority as SupportTicket['priority']);
      if (filters?.category) q = q.eq('category', filters.category as SupportTicket['category']);

      if (filters?.search && filters.search.trim()) {
        const raw = filters.search.trim();
        const s = `%${escapeIlike(raw)}%`;
        q = q.or(`title.ilike.${s},description.ilike.${s}`);
      }

      if (useCompanyNameFilter) {
        const c = `%${companyNameFilter}%`;
        q = q.ilike('companies.name', c);
      }

      const { data, error } = await q.order('updated_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as unknown as Record<string, unknown>[];

      const profileIds = new Set<string>();
      for (const r of rows) {
        if (r.created_by) profileIds.add(String(r.created_by));
        if (r.assigned_to) profileIds.add(String(r.assigned_to));
      }

      const profileById = new Map<string, ProfileBrief & { id: string }>();
      if (profileIds.size > 0) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id,name,email,user_id')
          .in('id', [...profileIds]);

        if (!pErr && profs) {
          for (const p of profs as unknown as {
            id: string;
            name: string | null;
            email?: string | null;
            user_id: string;
          }[]) {
            profileById.set(p.id, {
              id: p.id,
              name: p.name?.trim() || 'Unknown',
              email: p.email ?? null,
              user_id: p.user_id,
            });
          }
        }
      }

      const companyById = new Map<string, { name: string; email: string | null }>();
      if (rows.length > 0) {
        const cids = [...new Set(rows.map((r) => String(r.company_id)).filter(Boolean))];
        if (cids.length > 0) {
          const { data: comps, error: cErr } = await supabase
            .from('companies')
            .select('id,name,email')
            .in('id', cids);
          if (!cErr && comps) {
            for (const c of comps as { id: string; name: string; email?: string | null }[]) {
              companyById.set(c.id, { name: c.name, email: c.email ?? null });
            }
          }
        }
      }

      return rows.map((row) => {
        const embeddedCompany = row.companies as { name?: string; email?: string | null } | null | undefined;
        const comp = companyById.get(String(row.company_id));
        const companyName = embeddedCompany?.name ?? comp?.name;
        const companyEmail = embeddedCompany?.email ?? comp?.email ?? undefined;

        const creatorP = profileById.get(String(row.created_by));
        const assigneeP = row.assigned_to ? profileById.get(String(row.assigned_to)) : undefined;

        return mapTicketRow({
          ...row,
          companies: companyName
            ? { name: companyName, email: companyEmail ?? null }
            : null,
          creator: creatorP
            ? { name: creatorP.name, email: creatorP.email, user_id: creatorP.user_id }
            : null,
          assignee: row.assigned_to
            ? { name: assigneeP?.name ?? null }
            : null,
        });
      });
    },
  });
}

export function useTicket(ticketId: string) {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['support-ticket', ticketId, companyId],
    enabled: !!ticketId && !!companyId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();

      if (error) throw error;
      if (!row) return null;

      const r = row as Record<string, unknown>;
      const ids = [r.created_by, r.assigned_to].filter(Boolean).map(String);

      const profileById = new Map<string, ProfileBrief>();
      if (ids.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id,name,email,user_id')
          .in('id', ids);
        if (!pErr && profs) {
          for (const p of profs as unknown as {
            id: string;
            name: string | null;
            email?: string | null;
            user_id: string;
          }[]) {
            profileById.set(p.id, {
              name: p.name?.trim() || 'Unknown',
              email: p.email ?? null,
              user_id: p.user_id,
            });
          }
        }
      }

      let companyBlock: { name: string; email?: string | null } | null = null;
      if (r.company_id) {
        const { data: comp } = await supabase
          .from('companies')
          .select('name,email')
          .eq('id', String(r.company_id))
          .maybeSingle();
        const c = comp as { name?: string; email?: string | null } | null;
        if (c?.name) companyBlock = { name: c.name, email: c.email ?? null };
      }

      const cr = profileById.get(String(r.created_by));
      const asg = r.assigned_to ? profileById.get(String(r.assigned_to)) : undefined;

      return mapTicketRow({
        ...r,
        companies: companyBlock,
        creator: cr ? { name: cr.name, email: cr.email, user_id: cr.user_id } : null,
        assignee: r.assigned_to ? { name: asg?.name ?? null } : null,
      });
    },
  });
}

export function useTicketMessages(ticketId: string, isAdmin: boolean) {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['support-messages', ticketId, isAdmin, companyId],
    enabled: !!ticketId && !!companyId,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (!isAdmin) {
        q = q.eq('is_internal', false);
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data || []) as unknown as Record<string, unknown>[];
      const senderIds = [...new Set(rows.map((m) => String(m.sender_id)).filter(Boolean))];
      const nameById = new Map<string, string>();
      if (senderIds.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id,name')
          .in('id', senderIds);
        if (!pErr && profs) {
          for (const p of profs as unknown as { id: string; name: string | null }[]) {
            nameById.set(p.id, p.name?.trim() || 'Unknown');
          }
        }
      }

      return rows.map((row) => {
        const senderName = nameById.get(String(row.sender_id));
        return {
          ...(row as unknown as SupportMessage),
          sender_name: senderName,
        };
      });
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewTicketInput) => {
      const ctx = await getAuthContext();
      if (!ctx) throw new Error('Not authenticated');

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('industry')
        .eq('id', ctx.companyId)
        .single();

      if (companyError) throw companyError;
      const industryType = String(company?.industry ?? 'real_estate');

      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          company_id: ctx.companyId,
          created_by: ctx.profileId,
          industry_type: industryType,
          title: input.title,
          description: input.description,
          priority: input.priority,
          category: input.category,
          tags: input.tags,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      const { error: msgError } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        company_id: ctx.companyId,
        sender_id: ctx.profileId,
        sender_type: 'client',
        message: input.description,
        is_internal: false,
      });

      if (msgError) throw msgError;

      const { data: adminProfiles, error: adminsError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('company_id', ctx.companyId)
        .in('role', ['super_admin', 'admin']);

      if (adminsError) throw adminsError;

      const ticketNumber = ticket.ticket_number as number;
      const notifRows = (adminProfiles || [])
        .filter((r) => r.user_id)
        .map((r) => ({
          user_id: r.user_id as string,
          type: 'system_alert' as const,
          title: `New Support Ticket #${ticketNumber}`,
          message: input.title,
          related_id: ticket.id,
          company_id: ctx.companyId,
          read: false,
        }));

      if (notifRows.length > 0) {
        const { error: notifError } = await (supabase as any).from('notifications').insert(notifRows);
        if (notifError) throw notifError;
      }

      return ticket as SupportTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-stats'] });
    },
  });
}

export function useReplyToTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      ticket_id: string;
      message: string;
      is_internal: boolean;
      sender_type: 'client' | 'admin';
    }) => {
      const ctx = await getAuthContext();
      if (!ctx) throw new Error('Not authenticated');

      const { data: ticket, error: ticketFetchError } = await supabase
        .from('support_tickets')
        .select('id, company_id, created_by, ticket_number')
        .eq('id', args.ticket_id)
        .single();

      if (ticketFetchError) throw ticketFetchError;

      const { error: insertError } = await supabase.from('support_messages').insert({
        ticket_id: args.ticket_id,
        company_id: ticket.company_id,
        sender_id: ctx.profileId,
        sender_type: args.sender_type,
        message: args.message,
        is_internal: args.is_internal,
      });

      if (insertError) throw insertError;

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (args.sender_type === 'admin') {
        updates.is_read_by_client = false;
      } else {
        updates.is_read_by_admin = false;
      }

      const { error: updError } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', args.ticket_id);

      if (updError) throw updError;

      const ticketNumber = ticket.ticket_number as number;
      const title = `New reply on Ticket #${ticketNumber}`;

      if (!args.is_internal) {
        if (args.sender_type === 'admin') {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('id', ticket.created_by)
            .maybeSingle();

          if (creatorProfile?.user_id) {
            const { error: nErr } = await (supabase as any).from('notifications').insert({
              user_id: creatorProfile.user_id,
              type: 'system_alert',
              title,
              message: args.message.slice(0, 200),
              related_id: args.ticket_id,
              company_id: ticket.company_id,
              read: false,
            });
            if (nErr) throw nErr;
          }
        } else {
          const { data: adminRoles, error: arErr } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('company_id', ticket.company_id)
            .in('role', ['super_admin', 'admin']);

          if (arErr) throw arErr;

          const notifRows = (adminRoles || [])
            .filter((r) => r.user_id && r.user_id !== ctx.userId)
            .map((r) => ({
              user_id: r.user_id as string,
              type: 'system_alert' as const,
              title,
              message: args.message.slice(0, 200),
              related_id: args.ticket_id,
              company_id: ticket.company_id,
              read: false,
            }));

          if (notifRows.length > 0) {
            const { error: nErr } = await (supabase as any).from('notifications').insert(notifRows);
            if (nErr) throw nErr;
          }
        }
      }

      return { ticket_id: args.ticket_id };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['support-messages', variables.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', variables.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['support-stats'] });
    },
  });
}

function statusLabel(s: string): string {
  switch (s) {
    case 'open':
      return 'Open';
    case 'in_progress':
      return 'In Progress';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
    default:
      return s;
  }
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticket_id, new_status }: { ticket_id: string; new_status: TicketStatus }) => {
      const ctx = await getAuthContext();
      if (!ctx) throw new Error('Not authenticated');

      const { data: ticket, error: tErr } = await supabase
        .from('support_tickets')
        .select('id, company_id, created_by, ticket_number')
        .eq('id', ticket_id)
        .single();

      if (tErr) throw tErr;

      const { error: updErr } = await supabase
        .from('support_tickets')
        .update({ status: new_status })
        .eq('id', ticket_id);

      if (updErr) throw updErr;

      const body = `Status updated to ${statusLabel(new_status)}`;

      const { error: msgErr } = await supabase.from('support_messages').insert({
        ticket_id,
        company_id: ticket.company_id,
        sender_id: ctx.profileId,
        sender_type: 'admin',
        message: body,
        is_internal: false,
      });

      if (msgErr) throw msgErr;

      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', ticket.created_by)
        .maybeSingle();

      if (creatorProfile?.user_id) {
        const { error: nErr } = await (supabase as any).from('notifications').insert({
          user_id: creatorProfile.user_id,
          type: 'system_alert',
          title: `Ticket #${ticket.ticket_number} updated`,
          message: body,
          related_id: ticket_id,
          company_id: ticket.company_id,
          read: false,
        });
        if (nErr) throw nErr;
      }

      return { ticket_id };
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', v.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['support-messages', v.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['support-stats'] });
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticket_id, assigned_to }: { ticket_id: string; assigned_to: string | null }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ assigned_to })
        .eq('id', ticket_id);

      if (error) throw error;
      return { ticket_id };
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', v.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

export function useMarkTicketRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticket_id, as_admin }: { ticket_id: string; as_admin: boolean }) => {
      const patch = as_admin ? { is_read_by_admin: true } : { is_read_by_client: true };
      const { error } = await supabase.from('support_tickets').update(patch).eq('id', ticket_id);
      if (error) throw error;
      return { ticket_id };
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', v.ticket_id] });
    },
  });
}

export function useTicketStats() {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['support-stats', companyId],
    enabled: !!companyId,
    staleTime: 30_000,
    queryFn: async () => {
      const ctx = await getAuthContext();
      if (!ctx) {
        return {
          open: 0,
          in_progress: 0,
          resolved: 0,
          closed: 0,
          total: 0,
          unread_by_admin: 0,
        } satisfies TicketStats;
      }

      let q = supabase.from('support_tickets').select('status, is_read_by_admin');

      if (!ctx.isInternalPlatform) {
        q = q.eq('company_id', ctx.companyId);
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = data || [];
      const stats: TicketStats = {
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
        total: rows.length,
        unread_by_admin: 0,
      };

      for (const r of rows) {
        const row = r as { status: TicketStatus; is_read_by_admin: boolean };
        if (row.status === 'open') stats.open += 1;
        else if (row.status === 'in_progress') stats.in_progress += 1;
        else if (row.status === 'resolved') stats.resolved += 1;
        else if (row.status === 'closed') stats.closed += 1;
        if (row.is_read_by_admin === false) stats.unread_by_admin += 1;
      }

      return stats;
    },
  });
}

export function useTeamMembers(
  companyIdOverride?: string | null,
  queryOptions?: { enabled?: boolean }
) {
  const { data: company } = useCurrentCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['support-team-members', companyIdOverride ?? 'current'],
    enabled: queryOptions?.enabled !== false && !!(companyIdOverride ?? companyId),
    staleTime: 30_000,
    queryFn: async () => {
      const ctx = await getAuthContext();
      if (!ctx) return [];

      const targetCompanyId = companyIdOverride ?? ctx.companyId;

      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, name, user_id')
        .eq('company_id', targetCompanyId)
        .order('name', { ascending: true });

      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('company_id', targetCompanyId);

      if (rErr) throw rErr;

      const roleMap = new Map((roles || []).map((x) => [x.user_id as string, x.role as string]));

      return (profiles || [])
        .map((p) => ({
          id: p.id as string,
          name: (p.name as string) || 'Unknown',
          role: roleMap.get(p.user_id as string) || '',
        }))
        .filter((m) => ['super_admin', 'admin', 'manager'].includes(m.role));
    },
  });
}

export function useTicketRealtime(ticketId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`support-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-messages', ticketId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, queryClient]);
}
