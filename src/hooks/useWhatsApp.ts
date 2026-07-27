import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'
import { toast } from 'sonner'
import { useCurrentCompany } from '@/hooks/useCompany'

type WhatsAppConversationRow = Database['public']['Tables']['whatsapp_conversations']['Row']
type WhatsAppConversationUpdate = Database['public']['Tables']['whatsapp_conversations']['Update']
type ChatAssignmentHistoryInsert = Database['public']['Tables']['chat_assignment_history']['Insert']
type ChatAssignmentHistoryRow = Database['public']['Tables']['chat_assignment_history']['Row']

export interface WhatsAppSettings {
  id: string
  company_id: string
  twilio_sid: string
  twilio_auth_token: string
  whatsapp_number: string
  twilio_api_key_sid?: string | null
  twilio_api_key_secret?: string | null
  twilio_twiml_app_sid?: string | null
  telephony_provider?: 'twilio' | 'callerdesk' | string | null
  callerdesk_api_key?: string | null
  callerdesk_secret_key?: string | null
  callerdesk_integration_key?: string | null
  callerdesk_bridge_number?: string | null
  callerdesk_virtual_number?: string | null
  created_at: string
  updated_at: string
}

export interface WhatsAppConversation {
  id: string
  company_id: string
  contact_phone: string
  contact_name?: string
  last_message_at: string
  created_at: string
  updated_at: string
  is_new_user?: boolean
  ai_enabled?: boolean
  current_step?: number
  chat_status?: string
  assigned_to?: string | null
  assigned_by?: string | null
  assigned_at?: string | null
  human_requested_at?: string | null
  agent_availability?: string | null
  assigned_profile?: { id: string; name: string } | null
  // Real estate columns
  purpose?: string
  property_type?: string
  budget?: string
  location?: string
  // Automobile columns
  vehicle_type?: string
  brand?: string
  // Education columns
  interest?: string
  course?: string
  study_mode?: string
  subjects_interest?: string
  last_customer_message_at?: string | null
}

export interface WhatsAppMessage {
  id: string
  conversation_id: string
  direction: 'incoming' | 'outgoing'
  body: string
  status: string
  message_sid?: string
  created_at: string
  company_id: string
  file_urls?: string[] // Array of file URLs
  file_names?: string[] // Array of original filenames
  file_types?: string[] // Array of file types
  reply_to_message_id?: string // ID of message being replied to
  reply_to_message_sid?: string // Twilio message SID being replied to
}

export interface WhatsAppMessageWithConversation extends WhatsAppMessage {
  whatsapp_conversations: WhatsAppConversation
  // reply_to_message removed to avoid complex nested selects in REST queries
}

export interface ChatAssignmentHistoryEntry {
  id: string
  company_id: string
  conversation_id: string
  action_type: string
  old_assigned_to: string | null
  new_assigned_to: string | null
  changed_by: string | null
  notes: string | null
  created_at: string
  changed_by_profile?: { id: string; name: string } | null
  old_assigned_profile?: { id: string; name: string } | null
  new_assigned_profile?: { id: string; name: string } | null
}

/** Drop duplicate rows (same Twilio/Meta message_sid, or same id). */
function dedupeWhatsAppMessages<T extends { id: string; message_sid?: string | null }>(
  messages: T[]
): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const msg of messages) {
    const key = msg.message_sid || msg.id
    if (seen.has(key)) continue
    seen.add(key)
    result.push(msg)
  }
  return result
}

async function getCurrentProfileId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  return profile?.id ?? null
}

// WhatsApp Settings Hooks
export function useWhatsAppSettings(companyId?: string | null) {
  return useQuery({
    queryKey: ['whatsapp-settings', companyId],
    enabled: !!companyId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('company_id', companyId as string)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data as WhatsAppSettings | null
    },
  })
}

export function useCreateWhatsAppSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      settings: Omit<WhatsAppSettings, 'id' | 'created_at' | 'updated_at'> & {
        callerdesk_virtual_number?: string | null
      }
    ) => {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .insert(settings)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] })
      queryClient.invalidateQueries({ queryKey: ['telephony-settings'] })
      queryClient.invalidateQueries({ queryKey: ['call-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['call-logs'] })
      toast.success('WhatsApp settings saved successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save WhatsApp settings')
    },
  })
}

