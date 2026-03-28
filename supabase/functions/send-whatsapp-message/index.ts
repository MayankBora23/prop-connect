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
  file_urls?: string[]
  file_names?: string[]
  file_types?: string[]
  reply_to_message_id?: string
}

type WhatsappProvider = 'twilio' | 'meta'

interface CompanyRow {
  whatsapp_provider: WhatsappProvider | null
  meta_phone_number_id: string | null
  meta_access_token: string | null
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
    const { conversation_id, body, file_urls, file_names, file_types, reply_to_message_id }: SendMessageRequest = await req.json()

    if (!conversation_id) {
      return new Response('Missing conversation_id', { status: 400, headers: corsHeaders })
    }

    // Allow empty body if file is present
    if (!body && !file_urls?.length) {
      return new Response('Missing body (required when no file)', { status: 400, headers: corsHeaders })
    }

    console.log('Sending WhatsApp message:', {
      conversation_id,
      body: body ? body.substring(0, 100) + (body.length > 100 ? '...' : '') : null,
      file_count: file_urls?.length || 0,
      reply_to: reply_to_message_id
    })

    if (!conversation_id) {
      return new Response('Missing conversation_id', { status: 400, headers: corsHeaders })
    }

    // Allow empty body if file is present
    if (!body && !file_urls?.length) {
      return new Response('Missing body (required when no file)', { status: 400, headers: corsHeaders })
    }

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

    // Resolve provider + credentials from companies
    const { data: companyRow, error: companyError } = await supabase
      .from('companies')
      .select('whatsapp_provider, meta_phone_number_id, meta_access_token')
      .eq('id', conversation.company_id)
      .maybeSingle<CompanyRow>()

    if (companyError) {
      console.error('Failed to resolve company provider:', companyError)
      return new Response('Company lookup failed', { status: 500, headers: corsHeaders })
    }

    const provider: WhatsappProvider = (companyRow?.whatsapp_provider ?? 'twilio') === 'meta' ? 'meta' : 'twilio'

    // Build message body for Twilio, including quoted reply context if provided
    const twilioBody = body || ''

    let repliedMessageSid = null
    if (reply_to_message_id) {
      try {
        const { data: repliedMsg, error: repliedErr } = await supabase
          .from('whatsapp_messages')
          .select('body, file_names, message_sid')
          .eq('id', reply_to_message_id)
          .single()

        if (!repliedErr && repliedMsg) {
          const preview = repliedMsg.body
            ? repliedMsg.body
            : (repliedMsg.file_names && repliedMsg.file_names[0]) ? repliedMsg.file_names[0] : ''
          if (preview) {
          // Do NOT modify the actual message body for native reply.
          // We only capture the replied message SID so we can pass it via a supported API later.
          }
          repliedMessageSid = repliedMsg.message_sid || null
        }
      } catch (e) {
        console.warn('Failed to fetch replied message for context:', e)
      }
    }

    // Send message via provider
    let outboundMessageSid: string | undefined
    if (provider === 'twilio') {
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

      console.log('Sending to Twilio:', {
        from: whatsappSettings.whatsapp_number,
        to: conversation.contact_phone,
        body_length: twilioBody?.length || 0,
        file_count: file_urls?.length || 0,
        reply_to_message_id,
      })

      // Twilio WhatsApp supports only one media file per message — send first file if any
      const twilioResponse = await sendTwilioMessage(
        whatsappSettings.twilio_sid,
        whatsappSettings.twilio_auth_token,
        whatsappSettings.whatsapp_number,
        conversation.contact_phone,
        twilioBody,
        file_urls?.[0], // Send only the first file to Twilio
        repliedMessageSid
      )

      if (!twilioResponse.success) {
        console.error('Twilio API error:', twilioResponse.error)
        return new Response(`Twilio API error: ${twilioResponse.error}`, { status: 500, headers: corsHeaders })
      }

      outboundMessageSid = twilioResponse.messageSid
      console.log('Twilio message sent successfully:', outboundMessageSid)
    } else {
      const phoneId = companyRow?.meta_phone_number_id
      const accessToken = companyRow?.meta_access_token
      if (!phoneId || !accessToken) {
        return new Response('Meta WhatsApp not configured (meta_phone_number_id/meta_access_token missing)', {
          status: 400,
          headers: corsHeaders,
        })
      }

      console.log('Sending to Meta WhatsApp:', {
        phone_number_id: phoneId,
        to: conversation.contact_phone,
        body_length: twilioBody?.length || 0,
        file_count: file_urls?.length || 0,
      })

      const metaResponse = await sendMetaWhatsAppMessage({
        phoneNumberId: phoneId,
        accessToken,
        to: conversation.contact_phone,
        body: twilioBody,
        fileUrl: file_urls?.[0],
        fileName: file_names?.[0],
        fileType: file_types?.[0],
      })

      if (!metaResponse.success) {
        console.error('Meta API error:', metaResponse.error)
        return new Response(`Meta API error: ${metaResponse.error}`, { status: 500, headers: corsHeaders })
      }

      outboundMessageSid = metaResponse.messageSid
      console.log('Meta message sent successfully:', outboundMessageSid)
    }

    // Store the sent message in database
    const messageDataToInsert: any = {
      conversation_id: conversation_id,
      direction: 'outgoing' as const,
      body: body || '', // Ensure body is never null
      status: 'sent' as const,
      message_sid: outboundMessageSid ?? null,
      company_id: conversation.company_id,
      file_urls: file_urls || null,
      file_names: file_names || null,
      file_types: file_types || null,
      reply_to_message_id: reply_to_message_id || null,
      reply_to_message_sid: repliedMessageSid || null,
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

    console.log('WhatsApp message sent successfully:', outboundMessageSid)

    return new Response(JSON.stringify({
      success: true,
      messageId: messageData.id,
      messageSid: outboundMessageSid
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

async function sendMetaWhatsAppMessage(params: {
  phoneNumberId: string
  accessToken: string
  to: string
  body: string
  fileUrl?: string
  fileName?: string
  fileType?: string
}): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const { phoneNumberId, accessToken, to, body, fileUrl, fileName, fileType } = params

    const toE164 = to.trim().startsWith('+') ? to.trim() : `+${to.trim()}`
    const trimmedBody = body ?? ''

    let payload: any

    if (fileUrl) {
      const normalizedType = (fileType || '').trim().toLowerCase()

      if (normalizedType === 'image') {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toE164,
          type: 'image',
          image: {
            link: fileUrl,
            ...(trimmedBody ? { caption: trimmedBody } : {}),
          },
        }
      } else {
        // Default to document if not explicitly image
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toE164,
          type: 'document',
          document: {
            link: fileUrl,
            filename: fileName || 'document',
            ...(trimmedBody ? { caption: trimmedBody } : {}),
          },
        }
      }
    } else {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toE164,
        type: 'text',
        text: {
          body: trimmedBody,
        },
      }
    }

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const data = await response.json()
    const messageSid: string | undefined =
      data?.messages?.[0]?.id || data?.id || undefined

    return { success: true, messageSid }
  } catch (error) {
    return { success: false, error: (error as any)?.message || String(error) }
  }
}

// Send message via Twilio API
async function sendTwilioMessage(
  accountSid: string,
  authToken: string,
  fromNumber: string,
  toNumber: string,
  body: string,
  mediaUrl?: string,
  repliedMessageSid?: string | null
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
    // Do NOT include unsupported Context field in FormData for Programmable Messaging.
    // If you want native quoted replies, switch to Twilio Conversations API or WhatsApp Cloud API.

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
