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
 * CALLERDESK SETTINGS REQUIRED in whatsapp_settings table:
 * - telephony_provider = 'callerdesk'
 * - callerdesk_integration_key = your authcode from CallerDesk API settings
 * - callerdesk_bridge_number = agent's mobile/desk number (10 digits, no country code)
 */
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

type CallerDeskReport = {
  SourceNumber?: string
  DialWhomNumber?: string
  CallDuration?: string | number
  CallRecordingUrl?: string
  Status?: string
  CallSid?: string
  CustomerNumber?: string
  DestinationNumber?: string
  Direction?: string
  StartTime?: string
  EndTime?: string
}

const normalizePhone = (value?: string | null) => {
  if (!value) return ''
  return value.toString().trim().replace(/^\+/, '').replace(/[^\d]/g, '')
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
    let payload: CallerDeskReport = {}

    const contentType = req.headers.get('content-type') || ''
    if (req.method === 'GET') {
      // CallerDesk may send as query params
      const url = new URL(req.url)
      payload = Object.fromEntries(url.searchParams.entries()) as unknown as CallerDeskReport
    } else if (contentType.includes('application/json')) {
      payload = await req.json()
    } else {
      // form-urlencoded or multipart
      try {
        const formData = await req.formData()
        payload = Object.fromEntries(formData.entries()) as unknown as CallerDeskReport
      } catch {
        const text = await req.text()
        // try parse as query string
        const params = new URLSearchParams(text)
        payload = Object.fromEntries(params.entries()) as unknown as CallerDeskReport
      }
    }

    console.log('CallerDesk webhook payload:', JSON.stringify(payload))

    const sourceNumber = normalizePhone(payload.SourceNumber)
    const dialWhomNumber = normalizePhone(payload.DialWhomNumber)
    const destinationNumber = normalizePhone(payload.DestinationNumber)
    const callSid = (payload.CallSid || '').toString().trim()
    const duration = payload.CallDuration ? Number(payload.CallDuration) : 0
    const status = mapCallerDeskStatus((payload.Status || '').toString(), Number.isFinite(duration) ? duration : 0)
    const recordingUrl = payload.CallRecordingUrl ? payload.CallRecordingUrl.toString().trim() : null

    // CallerDesk sample payload always includes SourceNumber and DialWhomNumber for call reports.
    // We use DialWhomNumber (agent) to resolve company because whatsapp_settings stores bridge/agent number.
    if (!dialWhomNumber && !destinationNumber && !sourceNumber) {
      return new Response('Missing caller identifiers', { status: 400, headers: corsHeaders })
    }

    // Build list of candidate numbers, remove duplicates and empty strings
    const candidates = [...new Set([
      dialWhomNumber,
      destinationNumber,
      sourceNumber,
    ].filter(Boolean))]

    if (candidates.length === 0) {
      console.error('No phone numbers in payload to match company')
      return new Response('Missing caller identifiers', { status: 400, headers: corsHeaders })
    }

    // Try each candidate one at a time until we find a match
    let companyId: string | null = null
    let bridgeNumber: string | null = null

    for (const candidate of candidates) {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('company_id, callerdesk_bridge_number')
        .eq('callerdesk_bridge_number', candidate)
        .limit(1)
        .maybeSingle()

      if (!error && data?.company_id) {
        companyId = data.company_id
        bridgeNumber = data.callerdesk_bridge_number
        break
      }
    }

    if (!companyId) {
      console.error('Could not resolve company from numbers:', candidates)
      // Return 200 anyway so CallerDesk doesn't keep retrying
      return new Response('Unknown bridge number', { status: 200, headers: corsHeaders })
    }

    const updateData: Record<string, unknown> = {
      status,
      duration: Number.isFinite(duration) ? Math.max(0, Math.floor(duration)) : 0,
      recording_url: recordingUrl,
      callerdesk_call_sid: callSid || null,
      callerdesk_source_number: sourceNumber,
      callerdesk_customer_number: sourceNumber || null,
      updated_at: new Date().toISOString(),
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    // Store bridge/agent number for correlation
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

    // 2) Fallback: update the most recent initiated outgoing call for this bridge+customer
    const customerNumber = sourceNumber || null
    if (customerNumber) {
      const { data: recent, error: recentErr } = await supabase
        .from('call_logs')
        .select('id')
        .eq('company_id', companyId)
        .eq('direction', 'outgoing')
        .eq('status', 'initiated')
        .eq('callerdesk_bridge_number', bridgeNumber)
        .eq('callerdesk_customer_number', customerNumber)
        .order('created_at', { ascending: false })
        .limit(1)

      if (recentErr) {
        console.error('Failed to find recent initiated call log:', recentErr)
      } else if (recent && recent.length > 0) {
        const id = (recent[0] as any).id as string
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

    // 3) Last resort: insert new call log
    const insertData: Record<string, unknown> = {
      company_id: companyId,
      direction: 'outgoing',
      status,
      duration: (updateData.duration as number) ?? 0,
      recording_url: recordingUrl,
      callerdesk_call_sid: callSid || null,
      callerdesk_source_number: sourceNumber,
      callerdesk_customer_number: customerNumber,
      callerdesk_bridge_number: bridgeNumber,
      completed_at: updateData.completed_at ?? null,
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

