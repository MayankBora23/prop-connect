/*
 * CALLERDESK CLICK-TO-CALL SETUP NOTES:
 *
 * - CALLERDESK SETTINGS REQUIRED in whatsapp_settings table:
 *   - telephony_provider = 'callerdesk'
 *   - callerdesk_integration_key = your authcode from CallerDesk API settings
 *   - callerdesk_bridge_number = agent's mobile number (10 digits, no country code)
 *   - callerdesk_virtual_number = CallerDesk DID/IVR virtual number (digits; usually includes STD/country code)
 *
 * - This function triggers CallerDesk click_to_call_v2. CallerDesk will first ring the agent number
 *   (bridge/deskphone) and then connect to the customer number.
 */
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

const normalizeAuthCode = (value?: string | null) => {
  if (!value) return ''
  // Remove all whitespace characters from copied keys (spaces/tabs/newlines).
  return value.toString().replace(/\s+/g, '').trim()
}

/** If user stored a full click_to_call URL or `authcode=...`, extract authcode for the API. */
const extractIntegrationKeyForApi = (raw: string): string => {
  let t = raw.trim().replace(/^\uFEFF/, '')
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
  if (!t) return ''

  const stripWrappingQuotes = (s: string) => {
    const x = s.trim()
    if ((x.startsWith('"') && x.endsWith('"')) || (x.startsWith("'") && x.endsWith("'"))) {
      return x.slice(1, -1).trim()
    }
    return x
  }

  const compact = t.replace(/\s+/g, '')
  const m = /(?:^|[?&])authcode=([^&]+)/i.exec(compact)
  if (m?.[1]) {
    try {
      return stripWrappingQuotes(decodeURIComponent(m[1]).replace(/\s+/g, '').trim())
    } catch {
      return stripWrappingQuotes(m[1].replace(/\s+/g, '').trim())
    }
  }
  return stripWrappingQuotes(normalizeAuthCode(compact))
}

const buildCallerDeskUrl = (
  authcode: string,
  agentNumber: string, // calling_party_a — agent mobile without country code
  customerNumber: string, // calling_party_b — customer WITH country code
  virtualNumber: string // deskphone — CallerDesk IVR/DID number
): string => {
  // Agent number: last 10 digits, no country code
  const agentDigits = agentNumber.replace(/\D/g, '').slice(-10)
  // Customer number: full digits with country code
  const customerDigits = customerNumber.replace(/\D/g, '')
  // Virtual/IVR number: full digits
  const virtualDigits = virtualNumber.replace(/\D/g, '')

  const params = new URLSearchParams({
    calling_party_a: agentDigits,
    calling_party_b: customerDigits,
    deskphone: virtualDigits, // virtual/IVR number, NOT agent number
    call_from_did: '1',
    authcode: authcode.trim(),
  })

  return `https://app.callerdesk.io/api/click_to_call_v2?${params.toString()}`
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
    const customerNumberRaw = normalizePhone(body.customer_number)
    // CallerDesk expects customer number with country code digits.
    const customerNumber = customerNumberRaw.length === 10 ? `91${customerNumberRaw}` : customerNumberRaw
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
      .select('id, updated_at, telephony_provider, callerdesk_integration_key, callerdesk_bridge_number, callerdesk_virtual_number')
      .eq('company_id', profile.company_id)
      .maybeSingle()

    if (settingsErr) {
      console.error('Failed to load whatsapp_settings:', settingsErr)
      return new Response('Failed to load settings', { status: 500, headers: corsHeaders })
    }

    if ((settings as any)?.telephony_provider !== 'callerdesk') {
      return new Response('Telephony provider is not CallerDesk', { status: 400, headers: corsHeaders })
    }

    const integrationKey = extractIntegrationKeyForApi(
      ((settings as any)?.callerdesk_integration_key || '').toString()
    )
    const bridgeNumber = normalizePhone((settings as any)?.callerdesk_bridge_number || '')
    const virtualNumber = normalizePhone((settings as any)?.callerdesk_virtual_number || '')
    if (!integrationKey || !bridgeNumber || !virtualNumber) {
      return new Response(
        JSON.stringify({
          error:
            'CallerDesk not fully configured. Missing: ' +
            (!integrationKey ? 'integration_key ' : '') +
            (!bridgeNumber ? 'bridge_number ' : '') +
            (!virtualNumber ? 'virtual_number' : ''),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('CallerDesk settings resolved:', {
      companyId: profile.company_id,
      settingsId: (settings as any)?.id ?? null,
      settingsUpdatedAt: (settings as any)?.updated_at ?? null,
      telephonyProvider: (settings as any)?.telephony_provider ?? null,
      integrationKeyPrefix: integrationKey ? `${integrationKey.slice(0, 8)}...` : 'MISSING',
      bridgeNumber,
      virtualNumber,
    })

    if (customerNumber.endsWith(bridgeNumber)) {
      console.warn('CallerDesk call warning: customer number appears to match bridge/agent number', {
        bridgeNumber,
        customerNumber,
      })
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
    const url = buildCallerDeskUrl(integrationKey, bridgeNumber, customerNumber, virtualNumber)
    console.log('CallerDesk call attempt:', {
      integrationKey: integrationKey ? `${integrationKey.slice(0, 8)}...` : 'MISSING',
      bridgeNumber,
      customerNumber,
      virtualNumber,
      url: url.replace(integrationKey, 'REDACTED'),
    })

    const res = await fetch(url, { method: 'GET' })
    const text = await res.text().catch(() => '')
    console.log('CallerDesk response:', { status: res.status, body: text, url })

    if (!res.ok) {
      console.error('CallerDesk trigger failed:', { url, status: res.status, body: text })
      return new Response(
        JSON.stringify({ ok: false, error: `CallerDesk HTTP ${res.status}`, detail: text }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CallerDesk often returns HTTP 200 with JSON { type: "error", message: "..." } — treat as failure.
    let callerDeskError: string | null = null
    const trimmed = text.trim()
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as { type?: string; message?: string }
        if (parsed?.type === 'error' && parsed.message) {
          callerDeskError = parsed.message.trim()
        }
      } catch {
        /* not JSON */
      }
    }

    if (callerDeskError) {
      console.error('CallerDesk API error (body):', callerDeskError)
      const lower = callerDeskError.toLowerCase()
      const authHint =
        lower.includes('auth') || lower.includes('invalid')
          ? 'Re-copy the Integration key from CallerDesk → API (same account as your virtual number). If it still fails, regenerate that key in CallerDesk or ask support whether click-to-call expects a different credential. Ensure Click-to-call coin balance is not zero.'
          : undefined
      return new Response(
        JSON.stringify({
          ok: false,
          error: callerDeskError,
          hint: authHint,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ ok: true, response: text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('callerdesk-make-call unexpected error:', e)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

