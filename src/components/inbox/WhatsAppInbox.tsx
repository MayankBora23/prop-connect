import { useState } from 'react';
import { Message } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Image, FileText, Check, CheckCheck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/hooks/useData';

export function WhatsAppInbox() {
  const [selectedChat, setSelectedChat] = useState<string | null>('1');
  const [newMessage, setNewMessage] = useState('');
  const { data: messages = [], isLoading } = useMessages();

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading inbox...</div>;
  }

  // Group messages by lead
  const conversations = messages.reduce((acc, msg) => {
    if (!acc[msg.leadId]) {
      acc[msg.leadId] = {
        leadId: msg.leadId,
        leadName: msg.leadName,
        phone: msg.phone,
        messages: [],
        lastMessage: msg,
      };
    }
    acc[msg.leadId].messages.push(msg);
    if (new Date(msg.timestamp) > new Date(acc[msg.leadId].lastMessage.timestamp)) {
      acc[msg.leadId].lastMessage = msg;
    }
    return acc;
  }, {} as Record<string, { leadId: string; leadName: string; phone: string; messages: Message[]; lastMessage: Message }>);

  const conversationList = Object.values(conversations);
  const activeConversation = selectedChat ? conversations[selectedChat] : null;

  return (
    <div className="flex h-[calc(100vh-140px)] card-elevated overflow-hidden animate-fade-in">
      {/* Conversations List */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search conversations..." className="pl-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversationList.map((conv) => (
            <button
              key={conv.leadId}
              onClick={() => setSelectedChat(conv.leadId)}
              className={cn(
                'w-full p-4 flex items-start gap-3 hover:bg-secondary transition-colors text-left',
                selectedChat === conv.leadId && 'bg-secondary'
              )}
            >
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0">
                {conv.leadName.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground text-sm truncate">{conv.leadName}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {conv.lastMessage.timestamp.split(' ')[1]} {conv.lastMessage.timestamp.split(' ')[2]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {conv.lastMessage.direction === 'outgoing' && (
                    <span className="inline-flex mr-1">
                      {conv.lastMessage.status === 'read' ? (
                        <CheckCheck className="w-3 h-3 text-info" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </span>
                  )}
                  {conv.lastMessage.content}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="h-16 px-4 flex items-center gap-3 border-b border-border bg-card">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {activeConversation.leadName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="font-medium text-foreground">{activeConversation.leadName}</h3>
              <p className="text-xs text-muted-foreground">{activeConversation.phone}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30">
            {activeConversation.messages.map((msg) => (
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
                  <p className="text-sm">{msg.content}</p>
                  <div className={cn(
                    'flex items-center gap-1 mt-1',
                    msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                  )}>
                    <span className={cn(
                      'text-xs',
                      msg.direction === 'outgoing' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {msg.timestamp.split(' ')[1]} {msg.timestamp.split(' ')[2]}
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
              />
              <Button size="icon" className="gradient-primary border-0 rounded-full">
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
