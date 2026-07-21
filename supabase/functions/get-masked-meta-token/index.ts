// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type MaskedMetaTokenResponse = {
  masked_access_token: string
  has_access_token: boolean
  meta_phone_number_id: string
  meta_waba_id: string
  meta_webhook_verify_token: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const authHeader = req.headers.get('Authorization')
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader ?? '' } },
  })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.company_id) {
    return new Response(JSON.stringify({ error: 'No company found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('meta_access_token, meta_phone_number_id, meta_waba_id, meta_webhook_verify_token')
    .eq('id', profile.company_id)
    .maybeSingle()

  const masked =
    company?.meta_access_token && company.meta_access_token.trim().length > 0
      ? `••••••••••••${company.meta_access_token.slice(-4)}`
      : ''

  const body: MaskedMetaTokenResponse = {
    masked_access_token: masked,
    has_access_token: !!masked,
    meta_phone_number_id: company?.meta_phone_number_id ?? '',
    meta_waba_id: company?.meta_waba_id ?? '',
    meta_webhook_verify_token: company?.meta_webhook_verify_token ?? '',
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
