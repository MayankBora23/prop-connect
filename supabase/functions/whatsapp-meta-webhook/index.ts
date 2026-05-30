// @ts-ignore Deno URL import (resolved in Supabase Edge runtime)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore Deno URL import (resolved in Supabase Edge runtime)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleAiFlow } from '../whatsapp-webhook/handleAiFlow.ts'
import { containsHumanKeyword, processHumanTakeover } from '../whatsapp-webhook/humanTakeover.ts'

declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface MetaProfile {
  name?: string
}

interface MetaContact {
  profile?: MetaProfile
  wa_id?: string
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
  display_phone_number?: string
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
  messaging_product?: string
}

interface MetaChange {
  value?: MetaValue
  field?: string
}

interface MetaEntry {
  changes?: MetaChange[]
  id?: string
}

interface MetaWebhookBody {
  object?: string
  entry?: MetaEntry[]
}

interface CompanyRow {
  id: string
  whatsapp_provider: 'twilio' | 'meta' | null
  webhook_token: string | null
  meta_phone_number_id: string | null
  meta_access_token: string | null
  meta_webhook_verify_token: string | null
  industry: string | null
}

interface ParsedIncomingMessage {
  phoneNumberId: string
  contactPhone: string
  contactName: string | null
  body: string
  messageId: string | null
  rawType: string
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

/**
 * Normalize sender number for storage.
 * - strips non-digits
 * - if 10 digits, assumes India and prefixes +91
 * - otherwise prefixes +
 */
function normalizeInboundPhone(rawPhone: string | undefined): string | null {
  if (!rawPhone) return null
  const digits = rawPhone.replace(/[^\d]/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return `+${digits}`
}

/** Pulls text body for all common inbound Meta message types. */
function extractMessageBody(message: MetaMessage): string {
  return (message.text?.body ?? message.image?.caption ?? message.document?.caption ?? '').trim()
}

function safeJsonParse(raw: string): MetaWebhookBody | null {
  try {
    return JSON.parse(raw) as MetaWebhookBody
  } catch (error) {
    console.error('❌ Failed to parse Meta payload JSON', error)
    return null
  }
}

function flattenIncomingMessages(payload: MetaWebhookBody): ParsedIncomingMessage[] {
  const parsed: ParsedIncomingMessage[] = []
  const entries = Array.isArray(payload.entry) ? payload.entry : []

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : []
    for (const change of changes) {
      const value = change.value
      if (!value) continue

      const phoneNumberId = value.metadata?.phone_number_id
      if (!phoneNumberId) {
        console.warn('⚠️ Skipping change without metadata.phone_number_id')
        continue
      }

      const contactName = value.contacts?.[0]?.profile?.name ?? null
      const messages = Array.isArray(value.messages) ? value.messages : []

      for (const message of messages) {
        const contactPhone = normalizeInboundPhone(message.from)
        if (!contactPhone) {
          console.warn('⚠️ Skipping message with invalid sender number', { from: message.from })
          continue
        }

        parsed.push({
          phoneNumberId,
          contactPhone,
          contactName,
          body: extractMessageBody(message),
          messageId: message.id ? String(message.id) : null,
          rawType: message.type ?? 'unknown',
        })
      }
    }
  }

  return parsed
}

async function resolveCompany({
  supabase,
  tokenFromQuery,
  phoneNumberId,
}: {
  supabase: ReturnType<typeof createClient>
  tokenFromQuery: string | null
  phoneNumberId: string
}): Promise<CompanyRow | null> {
  // 1) Prefer explicit webhook token from URL (multi-tenant safe)
  if (tokenFromQuery) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, whatsapp_provider, webhook_token, meta_phone_number_id, meta_access_token, meta_webhook_verify_token, industry')
      .eq('webhook_token', tokenFromQuery)
      .maybeSingle<CompanyRow>()

    if (error) {
      console.error('❌ Company lookup by webhook_token failed', { tokenFromQuery, error })
    } else if (data) {
      console.log('✅ Company resolved by webhook_token', { companyId: data.id })
      return data
    }
  }

  // 2) Fallback: route by Meta phone_number_id in payload metadata
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('companies')
    .select('id, whatsapp_provider, webhook_token, meta_phone_number_id, meta_access_token, meta_webhook_verify_token, industry')
    .eq('meta_phone_number_id', phoneNumberId)
    .maybeSingle<CompanyRow>()

  if (fallbackError) {
    console.error('❌ Company lookup by meta_phone_number_id failed', { phoneNumberId, fallbackError })
    return null
  }

  if (fallbackData) {
    console.log('✅ Company resolved by meta_phone_number_id', { companyId: fallbackData.id, phoneNumberId })
  } else {
    console.error('❌ Company not found by token or meta_phone_number_id', { tokenFromQuery, phoneNumberId })
  }

