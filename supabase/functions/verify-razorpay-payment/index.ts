// @ts-ignore Deno URL import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, verifyPaymentSignature } from '../_shared/razorpay.ts'

declare const Deno: { env: { get: (key: string) => string | undefined } }

async function creditWalletForPayment(
  supabase: ReturnType<typeof createClient>,
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<{ success: boolean; balance?: number; alreadyCredited?: boolean }> {
  const { data: order, error: orderError } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle()

  if (orderError || !order) {
    return { success: false }
  }

  if (order.status === 'paid') {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('company_id', order.company_id)
      .maybeSingle()
    return { success: true, balance: Number(wallet?.balance ?? 0), alreadyCredited: true }
  }

  const { data: existingCredit } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('type', 'credit')
    .eq('reference_id', razorpayPaymentId)
    .maybeSingle()

  if (existingCredit) {
    await supabase
      .from('payment_orders')
      .update({
        status: 'paid',
        razorpay_payment_id: razorpayPaymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('company_id', order.company_id)
      .maybeSingle()
    return { success: true, balance: Number(wallet?.balance ?? 0), alreadyCredited: true }
  }

  const { data: newBalance, error: creditError } = await supabase.rpc('try_add_wallet_balance', {
    p_company_id: order.company_id,
    p_amount: order.amount_inr,
  })

  if (creditError || newBalance === null) {
    console.error('try_add_wallet_balance:', creditError)
    return { success: false }
  }

  await supabase.from('wallet_transactions').insert({
    company_id: order.company_id,
    type: 'credit',
    provider: 'razorpay',
    service_type: 'recharge',
    amount_inr: order.amount_inr,
    reference_id: razorpayPaymentId,
    status: 'completed',
    notes: `Wallet recharge via Razorpay order ${razorpayOrderId}`,
  })

  await supabase
    .from('payment_orders')
    .update({
      status: 'paid',
      razorpay_payment_id: razorpayPaymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  return { success: true, balance: Number(newBalance) }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
    } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json()) as {
      razorpay_order_id?: string
      razorpay_payment_id?: string
      razorpay_signature?: string
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const secret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
    const valid = await verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secret
    )

    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), {
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
      .select('company_id, user_id')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle()

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profile?.company_id !== order.company_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await creditWalletForPayment(supabase, razorpay_order_id, razorpay_payment_id)

    if (!result.success) {
      return new Response(JSON.stringify({ error: 'Failed to credit wallet' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        balance: result.balance,
        already_credited: result.alreadyCredited ?? false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('verify-razorpay-payment:', e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