export function useUpdateWhatsAppSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: (Partial<WhatsAppSettings> & { callerdesk_virtual_number?: string | null }) & { id: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] })
      queryClient.invalidateQueries({ queryKey: ['telephony-settings'] })
      queryClient.invalidateQueries({ queryKey: ['call-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['call-logs'] })
      toast.success('WhatsApp settings updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update WhatsApp settings')
    },
  })
}

// WhatsApp Conversations Hooks
export function useWhatsAppConversations() {
  const { data: company } = useCurrentCompany()
  const companyId = company?.id

  return useQuery({
    queryKey: ['whatsapp-conversations', companyId],
    enabled: !!companyId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('last_message_at', { ascending: false })

      if (error) throw error

      const rows = (data || []) as WhatsAppConversationRow[]
      if (rows.length === 0) return [] as WhatsAppConversation[]

      const assignedIds = [
        ...new Set(rows.map((c) => c.assigned_to).filter((id): id is string => !!id)),
      ]

      const profileMap = new Map<string, { id: string; name: string }>()
      if (assignedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', assignedIds)

        for (const profile of profiles || []) {
          profileMap.set(profile.id, { id: profile.id, name: profile.name || '' })
        }
      }

      return rows.map((conv) => ({
        ...conv,
        assigned_profile: conv.assigned_to
          ? profileMap.get(conv.assigned_to) ?? null
          : null,
      })) as WhatsAppConversation[]
    },
  })
}

export function useWhatsAppConversation(id: string) {
  const { data: company } = useCurrentCompany()
  const companyId = company?.id

  return useQuery({
    queryKey: ['whatsapp-conversation', id, companyId],
    enabled: !!id && !!companyId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as WhatsAppConversation
    },
  })
}

export function useCreateWhatsAppConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conversation: Omit<WhatsAppConversation, 'id' | 'created_at' | 'updated_at'>) => {
      // Validate required fields
      if (!conversation.contact_phone || conversation.contact_phone.trim() === '') {
        throw new Error('Contact phone number is required')
      }
      if (!conversation.company_id || conversation.company_id.trim() === '') {
        throw new Error('Company ID is required')
      }

      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .insert(conversation)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
      toast.success('Contact added to WhatsApp inbox')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add contact to WhatsApp inbox')
    },
  })
}

export function useUpdateWhatsAppConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WhatsAppConversation> & { id: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', data.id] })
      toast.success('Contact name updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update contact name')
    },
  })
}

export function useClearWhatsAppChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('whatsapp_messages')
        .delete()
        .eq('conversation_id', conversationId)

      if (error) throw error
      return { conversationId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', data.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages-realtime', data.conversationId] })
      toast.success('Chat cleared successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to clear chat')
    },
  })
}

export function useDeleteWhatsAppMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('whatsapp_messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error
      return { messageId }
    },
    onSuccess: (data, variables) => {
      // Invalidate all message queries since we don't know which conversation this message belonged to
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages-realtime'] })
      toast.success('Message deleted')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete message')
    },
  })
}

export function useDeleteWhatsAppConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ conversationId, deleteMessages = false }: { conversationId: string, deleteMessages?: boolean }) => {
      // If deleting messages too, delete them first
      if (deleteMessages) {
        const { error: messagesError } = await supabase
          .from('whatsapp_messages')
          .delete()
          .eq('conversation_id', conversationId)

        if (messagesError) throw messagesError
      }

      // Delete the conversation
      const { error } = await supabase
        .from('whatsapp_conversations')
        .delete()
        .eq('id', conversationId)

      if (error) throw error
      return { conversationId, deleteMessages }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', data.conversationId] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages-realtime', data.conversationId] })
      toast.success(data.deleteMessages ? 'Contact and messages deleted successfully' : 'Contact deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete contact')
    },
  })
}

