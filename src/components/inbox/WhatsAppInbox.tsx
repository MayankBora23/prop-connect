import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  useWhatsAppConversations,
  useWhatsAppMessages,
  useCreateWhatsAppMessage,
  useWhatsAppMessagesRealtime,
  useDeleteWhatsAppConversation,
  useClearWhatsAppChat,
  useDeleteWhatsAppMessage
} from '@/hooks/useWhatsApp';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Image, FileText, Check, CheckCheck, Search, User, MoreVertical, Edit, Trash2, MessageSquareOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { EditContactDialog } from './EditContactDialog';
import { DeleteContactDialog } from './DeleteContactDialog';

export function WhatsAppInbox() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editContactDialogOpen, setEditContactDialogOpen] = useState(false);
  const [deleteContactDialogOpen, setDeleteContactDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  const { data: conversations, isLoading: conversationsLoading } = useWhatsAppConversations();
  const { data: messagesData } = useWhatsAppMessagesRealtime(selectedConversationId || '');
  const createMessage = useCreateWhatsAppMessage();
  const deleteConversation = useDeleteWhatsAppConversation();
  const clearChat = useClearWhatsAppChat();
  const deleteMessage = useDeleteWhatsAppMessage();
  const { toast } = useToast();

  // Prepare conversations list with search filtering
  const conversationList = (conversations || []).filter(conv =>
    (conv.contact_name || conv.contact_phone).toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contact_phone.includes(searchTerm)
  );

  const activeConversation = selectedConversationId ? conversations?.find(c => c.id === selectedConversationId) : null;
  const activeMessages = messagesData?.data || [];

  const handleFileSelect = (file: File | null) => {
    if (file) {
      // Validate file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 10MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  const handleAttachmentClick = (type: 'file' | 'image' | 'document') => {
    if (type === 'file') {
      fileInputRef.current?.click();
    } else if (type === 'image') {
      imageInputRef.current?.click();
    } else if (type === 'document') {
      documentInputRef.current?.click();
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversationId) return;

    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const storageFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('whatsapp-attachments')
          .upload(storageFileName, selectedFile);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('whatsapp-attachments')
          .getPublicUrl(storageFileName);

        fileUrl = publicUrl;
        fileName = selectedFile.name;
        fileType = selectedFile.type.startsWith('image/') ? 'image' : 'document';
      }

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
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Message sent successfully:', result);

      setNewMessage('');
      clearSelectedFile();
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
              <div
                key={conv.id}
                className={cn(
                  'w-full p-4 flex items-start gap-3 hover:bg-secondary transition-colors text-left',
                  selectedConversationId === conv.id && 'bg-secondary'
                )}
              >
                <button
                  onClick={() => setSelectedConversationId(conv.id)}
                  className="flex items-start gap-3 flex-1 min-w-0"
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
              </div>
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
          <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-card">
            <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditContactDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Save Contact
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditContactDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Contact
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (activeConversation && confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.')) {
                        clearChat.mutate(activeConversation.id);
                      }
                    }}
                  >
                    <MessageSquareOff className="mr-2 h-4 w-4" />
                    Clear Chat
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteContactDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Contact
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30">
            {activeMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex group',
                  msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                )}
              >
                <div className="relative max-w-[70%]">
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2 shadow-sm',
                      msg.direction === 'outgoing'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card text-card-foreground rounded-bl-md'
                    )}
                  >
                    {/* File/Image Display */}
                    {msg.file_url && (
                      <div className="mb-2">
                        {msg.file_type === 'image' ? (
                          <img
                            src={msg.file_url}
                            alt={msg.file_name || 'Image'}
                            className="max-w-full max-h-48 rounded-lg cursor-pointer"
                            onClick={() => window.open(msg.file_url, '_blank')}
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors"
                               onClick={() => window.open(msg.file_url, '_blank')}>
                            <FileText className="w-5 h-5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{msg.file_name}</p>
                              <p className="text-xs text-muted-foreground">Click to download</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this message?')) {
                        deleteMessage.mutate(msg.id);
                      }
                    }}
                    className={cn(
                      'absolute top-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200',
                      'opacity-0 group-hover:opacity-100',
                      msg.direction === 'outgoing'
                        ? '-left-8 bg-primary text-primary-foreground hover:bg-primary/80'
                        : '-right-8 bg-card text-card-foreground hover:bg-card/80'
                    )}
                    title="Delete message"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAttachmentClick('file')}
                className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleAttachmentClick('image')}
                className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                title="Attach image"
              >
                <Image className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleAttachmentClick('document')}
                className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                title="Attach document"
              >
                <FileText className="w-5 h-5" />
              </button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={selectedFile ? `Sending ${selectedFile.name}...` : "Type a message..."}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button
                size="icon"
                className="gradient-primary border-0 rounded-full"
                onClick={handleSendMessage}
                disabled={createMessage.isPending || (!newMessage.trim() && !selectedFile) || !selectedConversationId}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* File Preview */}
            {selectedFile && (
              <div className="mt-2 p-2 bg-secondary rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedFile.type.startsWith('image/') ? (
                    <Image className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span className="text-sm truncate">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={clearSelectedFile}
                  className="text-muted-foreground hover:text-foreground"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a conversation to start messaging
        </div>
      )}

      {/* Edit Contact Dialog */}
      {activeConversation && (
        <EditContactDialog
          open={editContactDialogOpen}
          onOpenChange={setEditContactDialogOpen}
          conversation={activeConversation}
        />
      )}

      {/* Delete Contact Dialog */}
      {activeConversation && (
        <DeleteContactDialog
          open={deleteContactDialogOpen}
          onOpenChange={setDeleteContactDialogOpen}
          conversation={activeConversation}
          onSuccess={() => setSelectedConversationId(null)}
        />
      )}
    </div>
  );
}
