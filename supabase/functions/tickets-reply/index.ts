import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function getAuthUser(supabaseUrl: string, serviceRoleKey: string, req: Request) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
  const { data: authData, error } = await supabase.auth.getUser();
  if (error) throw error;
  return authData.user;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const user = await getAuthUser(supabaseUrl, serviceRoleKey, req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { ticket_id, message } = await req.json();
    if (!ticket_id || !message) {
      return new Response(JSON.stringify({ error: 'Missing ticket_id or message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id, company_id, user_id, assigned_to')
      .eq('id', ticket_id)
      .single();

    if (!ticket) return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404, headers: corsHeaders });

    const isClient = ticket.user_id === user.id;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', user.id);

    const isSuperAdmin = (roles || []).some((r: any) => r.role === 'super_admin');
    const isCompanyAdmin = (roles || []).some((r: any) => r.company_id === ticket.company_id && ['admin', 'manager'].includes(r.role));

    let sender_type: 'client' | 'admin';
    if (isClient) {
      sender_type = 'client';
    } else {
      if (!isSuperAdmin && !isCompanyAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      sender_type = 'admin';
    }

    const { data: msg, error: msgError } = await supabase.from('support_ticket_messages').insert({
      ticket_id,
      sender_type,
      sender_user_id: user.id,
      message,
    }).select().single();

    if (msgError) throw msgError;

    await supabase.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticket_id);

    // Notifications:
    if (sender_type === 'client') {
      const recipients = new Set<string>();
      if (ticket.assigned_to) recipients.add(ticket.assigned_to);

      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('company_id', ticket.company_id)
        .in('role', ['admin', 'manager', 'super_admin']);

      (adminRoles || []).forEach((r: any) => recipients.add(r.user_id));

      await Promise.all(
        Array.from(recipients).map((recipientId) =>
          supabase.from('notifications').insert({
            user_id: recipientId,
            company_id: ticket.company_id,
            type: 'ticket_replied',
            title: 'New reply received',
            message: `Client replied on ticket ${ticket_id}`,
            related_id: ticket_id,
          })
        )
      );
    } else {
      await supabase.from('notifications').insert({
        user_id: ticket.user_id,
        company_id: ticket.company_id,
        type: 'ticket_replied',
        title: 'New support reply',
        message: `Support replied on ticket ${ticket_id}`,
        related_id: ticket_id,
      });
    }

    return new Response(JSON.stringify({ message: msg }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('tickets-reply error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

