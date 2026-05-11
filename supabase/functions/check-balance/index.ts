// @ts-ignore Deno URL import (resolved in Supabase Edge runtime)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore Deno URL import (resolved in Supabase Edge runtime)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type WhatsappProvider = 'twilio' | 'meta'

interface CheckBalanceBody {
  company_id: string
  provider: WhatsappProvider
  service_type: 'whatsapp' | 'call'
  estimated_cost_inr: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = (await req.json()) as CheckBalanceBody
    const { company_id, provider, service_type, estimated_cost_inr } = body

    if (
      !company_id ||
      !provider ||
      !service_type ||
      estimated_cost_inr === undefined ||
      estimated_cost_inr === null
    ) {
      return new Response(
        JSON.stringify({ error: 'company_id, provider, service_type, and estimated_cost_inr are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('whatsapp_provider, voice_provider')
      .eq('id', company_id)
      .maybeSingle()

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: 'company_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (service_type === 'call') {
      if (company.voice_provider !== provider) {
        return new Response(JSON.stringify({ allowed: false, reason: 'service_not_configured' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      const configured: WhatsappProvider = company.whatsapp_provider === 'meta' ? 'meta' : 'twilio'
      if (configured !== provider) {
        return new Response(
          JSON.stringify({ allowed: false, reason: 'service_not_configured' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance, min_balance_threshold')
      .eq('company_id', company_id)
      .maybeSingle()

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: 'wallet_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const balance = Number(wallet.balance)
    const min_threshold = Number(wallet.min_balance_threshold)
    const cost = Number(estimated_cost_inr)

    if (balance < cost || balance < min_threshold) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'insufficient_balance',
          balance,
          min_threshold,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        balance,
        min_threshold,
        estimated_cost_inr: cost,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('check-balance error:', error)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