  return fallbackData ?? null
}

serve(async (req: Request) => {
  console.log('='.repeat(90))
  console.log('📥 Meta WhatsApp webhook request', { method: req.method, url: req.url })
  console.log('='.repeat(90))

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)

    if (req.method === 'GET') return await handleVerification(url)
    if (req.method === 'POST') return await handleIncoming(req, url)

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  } catch (error) {
    console.error('💥 Top-level webhook failure', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

/**
 * Meta webhook verification.
 * Supports:
 * - token query param routing
 * - direct match via meta_webhook_verify_token
 * - optional lookup by meta_phone_number_id query when provided
 */
async function handleVerification(url: URL): Promise<Response> {
  const mode = url.searchParams.get('hub.mode')
  const challenge = url.searchParams.get('hub.challenge')
  const verifyToken = url.searchParams.get('hub.verify_token')
  const tokenFromQuery = url.searchParams.get('token')
  const phoneNumberIdFromQuery = url.searchParams.get('meta_phone_number_id')

  console.log('🔐 Verification request received', {
    mode,
    hasChallenge: !!challenge,
    hasVerifyToken: !!verifyToken,
    tokenFromQueryPresent: !!tokenFromQuery,
    phoneNumberIdFromQuery,
  })

  if (mode !== 'subscribe' || !challenge || !verifyToken) {
    console.warn('❌ Verification failed: missing/invalid hub params')
    return new Response('Verification failed', { status: 403, headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  let company: { id: string; meta_webhook_verify_token: string | null } | null = null

  if (tokenFromQuery) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, meta_webhook_verify_token')
      .eq('webhook_token', tokenFromQuery)
      .maybeSingle()
    if (error) console.error('❌ Verification lookup by webhook_token failed', error)
    if (data) company = data
  }

  if (!company && phoneNumberIdFromQuery) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, meta_webhook_verify_token')
      .eq('meta_phone_number_id', phoneNumberIdFromQuery)
      .maybeSingle()
    if (error) console.error('❌ Verification lookup by meta_phone_number_id failed', error)
    if (data) company = data
  }

  if (!company) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, meta_webhook_verify_token')
      .eq('meta_webhook_verify_token', verifyToken)
      .maybeSingle()
    if (error) console.error('❌ Verification lookup by verify_token failed', error)
    if (data) company = data
  }

  if (!company || company.meta_webhook_verify_token !== verifyToken) {
    console.warn('❌ Verification failed: token mismatch/company missing', {
      companyId: company?.id ?? null,
    })
    return new Response('Verification failed', { status: 403, headers: corsHeaders })
  }

  console.log('✅ Verification successful', { companyId: company.id })
  return new Response(challenge, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
  })
}

/**
 * Handles inbound Meta messages and mirrors Twilio flow:
 * conversation lookup/create -> incoming message insert -> human takeover -> AI flow.
 * Always returns HTTP 200 to Meta to avoid retries.
 */
async function handleIncoming(req: Request, url: URL): Promise<Response> {
  const tokenFromQuery = url.searchParams.get('token')
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const aiTriggeredConversationIds = new Set<string>()

  try {
    const rawBody = await req.text()
    console.log('📦 Raw POST payload length', rawBody.length)

    const parsedPayload = safeJsonParse(rawBody)
    if (!parsedPayload) {
      console.error('❌ Invalid JSON body, returning 200 to prevent webhook retries')
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    console.log('📦 Parsed Meta payload object', {
      object: parsedPayload.object,
      entries: parsedPayload.entry?.length ?? 0,
      tokenFromQueryPresent: !!tokenFromQuery,
    })

    const parsedMessages = flattenIncomingMessages(parsedPayload)
    if (parsedMessages.length === 0) {
      console.log('ℹ️ No inbound user messages found (likely status update only)')
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    for (const incoming of parsedMessages) {
      console.log('➡️ Processing incoming Meta message', {
        phoneNumberId: incoming.phoneNumberId,
        from: incoming.contactPhone,
        hasBody: incoming.body.length > 0,
        messageId: incoming.messageId,
        rawType: incoming.rawType,
      })

      const company = await resolveCompany({
        supabase,
        tokenFromQuery,
        phoneNumberId: incoming.phoneNumberId,
      })
      if (!company) continue

      // Enforce provider sanity to avoid cross-routing.
      if (company.whatsapp_provider && company.whatsapp_provider !== 'meta') {
        console.warn('⚠️ Company resolved but provider is not meta; skipping message', {
          companyId: company.id,
          provider: company.whatsapp_provider,
        })
        continue
      }

      const conversationLookup = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('company_id', company.id)
        .eq('contact_phone', incoming.contactPhone)
        .single()

      let conversationId: string | null = null

      if (conversationLookup.data) {
        conversationId = conversationLookup.data.id
        console.log('🔄 Existing conversation found', { conversationId })
        await supabase
          .from('whatsapp_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            contact_name: incoming.contactName ?? undefined,
          })
          .eq('id', conversationId)
      } else if (!conversationLookup.error || conversationLookup.error.code === 'PGRST116') {
        const { data: newConversation, error: createError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            company_id: company.id,
            contact_phone: incoming.contactPhone,
            contact_name: incoming.contactName,
            last_message_at: new Date().toISOString(),
            is_new_user: true,
            ai_enabled: true,
            current_step: 1,
          })
          .select('id')
          .single()

        if (createError) {
          console.error('❌ Failed to create conversation', { createError, incoming })
          continue
        }

        conversationId = newConversation.id
        console.log('✅ New conversation created', { conversationId })
      } else {
        console.error('❌ Failed conversation lookup', conversationLookup.error)
        continue
      }

      if (!conversationId) {
        console.error('❌ Conversation id missing after lookup/create')
        continue
      }

      // Idempotent message insert using Meta message id.
      let shouldInsertMessage = true
      if (incoming.messageId) {
        const { data: existingIncoming } = await supabase
          .from('whatsapp_messages')
          .select('id')
          .eq('message_sid', incoming.messageId)
          .maybeSingle()
        if (existingIncoming) {
          shouldInsertMessage = false
          console.log('♻️ Duplicate message received, skipping insert', {
            conversationId,
            messageId: incoming.messageId,
          })
        }
      }

      if (shouldInsertMessage) {
        const { error: insertMessageError } = await supabase
          .from('whatsapp_messages')
          .insert({
            conversation_id: conversationId,
            company_id: company.id,
            direction: 'incoming',
            body: incoming.body,
            status: 'delivered',
            message_sid: incoming.messageId,
          })

        if (insertMessageError) {
          console.error('❌ Failed to store incoming message', {
            insertMessageError,
            conversationId,
            companyId: company.id,
          })
          continue
        }
      }

      const { data: conversationData, error: conversationDataError } = await supabase
        .from('whatsapp_conversations')
        .select('is_new_user, ai_enabled, current_step, assigned_to, company_id, chat_status')
        .eq('id', conversationId)
        .single()

      if (conversationDataError || !conversationData) {
        console.error('❌ Failed to fetch conversation data for AI/handover', conversationDataError)
        continue
      }

      if (containsHumanKeyword(incoming.body)) {
        console.log('👋 Human takeover keyword detected', { conversationId })
        await processHumanTakeover({
          supabase,
          conversationId,
          companyId: company.id,
          assignedTo: conversationData.assigned_to ?? null,
          chatStatus: conversationData.chat_status ?? null,
          recipientAddress: `whatsapp:${incoming.contactPhone}`,
          whatsappSettings: {
            company_id: company.id,
            meta_phone_number_id: company.meta_phone_number_id,
            meta_access_token: company.meta_access_token,
          },
          provider: 'meta',
        })
        continue
      }

      const shouldRunAi =
        conversationData.is_new_user === true &&
        conversationData.ai_enabled === true &&
        !!company.meta_phone_number_id &&
        !!company.meta_access_token &&
        !aiTriggeredConversationIds.has(conversationId)

      console.log('🤖 AI evaluation', {
        conversationId,
        is_new_user: conversationData.is_new_user,
        ai_enabled: conversationData.ai_enabled,
        hasMetaPhoneId: !!company.meta_phone_number_id,
        hasMetaAccessToken: !!company.meta_access_token,
        shouldRunAi,
      })

      if (!shouldRunAi) continue

      aiTriggeredConversationIds.add(conversationId)
      await handleAiFlow({
        payload: {
          To: '',
          From: `whatsapp:${incoming.contactPhone}`,
          Body: incoming.body,
          MessageSid: incoming.messageId ?? '',
          ProfileName: incoming.contactName ?? undefined,
        },
        conversationId,
        whatsappSettings: {
          company_id: company.id,
          meta_phone_number_id: company.meta_phone_number_id,
          meta_access_token: company.meta_access_token,
        },
        conversationData,
        supabase,
        provider: 'meta',
        industry: company.industry || 'real_estate',
      })

      console.log('✅ AI flow completed', { conversationId })
    }
  } catch (error) {
    // Important for Meta reliability: acknowledge with 200 even when processing fails.
    console.error('💥 Fatal POST handling exception', error)
  }

  return new Response('ok', { status: 200, headers: corsHeaders })
}
