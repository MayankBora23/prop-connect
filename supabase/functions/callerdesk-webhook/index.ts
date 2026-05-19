/*
 * CALLERDESK WEBHOOK SETUP — MUST DO THIS MANUALLY:
 *
 * 1. Go to CallerDesk Dashboard → API & Integration → Webhooks
 * 2. Click "Create Webhook"
 * 3. Enter URL: https://YOUR_PROJECT.supabase.co/functions/v1/callerdesk-webhook
 * 4. Select events: "Call Report" / "Call Completed" / all call events
 * 5. Save
 *
 * To verify the function is reachable, open in browser:
 * https://YOUR_PROJECT.supabase.co/functions/v1/callerdesk-webhook?ping=1
 * Should return: { "status": "callerdesk-webhook alive" }
 *
 * Company (whatsapp_settings): telephony_provider, integration key, virtual number.
 * Per agent (profiles.callerdesk_bridge_number): bridge mobile — used to match DialWhomNumber
 * from webhooks to company + agent_id.
 */
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

type CallerDeskRawPayload = Record<string, unknown>

type CallerDeskReport = {
  SourceNumber?: string
  DialWhomNumber?: string
  CallDuration?: string | number
  TalkDuration?: string | number
  CallRecordingUrl?: string
  RecordingUrl?: string
  Status?: string
  callstatus?: string
  CallSid?: string
  CustomerNumber?: string
  DestinationNumber?: string
  Direction?: string
  direction?: string
  StartTime?: string
  EndTime?: string
  calling_party_a?: string
  calling_party_b?: string
  LegB_Start_time?: string | number
}

type CallerDeskDirection = 'inbound' | 'outbound'

type ExtractedCallParties = {
  direction: CallerDeskDirection
  customer_number: string
  agent_bridge_number: string
  customer_digits_full: string
  sourceNumber: string
  dialWhomNumber: string
  destinationNumber: string
}

type AgentProfileLookup = {
  companyId: string
  bridgeNumber: string
  agentUserId: string | null
  agentFullName: string | null
  source: 'profile' | 'legacy_company_settings'
}

const normalizePhone = (value?: string | null) => {
  if (!value) return ''
  return value.toString().trim().replace(/^\+/, '').replace(/[^\d]/g, '')
}

/** Last 10 digits for uniform profile / customer matching. */
const last10Digits = (value?: string | null) => {
  if (!value) return ''
  return value.toString().replace(/\D/g, '').slice(-10)
}

const normalizeBridgeNumber = (value?: string | null) => last10Digits(value)

/** Match customer numbers across 0-prefix, 91-prefix, and bare 10-digit storage. */
const customerNumbersMatch = (stored?: string | null, webhookSource?: string | null) => {
  const a = normalizeBridgeNumber(stored)
  const b = normalizeBridgeNumber(webhookSource)
  return !!a && !!b && a === b
}

/** Flatten payload values to strings; index keys case-insensitively. */
const flattenPayload = (raw: CallerDeskRawPayload): Map<string, string> => {
  const map = new Map<string, string>()
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue
    const str =
      typeof value === 'string'
        ? value
        : value instanceof File
          ? value.name
          : String(value)
    const trimmed = str.trim()
    if (!trimmed) continue
    map.set(key, trimmed)
    map.set(key.toLowerCase(), trimmed)
  }
  return map
}

const pickPayloadField = (map: Map<string, string>, ...keys: string[]): string => {
  for (const key of keys) {
    const exact = map.get(key)
    if (exact?.trim()) return exact.trim()
    const lower = map.get(key.toLowerCase())
    if (lower?.trim()) return lower.trim()
  }
  return ''
}

