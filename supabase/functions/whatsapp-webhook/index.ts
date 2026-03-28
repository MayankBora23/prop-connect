import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleAiFlow } from './handleAiFlow.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TwilioWebhookPayload {
  To: string
  From: string
  Body: string
  MessageSid: string
  AccountSid: string
  NumMedia?: string
  MediaUrl0?: string
  MediaContentType0?: string
  ProfileName?: string
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

    // Get the raw request body and URL for signature verification
    const url = new URL(req.url)
    const body = await req.text()
    const signature = req.headers.get('x-twilio-signature')

    if (!signature) {
      console.error('Missing Twilio signature')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Parse the form data
    const formData = new URLSearchParams(body)
    const payload: TwilioWebhookPayload = {
      To: formData.get('To') || '',
      From: formData.get('From') || '',
      Body: formData.get('Body') || '',
      MessageSid: formData.get('MessageSid') || '',
      AccountSid: formData.get('AccountSid') || '',
      NumMedia: formData.get('NumMedia') || '',
      MediaUrl0: formData.get('MediaUrl0') || '',
      MediaContentType0: formData.get('MediaContentType0') || '',
      ProfileName: formData.get('ProfileName') || '',
    }

    // Log full incoming form data for debugging (includes possible replied SID fields)
    console.log('Received WhatsApp webhook:', payload)
    // Log raw form entries
    try {
      const entries: Record<string, string> = {}
      for (const [k, v] of formData.entries()) {
        entries[k] = v
      }
      console.log('Webhook form entries:', entries)
    } catch (e) {
      console.warn('Failed to log form entries', e)
    }

    // Extract the phone number from the 'To' field (remove whatsapp: prefix if present)
    const whatsappNumber = payload.To.replace('whatsapp:', '')

    // For multi-tenant sandbox support, first try routing by AccountSid (required for sandbox)
    // Fall back to whatsapp_number for live/production environments
    let whatsappSettings, settingsError

    // Try routing by AccountSid first (handles sandbox where multiple companies share same number)
    const accountSidResult = await supabase
      .from('whatsapp_settings')
      .select('company_id, twilio_auth_token, whatsapp_number')
      .eq('twilio_sid', payload.AccountSid)
      .single()

    if (accountSidResult.data) {
      whatsappSettings = accountSidResult.data
      settingsError = null
      console.log('Routed by AccountSid (sandbox mode):', payload.AccountSid)
    } else {
      // Fall back to routing by whatsapp_number (for live/production)
      const numberResult = await supabase
        .from('whatsapp_settings')
        .select('company_id, twilio_auth_token, whatsapp_number')
        .eq('whatsapp_number', whatsappNumber)
        .single()

      whatsappSettings = numberResult.data
      settingsError = numberResult.error
      console.log('Routed by whatsapp_number (live mode):', whatsappNumber)
    }

    // Get company industry type for AI flow routing
    let companyIndustry = 'real_estate' // default fallback
    if (whatsappSettings?.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('industry')
        .eq('id', whatsappSettings.company_id)
        .single()

      if (companyData?.industry) {
        companyIndustry = companyData.industry
        console.log('Company industry detected:', companyIndustry)
      }
    }

    if (settingsError || !whatsappSettings) {
      console.error('WhatsApp settings not found for AccountSid:', payload.AccountSid, 'or number:', whatsappNumber)
      return new Response('WhatsApp settings not configured', { status: 404, headers: corsHeaders })
    }

    // TEMPORARILY DISABLE SIGNATURE VALIDATION FOR DEBUGGING
    console.log('Webhook received:', { url: url.toString(), hasSignature: !!signature, bodyLength: body.length })

    // const isValidSignature = await verifyTwilioSignature(
    //   url.toString(),
    //   body,
    //   signature,
    //   whatsappSettings.twilio_auth_token
    // )

    // if (!isValidSignature) {
    //   console.error('Invalid Twilio signature')
    //   return new Response('Invalid signature', { status: 401, headers: corsHeaders })
    // }

    console.log('Signature validation temporarily disabled for debugging')

    // Extract sender's phone number
    const contactPhone = payload.From.replace('whatsapp:', '')

    // Validate contact phone - don't create conversation if phone is empty
    if (!contactPhone || contactPhone.trim() === '') {
      console.error('Invalid contact phone number:', contactPhone)
      return new Response('Invalid contact phone', { status: 400, headers: corsHeaders })
    }

    // Check if conversation already exists, if not create it
    let conversationId: string

    const { data: existingConversation, error: conversationError } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('company_id', whatsappSettings.company_id)
      .eq('contact_phone', contactPhone)
      .single()

    if (conversationError && conversationError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking conversation:', conversationError)
      return new Response('Database error', { status: 500, headers: corsHeaders })
    }

    if (existingConversation) {
      conversationId = existingConversation.id
      // Update last_message_at
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
    } else {
      // Create new conversation
      const { data: newConversation, error: createConversationError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          company_id: whatsappSettings.company_id,
          contact_phone: contactPhone,
          contact_name: payload.ProfileName || null, // Use ProfileName from Twilio if available
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (createConversationError) {
        console.error('Error creating conversation:', createConversationError)
        return new Response('Database error', { status: 500, headers: corsHeaders })
      }

      conversationId = newConversation.id
    }

    // GATEKEEPER: Check if we should route to AI flow
    const { data: conversationData, error: conversationFetchError } = await supabase
      .from('whatsapp_conversations')
      .select('is_new_user, ai_enabled, current_step')
      .eq('id', conversationId)
      .single()

    if (conversationFetchError) {
      console.error('Error fetching conversation data:', conversationFetchError)
      return new Response('Database error', { status: 500, headers: corsHeaders })
    }

    // Route to AI flow if new user and AI enabled
    if (conversationData.is_new_user === true && conversationData.ai_enabled === true) {
      console.log('🎯 Routing to AI Lead Qualification flow')
      console.log(`🤖 AI Flow trigger: new_user=${conversationData.is_new_user}, ai_enabled=${conversationData.ai_enabled}`)
      console.log(`📞 Conversation: ${conversationId}, Phone: ${contactPhone}, Industry: ${companyIndustry}`)

      try {
        const result = await handleAiFlow({
          payload,
          conversationId,
          whatsappSettings,
          conversationData,
          supabase,
          provider: 'twilio',
          accountSid: payload.AccountSid,
          industry: companyIndustry
        })
        console.log('✅ AI Flow completed successfully')
        return result
      } catch (aiError) {
        console.error('❌ AI Flow failed:', aiError)
        throw aiError
      }
    }

    console.log('Continuing with existing Human Inbox logic')

    // Check for replied-to message SID sent by Twilio (OriginalRepliedMessageSid / QuotedMessageSid variants)
    // Extract possible replied-message identifiers from webhook payload
    const originalRepliedSid = formData.get('OriginalRepliedMessageSid') || formData.get('QuotedMessageSid') || formData.get('RepliedMessageSid') || formData.get('Context') || null

    if (!originalRepliedSid) {
      console.log('No replied-message SID found in webhook payload for MessageSid:', payload.MessageSid)
    } else {
      console.log('Webhook contains replied-message identifier:', originalRepliedSid)
    }

    // Try to resolve replied-message SID to a local DB id (if provided)
    let reply_to_message_id = null
    if (originalRepliedSid) {
      try {
        // If Context was provided as JSON with message_sid, parse that
        let sidToFind = originalRepliedSid as string
        try {
          const parsed = JSON.parse(String(originalRepliedSid))
          if (parsed && parsed.message_sid) {
            sidToFind = parsed.message_sid
          }
        } catch {
          // not JSON, keep as-is
        }

        const { data: repliedRow, error: findError } = await supabase
          .from('whatsapp_messages')
          .select('id')
          .eq('message_sid', sidToFind)
          .single()
        if (!findError && repliedRow) {
          reply_to_message_id = repliedRow.id
        } else {
          console.log('Replied SID not found in DB:', sidToFind)
        }
      } catch (e) {
        console.warn('Error finding replied message by SID:', e)
      }
    }

    // Insert the incoming user message
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        company_id: whatsappSettings.company_id,
        direction: 'incoming',  // Database ENUM expects lowercase
        body: payload.Body,
        status: 'delivered',
        message_sid: payload.MessageSid
      })

    if (messageError) {
      console.error('Error inserting incoming message:', messageError)
      return new Response('Database error', { status: 500, headers: corsHeaders })
    }

    console.log('✅ Incoming user message stored in database')

    console.log('Successfully processed WhatsApp message')

    // Return empty response with 200 status (Twilio expects this)
    return new Response('', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

// Verify Twilio signature
async function verifyTwilioSignature(
  url: string,
  body: string,
  signature: string,
  authToken: string
): Promise<boolean> {
  try {
    // Import crypto for HMAC verification
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(authToken),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    )

    const data = encoder.encode(url + body)
    const expectedSignature = await crypto.subtle.sign('HMAC', key, data)

    // Convert to hex string
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return expectedHex === signature.toLowerCase()
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
}
