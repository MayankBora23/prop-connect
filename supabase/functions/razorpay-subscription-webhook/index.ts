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

    const now = new Date()
    const nowIso = now.toISOString()
    const billing_cycle = paymentRow.billing_cycle as BillingCycle
    const plan_slug = paymentRow.plan_slug as string
    const company_id = paymentRow.company_id as string
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
      .select('id, included_users, name')
      .eq('slug', plan_slug)
      .maybeSingle()

    if (planErr || !plan) {
      console.error('Plan not found for slug:', plan_slug, planErr)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

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
