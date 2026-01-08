import { useState } from 'react';
import {
  useWhatsAppConversations,
  useWhatsAppMessages,
  useCreateWhatsAppMessage,
  useWhatsAppMessagesRealtime
} from '@/hooks/useWhatsApp';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Image, FileText, Check, CheckCheck, Search, MessageSquare, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function AutomobileWhatsAppInbox() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: conversations, isLoading: conversationsLoading } = useWhatsAppConversations();
  const { data: messagesData } = useWhatsAppMessagesRealtime(selectedConversationId || '');
  const createMessage = useCreateWhatsAppMessage();
  const { data: autoLeads } = useAutoLeads();
  const { toast } = useToast();

  // Filter conversations to only show those that match auto lead phone numbers
  const leadPhones = new Set((autoLeads || []).map(lead => lead.phone));
  const leadConversations = (conversations || []).filter(conv =>
    leadPhones.has(conv.contact_phone) &&
    (conv.contact_name || conv.contact_phone).toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contact_phone.includes(searchTerm)
  );

  const activeConversation = selectedConversationId ? conversations?.find(c => c.id === selectedConversationId) : null;
  const activeMessages = messagesData?.data || [];

  // Get auto lead info for the active conversation
  const activeLead = autoLeads?.find(lead => lead.phone === activeConversation?.contact_phone);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId) return;

    try {
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            WhatsApp Inbox - Auto Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[calc(100vh-200px)] card-elevated overflow-hidden animate-fade-in">
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="w-5 h-5" />
          WhatsApp Inbox - Auto Leads
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[calc(100vh-200px)] card-elevated overflow-hidden animate-fade-in">
          {/* Conversations List */}
          <div className="w-80 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search auto lead conversations..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {leadConversations.length > 0 ? (
                leadConversations.map((conv) => {
                  const lead = autoLeads?.find(l => l.phone === conv.contact_phone);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversationId(conv.id)}
                      className={cn(
                        'w-full p-4 flex items-start gap-3 hover:bg-secondary transition-colors text-left',
                        selectedConversationId === conv.id && 'bg-secondary'
                      )}
                    >
                      <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0">
                        {lead?.name.split(' ').map(n => n[0]).join('').slice(0, 2) ||
                         (conv.contact_name || conv.contact_phone).split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground text-sm truncate">
                            {lead?.name || conv.contact_name || conv.contact_phone}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {format(new Date(conv.last_message_at), 'h:mm a')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground truncate">
                            {lead ? `${lead.preferred_brand || 'Lead'} • ${lead.preferred_vehicle_type || 'Vehicle'}` : conv.contact_phone}
                          </p>
                          {lead && (
                            <Badge variant="outline" className="text-xs">
                              {lead.status.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        {lead && lead.budget_max && (
                          <p className="text-xs text-muted-foreground">
                            Budget: ₹{lead.budget_min || 0} - ₹{lead.budget_max}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No auto lead conversations yet. Leads will appear here when they send WhatsApp messages.
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
                  {(activeLead?.name || activeConversation.contact_name || activeConversation.contact_phone).split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    {activeLead?.name || activeConversation.contact_name || activeConversation.contact_phone}
                  </h3>
                  <p className="text-xs text-muted-foreground">{activeConversation.contact_phone}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {activeLead?.preferred_vehicle_type && (
                      <Badge variant="outline" className="text-xs">
                        {activeLead.preferred_vehicle_type}
                      </Badge>
                    )}
                    {activeLead?.preferred_brand && (
                      <Badge variant="outline" className="text-xs">
                        {activeLead.preferred_brand}
                      </Badge>
                    )}
                    {activeLead?.status && (
                      <Badge variant="outline" className="text-xs">
                        {activeLead.status.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
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
              Select an auto lead conversation to start messaging
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
