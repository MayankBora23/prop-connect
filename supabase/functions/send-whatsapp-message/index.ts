import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SendMessageRequest {
  conversation_id: string
  body: string
  file_url?: string
  file_name?: string
  file_type?: string
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

    // Get the request body
    const { conversation_id, body, file_url, file_name, file_type }: SendMessageRequest = await req.json()

    if (!conversation_id) {
      return new Response('Missing conversation_id', { status: 400, headers: corsHeaders })
    }

    // Allow empty body if file is present
    if (!body && !file_url) {
      return new Response('Missing body (required when no file)', { status: 400, headers: corsHeaders })
    }

    console.log('Sending WhatsApp message:', {
      conversation_id,
      body: body ? body.substring(0, 100) + (body.length > 100 ? '...' : '') : null,
      has_file: !!file_url,
      file_name,
      file_type
    })

    // Get conversation details
    const { data: conversation, error: conversationError } = await supabase
      .from('whatsapp_conversations')
      .select('contact_phone, company_id')
      .eq('id', conversation_id)
      .single()

    if (conversationError || !conversation) {
      console.error('Conversation lookup error:', conversationError)
      console.error('Conversation ID:', conversation_id)
      return new Response(`Conversation not found: ${conversationError?.message || 'Unknown error'}`, { status: 404, headers: corsHeaders })
    }

    console.log('Found conversation:', { contact_phone: conversation.contact_phone, company_id: conversation.company_id })

    if (!conversation.company_id) {
      console.error('Conversation has no company_id');
      return new Response('Conversation has no company_id', { status: 400, headers: corsHeaders })
    }

    // Get WhatsApp settings for this company
    const { data: whatsappSettings, error: settingsError } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('company_id', conversation.company_id)
      .single()

    if (settingsError || !whatsappSettings) {
      console.error('WhatsApp settings not found:', settingsError)
      return new Response('WhatsApp settings not configured', { status: 404, headers: corsHeaders })
    }

    // Send message via Twilio API
    console.log('Sending to Twilio:', {
      from: whatsappSettings.whatsapp_number,
      to: conversation.contact_phone,
      body_length: body?.length || 0,
      has_media: !!file_url
    })

    const twilioResponse = await sendTwilioMessage(
      whatsappSettings.twilio_sid,
      whatsappSettings.twilio_auth_token,
      whatsappSettings.whatsapp_number,
      conversation.contact_phone,
      body,
      file_url
    )

    if (!twilioResponse.success) {
      console.error('Twilio API error:', twilioResponse.error)
      return new Response(`Twilio API error: ${twilioResponse.error}`, { status: 500, headers: corsHeaders })
    }

    console.log('Twilio message sent successfully:', twilioResponse.messageSid)

    // Store the sent message in database
    const messageDataToInsert = {
      conversation_id: conversation_id,
      direction: 'outgoing' as const,
      body: body || '', // Ensure body is never null
      status: 'sent' as const,
      message_sid: twilioResponse.messageSid,
      company_id: conversation.company_id,
      ...(file_url && { file_url }),
      ...(file_name && { file_name }),
      ...(file_type && { file_type }),
    }

    console.log('Inserting message data:', messageDataToInsert)

    const { data: messageData, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert(messageDataToInsert)
      .select()
      .single()

    if (messageError) {
      console.error('Database insertion error:', messageError)
      console.error('Message data that failed:', messageDataToInsert)
      return new Response(`Database error: ${messageError.message}`, { status: 500, headers: corsHeaders })
    }

    // Update conversation last_message_at
    await supabase
      .from('whatsapp_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation_id)

    console.log('WhatsApp message sent successfully:', twilioResponse.messageSid)

    return new Response(JSON.stringify({
      success: true,
      messageId: messageData.id,
      messageSid: twilioResponse.messageSid
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

// Send message via Twilio API
async function sendTwilioMessage(
  accountSid: string,
  authToken: string,
  fromNumber: string,
  toNumber: string,
  body: string,
  mediaUrl?: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const formData = new FormData()
    formData.append('From', `whatsapp:${fromNumber}`)
    formData.append('To', `whatsapp:${toNumber}`)
    formData.append('Body', body)

    // Add media URL if provided
    if (mediaUrl) {
      formData.append('MediaUrl', mediaUrl)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const data = await response.json()
    return { success: true, messageSid: data.sid }

  } catch (error) {
    return { success: false, error: error.message }
  }
}
