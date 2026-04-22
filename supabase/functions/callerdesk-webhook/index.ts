// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    let payload: CallerDeskReport = {}

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      payload = (await req.json()) as CallerDeskReport
    } else {
      const formData = await req.formData()
      payload = Object.fromEntries(formData.entries()) as unknown as CallerDeskReport
    }

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

    const bridgeCandidate = dialWhomNumber || destinationNumber || sourceNumber

    // Resolve company_id by matching CallerDesk bridge number stored in whatsapp_settings
    const { data: settings, error: settingsError } = await supabase
      .from('whatsapp_settings')
      .select('company_id, callerdesk_bridge_number')
      .in('callerdesk_bridge_number', [
        bridgeCandidate,
        dialWhomNumber,
        destinationNumber,
        sourceNumber,
      ].filter(Boolean))
      .maybeSingle()

    if (settingsError) {
      console.error('Failed to resolve company by bridge candidate:', settingsError)
      return new Response('Failed to resolve company', { status: 500, headers: corsHeaders })
    }

    const companyId = settings?.company_id
    if (!companyId) {
      return new Response('Unknown bridge number', { status: 404, headers: corsHeaders })
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
    const bridgeNumber = normalizePhone(settings.callerdesk_bridge_number || '') || bridgeCandidate
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

