import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export interface WhatsAppSettings {
  id: string
  company_id: string
  twilio_sid: string
  twilio_auth_token: string
  whatsapp_number: string
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
  file_url?: string
  file_name?: string
  file_type?: string
}

export interface WhatsAppMessageWithConversation extends WhatsAppMessage {
  whatsapp_conversations: WhatsAppConversation
}

// WhatsApp Settings Hooks
export function useWhatsAppSettings() {
  return useQuery({
    queryKey: ['whatsapp-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_settings' as any)
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return (data as unknown) as WhatsAppSettings | null
    },
  })
}

export function useCreateWhatsAppSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: Omit<WhatsAppSettings, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('whatsapp_settings' as any)
        .insert(settings as any)
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
        .from('whatsapp_settings' as any)
        .update(updates as any)
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
        .from('whatsapp_conversations' as any)
        .select('*')
        .order('last_message_at', { ascending: false })

      if (error) throw error
      return (data as unknown) as WhatsAppConversation[]
    },
  })
}

export function useWhatsAppConversation(id: string) {
  return useQuery({
    queryKey: ['whatsapp-conversation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations' as any)
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return (data as unknown) as WhatsAppConversation
    },
    enabled: !!id,
  })
}

export function useUpdateWhatsAppConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WhatsAppConversation> & { id: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', (data as any).id] })
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
          .from('whatsapp_messages' as any)
          .delete()
          .eq('conversation_id', conversationId)

        if (messagesError) throw messagesError
      }

      // Delete the conversation
      const { error } = await supabase
        .from('whatsapp_conversations' as any)
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
      const { data, error } = await supabase
        .from('whatsapp_messages' as any)
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
      return (data as unknown) as WhatsAppMessageWithConversation[]
    },
    enabled: !!conversationId,
  })
}

export function useCreateWhatsAppMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (message: Omit<WhatsAppMessage, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('whatsapp_messages' as any)
        .insert(message as any)
        .select()
        .single()

      if (error) throw error

      // Update conversation last_message_at
      await supabase
        .from('whatsapp_conversations' as any)
        .update({ last_message_at: new Date().toISOString() } as any)
        .eq('id', (message as any).conversation_id)

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', (data as any).conversation_id] })
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
      const { data, error } = await supabase
        .from('whatsapp_messages' as any)
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

      return {
        data: (data as unknown) as WhatsAppMessageWithConversation[],
        subscription,
      }
    },
    enabled: !!conversationId,
  })
}
