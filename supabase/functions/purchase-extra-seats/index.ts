// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type BillingCycle = 'monthly' | 'quarterly' | 'yearly'

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
      quantity?: number
      cycle_type?: BillingCycle
    }
    const company_id = body.company_id ?? ''
    const quantity = Math.floor(Number(body.quantity ?? 0))
    const cycle_type = body.cycle_type

    if (!company_id || !quantity || quantity < 1 || quantity > 50) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid company_id or quantity (1–50)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!cycle_type || !['monthly', 'quarterly', 'yearly'].includes(cycle_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid cycle_type' }),
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
        'extra_seat_rate, current_period_start, current_period_end, plan_included_seats, billing_cycle, plan_slug, status'
      )
      .eq('company_id', company_id)
      .maybeSingle()

    if (subErr || !sub) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (sub.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Subscription must be active to purchase seats' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!sub.current_period_end) {
      return new Response(
        JSON.stringify({ error: 'Billing period not set' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const extra_seat_rate = Number(sub.extra_seat_rate ?? 499)
    const monthlyMultiplier = cycle_type === 'yearly' ? 12 : cycle_type === 'quarterly' ? 3 : 1
    const cycleDays = cycle_type === 'yearly' ? 365 : cycle_type === 'quarterly' ? 90 : 30
    const toISTMidnight = (date: Date) => {
      const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
      ist.setHours(0, 0, 0, 0)
      return ist
    }
    const endIST = toISTMidnight(new Date(sub.current_period_end))
    const todayIST = toISTMidnight(new Date())
    const remainingDays = Math.max(1, Math.round(
      (endIST.getTime() - todayIST.getTime()) / 86400000
    ))
    const fullSeatCost = extra_seat_rate * monthlyMultiplier * quantity
    const proratedAmount = Math.round(fullSeatCost * (remainingDays / cycleDays))

    if (proratedAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid prorated amount' }),
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

    const amount_paise = Math.round(proratedAmount * 100)
    const receipt = `seat_${company_id.replace(/-/g, '').slice(0, 8)}_${Date.now()}`.slice(0, 40)

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
          purpose: 'seat_purchase',
          quantity: String(quantity),
        },
      }),
    })
    const order = await razorpayRes.json()
    if (!razorpayRes.ok) {
      const rzMsg =
        typeof order?.error?.description === 'string'
          ? order.error.description
          : 'Failed to create payment order'
      console.error('Razorpay seat order failed:', order)
      return new Response(
        JSON.stringify({ error: rzMsg, detail: order }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: paymentRow, error: insertErr } = await supabase
      .from('subscription_payment_history')
      .insert({
        company_id,
        plan_slug: sub.plan_slug,
        billing_cycle: sub.billing_cycle ?? cycle_type,
        amount_inr: proratedAmount,
        razorpay_order_id: order.id,
        status: 'pending',
        payment_type: 'seat_purchase',
        seat_quantity: quantity,
        period_start: sub.current_period_start,
        period_end: sub.current_period_end,
      })
      .select('id')
      .single()

    if (insertErr || !paymentRow) {
      console.error('Failed to insert subscription_payment_history:', insertErr)
      return new Response(
        JSON.stringify({ error: 'Failed to save order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error: seatInsertErr } = await supabase.from('subscription_seat_purchases').insert({
      company_id,
      subscription_payment_history_id: paymentRow.id,
      quantity,
      prorated_amount: proratedAmount,
      full_amount: fullSeatCost,
      remaining_days: remainingDays,
      cycle_days: cycleDays,
      status: 'pending',
    })

    if (seatInsertErr) {
      console.error('Failed to insert subscription_seat_purchases:', seatInsertErr)
      return new Response(
        JSON.stringify({ error: 'Failed to save seat purchase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount: amount_paise,
        currency: 'INR',
        key_id: keyId,
        price_inr: proratedAmount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('purchase-extra-seats unexpected error:', e)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
