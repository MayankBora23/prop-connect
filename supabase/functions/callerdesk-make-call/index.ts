/*
 * CALLERDESK CLICK-TO-CALL SETUP NOTES:
 *
 * Company (whatsapp_settings — admin, Company Settings):
 *   - telephony_provider = 'callerdesk'
 *   - callerdesk_integration_key = click-to-call authcode
 *   - callerdesk_virtual_number = CallerDesk DID/IVR virtual number
 *
 * Per user (profiles — each agent, Profile Settings):
 *   - callerdesk_bridge_number = agent mobile (10 digits, no country code)
 *
 * This function rings the authenticated user's bridge number, then connects the customer.
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

/** Profile bridge: last 10 digits (matches Profile Settings save). */
const normalizeBridgeNumber = (value?: string | null) => normalizePhone(value).slice(-10)

/** Lead/customer number for calling_party_b — must include country code (>10 digits). */
const normalizeWithCountryCode = (raw: string): string => {
  const digits = normalizePhone(raw)
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  if (
    (digits.startsWith('91') ||
      digits.startsWith('971') ||
      digits.startsWith('966') ||
      digits.startsWith('974')) &&
    digits.length > 10
  ) {
    return digits
  }
  return digits
}

/** Virtual/IVR — match webhook DestinationNumber (often 0-prefixed). */
const formatCallerDeskVirtualNumber = (raw: string): string => {
  const digits = normalizePhone(raw)
  if (!digits) return ''
  if (digits.length === 11 && digits.startsWith('0')) return digits
  if (digits.length === 10) return `0${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `0${digits.slice(-10)}`
  return digits
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
  bridgeNumber: string, // calling_party_a — agent mobile (10 digits, no country code)
  customerNumberFull: string, // calling_party_b — lead with country code
  virtualNumber: string, // deskphone — virtual/IVR
  useDeskphone: boolean
): string => {
  const agentDigits = bridgeNumber.replace(/\D/g, '').slice(-10)
  const customerDigits = customerNumberFull.replace(/\D/g, '')
  const virtualDigits = virtualNumber.replace(/\D/g, '')

  const params = new URLSearchParams({
    calling_party_a: agentDigits,
    calling_party_b: customerDigits,
    call_from_did: '1',
    authcode: authcode.trim(),
  })
  if (useDeskphone && virtualDigits) {
    params.set('deskphone', virtualDigits)
  }

  return `https://app.callerdesk.io/api/click_to_call_v2?${params.toString()}`
}

