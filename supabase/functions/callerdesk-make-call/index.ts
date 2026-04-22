// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const normalizePhone = (value?: string | null) => {
  if (!value) return ''
  return value.toString().trim().replace(/^\+/, '').replace(/[^\d]/g, '')
}

const toAgentWithoutCountryCode = (digits: string) => {
  const d = normalizePhone(digits)
  // CallerDesk docs: calling_party_a should be agent number without country code.
  // Heuristic: if number looks like E.164, use last 10 digits (common for IN; safe fallback).
  if (d.length > 10) return d.slice(-10)
  return d
}

const buildCallerDeskUrl = (integrationKey: string, agent: string, customer: string) => {
  const trimmed = (integrationKey || '').toString().trim()
  if (!trimmed) throw new Error('Missing integration_key')

  const agentA = toAgentWithoutCountryCode(agent)

  // If caller provided only an authcode/token, use documented click_to_call_v2 format.
  if (!trimmed.includes('/') && !trimmed.includes('?') && !trimmed.includes('=')) {
    const authcode = trimmed
    return (
      `https://app.callerdesk.io/api/click_to_call_v2` +
      `?calling_party_a=${encodeURIComponent(agentA)}` +
      `&calling_party_b=${encodeURIComponent(customer)}` +
      `&deskphone=` +
      `&call_from_did=1` +
      `&authcode=${encodeURIComponent(authcode)}`
    )
  }

  let base: string
  if (/^https?:\/\//i.test(trimmed)) {
    base = trimmed
  } else {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    // Prefer app.callerdesk.io for API routes; keep callerdesk.io for non-API custom paths.
    const host = path.startsWith('/api/') || path.startsWith('/api_') || path.includes('click_to_call')
      ? 'https://app.callerdesk.io'
      : 'https://callerdesk.io'
    base = `${host}${path}`
  }

  // Default behavior for a provided URL/path: ensure calling_party params exist.
  // Keep legacy params too (per original spec), but CallerDesk click_to_call_v2 needs calling_party_a/b.
  const joinChar = base.includes('?') ? '&' : '?'
  const hasA = /(?:\?|&)calling_party_a=/.test(base)
  const hasB = /(?:\?|&)calling_party_b=/.test(base)
  const hasDeskphone = /(?:\?|&)deskphone=/.test(base)
  const hasCallFromDid = /(?:\?|&)call_from_did=/.test(base)

  const params: string[] = []
  params.push(`agent=${encodeURIComponent(agent)}`)
  params.push(`customer=${encodeURIComponent(customer)}`)
  if (!hasA) params.push(`calling_party_a=${encodeURIComponent(agentA)}`)
  if (!hasB) params.push(`calling_party_b=${encodeURIComponent(customer)}`)
  if (!hasDeskphone) params.push(`deskphone=`)
  if (!hasCallFromDid) params.push(`call_from_did=1`)

  return `${base}${joinChar}${params.join('&')}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // Identify the caller (authenticated user)
    const authHeader = req.headers.get('authorization') || ''
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await authed.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const body = (await req.json().catch(() => ({}))) as { customer_number?: string }
    const customerNumber = normalizePhone(body.customer_number)
    if (!customerNumber) {
      return new Response('Missing customer_number', { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Resolve company_id from profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (profileErr || !profile?.company_id) {
      return new Response('Missing company context', { status: 400, headers: corsHeaders })
    }

    // Load CallerDesk telephony settings for this company
    const { data: settings, error: settingsErr } = await supabase
      .from('whatsapp_settings')
      .select('telephony_provider, callerdesk_integration_key, callerdesk_bridge_number')
      .eq('company_id', profile.company_id)
      .maybeSingle()

    if (settingsErr) {
      console.error('Failed to load whatsapp_settings:', settingsErr)
      return new Response('Failed to load settings', { status: 500, headers: corsHeaders })
    }

    if ((settings as any)?.telephony_provider !== 'callerdesk') {
      return new Response('Telephony provider is not CallerDesk', { status: 400, headers: corsHeaders })
    }

    const integrationKey = ((settings as any)?.callerdesk_integration_key || '').toString().trim()
    const bridgeNumber = normalizePhone((settings as any)?.callerdesk_bridge_number || '')
    if (!integrationKey || !bridgeNumber) {
      return new Response('CallerDesk not configured', { status: 400, headers: corsHeaders })
    }

    // Create initial call log entry (server-side; bypasses RLS)
    const { error: logErr } = await supabase.from('call_logs').insert({
      company_id: profile.company_id,
      agent_id: userData.user.id,
      direction: 'outgoing',
      status: 'initiated',
      callerdesk_bridge_number: bridgeNumber,
      callerdesk_customer_number: customerNumber,
    })
    if (logErr) console.error('Failed to insert call_log:', logErr)

    // Trigger CallerDesk (server-side; no CORS)
    const url = buildCallerDeskUrl(integrationKey, bridgeNumber, customerNumber)
    const res = await fetch(url, { method: 'GET' })
    const text = await res.text().catch(() => '')

    if (!res.ok) {
      console.error('CallerDesk trigger failed:', { url, status: res.status, body: text })
      return new Response(`CallerDesk trigger failed (${res.status})`, { status: 502, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true, url, response: text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('callerdesk-make-call unexpected error:', e)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

