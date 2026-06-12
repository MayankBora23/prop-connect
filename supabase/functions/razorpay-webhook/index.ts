// @ts-ignore Deno URL import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, verifyWebhookSignature } from '../_shared/razorpay.ts'

declare const Deno: { env: { get: (key: string) => string | undefined } }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const rawBody = await req.text()
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
    const signature = req.headers.get('x-razorpay-signature') ?? ''

    if (webhookSecret) {
      const valid = await verifyWebhookSignature(rawBody, signature, webhookSecret)
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const payload = JSON.parse(rawBody) as {
      event?: string
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string; status?: string } }
      }
    }

    if (payload.event !== 'payment.captured') {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payment = payload.payload?.payment?.entity
    const orderId = payment?.order_id
    const paymentId = payment?.id

    if (!orderId || !paymentId) {
      return new Response(JSON.stringify({ error: 'Missing payment data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: order } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('razorpay_order_id', orderId)
      .maybeSingle()

    if (!order || order.status === 'paid') {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: existingCredit } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('type', 'credit')
      .eq('reference_id', paymentId)
      .maybeSingle()

    if (!existingCredit) {
      await supabase.rpc('try_add_wallet_balance', {
        p_company_id: order.company_id,
        p_amount: order.amount_inr,
      })

      await supabase.from('wallet_transactions').insert({
        company_id: order.company_id,
        type: 'credit',
        provider: 'razorpay',
        service_type: 'recharge',
        amount_inr: order.amount_inr,
        reference_id: paymentId,
        status: 'completed',
        notes: `Wallet recharge (webhook) order ${orderId}`,
      })
    }

    await supabase
      .from('payment_orders')
      .update({
        status: 'paid',
        razorpay_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('razorpay-webhook:', e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
