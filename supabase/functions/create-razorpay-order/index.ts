// @ts-ignore Deno URL import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, createRazorpayOrder } from '../_shared/razorpay.ts'

declare const Deno: { env: { get: (key: string) => string | undefined } }

const MIN_AMOUNT_INR = 10
const MAX_AMOUNT_INR = 500000

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
      error: userError,
    } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { amount_inr } = (await req.json()) as { amount_inr?: number }
    const amount = Number(amount_inr)
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT_INR || amount > MAX_AMOUNT_INR) {
      return new Response(
        JSON.stringify({ error: `Amount must be between ₹${MIN_AMOUNT_INR} and ₹${MAX_AMOUNT_INR}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const amountPaise = Math.round(amount * 100)
    const receipt = `rcpt_${profile.company_id.slice(0, 8)}_${Date.now()}`

    const razorpayOrder = await createRazorpayOrder({
      amountPaise,
      receipt,
      notes: { company_id: profile.company_id, user_id: user.id },
    })

    const { data: paymentOrder, error: insertError } = await supabase
      .from('payment_orders')
      .insert({
        company_id: profile.company_id,
        user_id: user.id,
        amount_inr: amount,
        amount_paise: amountPaise,
        currency: 'INR',
        razorpay_order_id: razorpayOrder.id,
        status: 'created',
        receipt,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('payment_orders insert:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to create payment record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''

    return new Response(
      JSON.stringify({
        payment_order_id: paymentOrder.id,
        order_id: razorpayOrder.id,
        amount: amountPaise,
        amount_inr: amount,
        currency: 'INR',
        key_id: keyId,
        prefill: {
          name: profile.name ?? undefined,
          email: user.email ?? undefined,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('create-razorpay-order:', e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
