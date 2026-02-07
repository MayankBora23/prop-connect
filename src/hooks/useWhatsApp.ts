import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export interface WhatsAppSettings {
  id: string
  company_id: string
  twilio_sid: string
  twilio_auth_token: string
  whatsapp_number: string
  twilio_api_key_sid?: string | null
  twilio_api_key_secret?: string | null
  twilio_twiml_app_sid?: string | null
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
}

export interface WhatsAppMessageWithConversation extends WhatsAppMessage {
  whatsapp_conversations: WhatsAppConversation
  // reply_to_message removed to avoid complex nested selects in REST queries
}

// WhatsApp Settings Hooks
export function useWhatsAppSettings() {
  return useQuery({
    queryKey: ['whatsapp-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data as WhatsAppSettings | null
    },
  })
}

export function useCreateWhatsAppSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: Omit<WhatsAppSettings, 'id' | 'created_at' | 'updated_at'>) => {
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
    mutationFn: async ({ id, ...updates }: Partial<WhatsAppSettings> & { id: string }) => {
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
      toast.success('WhatsApp settings updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update WhatsApp settings')
    },
  })
}

// WhatsApp Conversations Hooks
export function useWhatsAppConversations() {
  return useQuery({
    queryKey: ['whatsapp-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('last_message_at', { ascending: false })

      if (error) throw error
      return data as WhatsAppConversation[]
    },
  })
}

export function useWhatsAppConversation(id: string) {
  return useQuery({
    queryKey: ['whatsapp-conversation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as WhatsAppConversation
    },
    enabled: !!id,
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
  return useQuery({
    queryKey: ['whatsapp-messages', conversationId],
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
        return msgs
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
        return msgs
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

      return augmented
    },
    enabled: !!conversationId,
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
        return { data: msgs, subscription }
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
        return { data: msgs, subscription }
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
        data: augmented,
        subscription,
      }
    },
    enabled: !!conversationId,
  })
}
