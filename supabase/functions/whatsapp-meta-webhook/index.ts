// @ts-ignore Deno URL import (resolved in Supabase Edge runtime)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore Deno URL import (resolved in Supabase Edge runtime)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleAiFlow, type WhatsappProvider } from '../whatsapp-webhook/handleAiFlow.ts'

declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface MetaProfile {
  name?: string
}

interface MetaContact {
  profile?: MetaProfile
}

interface MetaMedia {
  caption?: string
}

interface MetaMessage {
  from?: string
  id?: string
  timestamp?: string | number
  type?: string
  text?: { body?: string }
  image?: MetaMedia
  document?: MetaMedia
}

interface MetaMetadata {
  phone_number_id?: string
  waba_id?: string
}

interface MetaStatus {
  id?: string
  status?: string
  recipient_id?: string
}

interface MetaValue {
  messages?: MetaMessage[]
  metadata?: MetaMetadata
  contacts?: MetaContact[]
  statuses?: MetaStatus[]
}

interface MetaChange {
  value?: MetaValue
}

interface MetaEntry {
  changes?: MetaChange[]
}

interface MetaWebhookBody {
  entry?: MetaEntry[]
}

interface CompanyRow {
  id: string
  whatsapp_provider: WhatsappProvider | null
  meta_phone_number_id: string | null
  meta_access_token: string | null
  meta_waba_id: string | null
  meta_webhook_verify_token: string | null
  industry: string | null
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, serviceRoleKey)

function getCountryCode(phone: string): string {
  const p = phone.trim()
  if (p.startsWith('+91')) return 'IN'
  if (p.startsWith('+971')) return 'AE'
  if (p.startsWith('+966')) return 'SA'
  if (p.startsWith('+974')) return 'QA'
  return 'GCC'
}

function normalizeMetaPhoneNumber(phone: string | undefined): string | null {
  if (!phone) return null
  const trimmed = phone.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('+')) return trimmed
  // Meta typically sends raw digits (e.g. 91999...), while the app stores +prefixed values.
  return `+${trimmed}`
}

function parseMetaTimestampToIso(timestamp: string | number | undefined): string | null {
  if (timestamp === undefined || timestamp === null) return null
  const num = typeof timestamp === 'string' ? Number.parseInt(timestamp, 10) : Number(timestamp)
  if (Number.isNaN(num) || num <= 0) return null
  return new Date(num * 1000).toISOString()
}

async function getOrCreateConversation(params: {
  companyId: string
  contactPhone: string
  contactName?: string | null
}): Promise<string> {
  const { companyId, contactPhone, contactName } = params

  const { data: existing, error: existingError } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('company_id', companyId)
    .eq('contact_phone', contactPhone)
    .maybeSingle()

  if (existingError) {
    console.error('Meta webhook: conversation lookup failed', existingError)
    throw existingError
  }

  if (existing?.id) return existing.id

  const { data: created, error: createError } = await supabase
    .from('whatsapp_conversations')
    .insert({
      company_id: companyId,
      contact_phone: contactPhone,
      contact_name: contactName ?? null,
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (createError) {
    console.error('Meta webhook: conversation create failed', createError)
    throw createError
  }

  if (!created?.id) {
    throw new Error('Meta webhook: conversation create returned no id')
  }

  return created.id
}

async function resolveCompanyByMeta(params: {
  phoneNumberId?: string
  wabaId?: string
}): Promise<CompanyRow | null> {
  const { phoneNumberId, wabaId } = params

  if (phoneNumberId) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, whatsapp_provider, meta_phone_number_id, meta_access_token, meta_waba_id, meta_webhook_verify_token, industry')
      .eq('meta_phone_number_id', phoneNumberId)
      .maybeSingle<CompanyRow>()

    if (error) {
      console.error('Meta webhook: company resolve by phone_number_id failed', error)
      return null
    }
    return data ?? null
  }

  if (wabaId) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, whatsapp_provider, meta_phone_number_id, meta_access_token, meta_waba_id, meta_webhook_verify_token, industry')
      .eq('meta_waba_id', wabaId)
      .maybeSingle<CompanyRow>()

    if (error) {
      console.error('Meta webhook: company resolve by waba_id failed', error)
      return null
    }
    return data ?? null
  }

  return null
}

