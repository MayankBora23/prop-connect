// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      amount_inr?: number
    }
    const company_id = body.company_id ?? ''
    const amount_inr = Number(body.amount_inr)

    if (!company_id) {
      return new Response('Missing company_id', { status: 400, headers: corsHeaders })
    }
    if (!Number.isFinite(amount_inr) || amount_inr <= 0 || amount_inr >= 500000) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount. Must be greater than 0 and less than 500000.' }),
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

    const amount_paise = Math.round(amount_inr * 100)
    // Razorpay receipt max length is 40 characters
    const receipt = `wlt_${company_id.replace(/-/g, '').slice(0, 8)}_${Date.now()}`.slice(0, 40)

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
        notes: { company_id: String(company_id), purpose: 'wallet_recharge' },
      }),
    })
    const order = await razorpayRes.json()
    if (!razorpayRes.ok) {
      const rzMsg =
        typeof order?.error?.description === 'string'
          ? order.error.description
          : 'Failed to create payment order'
      console.error('Razorpay order failed:', order)
      return new Response(
        JSON.stringify({ error: rzMsg, detail: order }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error: insertErr } = await supabase.from('razorpay_orders').insert({
      company_id,
      razorpay_order_id: order.id,
      amount_inr,
      amount_paise,
      currency: 'INR',
      status: 'pending',
    })

    if (insertErr) {
      console.error('Failed to insert razorpay_orders:', insertErr)
      return new Response(
        JSON.stringify({ error: 'Failed to save order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount: Number(order.amount),
        currency: order.currency ?? 'INR',
        key_id: keyId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('create-razorpay-order unexpected error:', e)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
