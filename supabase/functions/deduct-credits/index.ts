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

interface DeductCreditsBody {
  company_id: string
  provider: WhatsappProvider
  service_type: 'whatsapp' | 'call'
  destination_country: string
  message_category: string | null
  usage_quantity: number
  call_duration_seconds?: number
  call_duration_minutes?: number
  reference_id: string
  twilio_actual_price?: number | null
  twilio_price_currency?: string | null
}

function pricingCountry(
  provider: WhatsappProvider,
  service_type: 'whatsapp' | 'call',
  destination_country: string
): string {
  if (service_type === 'whatsapp' && provider === 'meta' && ['AE', 'SA', 'QA'].includes(destination_country)) {
    return 'GCC'
  }
  return destination_country
}

serve(async (req: Request) => {
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

    const body = (await req.json()) as DeductCreditsBody
    const {
      company_id,
      provider,
      service_type,
      destination_country,
      message_category,
      usage_quantity,
      call_duration_seconds,
      call_duration_minutes,
      reference_id,
      twilio_actual_price,
      twilio_price_currency,
    } = body

    if (
      !company_id ||
      !provider ||
      !service_type ||
      !destination_country ||
      usage_quantity === undefined ||
      !reference_id
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'missing_fields',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (service_type === 'whatsapp' && !message_category) {
      return new Response(JSON.stringify({ success: false, reason: 'missing_fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Meta WhatsApp deduction is handled directly in send-whatsapp-message
    // with a flat platform fee read from service_pricing.
    // Routing Meta through here would cause double-deduction.
    if (provider === 'meta' && service_type === 'whatsapp') {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'meta_whatsapp_handled_in_send_function',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }


    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('reference_id', reference_id)
      .eq('type', 'debit')
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ success: false, reason: 'already_processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('whatsapp_provider, voice_provider')
      .eq('id', company_id)
      .maybeSingle()

    if (companyError || !company) {
      return new Response(JSON.stringify({ success: false, reason: 'company_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (service_type === 'call') {
      if (company.voice_provider !== provider) {
        return new Response(JSON.stringify({ success: false, reason: 'service_not_configured' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      const configured: WhatsappProvider = company.whatsapp_provider === 'meta' ? 'meta' : 'twilio'
      if (configured !== provider) {
        return new Response(JSON.stringify({ success: false, reason: 'service_not_configured' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const dest = pricingCountry(provider, service_type, destination_country)

    let priceRow: { client_price_inr: number } | null = null
    let priceError: any = null

    if (service_type === 'call') {
      const res = await supabase
        .from('service_pricing')
        .select('client_price_inr')
        .eq('provider', 'twilio')
        .eq('service_type', 'call')
        .eq('destination_country', dest)
        .eq('is_active', true)
        .maybeSingle()
      priceRow = res.data as any
      priceError = res.error
    } else {
      const res = await supabase
        .from('service_pricing')
        .select('client_price_inr')
        .eq('provider', provider)
        .eq('service_type', 'whatsapp')
        .eq('destination_country', dest)
        .eq('message_category', message_category)
        .eq('is_active', true)
        .maybeSingle()
      priceRow = res.data as any
      priceError = res.error
    }

    if (priceError || !priceRow) {
      return new Response(JSON.stringify({ success: false, reason: 'pricing_not_found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const unit = Number(priceRow.client_price_inr)
    const qty = Number(usage_quantity)
    const billedMinutes =
      service_type === 'call' ? Number(call_duration_minutes ?? usage_quantity ?? 0) : Number(usage_quantity ?? 0)
    const cost = unit * (service_type === 'call' ? billedMinutes : qty)

    const { data: walletBefore } = await supabase
      .from('wallets')
      .select('balance, min_balance_threshold')
      .eq('company_id', company_id)
      .maybeSingle()

    if (!walletBefore) {
      return new Response(JSON.stringify({ success: false, reason: 'wallet_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const balance = Number(walletBefore.balance)
    const min_threshold = Number(walletBefore.min_balance_threshold)

    if (balance < cost || balance < min_threshold) {
      return new Response(JSON.stringify({ success: false, reason: 'insufficient_balance' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: rpcBal, error: rpcErr } = await supabase.rpc('try_deduct_wallet_balance', {
      p_company_id: company_id,
      p_cost: cost,
    })

    if (rpcErr) {
      console.error('deduct-credits: rpc failed', rpcErr)
      return new Response(JSON.stringify({ success: false, reason: 'insufficient_balance' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (rpcBal === null || rpcBal === undefined) {
      return new Response(JSON.stringify({ success: false, reason: 'insufficient_balance' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const new_balance = Number(rpcBal)

    const { error: txErr } = await supabase.from('wallet_transactions').insert({
      company_id,
      type: 'debit',
      provider,
      service_type,
      amount_inr: cost,
      usage_quantity: service_type === 'call' ? billedMinutes : qty,
      destination_country: dest,
      message_category: service_type === 'call' ? null : message_category,
      reference_id,
      twilio_actual_price: twilio_actual_price ?? null,
      twilio_price_currency: twilio_price_currency ?? null,
      call_duration_seconds: service_type === 'call' ? (call_duration_seconds ?? null) : null,
      call_duration_minutes: service_type === 'call' ? (call_duration_minutes ?? billedMinutes ?? null) : null,
      status: 'completed',
    })

    if (txErr) {
      console.error('deduct-credits: wallet_transactions insert failed', txErr)
      return new Response(JSON.stringify({ success: false, reason: 'persist_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: logErr } = await supabase.from('usage_logs').insert({
      company_id,
      provider,
      service_type,
      usage_type: service_type === 'call' ? 'call' : 'message',
      quantity: service_type === 'call' ? billedMinutes : qty,
      destination_country: dest,
      message_category: service_type === 'call' ? null : message_category,
      credits_deducted: cost,
      twilio_actual_price: twilio_actual_price ?? null,
      reference_id,
      call_duration_seconds: service_type === 'call' ? (call_duration_seconds ?? null) : null,
      call_duration_minutes: service_type === 'call' ? (call_duration_minutes ?? billedMinutes ?? null) : null,
    })

    if (logErr) {
      console.error('deduct-credits: usage_logs insert failed', logErr)
    }

    return new Response(
      JSON.stringify({
        success: true,
        credits_deducted: cost,
        new_balance,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('deduct-credits error:', error)
    return new Response(JSON.stringify({ success: false, reason: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