/** Parse JSON, URL-encoded form, multipart form, or query-string bodies from CallerDesk. */
async function parseCallerDeskPayload(req: Request): Promise<CallerDeskRawPayload> {
  const contentType = (req.headers.get('content-type') || '').toLowerCase()

  if (req.method === 'GET') {
    const url = new URL(req.url)
    return Object.fromEntries(url.searchParams.entries()) as CallerDeskRawPayload
  }

  if (contentType.includes('application/json')) {
    try {
      const json = await req.json()
      if (json && typeof json === 'object' && !Array.isArray(json)) {
        return json as CallerDeskRawPayload
      }
    } catch {
      // fall through to text parsing
    }
  }

  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    try {
      const formData = await req.formData()
      const out: CallerDeskRawPayload = {}
      for (const [key, value] of formData.entries()) {
        out[key] = typeof value === 'string' ? value : value.name
      }
      if (Object.keys(out).length > 0) return out
    } catch {
      // fall through
    }
  }

  const text = await req.text().catch(() => '')
  if (!text.trim()) return {}

  try {
    const asJson = JSON.parse(text)
    if (asJson && typeof asJson === 'object' && !Array.isArray(asJson)) {
      return asJson as CallerDeskRawPayload
    }
  } catch {
    // not JSON
  }

  const params = new URLSearchParams(text)
  if ([...params.keys()].length > 0) {
    return Object.fromEntries(params.entries()) as CallerDeskRawPayload
  }

  return { raw: text } as CallerDeskRawPayload
}

const detectCallerDeskDirection = (map: Map<string, string>): CallerDeskDirection => {
  const raw = pickPayloadField(map, 'direction', 'Direction', 'call_direction', 'CallDirection').toLowerCase()
  if (raw === 'outbound' || raw === 'outgoing' || raw === 'out') return 'outbound'
  if (raw === 'inbound' || raw === 'incoming' || raw === 'in' || raw === 'ivr') return 'inbound'
  return 'inbound'
}

/** Map inbound/outbound routing fields to customer vs agent bridge (last 10 digits). */
const extractCallParties = (map: Map<string, string>, direction: CallerDeskDirection): ExtractedCallParties => {
  const sourceRaw = pickPayloadField(map, 'SourceNumber', 'source_number')
  const dialWhomRaw = pickPayloadField(map, 'DialWhomNumber', 'dial_whom_number')
  const destinationRaw = pickPayloadField(map, 'DestinationNumber', 'destination_number')
  const customerFieldRaw = pickPayloadField(map, 'CustomerNumber', 'customer_number')
  const partyARaw = pickPayloadField(map, 'calling_party_a', 'CallingPartyA')
  const partyBRaw = pickPayloadField(map, 'calling_party_b', 'CallingPartyB')

  const sourceNumber = normalizePhone(sourceRaw)
  const dialWhomNumber = normalizePhone(dialWhomRaw)
  const destinationNumber = normalizePhone(destinationRaw)

  let customer_digits_full = ''
  let agent_bridge_number = ''

  if (direction === 'outbound') {
    customer_digits_full = normalizePhone(
      partyBRaw || destinationRaw || customerFieldRaw || sourceRaw
    )
    agent_bridge_number = last10Digits(partyARaw || dialWhomRaw)
  } else {
    customer_digits_full = normalizePhone(sourceRaw || partyARaw || customerFieldRaw)
    agent_bridge_number = last10Digits(dialWhomRaw)
  }

  if (!agent_bridge_number && dialWhomNumber) {
    agent_bridge_number = last10Digits(dialWhomNumber)
  }
  if (!customer_digits_full && sourceNumber) {
    customer_digits_full = sourceNumber
  }

  const customer_number = last10Digits(customer_digits_full)

  return {
    direction,
    customer_number,
    agent_bridge_number,
    customer_digits_full,
    sourceNumber,
    dialWhomNumber,
    destinationNumber,
  }
}

/** DB `call_logs.direction` uses incoming | outgoing (not inbound/outbound). */
const toCallLogDirection = (direction: CallerDeskDirection): 'incoming' | 'outgoing' =>
  direction === 'outbound' ? 'outgoing' : 'incoming'

type BridgeResolution = {
  companyId: string
  bridgeNumber: string
  agentUserId: string | null
  source:
    | 'profile'
    | 'profile_scoped_to_virtual_company'
    | 'virtual_number'
    | 'legacy_company_settings'
}

