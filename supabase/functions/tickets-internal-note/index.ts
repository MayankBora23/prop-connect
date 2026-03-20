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
    const { ticket_id, note } = await req.json();

    if (!ticket_id || !note) {
      return new Response(JSON.stringify({ error: 'Missing ticket_id or note' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id, company_id')
      .eq('id', ticket_id)
      .single();

    if (!ticket) return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404, headers: corsHeaders });

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', user.id);

    const isSuperAdmin = (roles || []).some((r: any) => r.role === 'super_admin');
    const isCompanyAdmin = (roles || []).some((r: any) => r.company_id === ticket.company_id && ['admin', 'manager'].includes(r.role));

    if (!isSuperAdmin && !isCompanyAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase.from('support_ticket_internal_notes').insert({
      ticket_id,
      admin_user_id: user.id,
      note,
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ internal_note: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('tickets-internal-note error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