// WhatsApp Messages Hooks
export function useWhatsAppMessages(conversationId: string) {
  const { data: company } = useCurrentCompany()
  const companyId = company?.id

  return useQuery({
    queryKey: ['whatsapp-messages', conversationId, companyId],
    enabled: !!conversationId && !!companyId,
    staleTime: 30_000,
    queryFn: async () => {
      // Fetch messages for the conversation
      const { data: messages, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          whatsapp_conversations (
            id,
            contact_phone,
            contact_name
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const msgs = (messages as unknown) as WhatsAppMessageWithConversation[]

      // Collect unique reply_to_message_id and reply_to_message_sid values
      const replyIds = Array.from(new Set(msgs.map(m => m.reply_to_message_id).filter(Boolean))) as string[]
      const replySids = Array.from(new Set(msgs.map(m => m.reply_to_message_sid).filter(Boolean))) as string[]

      if (replyIds.length === 0 && replySids.length === 0) {
        return dedupeWhatsAppMessages(msgs)
      }

      // Fetch replied-to messages by id
      const repliesByIdPromise = replyIds.length > 0
        ? supabase
            .from('whatsapp_messages')
            .select('id, body, file_urls, file_names, file_types, direction, created_at, message_sid')
            .in('id', replyIds)
        : Promise.resolve({ data: [], error: null })

      // Fetch replied-to messages by message_sid
      const repliesBySidPromise = replySids.length > 0
        ? supabase
            .from('whatsapp_messages')
            .select('id, body, file_urls, file_names, file_types, direction, created_at, message_sid')
            .in('message_sid', replySids)
        : Promise.resolve({ data: [], error: null })

      const [byIdResult, bySidResult] = await Promise.all([repliesByIdPromise, repliesBySidPromise])
      const repliesError = byIdResult.error || bySidResult.error

      if (repliesError) {
        console.warn('Failed to fetch reply messages:', repliesError)
        return dedupeWhatsAppMessages(msgs)
      }

      const combinedReplies = [...(byIdResult.data || []), ...(bySidResult.data || [])] as any[]
      const replyMap = new Map<string, Partial<WhatsAppMessage>>()
      combinedReplies.forEach(r => {
        if (r.id) replyMap.set(r.id, r)
        if (r.message_sid) replyMap.set(r.message_sid, r)
      })

      // Attach reply object (match by id or sid)
      const augmented = msgs.map(m => {
        if (m.reply_to_message_id && replyMap.has(m.reply_to_message_id)) {
          return { ...m, reply_to_message: replyMap.get(m.reply_to_message_id) as WhatsAppMessage }
        }
        if (m.reply_to_message_sid && replyMap.has(m.reply_to_message_sid)) {
          return { ...m, reply_to_message: replyMap.get(m.reply_to_message_sid) as WhatsAppMessage }
        }
        return m
      })

      return dedupeWhatsAppMessages(augmented)
    },
  })
}

export function useCreateWhatsAppMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (message: Omit<WhatsAppMessage, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert(message)
        .select()
        .single()

      if (error) throw error

      // Update conversation last_message_at
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', message.conversation_id)

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', data.conversation_id] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
    },
  })
}

