import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  NumMedia?: string
  MediaUrl0?: string
  MediaContentType0?: string
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
      NumMedia: formData.get('NumMedia') || '',
      MediaUrl0: formData.get('MediaUrl0') || '',
      MediaContentType0: formData.get('MediaContentType0') || '',
    }

    console.log('Received WhatsApp webhook:', payload)

    // Extract the phone number from the 'To' field (remove whatsapp: prefix if present)
    const whatsappNumber = payload.To.replace('whatsapp:', '')

    // Find the company that owns this WhatsApp number
    const { data: whatsappSettings, error: settingsError } = await supabase
      .from('whatsapp_settings')
      .select('company_id, twilio_auth_token')
      .eq('whatsapp_number', whatsappNumber)
      .single()

    if (settingsError || !whatsappSettings) {
      console.error('WhatsApp settings not found for number:', whatsappNumber)
      return new Response('WhatsApp number not configured', { status: 404, headers: corsHeaders })
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

    // Insert the message
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        direction: 'incoming',
        body: payload.Body,
        status: 'delivered', // Twilio delivered it to us
        message_sid: payload.MessageSid,
        company_id: whatsappSettings.company_id,
      })

    if (messageError) {
      console.error('Error inserting message:', messageError)
      return new Response('Database error', { status: 500, headers: corsHeaders })
    }

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