/** Company has CallerDesk enabled in Company Settings (whatsapp_settings). */
async function companyHasCallerDeskConfigured(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('whatsapp_settings')
    .select('telephony_provider, callerdesk_integration_key, callerdesk_virtual_number')
    .eq('company_id', companyId)
    .maybeSingle()

  if (error || !data) return false
  if ((data as { telephony_provider?: string }).telephony_provider !== 'callerdesk') return false
  const key = ((data as { callerdesk_integration_key?: string }).callerdesk_integration_key || '')
    .toString()
    .trim()
  const virtual = ((data as { callerdesk_virtual_number?: string }).callerdesk_virtual_number || '')
    .toString()
    .trim()
  return Boolean(key || virtual)
}

/**
 * Match webhook DestinationNumber to Company Settings virtual IVR.
 * This is the authoritative tenant for inbound IVR calls.
 */
async function resolveCompanyFromVirtualNumber(
  supabase: ReturnType<typeof createClient>,
  destinationRaw: string
): Promise<string | null> {
  const destLast10 = last10Digits(destinationRaw)
  if (destLast10.length < 10) return null

  const { data: rows, error } = await supabase
    .from('whatsapp_settings')
    .select('company_id, callerdesk_virtual_number, telephony_provider')
    .eq('telephony_provider', 'callerdesk')
    .not('callerdesk_virtual_number', 'is', null)

  if (error || !rows?.length) return null

  for (const row of rows) {
    const stored = (row as { callerdesk_virtual_number?: string }).callerdesk_virtual_number
    if (!stored) continue
    if (last10Digits(stored) === destLast10) {
      return (row as { company_id: string }).company_id
    }
  }

  return null
}

/** Look up agent profile by bridge, optionally restricted to one company. */
async function lookupAgentProfileByBridge(
  supabase: ReturnType<typeof createClient>,
  bridgeLast10: string,
  companyId?: string | null
): Promise<AgentProfileLookup | null> {
  if (bridgeLast10.length < 10) return null

  let exactQuery = supabase
    .from('profiles')
    .select('company_id, user_id, callerdesk_bridge_number, name')
    .eq('callerdesk_bridge_number', bridgeLast10)

  if (companyId) {
    exactQuery = exactQuery.eq('company_id', companyId)
  }

  const { data: profileRow, error: profileErr } = await exactQuery.limit(1).maybeSingle()

  if (!profileErr && profileRow?.company_id) {
    const agentFullName = (profileRow as { name?: string | null }).name?.trim() || null
    return {
      companyId: profileRow.company_id,
      bridgeNumber: bridgeLast10,
      agentUserId: profileRow.user_id ?? null,
      agentFullName,
      source: 'profile',
    }
  }

  let candidatesQuery = supabase
    .from('profiles')
    .select('company_id, user_id, callerdesk_bridge_number, name')
    .not('callerdesk_bridge_number', 'is', null)
    .like('callerdesk_bridge_number', `%${bridgeLast10}`)
    .limit(20)

  if (companyId) {
    candidatesQuery = candidatesQuery.eq('company_id', companyId)
  }

  const { data: profileCandidates } = await candidatesQuery

  for (const row of profileCandidates || []) {
    if (normalizeBridgeNumber(row.callerdesk_bridge_number) === bridgeLast10 && row.company_id) {
      const agentFullName = (row as { name?: string | null }).name?.trim() || null
      return {
        companyId: row.company_id,
        bridgeNumber: bridgeLast10,
        agentUserId: row.user_id ?? null,
        agentFullName,
        source: 'profile',
      }
    }
  }

  return null
}

/** Resolve company + agent from webhook phone fields via profiles.callerdesk_bridge_number. */
async function resolveBridgeFromCandidates(
  supabase: ReturnType<typeof createClient>,
  candidates: string[]
): Promise<BridgeResolution | null> {
  for (const candidate of candidates) {
    const last10 = normalizeBridgeNumber(candidate)
    if (last10.length < 10) continue

    const profileMatch = await lookupAgentProfileByBridge(supabase, last10)
    if (profileMatch) {
      const configured = await companyHasCallerDeskConfigured(supabase, profileMatch.companyId)
      if (!configured) {
        console.warn(
          'CallerDesk bridge matched a profile whose company has no CallerDesk Company Settings:',
          { companyId: profileMatch.companyId, bridge: last10 }
        )
        continue
      }
      return {
        companyId: profileMatch.companyId,
        bridgeNumber: profileMatch.bridgeNumber,
        agentUserId: profileMatch.agentUserId,
        source: profileMatch.source,
      }
    }
  }

  // Deprecated: company-wide bridge on whatsapp_settings (pre–Profile Settings migration)
  for (const candidate of candidates) {
    const last10 = normalizeBridgeNumber(candidate)
    if (last10.length < 10) continue

    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('company_id, callerdesk_bridge_number, telephony_provider')
      .eq('callerdesk_bridge_number', last10)
      .eq('telephony_provider', 'callerdesk')
      .limit(1)
      .maybeSingle()

    if (!error && data?.company_id) {
      return {
        companyId: data.company_id,
        bridgeNumber: last10,
        agentUserId: null,
        source: 'legacy_company_settings',
      }
    }
  }

  return null
}

