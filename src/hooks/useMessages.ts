import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          lead:leads(*)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (leadId: string, content: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          lead_id: leadId,
          content,
          direction: 'outgoing',
          status: 'sent',
          message_type: 'text',
        })
        .select(`
          *,
          lead:leads(*)
        `)
        .single();

      if (error) throw error;
      
      setMessages(prev => [...prev, data]);
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select(`*, lead:leads(*)`)
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            setMessages(prev => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    messages,
    loading,
    fetchMessages,
    sendMessage,
  };
}