// Realtime subscription for messages
export function useWhatsAppMessagesRealtime(conversationId: string) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['whatsapp-messages-realtime', conversationId],
    queryFn: async () => {
      // Set up realtime subscription
      const subscription = supabase
        .channel(`whatsapp-messages-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            console.log('Realtime message update:', payload)
            queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] })
            queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
          }
        )
        .subscribe()

      // Fetch initial data
      const { data: messages, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          whatsapp_conversations (
            id,
            contact_phone,
            contact_name
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const msgs = (messages as unknown) as WhatsAppMessageWithConversation[]
      const replyIds = Array.from(new Set(msgs.map(m => m.reply_to_message_id).filter(Boolean))) as string[]
      const replySids = Array.from(new Set(msgs.map(m => m.reply_to_message_sid).filter(Boolean))) as string[]

      if (replyIds.length === 0 && replySids.length === 0) {
        return { data: dedupeWhatsAppMessages(msgs), subscription }
      }

      const repliesByIdPromise = replyIds.length > 0
        ? supabase
            .from('whatsapp_messages')
            .select('id, body, file_urls, file_names, file_types, direction, created_at, message_sid')
            .in('id', replyIds)
        : Promise.resolve({ data: [], error: null })

      const repliesBySidPromise = replySids.length > 0
        ? supabase
            .from('whatsapp_messages')
            .select('id, body, file_urls, file_names, file_types, direction, created_at, message_sid')
            .in('message_sid', replySids)
        : Promise.resolve({ data: [], error: null })

      const [byIdResult, bySidResult] = await Promise.all([repliesByIdPromise, repliesBySidPromise])
      const repliesError = byIdResult.error || bySidResult.error

      if (repliesError) {
        console.warn('Failed to fetch reply messages:', repliesError)
        return { data: dedupeWhatsAppMessages(msgs), subscription }
      }

      const combinedReplies = [...(byIdResult.data || []), ...(bySidResult.data || [])] as any[]
      const replyMap = new Map<string, Partial<WhatsAppMessage>>()
      combinedReplies.forEach(r => {
        if (r.id) replyMap.set(r.id, r)
        if (r.message_sid) replyMap.set(r.message_sid, r)
      })

      const augmented = msgs.map(m => {
        if (m.reply_to_message_id && replyMap.has(m.reply_to_message_id)) {
          return { ...m, reply_to_message: replyMap.get(m.reply_to_message_id) as WhatsAppMessage }
        }
        if (m.reply_to_message_sid && replyMap.has(m.reply_to_message_sid)) {
          return { ...m, reply_to_message: replyMap.get(m.reply_to_message_sid) as WhatsAppMessage }
        }
        return m
      })

      return {
        data: dedupeWhatsAppMessages(augmented),
        subscription,
      }
    },
    enabled: !!conversationId,
  })
}

export function useConversationRealtime(conversationId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`whatsapp-conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', conversationId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient])
}

export function useToggleAI() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ conversationId, enabled }: { conversationId: string; enabled: boolean }) => {
      const profileId = await getCurrentProfileId()

      const { data: currentRaw, error: fetchError } = await supabase
        .from('whatsapp_conversations')
        .select('company_id, chat_status')
        .eq('id', conversationId)
        .single()

      if (fetchError) throw fetchError

      const current = currentRaw as Pick<WhatsAppConversationRow, 'company_id' | 'chat_status'>

      const chatStatus = enabled
        ? 'ai_handling'
        : current.chat_status === 'assigned'
          ? 'assigned'
          : 'pending'

      const updates: WhatsAppConversationUpdate = {
        ai_enabled: enabled,
        chat_status: chatStatus,
      }

      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update(updates)
        .eq('id', conversationId)
        .select()
        .single()

      if (error) throw error

      const historyRow: ChatAssignmentHistoryInsert = {
        company_id: current.company_id,
        conversation_id: conversationId,
        action_type: 'ai_toggled',
        changed_by: profileId,
        notes: enabled ? 'AI enabled' : 'AI disabled',
      }
      await supabase.from('chat_assignment_history').insert(historyRow)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
      toast.success('AI setting updated')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update AI setting')
    },
  })
}

export function useAssignChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      assignToProfileId,
      companyId,
    }: {
      conversationId: string
      assignToProfileId: string | null
      companyId: string
    }) => {
      const profileId = await getCurrentProfileId()

      const { data: currentRaw, error: fetchError } = await supabase
        .from('whatsapp_conversations')
        .select('assigned_to')
        .eq('id', conversationId)
        .single()

      if (fetchError) throw fetchError

      const current = currentRaw as Pick<WhatsAppConversationRow, 'assigned_to'>
      const oldAssignedTo = current.assigned_to
      let actionType: string

      if (!assignToProfileId) {
        actionType = 'unassigned'
        const unassignUpdates: WhatsAppConversationUpdate = {
          assigned_to: null,
          assigned_by: null,
          assigned_at: null,
          chat_status: 'pending',
        }
        const { error } = await supabase
          .from('whatsapp_conversations')
          .update(unassignUpdates)
          .eq('id', conversationId)

        if (error) throw error
      } else {
        actionType =
          oldAssignedTo && oldAssignedTo !== assignToProfileId ? 'reassigned' : 'assigned'

        const assignUpdates: WhatsAppConversationUpdate = {
          assigned_to: assignToProfileId,
          assigned_by: profileId,
          assigned_at: new Date().toISOString(),
          chat_status: 'assigned',
          ai_enabled: false,
        }
        const { error } = await supabase
          .from('whatsapp_conversations')
          .update(assignUpdates)
          .eq('id', conversationId)

        if (error) throw error

        const { data: assigneeProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('id', assignToProfileId)
          .maybeSingle()

        if (assigneeProfile?.user_id) {
          const { error: notifError } = await (supabase as any).from('notifications').insert({
            user_id: assigneeProfile.user_id,
            type: 'system_alert',
            title: 'Chat Assigned to You',
            message: 'A WhatsApp conversation has been assigned to you',
            related_id: conversationId,
            company_id: companyId,
            read: false,
          })
          if (notifError) throw notifError
        }
      }

      const historyRow: ChatAssignmentHistoryInsert = {
        company_id: companyId,
        conversation_id: conversationId,
        action_type: actionType,
        old_assigned_to: oldAssignedTo,
        new_assigned_to: assignToProfileId,
        changed_by: profileId,
      }
      await supabase.from('chat_assignment_history').insert(historyRow)

      return { conversationId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
      toast.success('Chat assignment updated')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign chat')
    },
  })
}

