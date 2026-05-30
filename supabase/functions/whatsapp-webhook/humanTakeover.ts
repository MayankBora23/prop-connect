// @ts-nocheck
import { sendWhatsAppMessage, type WhatsappProvider } from './sendWhatsAppMessage.ts'

export const HUMAN_KEYWORDS = [
  'human',
  'agent',
  'support',
  'executive',
  'call me',
  'help me',
  'real person',
  'representative',
]

export const HUMAN_TAKEOVER_CONFIRMATION_MESSAGE =
  "I've connected you with our human agent. They'll assist you shortly."

export function containsHumanKeyword(body: string): boolean {
  const lower = (body || '').toLowerCase()
  return HUMAN_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export interface HumanTakeoverParams {
  supabase: any
  conversationId: string
  companyId: string
  assignedTo: string | null
  chatStatus?: string | null
  recipientAddress: string
  whatsappSettings: Record<string, unknown>
  provider: WhatsappProvider
  accountSid?: string
}

/** Apply human_requested state, notify team, and send auto-reply to the customer. */
export async function processHumanTakeover(params: HumanTakeoverParams): Promise<void> {
  const {
    supabase,
    conversationId,
    companyId,
    assignedTo: assignedToParam,
    chatStatus: chatStatusParam,
    recipientAddress,
    whatsappSettings,
    provider,
    accountSid,
  } = params

  const { data: convRow } = await supabase
    .from('whatsapp_conversations')
    .select('assigned_to, chat_status')
    .eq('id', conversationId)
    .maybeSingle()

  const assignedTo = assignedToParam ?? convRow?.assigned_to ?? null
  const chatStatus = chatStatusParam ?? convRow?.chat_status ?? null
  const alreadyRequested = chatStatus === 'human_requested'

  await supabase
    .from('whatsapp_conversations')
    .update({
      ai_enabled: false,
      chat_status: 'human_requested',
      human_requested_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  await supabase.from('chat_assignment_history').insert({
    company_id: companyId,
    conversation_id: conversationId,
    action_type: 'human_requested',
    notes: 'Triggered by customer keyword',
  })

  if (assignedTo) {
    const { data: assigneeProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', assignedTo)
      .maybeSingle()

    if (assigneeProfile?.user_id) {
      await supabase.from('notifications').insert({
        user_id: assigneeProfile.user_id,
        type: 'system_alert',
        title: 'Human Support Requested',
        message: 'Customer requested human agent in WhatsApp chat',
        related_id: conversationId,
        company_id: companyId,
        read: false,
      })
    }
  }

  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('company_id', companyId)
    .in('role', ['super_admin', 'admin'])

  const adminNotifRows = (adminRoles || [])
    .filter((r: { user_id: string | null }) => r.user_id)
    .map((r: { user_id: string }) => ({
      user_id: r.user_id,
      type: 'system_alert',
      title: 'Human Support Requested',
      message: 'Customer requested human agent in WhatsApp chat',
      related_id: conversationId,
      company_id: companyId,
      read: false,
    }))

  if (adminNotifRows.length > 0) {
    await supabase.from('notifications').insert(adminNotifRows)
  }

  if (!alreadyRequested) {
    try {
      await sendWhatsAppMessage(
        whatsappSettings,
        provider,
        recipientAddress,
        HUMAN_TAKEOVER_CONFIRMATION_MESSAGE,
        accountSid
      )

      await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        company_id: companyId,
        body: HUMAN_TAKEOVER_CONFIRMATION_MESSAGE,
        direction: 'outgoing',
        status: 'sent',
      })

      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

      console.log('Human takeover confirmation sent to customer:', recipientAddress)
    } catch (sendError) {
      console.error('Failed to send human takeover confirmation:', sendError)
    }
  }

  console.log('Human takeover triggered for conversation:', conversationId)
}
