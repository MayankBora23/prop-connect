// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type BillingCycle = 'monthly' | 'quarterly' | 'yearly'

function periodEndFromCycle(cycle: BillingCycle): Date {
  const d = new Date()
  if (cycle === 'monthly') d.setDate(d.getDate() + 30)
  else if (cycle === 'quarterly') d.setDate(d.getDate() + 90)
  else d.setDate(d.getDate() + 365)
  return d
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const authHeader = req.headers.get('authorization') || ''
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await authed.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const body = (await req.json().catch(() => ({}))) as {
      company_id?: string
      plan_slug?: string
      billing_cycle?: BillingCycle
    }
    const company_id = body.company_id ?? ''
    const plan_slug = body.plan_slug ?? ''
    const billing_cycle = body.billing_cycle

    if (!company_id || !plan_slug || !billing_cycle) {
      return new Response(
        JSON.stringify({ error: 'Missing company_id, plan_slug, or billing_cycle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['monthly', 'quarterly', 'yearly'].includes(billing_cycle)) {
      return new Response(
        JSON.stringify({ error: 'Invalid billing_cycle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (profileErr || !profile?.company_id || profile.company_id !== company_id) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    const { data: plan, error: planErr } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', plan_slug)
      .eq('is_active', true)
      .maybeSingle()

    if (planErr || !plan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (plan.is_custom) {
      return new Response(
        JSON.stringify({ error: 'Enterprise plan requires contacting sales' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const price =
      billing_cycle === 'monthly'
        ? Number(plan.monthly_price)
        : billing_cycle === 'quarterly'
          ? Number(plan.quarterly_price)
          : Number(plan.yearly_price)

    if (!Number.isFinite(price) || price <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan price' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
    if (!keyId || !keySecret) {
      console.error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET')
      return new Response(
        JSON.stringify({
          error: 'Payment gateway is not configured. Set Razorpay secrets on the server.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const amount_paise = Math.round(price * 100)
    const period_end = periodEndFromCycle(billing_cycle)
    const receipt = `sub_${company_id.replace(/-/g, '').slice(0, 8)}_${Date.now()}`.slice(0, 40)

    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: amount_paise,
        currency: 'INR',
        receipt,
        notes: {
          company_id: String(company_id),
          plan_slug: String(plan_slug),
          billing_cycle: String(billing_cycle),
        },
      }),
    })
    const order = await razorpayRes.json()
    if (!razorpayRes.ok) {
      const rzMsg =
        typeof order?.error?.description === 'string'
          ? order.error.description
          : 'Failed to create payment order'
      console.error('Razorpay subscription order failed:', order)
      return new Response(
        JSON.stringify({ error: rzMsg, detail: order }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const now = new Date().toISOString()
    const { error: insertErr } = await supabase.from('subscription_payment_history').insert({
      company_id,
      plan_slug,
      billing_cycle,
      amount_inr: price,
      razorpay_order_id: order.id,
      status: 'pending',
      period_start: now,
      period_end: period_end.toISOString(),
    })

    if (insertErr) {
      console.error('Failed to insert subscription_payment_history:', insertErr)
      return new Response(
        JSON.stringify({ error: 'Failed to save order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount: amount_paise,
        currency: 'INR',
        key_id: keyId,
        plan_name: plan.name,
        billing_cycle,
        price_inr: price,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('create-subscription-order unexpected error:', e)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
