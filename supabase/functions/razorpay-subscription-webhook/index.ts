/*
 * SETUP: Razorpay Dashboard → Settings → Webhooks → Add New Webhook
 * URL: https://eovpgjvlywjppuefqtlw.supabase.co/functions/v1/razorpay-subscription-webhook
 * Secret: same RAZORPAY_WEBHOOK_SECRET already in Supabase secrets
 * Events: payment.captured, payment.failed
 */
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type BillingCycle = 'monthly' | 'quarterly' | 'yearly'

function periodEndFromCycle(cycle: BillingCycle, from: Date = new Date()): Date {
  const d = new Date(from)
  if (cycle === 'monthly') d.setDate(d.getDate() + 30)
  else if (cycle === 'quarterly') d.setDate(d.getDate() + 90)
  else d.setDate(d.getDate() + 365)
  return d
}

function planPriceForCycle(
  plan: { monthly_price: number; quarterly_price: number; yearly_price: number },
  cycle: BillingCycle
): number {
  if (cycle === 'monthly') return Number(plan.monthly_price)
  if (cycle === 'quarterly') return Number(plan.quarterly_price)
  return Number(plan.yearly_price)
}

async function recalcNextBillingAmount(
  supabase: ReturnType<typeof createClient>,
  company_id: string,
  billing_cycle: BillingCycle,
  plan_slug: string,
  plan_included_seats: number,
  extra_seat_rate: number,
  user_limit: number
): Promise<number | null> {
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('monthly_price, quarterly_price, yearly_price')
    .eq('slug', plan_slug)
    .maybeSingle()

  if (!plan) return null

  const monthlyMultiplier = billing_cycle === 'yearly' ? 12 : billing_cycle === 'quarterly' ? 3 : 1
  const planPrice = planPriceForCycle(plan, billing_cycle)
  const extraSeatsAtRenewal = Math.max(0, user_limit - plan_included_seats)
  const extraSeatsCost = extraSeatsAtRenewal * extra_seat_rate * monthlyMultiplier
  return Math.round(planPrice + extraSeatsCost)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const bodyText = await req.text()
    const signature = req.headers.get('x-razorpay-signature') || ''
    const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText))
    const expected = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    if (expected !== signature) {
      console.error('Invalid Razorpay signature')
      return new Response('Unauthorized', { status: 400, headers: corsHeaders })
    }

    const payload = JSON.parse(bodyText)
    const event = payload?.event as string | undefined

    if (event !== 'payment.captured') {
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const payment = payload?.payload?.payment?.entity
    if (!payment?.order_id || !payment?.id) {
      console.error('Missing payment entity in webhook payload')
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const razorpay_order_id = payment.order_id as string
    const razorpay_payment_id = payment.id as string
    const amount_inr = Number(payment.amount) / 100

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: paymentRow, error: paymentErr } = await supabase
      .from('subscription_payment_history')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (paymentErr) {
      console.error('Failed to fetch subscription_payment_history:', paymentErr)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    if (!paymentRow) {
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const nowIso = new Date().toISOString()
    const billing_cycle = paymentRow.billing_cycle as BillingCycle
    const plan_slug = paymentRow.plan_slug as string
    const company_id = paymentRow.company_id as string
    const payment_type = (paymentRow.payment_type as string | null) ?? 'plan'

    if (payment_type === 'seat_purchase') {
      const { error: updatePaymentErr } = await supabase
        .from('subscription_payment_history')
        .update({
          status: 'completed',
          razorpay_payment_id,
          paid_at: nowIso,
        })
        .eq('id', paymentRow.id)
        .eq('status', 'pending')

      if (updatePaymentErr) {
        console.error('Failed to update seat purchase payment:', updatePaymentErr)
        return new Response('ok', { status: 200, headers: corsHeaders })
      }

      const { data: sub } = await supabase
        .from('company_subscriptions')
        .select('plan_included_seats, extra_seat_rate, billing_cycle, plan_slug, purchased_extra_seats')
        .eq('company_id', company_id)
        .maybeSingle()

      const { data: company } = await supabase
        .from('companies')
        .select('user_limit')
        .eq('id', company_id)
        .single()

      const seatQty = Number(paymentRow.seat_quantity ?? 0)
      const currentLimit = Number(company?.user_limit ?? 0)
      const newUserLimit = currentLimit + seatQty

      const plan_included_seats = Number(sub?.plan_included_seats ?? 0)
      const extra_seat_rate = Number(sub?.extra_seat_rate ?? 499)
      const cycle = (sub?.billing_cycle ?? billing_cycle) as BillingCycle
      const newNextBillingAmount = await recalcNextBillingAmount(
        supabase,
        company_id,
        cycle,
        sub?.plan_slug ?? plan_slug,
        plan_included_seats,
        extra_seat_rate,
        newUserLimit
      )

      const purchasedExtra = Number(sub?.purchased_extra_seats ?? 0) + seatQty

      await supabase
        .from('company_subscriptions')
        .update({
          purchased_extra_seats: purchasedExtra,
          next_billing_amount: newNextBillingAmount,
          updated_at: nowIso,
        })
        .eq('company_id', company_id)

      await supabase
        .from('companies')
        .update({ user_limit: newUserLimit })
        .eq('id', company_id)

      await supabase
        .from('subscription_seat_purchases')
        .update({ status: 'completed' })
        .eq('subscription_payment_history_id', paymentRow.id)

      console.log('Seat purchase completed:', { company_id, seatQty, newUserLimit })
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    if (payment_type === 'renewal') {
      const newPeriodStart = paymentRow.period_start
        ? new Date(paymentRow.period_start as string)
        : new Date()
      const newPeriodEnd = paymentRow.period_end
        ? new Date(paymentRow.period_end as string)
        : periodEndFromCycle(billing_cycle, newPeriodStart)

      const { error: updatePaymentErr } = await supabase
        .from('subscription_payment_history')
        .update({
          status: 'completed',
          razorpay_payment_id,
          paid_at: nowIso,
        })
        .eq('id', paymentRow.id)
        .eq('status', 'pending')

      if (updatePaymentErr) {
        console.error('Failed to update renewal payment:', updatePaymentErr)
        return new Response('ok', { status: 200, headers: corsHeaders })
      }

      const { data: sub } = await supabase
        .from('company_subscriptions')
        .select('plan_included_seats, extra_seat_rate, plan_slug')
        .eq('company_id', company_id)
        .maybeSingle()

      const { data: company } = await supabase
        .from('companies')
        .select('user_limit')
        .eq('id', company_id)
        .single()

      const user_limit = Number(company?.user_limit ?? 0)
      const plan_included_seats = Number(sub?.plan_included_seats ?? 0)
      const extra_seat_rate = Number(sub?.extra_seat_rate ?? 499)
      const newNextBillingAmount = await recalcNextBillingAmount(
        supabase,
        company_id,
        billing_cycle,
        sub?.plan_slug ?? plan_slug,
        plan_included_seats,
        extra_seat_rate,
        user_limit
      )

      const periodStartIso = newPeriodStart.toISOString()
      const periodEndIso = newPeriodEnd.toISOString()

      await supabase
        .from('company_subscriptions')
        .update({
          status: 'active',
          current_period_start: periodStartIso,
          current_period_end: periodEndIso,
          next_billing_date: periodEndIso,
          next_billing_amount: newNextBillingAmount,
          amount_paid: amount_inr,
          razorpay_payment_id,
          updated_at: nowIso,
        })
        .eq('company_id', company_id)

      await supabase
        .from('companies')
        .update({ subscription_status: 'active' })
        .eq('id', company_id)

      console.log('Renewal completed:', { company_id, periodEndIso })
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    // plan purchase (default)
    const now = new Date()
    const period_start = nowIso
    const period_end = periodEndFromCycle(billing_cycle, now).toISOString()

    const { error: updatePaymentErr } = await supabase
      .from('subscription_payment_history')
      .update({
        status: 'completed',
        razorpay_payment_id,
        paid_at: nowIso,
        period_start,
        period_end,
      })
      .eq('id', paymentRow.id)
      .eq('status', 'pending')

    if (updatePaymentErr) {
      console.error('Failed to update subscription_payment_history:', updatePaymentErr)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const { data: plan, error: planErr } = await supabase
      .from('subscription_plans')
      .select('id, included_users, name, monthly_price, quarterly_price, yearly_price, extra_user_price_monthly')
      .eq('slug', plan_slug)
      .maybeSingle()

    if (planErr || !plan) {
      console.error('Plan not found for slug:', plan_slug, planErr)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const planPrice = planPriceForCycle(plan, billing_cycle)
    const extra_seat_rate = Math.round(Number(plan.extra_user_price_monthly ?? 499))
    const plan_included_seats = Number(plan.included_users)

    const { error: upsertSubErr } = await supabase.from('company_subscriptions').upsert(
      {
        company_id,
        plan_id: plan.id,
        plan_slug,
        billing_cycle,
        status: 'active',
        current_period_start: period_start,
        current_period_end: period_end,
        next_billing_date: period_end,
        amount_paid: amount_inr,
        razorpay_payment_id,
        plan_included_seats,
        purchased_extra_seats: 0,
        extra_seat_rate,
        next_billing_amount: Math.round(planPrice),
        updated_at: nowIso,
      },
      { onConflict: 'company_id' }
    )

    if (upsertSubErr) {
      console.error('Failed to upsert company_subscriptions:', upsertSubErr)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const { error: companyErr } = await supabase
      .from('companies')
      .update({
        subscription_status: 'active',
        user_limit: plan.included_users,
        trial_ends_at: null,
      })
      .eq('id', company_id)

    if (companyErr) {
      console.error('Failed to update companies:', companyErr)
    }

    console.log('Subscription activated:', {
      company_id,
      plan_slug,
      billing_cycle,
      period_end,
    })

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('razorpay-subscription-webhook unexpected error:', e)
    return new Response('ok', { status: 200, headers: corsHeaders })
  }
})
