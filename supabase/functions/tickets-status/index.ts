import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
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
    if (req.method !== 'POST' && req.method !== 'PUT') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

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
    const { ticket_id, status } = await req.json();
    if (!ticket_id || !status) {
      return new Response(JSON.stringify({ error: 'Missing ticket_id or status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id, company_id, user_id')
      .eq('id', ticket_id)
      .single();

    if (!ticket) return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404, headers: corsHeaders });

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', user.id);

    const isSuperAdmin = (roles || []).some((r: any) => r.role === 'super_admin');
    const isCompanyAdmin = (roles || []).some((r: any) => r.company_id === ticket.company_id && ['admin', 'manager'].includes(r.role));

    // IMPORTANT: Some internal users may not have a user_roles row.
    // Always derive company_id from profiles.
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const userCompanyId = profile?.company_id ?? null;

    let isInternalCrmStaff = false;
    if (userCompanyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('industry')
        .eq('id', userCompanyId)
        .maybeSingle();
      isInternalCrmStaff = company?.industry === 'internal_crm';
    }

    // Allow internal_crm tenant users to manage statuses across tenants.
    if (!isSuperAdmin && !isCompanyAdmin && !isInternalCrmStaff) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: updated, error } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticket_id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('notifications').insert({
      user_id: ticket.user_id,
      company_id: ticket.company_id,
      type: 'ticket_status_changed',
      title: 'Ticket status updated',
      message: `Your ticket status changed to: ${status}`,
      related_id: ticket_id,
    });

    return new Response(JSON.stringify({ ticket: updated }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('tickets-status error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