export function useUpdateAgentAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ availability }: { availability: 'available' | 'busy' | 'offline' }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('profiles')
        .update({ agent_availability: availability })
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['currentProfile'] })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      if (variables.availability === 'offline') {
        toast('Tip: Enable AI auto-handling to ensure customers get responses while you\'re offline.')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update availability')
    },
  })
}

export function useChatAssignmentHistory(conversationId: string) {
  const { data: company } = useCurrentCompany()
  const companyId = company?.id

  return useQuery({
    queryKey: ['chat-assignment-history', conversationId, companyId],
    enabled: !!conversationId && !!companyId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_assignment_history')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const rows = (data || []) as ChatAssignmentHistoryRow[]
      if (rows.length === 0) return [] as ChatAssignmentHistoryEntry[]

      const profileIds = [
        ...new Set(
          rows
            .flatMap((r) => [r.changed_by, r.old_assigned_to, r.new_assigned_to])
            .filter((id): id is string => !!id)
        ),
      ]

      const profileMap = new Map<string, { id: string; name: string }>()
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', profileIds)

        for (const profile of profiles || []) {
          profileMap.set(profile.id, { id: profile.id, name: profile.name || '' })
        }
      }

      return rows.map((entry) => ({
        ...entry,
        changed_by_profile: entry.changed_by
          ? profileMap.get(entry.changed_by) ?? null
          : null,
        old_assigned_profile: entry.old_assigned_to
          ? profileMap.get(entry.old_assigned_to) ?? null
          : null,
        new_assigned_profile: entry.new_assigned_to
          ? profileMap.get(entry.new_assigned_to) ?? null
          : null,
      })) as ChatAssignmentHistoryEntry[]
    },
  })
}

export function useHumanTakeover() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ conversationId, companyId }: { conversationId: string; companyId: string }) => {
      const profileId = await getCurrentProfileId()

      const { data: currentRaw, error: fetchError } = await supabase
        .from('whatsapp_conversations')
        .select('assigned_to')
        .eq('id', conversationId)
        .single()

      if (fetchError) throw fetchError

      const current = currentRaw as Pick<WhatsAppConversationRow, 'assigned_to'>

      const takeoverUpdates: WhatsAppConversationUpdate = {
        ai_enabled: false,
        chat_status: 'human_requested',
        human_requested_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('whatsapp_conversations')
        .update(takeoverUpdates)
        .eq('id', conversationId)

      if (error) throw error

      const historyRow: ChatAssignmentHistoryInsert = {
        company_id: companyId,
        conversation_id: conversationId,
        action_type: 'human_requested',
        changed_by: profileId,
      }
      await supabase.from('chat_assignment_history').insert(historyRow)

      if (current.assigned_to) {
        const { data: assigneeProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('id', current.assigned_to)
          .maybeSingle()

        if (assigneeProfile?.user_id) {
          await (supabase as any).from('notifications').insert({
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

      const { data: adminRoles, error: arErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('company_id', companyId)
        .in('role', ['super_admin', 'admin'])

      if (arErr) throw arErr

      const { data: { session } } = await supabase.auth.getSession()
      const notifRows = (adminRoles || [])
        .filter((r) => r.user_id && r.user_id !== session?.user?.id)
        .map((r) => ({
          user_id: r.user_id as string,
          type: 'system_alert' as const,
          title: 'Human Support Requested',
          message: 'Customer requested human agent in WhatsApp chat',
          related_id: conversationId,
          company_id: companyId,
          read: false,
        }))

      if (notifRows.length > 0) {
        const { error: nErr } = await (supabase as any).from('notifications').insert(notifRows)
        if (nErr) throw nErr
      }

      return { conversationId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to request human takeover')
    },
  })
}