/**
 * Resolve tenant: virtual IVR (Company Settings) first, then agent bridge within that company.
 * Avoids attributing calls to a profile.company_id that has no CallerDesk integration.
 */
async function resolveCallerDeskTenant(
  supabase: ReturnType<typeof createClient>,
  agentBridgeLast10: string,
  destinationNumber: string,
  candidates: string[]
): Promise<{ resolved: BridgeResolution | null; agentProfile: AgentProfileLookup | null }> {
  let agentProfile: AgentProfileLookup | null = null

  const virtualCompanyId = destinationNumber
    ? await resolveCompanyFromVirtualNumber(supabase, destinationNumber)
    : null

  if (virtualCompanyId) {
    console.log('CallerDesk virtual number matched company:', {
      virtualLast10: last10Digits(destinationNumber),
      companyId: virtualCompanyId,
    })

    if (agentBridgeLast10.length >= 10) {
      agentProfile = await lookupAgentProfileByBridge(supabase, agentBridgeLast10, virtualCompanyId)
    }

    if (agentProfile) {
      return {
        resolved: {
          companyId: virtualCompanyId,
          bridgeNumber: agentProfile.bridgeNumber,
          agentUserId: agentProfile.agentUserId,
          source: 'profile_scoped_to_virtual_company',
        },
        agentProfile,
      }
    }

    return {
      resolved: {
        companyId: virtualCompanyId,
        bridgeNumber: agentBridgeLast10.length >= 10 ? agentBridgeLast10 : '',
        agentUserId: null,
        source: 'virtual_number',
      },
      agentProfile: null,
    }
  }

  if (agentBridgeLast10.length >= 10) {
    agentProfile = await lookupAgentProfileByBridge(supabase, agentBridgeLast10)
    if (agentProfile) {
      const configured = await companyHasCallerDeskConfigured(supabase, agentProfile.companyId)
      if (configured) {
        return {
          resolved: {
            companyId: agentProfile.companyId,
            bridgeNumber: agentProfile.bridgeNumber,
            agentUserId: agentProfile.agentUserId,
            source: 'profile',
          },
          agentProfile,
        }
      }
      console.error(
        'CallerDesk bridge profile found but company has no CallerDesk Company Settings (integration key / virtual number). Skipping wrong-tenant write.',
        {
          profileCompanyId: agentProfile.companyId,
          bridge: agentBridgeLast10,
          destinationNumber,
          hint: 'Set telephony_provider=callerdesk and virtual number on the company that owns this CallerDesk account, or fix profiles.company_id / callerdesk_bridge_number.',
        }
      )
      return { resolved: null, agentProfile }
    }
  }

  const fallback = await resolveBridgeFromCandidates(supabase, candidates)
  return { resolved: fallback, agentProfile }
}

const mapCallerDeskStatus = (raw: string, duration: number) => {
  const s = (raw || '').toString().trim().toUpperCase()
  if (!s) return 'initiated'
  if (s === 'ANSWER' || s === 'ANSWERED') return duration > 0 ? 'completed' : 'connected'
  if (s === 'BUSY') return 'busy'
  if (s === 'CANCEL' || s === 'CANCELED' || s === 'CANCELLED') return 'failed'
  if (s === 'NOANSWER' || s === 'NO_ANSWER' || s === 'ABANDONMENT' || s === 'ABANDONED') return 'no_answer'
  if (s === 'FAILED' || s === 'ERROR') return 'failed'
  return s.toLowerCase()
}