const parseCallerDeskApiBody = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{')) return { error: null as string | null, campid: null as string | null }
  try {
    const parsed = JSON.parse(trimmed) as {
      type?: string
      message?: string
      campid?: string | number
      CallSid?: string | number
    }
    const error =
      parsed?.type === 'error' && parsed.message ? parsed.message.trim() : null
    const campid = (parsed.campid ?? parsed.CallSid)?.toString().trim() || null
    return { error, campid }
  } catch {
    return { error: null, campid: null }
  }
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
    const customerNumberDigits = (body.customer_number ?? '').toString().replace(/[^\d]/g, '')
    if (!customerNumberDigits) {
      return new Response('Missing customer_number', { status: 400, headers: corsHeaders })
    }
    const customerNumberFull = normalizeWithCountryCode(customerNumberDigits)
    if (customerNumberFull.length <= 10) {
      return new Response(
        JSON.stringify({
          error:
            'Invalid customer phone number. Use a 10-digit Indian mobile or include country code (e.g. 91xxxxxxxxxx).',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const customerLast10 = customerNumberFull.slice(-10)

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('company_id, callerdesk_bridge_number')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (profileErr || !profile?.company_id) {
      return new Response('Missing company context', { status: 400, headers: corsHeaders })
    }

    const bridgeNumber = normalizeBridgeNumber((profile as any)?.callerdesk_bridge_number)

    // Load CallerDesk telephony settings for this company
    const { data: settings, error: settingsErr } = await supabase
      .from('whatsapp_settings')
      .select('id, updated_at, telephony_provider, callerdesk_integration_key, callerdesk_virtual_number')
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
    const virtualNumber = formatCallerDeskVirtualNumber(
      ((settings as any)?.callerdesk_virtual_number || '').toString()
    )
    if (!integrationKey || !bridgeNumber || !virtualNumber) {
      const missing: string[] = []
      if (!integrationKey || !virtualNumber) {
        missing.push('company integration key and/or virtual/IVR number (Company Settings)')
      }
      if (!bridgeNumber) {
        missing.push('your Bridge Number (Agent) (Profile Settings)')
      }
      return new Response(
        JSON.stringify({
          error: `CallerDesk not fully configured. Missing: ${missing.join('; ')}.`,
          missing: {
            integration_key: !integrationKey,
            virtual_number: !virtualNumber,
            profile_bridge_number: !bridgeNumber,
          },
          hint: !bridgeNumber
            ? 'Each agent sets their own 10-digit bridge number in Profile Settings → CallerDesk Bridge Number (Agent).'
            : undefined,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (bridgeNumber.length !== 10) {
      return new Response(
        JSON.stringify({
          error: 'Invalid bridge number. Use exactly 10 digits (no country code) in Profile Settings.',
          hint: 'Profile Settings → CallerDesk Bridge Number (Agent), e.g. 9876543210',
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
      customerNumberFull,
      virtualNumber,
    })

    if (customerLast10 === bridgeNumber) {
      return new Response(
        JSON.stringify({
          error:
            'Lead phone number is the same as your CallerDesk bridge number. Use a different lead or update your bridge number in Profile Settings.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: insertedLog, error: logErr } = await supabase
      .from('call_logs')
      .insert({
        company_id: profile.company_id,
        agent_id: userData.user.id,
        direction: 'outgoing',
        status: 'initiated',
        provider: 'callerdesk',
        customer_number: customerLast10,
        agent_number: bridgeNumber,
        callerdesk_bridge_number: bridgeNumber,
        callerdesk_customer_number: customerNumberFull,
        callerdesk_source_number: customerNumberFull,
      })
      .select('id')
      .single()
    if (logErr) console.error('Failed to insert call_log:', logErr)

    const triggerCallerDesk = async (useDeskphone: boolean) => {
      const url = buildCallerDeskUrl(
        integrationKey,
        bridgeNumber,
        customerNumberFull,
        virtualNumber,
        useDeskphone
      )
      console.log('CallerDesk call attempt:', {
        useDeskphone,
        bridgeNumber,
        customerNumberFull,
        customerLast10,
        virtualNumber: useDeskphone ? virtualNumber : '(omitted — single virtual number mode)',
        url: url.replace(integrationKey, 'REDACTED'),
      })
      const agentDigits = bridgeNumber.replace(/\D/g, '').slice(-10)
      const customerDigits = customerNumberFull.replace(/\D/g, '')
      const virtualDigits = virtualNumber.replace(/\D/g, '')
      console.log('CallerDesk leg mapping:', {
        'Leg A (rings first - agent)': agentDigits,
        'Leg B (rings second - customer)': customerDigits,
        'Deskphone (virtual IVR)': virtualDigits,
      })
      const res = await fetch(url, { method: 'GET' })
      const text = await res.text().catch(() => '')
      console.log('CallerDesk response:', { useDeskphone, status: res.status, body: text })
      return { res, text, parsed: parseCallerDeskApiBody(text) }
    }

    let { res, text: lastText, parsed } = await triggerCallerDesk(true)

    if (!res.ok || parsed.error) {
      const errLower = `${parsed.error || ''} ${lastText}`.toLowerCase()
      const deskphoneIssue =
        errLower.includes('deskphone') ||
        errLower.includes('virtual') ||
        errLower.includes('did') ||
        errLower.includes('ivr')
      if (deskphoneIssue) {
        console.warn('CallerDesk deskphone error — retrying with empty deskphone (single-VN mode)')
        ;({ res, text: lastText, parsed } = await triggerCallerDesk(false))
      }
    }

    if (!res.ok || parsed.error) {
      const lower = (parsed.error || '').toLowerCase()
      const authHint =
        lower.includes('auth') || lower.includes('invalid')
          ? 'Re-copy the Integration key from CallerDesk → API (same account as your virtual number). Ensure Click-to-call coins are not zero.'
          : undefined
      return new Response(
        JSON.stringify({
          ok: false,
          error: parsed.error || `CallerDesk HTTP ${res.status}`,
          detail: lastText,
          hint: authHint,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const campid = parsed.campid

    if (campid && insertedLog?.id) {
      await supabase
        .from('call_logs')
        .update({ callerdesk_call_sid: campid })
        .eq('id', insertedLog.id)
    }

    return new Response(
      JSON.stringify({
        ok: true,
        campid,
        response: lastText,
        dialed: {
          calling_party_a: bridgeNumber,
          calling_party_b: customerNumberFull,
          deskphone: virtualNumber,
        },
        hint:
          'Answer the virtual-number call within a few rings and stay on the line for the customer leg. In CallerDesk: add this agent mobile to a Call Group linked to your virtual number (reports showing "Call Group: Not Assigned" mean Leg B may not connect).',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (e) {
    console.error('callerdesk-make-call unexpected error:', e)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

