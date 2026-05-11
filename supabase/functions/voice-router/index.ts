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

function getCountryCode(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.startsWith('971')) return 'AE'
  if (clean.startsWith('966')) return 'SA'
  if (clean.startsWith('974')) return 'QA'
  if (clean.startsWith('91') && clean.length === 12) return 'IN'
  return 'IN'
}

serve(async (req) => {
  console.log('🚨 VOICE-ROUTER FUNCTION INVOKED - METHOD:', req.method)

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

    // Parse the form data from Twilio webhook (application/x-www-form-urlencoded)
    console.log('🔍 Parsing Twilio webhook form data...')
    const formData = await req.formData()

    // Extract parameters correctly
    const callSid = formData.get('CallSid') as string
    const direction = formData.get('Direction') as string
    const from = formData.get('From') as string

    // CORRECT PARAMETER KEY: Check for 'To' OR 'params.To' (Twilio nests parameters from JS SDK)
    let to = formData.get('To') as string
    if (!to) {
      to = formData.get('params.To') as string
    }

    const agentIdentity = formData.get('agent_identity') as string // Custom parameter for outgoing calls

    console.log('📋 Extracted form parameters:')
    console.log('   CallSid:', callSid)
    console.log('   Direction:', direction)
    console.log('   From:', from)
    console.log('   To (direct):', formData.get('To'))
    console.log('   params.To (nested):', formData.get('params.To'))
    console.log('   Final To:', to)
    console.log('   AgentIdentity:', agentIdentity)

    // DEBUG: Log all form data entries
    console.log('🔍 ALL FORM DATA ENTRIES:')
    for (const [key, value] of formData.entries()) {
      console.log(`   ${key}: ${value}`)
    }

    console.log('🎯 ===== VOICE ROUTER WEBHOOK CALLED =====')
    console.log('🔥 CallSid:', callSid)
    console.log('🔥 Direction:', direction)
    console.log('🔥 From:', from)
    console.log('🔥 To:', to)
    console.log('🔥 AgentIdentity:', agentIdentity)
    console.log('🔥 Timestamp:', new Date().toISOString())
    console.log('🔥 Raw To parameter:', JSON.stringify(to))
    console.log('====================================')

    // Log all form data for debugging
    const allFormData = Object.fromEntries(formData.entries())
    console.log('📋 Full form data received:', allFormData)

    // Specifically log the To parameter
    console.log('🎯 To parameter from Twilio:', to)

    if (!callSid) {
      console.error('❌ Missing CallSid in webhook request')
      return new Response('Missing CallSid', { status: 400, headers: corsHeaders })
    }

    console.log('✅ Valid webhook request received')

    let twimlResponse = ''

    // FIX: Check if From contains 'client:' to determine call type
    // Do NOT check Direction, as Twilio labels SDK calls as 'inbound' by default
    if (from && from.startsWith('client:')) {
      // This is an OUTBOUND call from the browser (Twilio SDK)
      console.log('📞 OUTBOUND CALL: From browser client, dialing phone number')
      console.log('From:', from)
      console.log('To:', to)

      // Resolve company_id from profiles.agent_identity (required for billing)
      let companyId: string | null = null
      let agentId: string | null = null
      if (agentIdentity) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, company_id')
          .eq('agent_identity', agentIdentity)
          .single()

        if (profile) {
          agentId = profile.user_id
          companyId = profile.company_id
        }
      }

      const destinationCountry = getCountryCode(to)

      if (companyId) {
        const { data: priceRow } = await supabase
          .from('service_pricing')
          .select('client_price_inr')
          .eq('provider', 'twilio')
          .eq('service_type', 'call')
          .eq('destination_country', destinationCountry)
          .eq('is_active', true)
          .maybeSingle()

        const clientPriceInr = Number(priceRow?.client_price_inr ?? 0)

        const balCheck = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/check-balance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            provider: 'twilio',
            service_type: 'call',
            estimated_cost_inr: clientPriceInr,
          }),
        })
        const balResult = await balCheck.json()

        if (balResult.allowed === false) {
          try {
            await supabase.from('call_logs').insert({
              company_id: companyId,
              agent_id: agentId,
              direction: direction === 'inbound' ? 'incoming' : 'outgoing',
              status: 'failed',
              blocked_reason: balResult.reason,
              destination_country: destinationCountry,
              twilio_call_sid: callSid,
              twilio_from_number: from,
              twilio_to_number: to,
            })
          } catch (e) {
            console.error('Error logging blocked call:', e)
          }

          const insufficientTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Your account has insufficient credits. Please recharge your wallet to make calls.</Say>
  <Hangup/>
</Response>`

          return new Response(insufficientTwiml, {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
          })
        }
      }

      twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="+17656296512">${to}</Dial>
</Response>`

      console.log('✅ Generated outbound call TwiML - dialing phone number')
    } else {
      // This is a REAL INBOUND call from a phone to the browser
      console.log('📞 INBOUND CALL: From phone number, routing to agent client')
      console.log('From:', from)
      console.log('To:', to)

      twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Client>agent_mayank</Client>
  </Dial>
</Response>`

      console.log('✅ Generated inbound call TwiML - routing to client')
    }

    // Log the call to database
    try {
      // Try to find company and agent based on the call details
      let companyId = null
      let agentId = null
      let destinationCountry: string | null = null

      if (agentIdentity) {
        // For outgoing calls, find the agent by identity
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, company_id')
          .eq('agent_identity', agentIdentity)
          .single()

        if (profile) {
          agentId = profile.user_id
          companyId = profile.company_id
          destinationCountry = to ? getCountryCode(to) : null
        }
      }

      // For incoming calls, we might need different logic to determine company
      // For now, we'll log what we can
      if (companyId) {
        const { error: logError } = await supabase
          .from('call_logs')
          .insert({
            company_id: companyId,
            agent_id: agentId,
            direction: direction === 'inbound' ? 'incoming' : 'outgoing',
            status: 'initiated',
            twilio_call_sid: callSid,
            twilio_from_number: from,
            twilio_to_number: to,
            destination_country: destinationCountry
          })

        if (logError) {
          console.error('Error logging call:', logError)
        } else {
          console.log('Call logged successfully:', callSid)
        }
      }
    } catch (error) {
      console.error('Error in call logging:', error)
      // Don't fail the webhook if logging fails
    }

    console.log('📤 Returning TwiML response with Content-Type: text/xml')

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        "Content-Type": "text/xml"
      }
    })

  } catch (error) {
    console.error('Unexpected error in voice router:', error)

    // Return error TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, there was an error with this call.</Say>
  <Hangup/>
</Response>`

    return new Response(errorTwiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml"
      }
    })
  }
})