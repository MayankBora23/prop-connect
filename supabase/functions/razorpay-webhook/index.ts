/*
 * SETUP: Razorpay Dashboard → Settings → Webhooks → Add Webhook
 * URL: https://eovpgjvlywjppuefqtlw.supabase.co/functions/v1/razorpay-webhook
 * Secret: value of RAZORPAY_WEBHOOK_SECRET env var
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

    const { data: order, error: orderErr } = await supabase
      .from('razorpay_orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('status', 'pending')
      .eq('credits_added', false)
      .maybeSingle()

    if (orderErr) {
      console.error('Failed to fetch razorpay_orders:', orderErr)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    if (!order) {
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const now = new Date().toISOString()

    const orderType = (order.order_type as string) ?? 'wallet_recharge'

    if (orderType === 'telephony') {
      // Mark order completed (same pattern as wallet branch)
      const { error: updateOrderErr } = await supabase.from('razorpay_orders').update({
        status: 'completed',
        razorpay_payment_id,
        credits_added: true,
        updated_at: now,
      }).eq('id', order.id).eq('credits_added', false)

      if (updateOrderErr) {
        console.error('Failed to update razorpay_orders:', updateOrderErr)
        return new Response('ok', { status: 200, headers: corsHeaders })
      }

      // Read users_count from payment notes
      const usersCount = Math.max(2, Number(payment?.notes?.users_count ?? 2))
      const amountPaid = Number(order.amount_inr)

      // If active subscription exists, extend from its valid_till
      // If expired or new, start from now
      const { data: existing } = await supabase
        .from('company_telephony_subscriptions')
        .select('valid_till')
        .eq('company_id', order.company_id)
        .eq('status', 'active')
        .order('valid_till', { ascending: false })
        .limit(1)
        .maybeSingle()

      const baseDate = existing?.valid_till && new Date(existing.valid_till) > new Date()
        ? new Date(existing.valid_till)
        : new Date()

      const newValidTill = new Date(baseDate)
      newValidTill.setMonth(newValidTill.getMonth() + 3)

      const { error: insertSubErr } = await supabase.from('company_telephony_subscriptions').insert({
        company_id: order.company_id,
        users_count: usersCount,
        amount_paid: amountPaid,
        valid_from: baseDate.toISOString(),
        valid_till: newValidTill.toISOString(),
        razorpay_order_id: order.razorpay_order_id,
        razorpay_payment_id,
        status: 'active',
      })

      if (insertSubErr) {
        console.error('Failed to insert telephony subscription:', insertSubErr)
        return new Response('ok', { status: 200, headers: corsHeaders })
      }

      console.log('Telephony subscription activated:', {
        company_id: order.company_id,
        users_count: usersCount,
        valid_till: newValidTill.toISOString(),
      })

      // Insert a record into wallet_transactions so the customer sees this in transaction history
      const { error: txErr } = await supabase.from('wallet_transactions').insert({
        company_id: order.company_id,
        type: 'credit',
        provider: 'callerdesk',
        service_type: 'call',
        amount_inr: amountPaid,
        status: 'completed',
        notes: `CallerDesk Telephony — ${usersCount} users`,
        reference_id: razorpay_payment_id,
      })

      if (txErr) {
        console.error('Failed to insert wallet_transactions for telephony:', txErr)
      }

      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const { error: updateOrderErr } = await supabase
      .from('razorpay_orders')
      .update({
        status: 'completed',
        razorpay_payment_id,
        credits_added: true,
        updated_at: now,
      })
      .eq('id', order.id)
      .eq('credits_added', false)

    if (updateOrderErr) {
      console.error('Failed to update razorpay_orders:', updateOrderErr)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const creditAmount = Number(order.amount_inr) || amount_inr

    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('balance')
      .eq('company_id', order.company_id)
      .maybeSingle()

    if (walletErr || !wallet) {
      console.error('Wallet not found for company:', order.company_id, walletErr)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const newBalance = Number(wallet.balance) + creditAmount
    const { error: walletUpdateErr } = await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: now })
      .eq('company_id', order.company_id)

    if (walletUpdateErr) {
      console.error('Failed to update wallet balance:', walletUpdateErr)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const { error: txErr } = await supabase.from('wallet_transactions').insert({
      company_id: order.company_id,
      type: 'credit',
      amount_inr: creditAmount,
      status: 'completed',
      notes: 'Razorpay top-up',
      reference_id: razorpay_payment_id,
    })

    if (txErr) {
      console.error('Failed to insert wallet_transactions:', txErr)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    console.log('Wallet recharged:', {
      company_id: order.company_id,
      amount_inr: creditAmount,
      razorpay_payment_id,
    })

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('razorpay-webhook unexpected error:', e)
    return new Response('ok', { status: 200, headers: corsHeaders })
  }
})
