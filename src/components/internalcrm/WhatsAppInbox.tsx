import { useState, useRef, useEffect } from 'react';
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
import { useAllCompanies } from '@/hooks/useCompany';
import { useInternalLeads } from '@/hooks/useInternalLeads';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Image, FileText, Check, CheckCheck, Search, MessageSquare, MoreVertical, Edit, Trash2, MessageSquareOff, X, Download, Reply, Building2, SendHorizontal, User, Home } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteContactDialog } from '../inbox/DeleteContactDialog';
import { SaveInternalLeadDialog } from './SaveInternalLeadDialog';
import { WhatsAppMessage } from '@/hooks/useWhatsApp';

export function InternalCRMWhatsAppInbox() {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteContactDialogOpen, setDeleteContactDialogOpen] = useState(false);
    const [saveInternalLeadDialogOpen, setSaveInternalLeadDialogOpen] = useState(false);
    const [bulkSendDialogOpen, setBulkSendDialogOpen] = useState(false);
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [bulkMessage, setBulkMessage] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [replyToMessage, setReplyToMessage] = useState<WhatsAppMessage | null>(null);

    // Filter states for bulk send
    const [industryFilter, setIndustryFilter] = useState<string>('all');
    const [stageFilter, setStageFilter] = useState<string>('all');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);

    const { data: conversations, isLoading: conversationsLoading, refetch: refetchConversations } = useWhatsAppConversations();
    const { data: messagesData } = useWhatsAppMessagesRealtime(selectedConversationId || '');
    const { data: internalLeads } = useInternalLeads();
    const createMessage = useCreateWhatsAppMessage();
    const deleteConversation = useDeleteWhatsAppConversation();
    const clearChat = useClearWhatsAppChat();
    const deleteMessage = useDeleteWhatsAppMessage();
    const { data: companies } = useAllCompanies();
    const { toast } = useToast();

    // Subscribe to conversation changes for realtime updates
    useEffect(() => {
        const subscription = supabase
            .channel('internal-crm-whatsapp-conversations')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'whatsapp_conversations',
                },
                () => {
                    console.log('Internal CRM conversations updated, refetching...');
                    refetchConversations();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [refetchConversations]);

    const normalizePhone = (phone: string) => phone.replace(/^\+91/, '').replace(/\D/g, '');

    const formatPhoneNumber = (phone: string) => {
        const cleaned = phone.replace(/[^\d+]/g, '');
        if (cleaned.startsWith('+91')) {
            const number = cleaned.slice(3);
            return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
        } else if (cleaned.startsWith('91') && cleaned.length === 12) {
            const number = cleaned.slice(2);
            return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
        } else if (cleaned.length === 10) {
            return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
        }
        return phone;
    };

    const getContactName = (phone: string, whatsappName?: string) => {
        const cleanPhone = normalizePhone(phone);

        // Check companies first
        const company = companies?.find(c => normalizePhone(c.phone || '') === cleanPhone);
        if (company) return company.name;

        // Check internal leads
        const lead = internalLeads?.find(l => normalizePhone(l.phone_no || '') === cleanPhone);
        if (lead) return `${lead.company_name} (${lead.lead_name})`;

        return whatsappName || phone;
    };

    const getContactSubtext = (phone: string) => {
        const cleanPhone = normalizePhone(phone);
        const company = companies?.find(c => normalizePhone(c.phone || '') === cleanPhone);
        if (company) return `${company.industry.replace(/_/g, ' ')} • ${company.email || ''}`;

        const lead = internalLeads?.find(l => normalizePhone(l.phone_no || '') === cleanPhone);
        if (lead) return `${lead.industry.replace(/_/g, ' ')} • ${lead.stage.replace(/_/g, ' ')}`;

        return phone;
    };

    const filteredConversations = (conversations || []).filter(conv =>
        (getContactName(conv.contact_phone, conv.contact_name)).toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.contact_phone.includes(searchTerm)
    );

    const activeConversation = selectedConversationId ? conversations?.find(c => c.id === selectedConversationId) : null;
    const activeMessages = messagesData?.data || [];

    const handleFileSelect = (files: FileList | null) => {
        if (files) {
            const fileArray = Array.from(files);
            const validFiles: File[] = [];
            const maxFileSize = 10 * 1024 * 1024; // 10MB
            const maxFiles = 10;

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

    const handleBulkSend = async () => {
        if (!bulkMessage.trim() && selectedFiles.length === 0) return;
        if (selectedContacts.length === 0) return;

        try {
            let totalSent = 0;
            let totalFailed = 0;

            for (const contactId of selectedContacts) {
                try {
                    const conversation = conversations?.find(conv => conv.id === contactId);
                    if (!conversation) continue;

                    let fileUrls: string[] = [];
                    let fileNames: string[] = [];
                    let fileTypes: string[] = [];

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

                    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-message`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify({
                            conversation_id: contactId,
                            body: bulkMessage.trim(),
                            file_urls: fileUrls.length > 0 ? fileUrls : null,
                            file_names: fileNames.length > 0 ? fileNames : null,
                            file_types: fileTypes.length > 0 ? fileTypes : null,
                        }),
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Failed to send to ${conversation.contact_name || conversation.contact_phone}: ${errorText}`);
                    }

                    totalSent++;

                    if (selectedContacts.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 3500));
                    }

                } catch (error) {
                    console.error('Bulk send error for contact:', contactId, error);
                    totalFailed++;
                }
            }

            setBulkSendDialogOpen(false);
            setSelectedContacts([]);
            setBulkMessage('');
            clearAllFiles();

            toast({
                title: 'Bulk send completed',
                description: `Sent to ${totalSent} contacts${totalFailed > 0 ? `, ${totalFailed} failed` : ''}`,
                variant: totalFailed > 0 ? 'destructive' : 'default',
            });

        } catch (error) {
            console.error('Bulk send error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to send bulk messages',
                variant: 'destructive',
            });
        }
    };

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedConversationId) return;

        try {
            let fileUrls: string[] = [];
            let fileNames: string[] = [];
            let fileTypes: string[] = [];

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

            setNewMessage('');
            clearAllFiles();
            clearReply();
        } catch (error) {
            console.error('Send message error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to send message',
                variant: 'destructive',
            });
        }
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

    const getBulkFilteredConversations = () => {
        return filteredConversations.filter(conv => {
            const cleanPhone = normalizePhone(conv.contact_phone);
            const lead = internalLeads?.find(l => normalizePhone(l.phone_no || '') === cleanPhone);
            const company = companies?.find(c => normalizePhone(c.phone || '') === cleanPhone);

            if (industryFilter !== 'all') {
                const ind = lead?.industry || company?.industry;
                if (ind !== industryFilter) return false;
            }

            if (stageFilter !== 'all') {
                const stage = lead?.stage;
                if (stage !== stageFilter) return false;
            }

            return true;
        });
    };

    if (conversationsLoading) {
        return (
            <div className="flex h-[calc(100vh-140px)] card-elevated overflow-hidden animate-fade-in">
                <div className="w-80 border-r border-border flex flex-col">
                    <div className="p-4 border-b border-border">
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="flex-1 p-2 space-y-2">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <Skeleton className="h-20 w-60" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-140px)] card-elevated overflow-hidden animate-fade-in bg-background">
            {/* Conversations List */}
            <div className="w-80 border-r border-border flex flex-col bg-card">
                <div className="p-4 border-b border-border space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search conversations..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => setBulkSendDialogOpen(true)}
                        className="w-full gradient-primary border-0"
                        size="sm"
                    >
                        <SendHorizontal className="w-4 h-4 mr-2" />
                        Bulk Send
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length > 0 ? (
                        filteredConversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={cn(
                                    'w-full p-4 flex items-start gap-3 hover:bg-secondary transition-colors text-left border-b border-border/50',
                                    selectedConversationId === conv.id && 'bg-secondary'
                                )}
                            >
                                <button
                                    onClick={() => setSelectedConversationId(conv.id)}
                                    className="flex items-start gap-3 flex-1 min-w-0"
                                >
                                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0">
                                        {getContactName(conv.contact_phone, conv.contact_name).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-semibold text-foreground text-sm truncate">
                                                {getContactName(conv.contact_phone, conv.contact_name)}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                                {format(new Date(conv.last_message_at), 'h:mm a')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate italic">
                                            {getContactSubtext(conv.contact_phone)}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                            <MessageSquareOff className="w-8 h-8 opacity-20" />
                            <span>No conversations yet</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {activeConversation ? (
                <div className="flex-1 flex flex-col bg-secondary/10">
                    {/* Chat Header */}
                    <div className="h-16 px-6 flex items-center justify-between border-b border-border bg-card shadow-sm z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                                {getContactName(activeConversation.contact_phone, activeConversation.contact_name).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground leading-tight">
                                    {getContactName(activeConversation.contact_phone, activeConversation.contact_name)}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatPhoneNumber(activeConversation.contact_phone)} • {getContactSubtext(activeConversation.contact_phone)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSaveInternalLeadDialogOpen(true)}
                                className="flex items-center gap-2 hover:bg-secondary transition-colors"
                            >
                                <User className="w-4 h-4" />
                                Save Lead
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => setSaveInternalLeadDialogOpen(true)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Save Lead
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            if (confirm('Are you sure you want to clear all messages in this chat?')) {
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
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-border">
                        {activeMessages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    'flex group transition-all duration-200',
                                    msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                                )}
                            >
                                <div className="relative max-w-[75%] flex flex-col gap-1">
                                    <div
                                        className={cn(
                                            'rounded-2xl px-4 py-2.5 shadow-sm text-sm break-words',
                                            msg.direction === 'outgoing'
                                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                                : 'bg-card text-card-foreground rounded-bl-none border border-border/50'
                                        )}
                                    >
                                        {msg.reply_to_message_id && (
                                            <div className={cn(
                                                'mb-2 p-2 rounded bg-black/10 text-[11px] border-l-2 border-primary/50 italic opacity-80',
                                                msg.direction === 'outgoing' ? 'text-primary-foreground' : 'text-muted-foreground'
                                            )}>
                                                Replied to a message
                                            </div>
                                        )}

                                        {msg.file_urls && msg.file_urls.length > 0 && (
                                            <div className="mb-2 space-y-2">
                                                {msg.file_urls.map((fileUrl, index) => (
                                                    <div key={index} className="rounded-lg overflow-hidden">
                                                        {msg.file_types?.[index] === 'image' ? (
                                                            <img
                                                                src={fileUrl}
                                                                alt={msg.file_names?.[index] || 'Image'}
                                                                className="max-w-full max-h-64 object-cover cursor-zoom-in hover:brightness-95 transition-all"
                                                                onClick={() => window.open(fileUrl, '_blank')}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="flex items-center gap-3 p-3 bg-black/5 hover:bg-black/10 transition-colors cursor-pointer group/file"
                                                                onClick={() => window.open(fileUrl, '_blank')}
                                                            >
                                                                <FileText className="w-5 h-5 opacity-70" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium truncate">{msg.file_names?.[index]}</p>
                                                                    <p className="text-[10px] opacity-60 uppercase">Click to view/download</p>
                                                                </div>
                                                                <Download className="w-4 h-4 opacity-0 group-hover/file:opacity-100 transition-opacity" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                                        <div className={cn(
                                            'flex items-center gap-1.5 mt-1.5',
                                            msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                                        )}>
                                            <span className={cn(
                                                'text-[10px] font-medium opacity-60',
                                                msg.direction === 'outgoing' ? 'text-primary-foreground' : 'text-muted-foreground'
                                            )}>
                                                {format(new Date(msg.created_at), 'h:mm a')}
                                            </span>
                                            {msg.direction === 'outgoing' && (
                                                msg.status === 'read' ? <CheckCheck className="w-3.5 h-3.5 text-blue-300" /> :
                                                    msg.status === 'delivered' ? <CheckCheck className="w-3.5 h-3.5 opacity-50" /> :
                                                        <Check className="w-3.5 h-3.5 opacity-50" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Reply & Delete on Hover */}
                                    <div className={cn(
                                        'opacity-0 group-hover:opacity-100 transition-opacity flex gap-1',
                                        msg.direction === 'outgoing' ? 'justify-end pr-1' : 'justify-start pl-1'
                                    )}>
                                        <button
                                            onClick={() => setReplyToMessage(msg)}
                                            className="p-1 hover:bg-secondary rounded text-muted-foreground"
                                            title="Reply"
                                        >
                                            <Reply className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Delete message?')) deleteMessage.mutate(msg.id);
                                            }}
                                            className="p-1 hover:bg-destructive/10 rounded text-destructive/70"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Message Input */}
                    <div className="p-4 bg-card border-t border-border shadow-lg z-10">
                        {replyToMessage && (
                            <div className="mb-3 p-2 bg-secondary/50 rounded-lg border-l-4 border-primary flex items-center justify-between animate-in slide-in-from-bottom-2">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-primary uppercase">Replying to message</p>
                                    <p className="text-xs text-muted-foreground truncate">{replyToMessage.body || 'Attachment'}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={clearReply} className="h-6 w-6 p-0">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {selectedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3 p-2 bg-secondary/30 rounded-lg border border-border/50">
                                {selectedFiles.map((file, index) => (
                                    <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1.5 shadow-sm">
                                        <span className="max-w-[120px] truncate text-[10px]">{file.name}</span>
                                        <button onClick={() => removeFile(index)} className="hover:text-destructive">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                                <Button variant="ghost" size="sm" onClick={clearAllFiles} className="text-[10px] h-6 px-2 text-destructive/80 hover:text-destructive">
                                    Clear All
                                </Button>
                            </div>
                        )}

                        <div className="flex items-end gap-3 max-w-5xl mx-auto">
                            <div className="flex items-center gap-1 pb-1">
                                <button
                                    onClick={() => handleAttachmentClick('image')}
                                    className="p-2.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                                    title="Images"
                                >
                                    <Image className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => handleAttachmentClick('document')}
                                    className="p-2.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                                    title="Documents"
                                >
                                    <FileText className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex-1 relative">
                                <textarea
                                    placeholder="Type your message here..."
                                    className="w-full bg-secondary/50 text-foreground text-sm rounded-2xl px-5 py-3 min-h-[48px] max-h-40 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none border border-border/50 placeholder:text-muted-foreground/50 transition-all"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                            </div>

                            <Button
                                onClick={handleSendMessage}
                                disabled={(!newMessage.trim() && selectedFiles.length === 0) || createMessage.isPending}
                                className="rounded-full h-12 w-12 gradient-primary shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all p-0 flex items-center justify-center shrink-0"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-secondary/5 space-y-6">
                    <div className="w-24 h-24 rounded-[2.5rem] gradient-primary flex items-center justify-center text-primary-foreground shadow-2xl animate-bounce-subtle">
                        <MessageSquare className="w-10 h-10" />
                    </div>
                    <div className="max-w-xs space-y-2">
                        <h3 className="text-2xl font-bold text-foreground">Internal Inbox</h3>
                        <p className="text-muted-foreground">
                            Select a conversation to start messaging with clients, partners, or system leads.
                        </p>
                    </div>
                </div>
            )}

            {/* Hidden File Inputs */}
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => handleFileSelect(e.target.files)} />
            <input type="file" ref={imageInputRef} accept="image/*" className="hidden" multiple onChange={(e) => handleFileSelect(e.target.files)} />
            <input type="file" ref={documentInputRef} accept=".pdf,.doc,.docx,.txt" className="hidden" multiple onChange={(e) => handleFileSelect(e.target.files)} />

            {/* Dialogs */}
            {activeConversation && (
                <DeleteContactDialog
                    open={deleteContactDialogOpen}
                    onOpenChange={setDeleteContactDialogOpen}
                    conversation={activeConversation}
                    onSuccess={() => setSelectedConversationId(null)}
                />
            )}

            {activeConversation && (
                <SaveInternalLeadDialog
                    open={saveInternalLeadDialogOpen}
                    onOpenChange={setSaveInternalLeadDialogOpen}
                    conversation={activeConversation}
                />
            )}

            <BulkSendDialog
                open={bulkSendDialogOpen}
                onOpenChange={setBulkSendDialogOpen}
                conversations={filteredConversations}
                onSend={handleBulkSend}
                selectedContacts={selectedContacts}
                setSelectedContacts={setSelectedContacts}
                bulkMessage={bulkMessage}
                setBulkMessage={setBulkMessage}
                industryFilter={industryFilter}
                setIndustryFilter={setIndustryFilter}
                stageFilter={stageFilter}
                setStageFilter={setStageFilter}
            />
        </div>
    );
}

function BulkSendDialog({
    open,
    onOpenChange,
    conversations,
    onSend,
    selectedContacts,
    setSelectedContacts,
    bulkMessage,
    setBulkMessage,
    industryFilter,
    setIndustryFilter,
    stageFilter,
    setStageFilter
}: any) {
    const industries = ['all', 'real_estate', 'healthcare', 'education', 'hotel', 'restaurant', 'ecommerce', 'car_dealer', 'general'];
    const stages = ['all', 'new', 'contacted', 'demo_scheduled', 'trial_started', 'closed_won', 'closed_lost'];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <SendHorizontal className="w-6 h-6 text-primary" />
                        Bulk Broadcast
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter Industry</label>
                            <Select value={industryFilter} onValueChange={setIndustryFilter}>
                                <SelectTrigger className="bg-secondary/50 border-none h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {industries.map(ind => (
                                        <SelectItem key={ind} value={ind}>{ind.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filter Stage</label>
                            <Select value={stageFilter} onValueChange={setStageFilter}>
                                <SelectTrigger className="bg-secondary/50 border-none h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {stages.map(stage => (
                                        <SelectItem key={stage} value={stage}>{stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recipient List ({selectedContacts.length})</label>
                            <button
                                onClick={() => setSelectedContacts(selectedContacts.length === conversations.length ? [] : conversations.map((c: any) => c.id))}
                                className="text-[10px] font-bold text-primary hover:underline"
                            >
                                {selectedContacts.length === conversations.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto border border-border/50 rounded-xl bg-secondary/20 p-2 grid grid-cols-2 gap-2">
                            {conversations.map((conv: any) => (
                                <div key={conv.id} className="flex items-center gap-2 p-1.5 hover:bg-background rounded-md transition-all">
                                    <Checkbox
                                        id={conv.id}
                                        checked={selectedContacts.includes(conv.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) setSelectedContacts([...selectedContacts, conv.id]);
                                            else setSelectedContacts(selectedContacts.filter((id: string) => id !== conv.id));
                                        }}
                                    />
                                    <label htmlFor={conv.id} className="text-xs truncate cursor-pointer font-medium">{conv.contact_name || conv.contact_phone}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Broadcast Message</label>
                        <textarea
                            className="w-full min-h-[120px] bg-secondary/50 border border-border/50 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                            placeholder="What do you want to announce today?"
                            value={bulkMessage}
                            onChange={(e) => setBulkMessage(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 border-t bg-secondary/10 flex justify-between items-center">
                    <p className="text-[10px] text-muted-foreground italic">Caution: Send delay applied for API compliance.</p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button
                            onClick={onSend}
                            className="gradient-primary min-w-[140px] shadow-lg"
                            disabled={!bulkMessage.trim() || selectedContacts.length === 0}
                        >
                            Blast to {selectedContacts.length}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