function extractMessageBody(message: MetaMessage): string {
  return (
    message.text?.body ??
    message.image?.caption ??
    message.document?.caption ??
    ''
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)

    if (req.method === 'GET') {
      return handleVerification(req, url)
    }

    if (req.method === 'POST') {
      return handleIncoming(req)
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  } catch (error) {
    console.error('Meta WhatsApp webhook: unexpected top-level error', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

async function handleVerification(req: Request, url: URL): Promise<Response> {
  const mode = url.searchParams.get('hub.mode')
  const challenge = url.searchParams.get('hub.challenge')
  const verifyToken = url.searchParams.get('hub.verify_token')

  if (mode !== 'subscribe' || !challenge || !verifyToken) {
    return new Response('Verification failed', { status: 403, headers: corsHeaders })
  }

  const { data: company, error } = await supabase
    .from('companies')
    .select('id, meta_webhook_verify_token')
    .eq('meta_webhook_verify_token', verifyToken)
    .maybeSingle()

  if (error) {
    console.error('Meta webhook verification: company lookup failed', error)
    return new Response('Verification failed', { status: 500, headers: corsHeaders })
  }

  if (!company) {
    console.warn('Meta webhook verification failed: verify_token not found')
    return new Response('Verification failed', { status: 403, headers: corsHeaders })
  }

  return new Response(challenge, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain',
    },
  })
}

async function handleIncoming(req: Request): Promise<Response> {
  // Meta expects 200 even if we can't fully process payload.
  try {
    const body = (await req.json()) as MetaWebhookBody

    const entries = Array.isArray(body.entry) ? body.entry : []
    if (entries.length === 0) {
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const aiTriggeredConversationIds = new Set<string>()

    for (const entry of entries) {
      const changes = entry.changes ?? []
      for (const change of changes) {
        const value = change.value
        if (!value) continue

        const phoneNumberId = value.metadata?.phone_number_id
        const wabaId = value.metadata?.waba_id

        const company = await resolveCompanyByMeta({ phoneNumberId, wabaId })
        if (!company) {
          console.warn('Meta webhook: no company resolved for incoming message', {
            phoneNumberId,
            wabaId,
          })
          continue
        }

        const statuses = Array.isArray(value.statuses) ? value.statuses : []
        for (const st of statuses) {
          if (st?.status !== 'sent') continue
          if (company.whatsapp_provider !== 'meta') continue
          const wamid = st.id as string | undefined
          const recipientId = st.recipient_id as string | undefined
          if (!wamid || !recipientId) continue

          const phone = normalizeMetaPhoneNumber(recipientId) || ''
          const destination_country = getCountryCode(phone)
          const message_category = 'utility'

          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/deduct-credits`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                company_id: company.id,
                provider: 'meta',
                service_type: 'whatsapp',
                destination_country,
                message_category,
                usage_quantity: 1,
                reference_id: wamid,
              }),
            })
            const j = (await res.json()) as { success?: boolean; reason?: string }
            if (!j?.success) {
              console.warn('Meta webhook deduct-credits (status sent):', j)
            }
          } catch (e) {
            console.error('Meta webhook deduct-credits request failed', e)
          }
        }

        const contactName = value.contacts?.[0]?.profile?.name ?? null
        const messages = Array.isArray(value.messages) ? value.messages : []
        for (const message of messages) {
          if (company.whatsapp_provider === 'meta' && phoneNumberId && String(message.from) === String(phoneNumberId)) {
            const recipientRaw =
              (message as { to?: string }).to ??
              (message as { recipient_id?: string }).recipient_id ??
              ''
            const toPhone = normalizeMetaPhoneNumber(recipientRaw)
            if (toPhone) {
              const destination_country = getCountryCode(toPhone)
              let message_category = 'utility'
              if (message.type === 'template') {
                const cat = (message as { template?: { category?: string } }).template?.category
                if (cat) {
                  const c = String(cat).toLowerCase()
                  if (['marketing', 'utility', 'authentication', 'service'].includes(c)) {
                    message_category = c
                  }
                }
              }
              try {
                const res = await fetch(`${supabaseUrl}/functions/v1/deduct-credits`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${serviceRoleKey}`,
                  },
                  body: JSON.stringify({
                    company_id: company.id,
                    provider: 'meta',
                    service_type: 'whatsapp',
                    destination_country,
                    message_category,
                    usage_quantity: 1,
                    reference_id: String(message.id || ''),
                  }),
                })
                const j = (await res.json()) as { success?: boolean; reason?: string }
                if (!j?.success) {
                  console.warn('Meta outbound message deduct-credits:', j)
                }
              } catch (e) {
                console.error('Meta outbound message deduct-credits error', e)
              }
            }
            continue
          }
          const contactPhone = normalizeMetaPhoneNumber(message.from)
          if (!contactPhone) {
            console.warn('Meta webhook: message missing from phone', { message })
            continue
          }

          const conversationId = await getOrCreateConversation({
            companyId: company.id,
            contactPhone,
            contactName,
          })

          const createdAtIso = parseMetaTimestampToIso(message.timestamp) ?? new Date().toISOString()
          const bodyText = extractMessageBody(message)

          const { data: conversationData, error: conversationFetchError } = await supabase
            .from('whatsapp_conversations')
            .select('is_new_user, ai_enabled, current_step')
            .eq('id', conversationId)
            .single()

          if (conversationFetchError) {
            console.error('Meta webhook: error fetching conversation data', conversationFetchError)
            continue
          }

          const metaPhoneNumberId = company.meta_phone_number_id
          const metaAccessToken = company.meta_access_token
          const wantsAi =
            conversationData?.is_new_user === true && conversationData?.ai_enabled === true
          const canRunAi =
            wantsAi && !!metaPhoneNumberId && !!metaAccessToken
          const runAiThisRequest =
            canRunAi && !aiTriggeredConversationIds.has(conversationId)

          if (
            !aiTriggeredConversationIds.has(conversationId) &&
            wantsAi &&
            (!metaPhoneNumberId || !metaAccessToken)
          ) {
            console.warn('Meta webhook: AI enabled but Meta credentials missing', {
              meta_phone_number_id_present: !!metaPhoneNumberId,
              meta_access_token_present: !!metaAccessToken,
            })
          }

          // Match Twilio webhook: handleAiFlow inserts the incoming row itself. Pre-inserting here
          // would duplicate every AI-path message in the inbox.
          if (!runAiThisRequest) {
            const { error: insertError } = await supabase
              .from('whatsapp_messages')
              .insert({
                conversation_id: conversationId,
                company_id: company.id,
                direction: 'incoming',
                body: bodyText,
                status: 'delivered',
                message_sid: message.id ?? null,
                created_at: createdAtIso,
              })

            if (insertError) {
              console.error('Meta webhook: failed to insert incoming message', insertError)
              continue
            }

            await supabase
              .from('whatsapp_conversations')
              .update({ last_message_at: new Date().toISOString() })
              .eq('id', conversationId)
          }

          if (runAiThisRequest) {
            const provider: WhatsappProvider = 'meta'
            const companyIndustry = company.industry ?? 'real_estate'

            aiTriggeredConversationIds.add(conversationId)

            await handleAiFlow({
              payload: {
                To: '',
                From: `whatsapp:${contactPhone}`,
                Body: bodyText,
                MessageSid: String(message.id ?? ''),
                AccountSid: undefined,
                ProfileName: contactName ?? undefined,
              },
              conversationId,
              whatsappSettings: {
                company_id: company.id,
                meta_phone_number_id: metaPhoneNumberId,
                meta_access_token: metaAccessToken,
              },
              conversationData,
              supabase,
              provider,
              industry: companyIndustry,
            })
          }
        }
      }
    }

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Meta webhook: handleIncoming failed', error)
    // Meta will retry on non-2xx. Keeping 200 avoids webhook churn.
    return new Response('ok', { status: 200, headers: corsHeaders })
  }
}

