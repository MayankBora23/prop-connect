import { useState } from 'react';
import {
  useWhatsAppConversations,
  useWhatsAppMessages,
  useCreateWhatsAppMessage,
  useWhatsAppMessagesRealtime
} from '@/hooks/useWhatsApp';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Image, FileText, Check, CheckCheck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function WhatsAppInbox() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: conversations, isLoading: conversationsLoading } = useWhatsAppConversations();
  const { data: messagesData } = useWhatsAppMessagesRealtime(selectedConversationId || '');
  const createMessage = useCreateWhatsAppMessage();
  const { toast } = useToast();

  // Prepare conversations list with search filtering
  const conversationList = (conversations || []).filter(conv =>
    (conv.contact_name || conv.contact_phone).toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contact_phone.includes(searchTerm)
  );

  const activeConversation = selectedConversationId ? conversations?.find(c => c.id === selectedConversationId) : null;
  const activeMessages = messagesData?.data || [];

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId) return;

    try {
      // Call the Edge Function to send the message via Twilio
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          conversation_id: selectedConversationId,
          body: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Message sent successfully:', result);

      setNewMessage('');
      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully',
      });
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  if (conversationsLoading) {
    return (
      <div className="flex h-[calc(100vh-140px)] card-elevated overflow-hidden animate-fade-in">
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex-1 p-2 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-20 w-60" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] card-elevated overflow-hidden animate-fade-in">
      {/* Conversations List */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversationList.length > 0 ? (
            conversationList.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversationId(conv.id)}
                className={cn(
                  'w-full p-4 flex items-start gap-3 hover:bg-secondary transition-colors text-left',
                  selectedConversationId === conv.id && 'bg-secondary'
                )}
              >
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0">
                  {(conv.contact_name || conv.contact_phone).split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground text-sm truncate">
                      {conv.contact_name || conv.contact_phone}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(conv.last_message_at), 'h:mm a')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.contact_phone}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No conversations yet
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeConversation && activeMessages ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="h-16 px-4 flex items-center gap-3 border-b border-border bg-card">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {(activeConversation.contact_name || activeConversation.contact_phone).split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                {activeConversation.contact_name || activeConversation.contact_phone}
              </h3>
              <p className="text-xs text-muted-foreground">{activeConversation.contact_phone}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30">
            {activeMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2 shadow-sm',
                    msg.direction === 'outgoing'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-card text-card-foreground rounded-bl-md'
                  )}
                >
                  <p className="text-sm">{msg.body}</p>
                  <div className={cn(
                    'flex items-center gap-1 mt-1',
                    msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                  )}>
                    <span className={cn(
                      'text-xs',
                      msg.direction === 'outgoing' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                    {msg.direction === 'outgoing' && (
                      msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-info" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/70" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-primary-foreground/70" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground">
                <Paperclip className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground">
                <Image className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground">
                <FileText className="w-5 h-5" />
              </button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button 
                size="icon" 
                className="gradient-primary border-0 rounded-full"
                onClick={handleSendMessage}
                disabled={createMessage.isPending || !newMessage.trim() || !selectedConversationId}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a conversation to start messaging
        </div>
      )}
    </div>
  );
}
