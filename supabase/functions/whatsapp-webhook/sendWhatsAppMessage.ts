// @ts-nocheck

export type WhatsappProvider = 'twilio' | 'meta'

function normalizeMetaRecipient(raw: string): string {
  return raw.replace(/[^\d]/g, '')
}

interface TwilioWhatsAppSettings {
  company_id: string
  twilio_auth_token: string
  whatsapp_number: string
}

interface MetaWhatsAppSettings {
  company_id: string
  meta_phone_number_id: string | null
  meta_access_token: string | null
}

type WhatsAppSettings = TwilioWhatsAppSettings | MetaWhatsAppSettings

export async function sendWhatsAppMessage(
  whatsappSettings: WhatsAppSettings | Record<string, unknown>,
  provider: WhatsappProvider,
  to: string,
  message: string,
  accountSid?: string
) {
  if (provider === 'twilio') {
    if (!accountSid) {
      throw new Error('Missing accountSid for Twilio send')
    }

    const twilioSettings = whatsappSettings as TwilioWhatsAppSettings
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const formData = new FormData()
    formData.append('To', to)
    formData.append('From', `whatsapp:${twilioSettings.whatsapp_number}`)
    formData.append('Body', message)

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${twilioSettings.twilio_auth_token}`)}`,
      },
      body: formData,
    })

    if (!response.ok) {
      console.error('Failed to send WhatsApp message:', response.statusText)
      const errorText = await response.text()
      console.error('Twilio error details:', errorText)
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`)
    }

    return
  }

  const metaSettings = whatsappSettings as MetaWhatsAppSettings

  const toTrimmed = to.trim()
  const recipientRaw = toTrimmed.startsWith('whatsapp:') ? toTrimmed.replace('whatsapp:', '') : toTrimmed
  const toE164 = recipientRaw.startsWith('+') ? recipientRaw : `+${recipientRaw}`
  const toMeta = normalizeMetaRecipient(toE164)

  const url = `https://graph.facebook.com/v18.0/${metaSettings.meta_phone_number_id}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toMeta,
    type: 'text',
    text: { body: message },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${metaSettings.meta_access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Meta API error: HTTP ${response.status}: ${errorText}`)
  }
}
