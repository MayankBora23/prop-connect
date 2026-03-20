import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

async function getUserCompanyAndIndustry(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile?.company_id) throw new Error('User has no company');

  const { data: company } = await supabase
    .from('companies')
    .select('industry')
    .eq('id', profile.company_id)
    .maybeSingle();

  if (!company?.industry) throw new Error('Company industry not found');

  return { companyId: profile.company_id, industry: company.industry as string };
}

async function getCompanyAdminRecipients(supabase: any, companyId: string): Promise<string[]> {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('company_id', companyId)
    .in('role', ['admin', 'manager', 'super_admin']);

  return Array.from(new Set((roles || []).map((r: any) => r.user_id)));
}

async function getSuperAdminRecipients(supabase: any): Promise<string[]> {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'super_admin');
  return (roles || []).map((r: any) => r.user_id);
}

async function insertNotification(supabase: any, input: {
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_id?: string | null;
  company_id?: string | null;
}) {
  await supabase.from('notifications').insert({
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    message: input.message,
    related_id: input.related_id ?? null,
    company_id: input.company_id ?? null,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const user = await getAuthUser(supabaseUrl, serviceRoleKey, req);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === 'POST') {
      const { title, description, priority, category } = await req.json();
      if (!title || !description || !priority || !category) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { companyId, industry } = await getUserCompanyAndIndustry(supabase, user.id);

      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          company_id: companyId,
          user_id: user.id,
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

      if (ticketError) throw ticketError;

      const { error: msgError } = await supabase.from('support_ticket_messages').insert({
        ticket_id: ticket.id,
        sender_type: 'client',
        sender_user_id: user.id,
        message: description,
      });
      if (msgError) throw msgError;

      // Notify admins in the company + super admins
      const recipients = new Set<string>();
      (await getCompanyAdminRecipients(supabase, companyId)).forEach((id) => recipients.add(id));
      (await getSuperAdminRecipients(supabase)).forEach((id) => recipients.add(id));

      await Promise.all(
        Array.from(recipients).map((recipientId) =>
          insertNotification(supabase, {
            user_id: recipientId,
            company_id: companyId,
            type: 'ticket_created',
            title: 'Support ticket created',
            message: `New ticket: ${title}`,
            related_id: ticket.id,
          })
        )
      );

      return new Response(JSON.stringify({ ticket }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      const { companyId } = await getUserCompanyAndIndustry(supabase, user.id);

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ tickets: data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('tickets error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

