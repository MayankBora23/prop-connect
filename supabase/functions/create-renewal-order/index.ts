// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type BillingCycle = 'monthly' | 'quarterly' | 'yearly'

function periodEndFromCycle(cycle: BillingCycle, from: Date): Date {
  const d = new Date(from)
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

    const body = (await req.json().catch(() => ({}))) as { company_id?: string }
    const company_id = body.company_id ?? ''

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing company_id' }),
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

    const { data: sub, error: subErr } = await supabase
      .from('company_subscriptions')
      .select(
        'plan_slug, billing_cycle, plan_included_seats, extra_seat_rate, next_billing_amount, current_period_end, status'
      )
      .eq('company_id', company_id)
      .maybeSingle()

    if (subErr || !sub) {
      return new Response(
        JSON.stringify({ error: 'No subscription found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const billing_cycle = (sub.billing_cycle ?? 'monthly') as BillingCycle
    if (!['monthly', 'quarterly', 'yearly'].includes(billing_cycle)) {
      return new Response(
        JSON.stringify({ error: 'Invalid billing cycle on subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!sub.current_period_end) {
      return new Response(
        JSON.stringify({ error: 'Billing period not set' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .select('user_limit')
      .eq('id', company_id)
      .single()

    if (companyErr || !company) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: plan, error: planErr } = await supabase
      .from('subscription_plans')
      .select('monthly_price, quarterly_price, yearly_price')
      .eq('slug', sub.plan_slug)
      .eq('is_active', true)
      .maybeSingle()

    if (planErr || !plan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const monthlyMultiplier = billing_cycle === 'yearly' ? 12 : billing_cycle === 'quarterly' ? 3 : 1
    const plan_included_seats = Number(sub.plan_included_seats ?? 0)
    const extra_seat_rate = Number(sub.extra_seat_rate ?? 499)
    const user_limit = Number(company.user_limit ?? plan_included_seats)
    const extraSeatsAtRenewal = Math.max(0, user_limit - plan_included_seats)
    const extraSeatsCost = extraSeatsAtRenewal * extra_seat_rate * monthlyMultiplier

    const planBasePrice =
      billing_cycle === 'monthly'
        ? Number(plan.monthly_price)
        : billing_cycle === 'quarterly'
          ? Number(plan.quarterly_price)
          : Number(plan.yearly_price)

    let totalRenewalAmount =
      sub.next_billing_amount != null && Number(sub.next_billing_amount) > 0
        ? Number(sub.next_billing_amount)
        : Math.round(planBasePrice + extraSeatsCost)

    if (!Number.isFinite(totalRenewalAmount) || totalRenewalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid renewal amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
    if (!keyId || !keySecret) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway is not configured. Set Razorpay secrets on the server.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const period_start = new Date(sub.current_period_end)
    const period_end = periodEndFromCycle(billing_cycle, period_start)
    const amount_paise = Math.round(totalRenewalAmount * 100)
    const receipt = `ren_${company_id.replace(/-/g, '').slice(0, 8)}_${Date.now()}`.slice(0, 40)

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
          purpose: 'renewal',
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
      console.error('Razorpay renewal order failed:', order)
      return new Response(
        JSON.stringify({ error: rzMsg, detail: order }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error: insertErr } = await supabase.from('subscription_payment_history').insert({
      company_id,
      plan_slug: sub.plan_slug,
      billing_cycle,
      amount_inr: totalRenewalAmount,
      razorpay_order_id: order.id,
      status: 'pending',
      payment_type: 'renewal',
      seat_quantity: 0,
      period_start: period_start.toISOString(),
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
        price_inr: totalRenewalAmount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('create-renewal-order unexpected error:', e)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
