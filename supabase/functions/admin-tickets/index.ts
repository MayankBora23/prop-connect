import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', user.id);

    const isSuperAdmin = (roles || []).some((r: any) => r.role === 'super_admin');

    // IMPORTANT: Some internal users may not have a user_roles row.
    // Always derive company_id from profiles.
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const userCompanyId = profile?.company_id ?? null;

    // If user belongs to internal_crm tenant, allow access to ALL tickets (platform support).
    let isInternalCrmStaff = false;
    if (userCompanyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('industry')
        .eq('id', userCompanyId)
        .maybeSingle();
      isInternalCrmStaff = company?.industry === 'internal_crm';
    }

    const url = new URL(req.url);
    const company_id = url.searchParams.get('company_id');
    const industry_type = url.searchParams.get('industry_type');
    const priority = url.searchParams.get('priority');

    let query = supabase.from('support_tickets').select('*');

    if (!isSuperAdmin && !isInternalCrmStaff) {
      // Non-super-admin can only see tickets for their own company.
      const myCompany = userCompanyId;
      if (!myCompany) return new Response(JSON.stringify({ tickets: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      query = query.eq('company_id', myCompany);
    } else if (company_id) {
      query = query.eq('company_id', company_id);
    }

    if (industry_type) query = query.eq('industry_type', industry_type);
    if (priority) query = query.eq('priority', priority);

    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;

    return new Response(JSON.stringify({ tickets: data || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('admin-tickets error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

