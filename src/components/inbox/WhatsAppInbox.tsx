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
import { Send, Paperclip, Image, FileText, Check, CheckCheck, Search, User, MoreVertical, Edit, Trash2, MessageSquareOff, X, Download, Reply } from 'lucide-react';
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
import { WhatsAppMessage } from '@/hooks/useWhatsApp';

export function WhatsAppInbox() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editContactDialogOpen, setEditContactDialogOpen] = useState(false);
  const [deleteContactDialogOpen, setDeleteContactDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<WhatsAppMessage | null>(null);

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
  const [missingOriginals, setMissingOriginals] = useState<Record<string, boolean>>({});

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      const maxFiles = 10; // Maximum 10 files per message

      for (const file of fileArray) {
        if (file.size > maxFileSize) {
          toast({
            title: 'File too large',
            description: `${file.name} is larger than 10MB and was skipped`,
            variant: 'destructive',
          });
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length + selectedFiles.length > maxFiles) {
        toast({
          title: 'Too many files',
          description: `Maximum ${maxFiles} files per message`,
          variant: 'destructive',
        });
        return;
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
  };

  const clearReply = () => {
    setReplyToMessage(null);
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
    if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedConversationId) return;

    try {
      let fileUrls: string[] = [];
      let fileNames: string[] = [];
      let fileTypes: string[] = [];

      // Upload files if selected
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const storageFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

          const { data, error } = await supabase.storage
            .from('whatsapp-attachments')
            .upload(storageFileName, file);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('whatsapp-attachments')
            .getPublicUrl(storageFileName);

          fileUrls.push(publicUrl);
          fileNames.push(file.name);
          fileTypes.push(file.type.startsWith('image/') ? 'image' : 'document');
        }
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
          file_urls: fileUrls.length > 0 ? fileUrls : null,
          file_names: fileNames.length > 0 ? fileNames : null,
          file_types: fileTypes.length > 0 ? fileTypes : null,
          reply_to_message_id: replyToMessage?.id || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${errorText}`);
      }

      const result = await response.json();
      console.log('Message sent successfully:', result);

      setNewMessage('');
      clearAllFiles();
      clearReply();
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
                id={`msg-${msg.id}`}
                data-msg-sid={msg.message_sid || ''}
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
                    {/* Reply Context (tag-style like WhatsApp) */}
                    {(msg.reply_to_message || msg.reply_to_message_sid) && (
                      <div
                        className={cn(
                          'mb-2 p-2 rounded-md text-sm overflow-hidden',
                          msg.direction === 'outgoing'
                            ? 'bg-primary text-primary-foreground/90'
                            : 'bg-muted text-muted-foreground'
                        )}
                        title={msg.reply_to_message?.body || msg.reply_to_message?.file_names?.[0] || msg.reply_to_message_sid || 'Replied message'}
                      >
                        <div className="text-xs font-medium mb-1 opacity-90">
                          {msg.reply_to_message ? (msg.reply_to_message.direction === 'incoming'
                            ? (msg.whatsapp_conversations?.contact_name || msg.whatsapp_conversations?.contact_phone)
                            : 'You') : 'Original message'}
                        </div>
                        <div
                          className="truncate cursor-pointer"
                          onClick={async () => {
                            // Jump to original message by id or sid
                            const originalId = (msg.reply_to_message as any)?.id || msg.reply_to_message_id
                            const originalSid = (msg.reply_to_message as any)?.message_sid || msg.reply_to_message_sid
                            const foundById = originalId ? document.getElementById(`msg-${originalId}`) : null
                            if (foundById) {
                              foundById.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              (foundById as HTMLElement).classList.add('ring-2', 'ring-primary')
                              setTimeout(() => (foundById as HTMLElement).classList.remove('ring-2', 'ring-primary'), 2000)
                              return
                            }
                            // try find by SID attribute
                            if (originalSid) {
                              const foundBySid = document.querySelector(`[data-msg-sid="${originalSid}"]`) as HTMLElement | null
                              if (foundBySid) {
                                foundBySid.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                foundBySid.classList.add('ring-2', 'ring-primary')
                                setTimeout(() => foundBySid.classList.remove('ring-2', 'ring-primary'), 2000)
                                return
                              }
                              // If not found locally, attempt on-demand fetch by SID
                              try {
                                const { data: fetched } = await supabase
                                  .from('whatsapp_messages')
                                  .select('id, body, file_urls, file_names, file_types, direction, created_at, message_sid')
                                  .eq('message_sid', originalSid)
                                  .single()
                                if (fetched && fetched.id) {
                                  // Insert temporary preview into the UI by adding to missingOriginals map
                                  setMissingOriginals(prev => ({ ...prev, [msg.id]: false }))
                                  // attach to msg.reply_to_message for rendering
                                  msg.reply_to_message = fetched as any
                                  // after state update, scroll (force re-render by setting state)
                                  // Note: we rely on React re-render; scroll to newly "attached" element by id is not possible,
                                  // so instead briefly highlight the current message to show the resolved original.
                                  const el = document.getElementById(`msg-${msg.id}`)
                                  if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                    el.classList.add('ring-2', 'ring-primary')
                                    setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2000)
                                  }
                                  return
                                }
                              } catch (e) {
                                console.warn('On-demand fetch by SID failed', e)
                              }
                            }
                            // fallback: mark missing and show toast
                            setMissingOriginals(prev => ({ ...prev, [msg.id]: true }))
                            toast({ title: 'Original message not found', description: 'The message you replied to is not available locally', variant: 'destructive' })
                          }}
                        >
                          {msg.reply_to_message ? (
                            msg.reply_to_message.file_urls && msg.reply_to_message.file_urls.length > 0 ? (
                              msg.reply_to_message.file_types?.[0] === 'image' ? (
                                <img
                                  src={msg.reply_to_message.file_urls[0]}
                                  alt={msg.reply_to_message.file_names?.[0] || 'Image'}
                                  className="inline-block max-w-[120px] max-h-[80px] rounded-sm object-cover"
                                />
                              ) : (
                                <span>{msg.reply_to_message.file_names?.[0] || 'Attachment'}</span>
                              )
                            ) : (
                              msg.reply_to_message.body
                            )
                          ) : (
                            <span className="italic text-xs text-muted-foreground">
                              Original message not found{msg.reply_to_message_sid ? ` (SID: ${msg.reply_to_message_sid})` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Multiple Files Display */}
                    {msg.file_urls && msg.file_urls.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {msg.file_urls.map((fileUrl, index) => (
                          <div key={index}>
                            {msg.file_types?.[index] === 'image' ? (
                              <img
                                src={fileUrl}
                                alt={msg.file_names?.[index] || 'Image'}
                                className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(fileUrl, '_blank')}
                              />
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors"
                                   onClick={() => {
                                     const link = document.createElement('a');
                                     link.href = fileUrl;
                                     link.download = msg.file_names?.[index] || 'download';
                                     document.body.appendChild(link);
                                     link.click();
                                     document.body.removeChild(link);
                                   }}>
                                <FileText className="w-5 h-5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{msg.file_names?.[index]}</p>
                                  <p className="text-xs text-muted-foreground">Click to download</p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const link = document.createElement('a');
                                    link.href = fileUrl;
                                    link.download = msg.file_names?.[index] || 'download';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="p-1 rounded hover:bg-secondary/50"
                                  title="Download"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
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
                  {/* Message Actions Dropdown */}
                  <div className={cn(
                    'absolute top-1 opacity-0 group-hover:opacity-100 transition-all duration-200',
                    msg.direction === 'outgoing' ? '-left-10' : '-right-10'
                  )}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center shadow-sm',
                          msg.direction === 'outgoing'
                            ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                            : 'bg-card text-card-foreground hover:bg-card/80 border'
                        )}>
                          <MoreVertical className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={msg.direction === 'outgoing' ? 'end' : 'start'}>
                        <DropdownMenuItem onClick={() => setReplyToMessage(msg)}>
                          <Reply className="mr-2 h-4 w-4" />
                          Reply
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this message?')) {
                              deleteMessage.mutate(msg.id);
                            }
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                placeholder={selectedFiles.length > 0 ? `Sending ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}...` : "Type a message..."}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button
                size="icon"
                className="gradient-primary border-0 rounded-full"
                onClick={handleSendMessage}
                disabled={createMessage.isPending || (!newMessage.trim() && selectedFiles.length === 0) || !selectedConversationId}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Reply Context */}
            {replyToMessage && (
              <div className="mt-2 p-3 bg-secondary/50 rounded-lg border-l-4 border-primary">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-primary">
                    Replying to {replyToMessage.direction === 'incoming' ? 'them' : 'yourself'}
                  </span>
                  <button
                    onClick={clearReply}
                    className="text-muted-foreground hover:text-foreground"
                    title="Cancel reply"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {replyToMessage.file_urls && replyToMessage.file_urls.length > 0
                    ? `${replyToMessage.file_names?.[0]} ${replyToMessage.body ? `+ ${replyToMessage.body}` : ''}`
                    : replyToMessage.body
                  }
                </p>
              </div>
            )}

            {/* File Previews */}
            {selectedFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="p-2 bg-secondary rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {file.type.startsWith('image/') ? (
                        <Image className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {selectedFiles.length > 1 && (
                  <button
                    onClick={clearAllFiles}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all files
                  </button>
                )}
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
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