const parseDurationSeconds = (map: Map<string, string>, payload: CallerDeskReport): number => {
  const raw = pickPayloadField(map, 'TalkDuration', 'talkduration', 'CallDuration', 'call_duration')
  const fromPayload = payload.TalkDuration ?? payload.CallDuration
  const candidate = raw || (fromPayload != null ? String(fromPayload) : '')
  const duration = candidate ? Number(candidate) : 0
  return Number.isFinite(duration) ? Math.max(0, Math.floor(duration)) : 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Health check — visit this URL in browser to confirm the function is live
  if (req.method === 'GET' && new URL(req.url).searchParams.get('ping') === '1') {
    return new Response(JSON.stringify({ status: 'callerdesk-webhook alive', timestamp: new Date().toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const rawPayload = await parseCallerDeskPayload(req)
    const payload = rawPayload as CallerDeskReport
    const fieldMap = flattenPayload(rawPayload)

    console.log('CallerDesk webhook payload:', JSON.stringify(rawPayload))

    const callDirection = detectCallerDeskDirection(fieldMap)
    const parties = extractCallParties(fieldMap, callDirection)
    const callLogDirection = toCallLogDirection(callDirection)

    const {
      customer_number: customerLast10,
      agent_bridge_number: agentBridgeLast10,
      customer_digits_full: customerDigitsFull,
      sourceNumber,
      dialWhomNumber,
      destinationNumber,
    } = parties

    console.log('CallerDesk number extraction:', {
      callDirection,
      callLogDirection,
      customer_number: customerLast10,
      agent_bridge_number: agentBridgeLast10,
      customer_digits_full: customerDigitsFull,
      sourceNumber,
      dialWhomNumber,
      destinationNumber,
    })

    const callSid = pickPayloadField(fieldMap, 'CallSid', 'callsid', 'campid').trim()
    const durationSeconds = parseDurationSeconds(fieldMap, payload)
    const statusRaw = pickPayloadField(fieldMap, 'callstatus', 'CallStatus', 'Status', 'status')
    const status = mapCallerDeskStatus(statusRaw, durationSeconds)
    const recordingUrlRaw = pickPayloadField(
      fieldMap,
      'RecordingUrl',
      'recording_url',
      'CallRecordingUrl',
      'callrecordingurl'
    )
    const recordingUrl = recordingUrlRaw ? recordingUrlRaw.trim() : null

    const legBStarted =
      payload.LegB_Start_time &&
      payload.LegB_Start_time !== '0' &&
      payload.LegB_Start_time.toString().trim() !== ''
    if (!legBStarted && dialWhomNumber && callDirection === 'outbound') {
      console.warn(
        'CallerDesk Leg B never started — customer was not dialed. Stay on the line after answering; verify lead mobile and Click-to-call balance in CallerDesk.'
      )
    }

    if (!agentBridgeLast10 && !dialWhomNumber && !destinationNumber && !sourceNumber) {
      return new Response('Missing caller identifiers', { status: 400, headers: corsHeaders })
    }

    const candidates = [
      ...new Set(
        [agentBridgeLast10, dialWhomNumber, destinationNumber, sourceNumber].filter(Boolean)
      ),
    ]

    if (candidates.length === 0) {
      console.error('No phone numbers in payload to match company')
      return new Response('Missing caller identifiers', { status: 400, headers: corsHeaders })
    }

    const { resolved: tenantResolved, agentProfile } = await resolveCallerDeskTenant(
      supabase,
      agentBridgeLast10,
      destinationNumber,
      candidates
    )
    let resolved = tenantResolved

    if (agentProfile) {
      console.log('CallerDesk agent profile resolved:', {
        companyId: agentProfile.companyId,
        user_id: agentProfile.agentUserId,
        agent_full_name: agentProfile.agentFullName,
        bridgeNumber: agentProfile.bridgeNumber,
      })
    }

    if (!resolved) {
      console.error('Could not resolve CallerDesk company/agent:', {
        candidates,
        destinationNumber,
        agentBridgeLast10,
      })
      return new Response('Unknown bridge number or CallerDesk company', { status: 200, headers: corsHeaders })
    }

    const { companyId, bridgeNumber, agentUserId, source } = resolved
    const agentBridgeDigits = agentBridgeLast10 || normalizeBridgeNumber(dialWhomNumber) || bridgeNumber

    console.log('CallerDesk bridge resolved:', {
      companyId,
      bridgeNumber,
      agentUserId,
      agentFullName: agentProfile?.agentFullName ?? null,
      source,
      callDirection,
      callLogDirection,
      customerLast10,
      agentBridgeDigits,
      dialWhomNumber,
      destinationNumber,
    })

    const customerSourceForLog = customerDigitsFull || sourceNumber

    const updateData: Record<string, unknown> = {
      direction: callLogDirection,
      status,
      duration: durationSeconds,
      recording_url: recordingUrl,
      callerdesk_call_sid: callSid || null,
      callerdesk_source_number: customerSourceForLog || sourceNumber,
      callerdesk_customer_number: customerSourceForLog || null,
      provider: 'callerdesk',
      customer_number: customerLast10 || customerSourceForLog,
      agent_number: agentBridgeDigits,
      started_at: payload.StartTime ? new Date(payload.StartTime).toISOString() : null,
      ended_at: payload.EndTime ? new Date(payload.EndTime).toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    if (agentUserId) {
      updateData.agent_id = agentUserId
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    updateData.callerdesk_bridge_number = bridgeNumber

    // 1) Try update by CallSid (best signal)
    if (callSid) {
      const { data: updated, error: updateErr } = await supabase
        .from('call_logs')
        .update(updateData)
        .eq('callerdesk_call_sid', callSid)
        .select('id')

      if (updateErr) {
        console.error('Failed to update call_logs by callerdesk_call_sid:', updateErr)
      } else if (updated && updated.length > 0) {
        return new Response('', { status: 200, headers: corsHeaders })
      }
    }

    // 2) Fallback: match initiated outgoing click-to-call by bridge + customer (last 10 digits)
    if (customerLast10 && callDirection === 'outbound') {
      const { data: recent, error: recentErr } = await supabase
        .from('call_logs')
        .select('id, callerdesk_customer_number, customer_number')
        .eq('company_id', companyId)
        .eq('direction', 'outgoing')
        .eq('status', 'initiated')
        .eq('callerdesk_bridge_number', bridgeNumber)
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentErr) {
        console.error('Failed to find recent initiated call log:', recentErr)
      } else {
        const matched = (recent || []).find(
          (row) =>
            customerNumbersMatch((row as any).callerdesk_customer_number, customerSourceForLog) ||
            customerNumbersMatch((row as any).customer_number, customerSourceForLog)
        )

        if (matched) {
          const id = (matched as any).id as string
          const { error: updateByIdErr } = await supabase
            .from('call_logs')
            .update(updateData)
            .eq('id', id)

          if (!updateByIdErr) {
            return new Response('', { status: 200, headers: corsHeaders })
          }
          console.error('Failed to update call log by id fallback:', updateByIdErr)
        }
      }
    }

    // 3) Last resort: insert new call log
    const insertData: Record<string, unknown> = {
      company_id: companyId,
      agent_id: agentUserId,
      direction: callLogDirection,
      status,
      duration: durationSeconds,
      recording_url: recordingUrl,
      callerdesk_call_sid: callSid || null,
      callerdesk_source_number: customerSourceForLog || sourceNumber,
      callerdesk_customer_number: customerSourceForLog,
      customer_number: customerLast10 || customerSourceForLog,
      callerdesk_bridge_number: bridgeNumber,
      completed_at: updateData.completed_at ?? null,
      provider: 'callerdesk',
      agent_number: agentBridgeDigits,
      started_at: payload.StartTime ? new Date(payload.StartTime).toISOString() : null,
      ended_at: payload.EndTime ? new Date(payload.EndTime).toISOString() : null,
    }

    const { error: insertErr } = await supabase.from('call_logs').insert(insertData)
    if (insertErr) {
      console.error('Failed to insert call log:', insertErr)
      return new Response('Failed to write call log', { status: 500, headers: corsHeaders })
    }

    return new Response('', { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Unexpected error in callerdesk-webhook:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
