// @ts-ignore Deno URL import (resolved in Supabase Edge runtime)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore Deno URL import (resolved in Supabase Edge runtime)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the form data from Twilio webhook
    const formData = await req.formData()
    const callSid = formData.get('CallSid') as string
    const callStatus = formData.get('CallStatus') as string
    const callDuration = formData.get('CallDuration') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const direction = formData.get('Direction') as string

    console.log('Voice status webhook received:', {
      callSid,
      callStatus,
      callDuration,
      from,
      to,
      direction
    })

    if (!callSid) {
      return new Response('Missing CallSid', { status: 400, headers: corsHeaders })
    }

    // Map Twilio status to our status values
    let mappedStatus = 'initiated'
    switch (callStatus) {
      case 'ringing':
        mappedStatus = 'ringing'
        break
      case 'in-progress':
      case 'answered':
        mappedStatus = 'connected'
        break
      case 'completed':
        mappedStatus = 'completed'
        break
      case 'busy':
        mappedStatus = 'busy'
        break
      case 'no-answer':
        mappedStatus = 'no_answer'
        break
      case 'failed':
      case 'canceled':
        mappedStatus = 'failed'
        break
      default:
        mappedStatus = 'initiated'
    }

    // Update call log
    const updateData: any = {
      status: mappedStatus,
      updated_at: new Date().toISOString()
    }

    // Add duration and completion time for completed calls
    if (callStatus === 'completed' && callDuration) {
      updateData.duration = parseInt(callDuration)
      updateData.completed_at = new Date().toISOString()
    }

    const { data: callLog, error: updateError } = await supabase
      .from('call_logs')
      .update(updateData)
      .eq('twilio_call_sid', callSid)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating call log:', updateError)
      // If the call log doesn't exist, try to create it
      if (updateError.code === 'PGRST116') { // No rows found
        console.log('Call log not found, creating new entry')

        // Try to determine company and agent
        let companyId = null
        let agentId = null
        let leadId = null

        // Try to find lead by phone number
        if (to) {
          const { data: lead } = await supabase
            .from('leads')
            .select('id, company_id, assigned_to')
            .eq('phone', to.replace('whatsapp:', ''))
            .single()

          if (lead) {
            leadId = lead.id
            companyId = lead.company_id
            agentId = lead.assigned_to
          }
        }

        // If still no company, try from number
        if (!companyId && from) {
          // This is more complex - we'd need to look up by company phone number
          // For now, we'll skip this and rely on the initial routing
        }

        if (companyId) {
          const { error: insertError } = await supabase
            .from('call_logs')
            .insert({
              company_id: companyId,
              agent_id: agentId,
              lead_id: leadId,
              direction: direction === 'inbound' ? 'incoming' : 'outgoing',
              status: mappedStatus,
              duration: callDuration ? parseInt(callDuration) : 0,
              twilio_call_sid: callSid,
              twilio_from_number: from,
              twilio_to_number: to,
              completed_at: callStatus === 'completed' ? new Date().toISOString() : null
            })

          if (insertError) {
            console.error('Error creating call log:', insertError)
          } else {
            console.log('Call log created successfully')
          }
        }
      }
    } else {
      console.log('Call log updated successfully:', callLog.id)

      // If call completed, update lead's last_called_at
      if (callStatus === 'completed' && callLog.lead_id) {
        const { error: leadUpdateError } = await supabase
          .from('leads')
          .update({
            last_called_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', callLog.lead_id)

        if (leadUpdateError) {
          console.error('Error updating lead last_called_at:', leadUpdateError)
        } else {
          console.log('Lead last_called_at updated')
        }
      }

      const isOutbound = Boolean(from && from.startsWith('client:'))

      // Bill only after call ends, only for outbound calls
      if (isOutbound && callStatus === 'completed' && callDuration && parseInt(callDuration) > 0) {
        const durationSeconds = parseInt(callDuration)
        const durationMinutes = Math.ceil(durationSeconds / 60)
        const companyId = callLog?.company_id
        const destinationCountry = callLog?.destination_country ?? 'IN'

        if (companyId) {
          try {
            const deductRes = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/deduct-credits`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  company_id: companyId,
                  provider: 'twilio',
                  service_type: 'call',
                  destination_country: destinationCountry,
                  message_category: null,
                  usage_quantity: durationMinutes,
                  call_duration_seconds: durationSeconds,
                  call_duration_minutes: durationMinutes,
                  reference_id: callSid,
                }),
              }
            )
            const result = await deductRes.json()
            if (result.success) {
              console.log(
                `Call billing: ₹${result.credits_deducted} deducted for ${durationMinutes} min (${durationSeconds}s), new balance: ₹${result.new_balance}`
              )
            } else {
              console.warn(`Call billing failed: ${result.reason} for CallSid ${callSid}`)
            }
          } catch (err) {
            console.error('deduct-credits call failed:', err)
          }
        }
      }
    }

    // Return empty response with 200 status
    return new Response('', {
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Unexpected error in voice status:', error)
    return new Response('', { status: 200, headers: corsHeaders })
  }
})