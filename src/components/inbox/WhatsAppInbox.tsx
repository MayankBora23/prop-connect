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
import { useLeads } from '@/hooks/useLeads';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Image, FileText, Check, CheckCheck, Search, User, MoreVertical, Edit, Trash2, MessageSquareOff, X, Download, Reply, Home, SendHorizontal, RefreshCw } from 'lucide-react';
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
import { SaveLeadDialog } from './SaveLeadDialog';
import { DeleteContactDialog } from './DeleteContactDialog';
import { PropertySuggestions } from './PropertySuggestions';
import { WhatsAppMessage } from '@/hooks/useWhatsApp';
import type { Property } from '@/hooks/useProperties';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export function WhatsAppInbox() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [saveLeadDialogOpen, setSaveLeadDialogOpen] = useState(false);
  const [deleteContactDialogOpen, setDeleteContactDialogOpen] = useState(false);
  const [propertySuggestionsOpen, setPropertySuggestionsOpen] = useState(false);
  const [bulkSendDialogOpen, setBulkSendDialogOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<WhatsAppMessage | null>(null);

  // Filter states for bulk send
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [budgetFilter, setBudgetFilter] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const {
    data: conversations,
    isLoading: conversationsLoading,
    isFetching: conversationsFetching,
    refetch: refetchConversations,
  } = useWhatsAppConversations();
  const {
    data: messagesData,
    isFetching: messagesFetching,
    refetch: refetchMessages,
  } = useWhatsAppMessagesRealtime(selectedConversationId || '');
  const { data: leads } = useLeads();
  const createMessage = useCreateWhatsAppMessage();
  const deleteConversation = useDeleteWhatsAppConversation();
  const clearChat = useClearWhatsAppChat();
  const deleteMessage = useDeleteWhatsAppMessage();
  const { toast } = useToast();

  // Subscribe to conversation changes for realtime updates
  useEffect(() => {
    const subscription = supabase
      .channel('whatsapp-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
        },
        () => {
          console.log('Conversations updated, refetching...');
          refetchConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [refetchConversations]);

  const inboxRefreshBusy =
    conversationsFetching || (!!selectedConversationId && messagesFetching);

  const handleInboxRefresh = async () => {
    try {
      await Promise.all([
        refetchConversations(),
        selectedConversationId ? refetchMessages() : Promise.resolve(),
      ]);
      toast({
        title: 'Refreshed',
        description: 'Conversations and messages are up to date.',
      });
    } catch {
      toast({
        title: 'Refresh failed',
        description: 'Could not reload inbox. Try again.',
        variant: 'destructive',
      });
    }
  };

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

  // Get lead name for a phone number (prioritize CRM lead names over WhatsApp profile names)
  const getLeadNameForPhone = (phoneNumber: string, whatsappProfileName?: string) => {
    if (!leads || !phoneNumber) return whatsappProfileName || null;

    // Remove +91 prefix and any non-numeric characters for comparison
    const cleanPhone = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');

    // Find lead with matching phone number
    const lead = leads.find(lead => {
      if (!lead.phone) return false;
      const leadCleanPhone = lead.phone.replace(/^\+91/, '').replace(/\D/g, '');
      return leadCleanPhone === cleanPhone;
    });

    // Prioritize CRM lead name over WhatsApp profile name
    return lead?.name || whatsappProfileName || null;
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const handleBulkSend = async () => {
    if (!bulkMessage.trim() && selectedFiles.length === 0) return;
    if (selectedContacts.length === 0) return;

    try {
      let totalSent = 0;
      let totalFailed = 0;

      for (const contactId of selectedContacts) {
        try {
          // Find the conversation for this contact
          const conversation = conversations?.find(conv => conv.id === contactId);
          if (!conversation) continue;

          let fileUrls: string[] = [];
          let fileNames: string[] = [];
          let fileTypes: string[] = [];

          // Upload files if selected (reuse the same files for all contacts)
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

          // Include property images if a property was selected
          if (selectedProperty?.images && selectedProperty.images.length > 0) {
            const propertyImages = selectedProperty.images.slice(0, 3);
            propertyImages.forEach((imageUrl, index) => {
              fileUrls.push(imageUrl);
              fileNames.push(`${selectedProperty.title} - Image ${index + 1}`);
              fileTypes.push('image');
            });
          }

          // Send message via existing Edge Function
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

          // Twilio Sandbox limit: 1 message every 3 seconds
          // Adding 500ms buffer for safety (3500ms total)
          if (selectedContacts.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 3500));
          }

        } catch (error) {
          console.error('Bulk send error for contact:', contactId, error);
          totalFailed++;
        }
      }

      // Close dialog and reset
      setBulkSendDialogOpen(false);
      setSelectedContacts([]);
      setBulkMessage('');
      setSelectedProperty(null);
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

  // Helper to parse budget strings with support for units (Cr, L, K) and shorthand (e.g., 90 -> 90L)
  const parseBudgetString = (budgetString: string | null | undefined): number => {
    if (!budgetString) return 0;
    const clean = budgetString.trim().toLowerCase();

    const parsePart = (part: string): number => {
      // Match numbers and optional units
      const match = part.match(/^([\d.]+)\s*(l|cr|k|cr\.)?$/);
      if (!match) {
        const numericMatch = part.match(/[\d.]+/);
        return numericMatch ? parseFloat(numericMatch[0]) : 0;
      }

      const value = parseFloat(match[1]);
      const unit = match[2];

      if (unit === 'l') return value * 100000;
      if (unit === 'cr' || unit === 'cr.') return value * 10000000;
      if (unit === 'k') return value * 1000;

      return value;
    };

    const parts = clean.split(/[-–—/]/);
    const values = parts.map(p => parsePart(p.trim()));
    return Math.max(...values, 0);
  };

  // Get unique filter values from leads
  const getUniquePropertyTypes = () => {
    return ['1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'Plot', 'Commercial', 'Villa'];
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (leadStatusFilter !== 'all') count++;
    if (propertyTypeFilter !== 'all') count++;
    if (budgetFilter) count++;
    return count;
  };

  // Filter conversations based on lead data and selected filters
  const getFilteredConversations = () => {
    if (!leads || getActiveFilterCount() === 0) {
      return conversationList;
    }

    return conversationList.filter(conv => {
      // Find the corresponding lead for this conversation
      const lead = leads.find(lead => {
        const cleanConvPhone = conv.contact_phone.replace(/^\+91/, '').replace(/\D/g, '');
        const cleanLeadPhone = lead.phone.replace(/^\+91/, '').replace(/\D/g, '');
        return cleanLeadPhone === cleanConvPhone;
      });

      if (!lead) return false; // Only show contacts that are leads

      // Apply filters
      if (leadStatusFilter !== 'all' && lead.lead_status !== leadStatusFilter) {
        return false;
      }

      if (propertyTypeFilter !== 'all' && lead.property_type !== propertyTypeFilter) {
        return false;
      }

      const filterBudgetValue = budgetFilter ? parseBudgetString(budgetFilter) : null;
      const leadBudgetValue = (lead as any).budget ? parseBudgetString((lead as any).budget) : (lead.budget_max || 0);

      if (filterBudgetValue !== null && leadBudgetValue < filterBudgetValue) {
        return false;
      }

      return true;
    });
  };

  const filteredConversations = getFilteredConversations();

  const handleSelectAllContacts = () => {
    if (selectedContacts.length === filteredConversations.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredConversations.map(conv => conv.id));
    }
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const clearAllFilters = () => {
    setLeadStatusFilter('all');
    setPropertyTypeFilter('all');
    setBudgetFilter('');
  };

  const handleSendProperty = async (property: Property) => {
    // If bulk send dialog is open, add property to bulk send instead of sending immediately
    if (bulkSendDialogOpen) {
      setSelectedProperty(property);
      setPropertySuggestionsOpen(false);

      // Format property details for bulk message
      const propertyMessage = `*${property.title}*\n\n` +
        `${property.description ? `${property.description}\n\n` : ''}` +
        `${property.bhk ? `${typeof property.bhk === 'string' ? property.bhk : `${property.bhk} BHK`}\n` : ''}` +
        `${(property as any).area ? `${(property as any).area} sq.ft\n` : ''}` +
        `${property.price ? `${formatPrice(property.price)}\n\n` : ''}` +
        `📍 *Location:*\n` +
        `${property.location || property.city || property.address || 'Location not specified'}\n` +
        `${property.amenities && property.amenities.length > 0 ? `\n✨ *Amenities:*\n${property.amenities.join(', ')}\n` : ''}` +
        `${property.property_type ? `\n🏢 *Type:* ${property.property_type}\n` : ''}` +
        `${property.status ? `\n📊 *Status:* ${property.status.charAt(0).toUpperCase() + property.status.slice(1)}\n` : ''}` +
        `\n📞 *Contact us for more details!*`;

      setBulkMessage(prev => prev ? `${prev}\n\n${propertyMessage}` : propertyMessage);

      // Add property images to bulk attachments
      if (property.images && property.images.length > 0) {
        // For bulk send, we'll handle property images differently since they're URLs, not Files
        // We'll store them separately and include them in the bulk send
        setSelectedProperty(property); // Store the property to access images later
      }

      return;
    }

    // Original single send functionality
    if (!selectedConversationId) return;

    try {
      // Format property details to match PropertyCard display
      const propertyMessage = `*${property.title}*\n\n` +
        `${property.description ? `${property.description}\n\n` : ''}` +
        `${property.bhk ? `${typeof property.bhk === 'string' ? property.bhk : `${property.bhk} BHK`}\n` : ''}` +
        `${(property as any).area ? `${(property as any).area} sq.ft\n` : ''}` +
        `${property.price ? `${formatPrice(property.price)}\n\n` : ''}` +
        `📍 *Location:*\n` +
        `${property.location || property.city || property.address || 'Location not specified'}\n` +
        `${property.amenities && property.amenities.length > 0 ? `\n✨ *Amenities:*\n${property.amenities.join(', ')}\n` : ''}` +
        `${property.property_type ? `\n🏢 *Type:* ${property.property_type}\n` : ''}` +
        `${property.status ? `\n📊 *Status:* ${property.status.charAt(0).toUpperCase() + property.status.slice(1)}\n` : ''}` +
        `\n📞 *Contact us for more details!*`;

      let fileUrls: string[] = [];
      let fileNames: string[] = [];
      let fileTypes: string[] = [];

      // Include property images if available (up to 3 images)
      if (property.images && property.images.length > 0) {
        // Send up to 3 images
        const imagesToSend = property.images.slice(0, 3);
        imagesToSend.forEach((imageUrl, index) => {
          fileUrls.push(imageUrl);
          fileNames.push(`${property.title} - Image ${index + 1}`);
          fileTypes.push('image');
        });
      }

      // Send the property details via WhatsApp
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          conversation_id: selectedConversationId,
          body: propertyMessage.trim(),
          file_urls: fileUrls.length > 0 ? fileUrls : null,
          file_names: fileNames.length > 0 ? fileNames : null,
          file_types: fileTypes.length > 0 ? fileTypes : null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send property: ${errorText}`);
      }

      const result = await response.json();
      console.log('Property sent successfully:', result);

      toast({
        title: 'Property sent',
        description: 'Property details have been sent successfully',
      });
    } catch (error) {
      console.error('Send property error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send property details',
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
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground flex-1">Conversations</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleInboxRefresh}
              disabled={inboxRefreshBusy}
              className="h-8 w-8 shrink-0 p-0"
              aria-label="Refresh conversations and messages"
            >
              <RefreshCw className={cn('h-4 w-4', inboxRefreshBusy && 'animate-spin')} />
            </Button>
          </div>
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
                    {((getLeadNameForPhone(conv.contact_phone, conv.contact_name) || conv.contact_phone).split(' ').map(n => n[0]).join('').slice(0, 2))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground text-sm truncate">
                        {getLeadNameForPhone(conv.contact_phone, conv.contact_name) || conv.contact_phone}
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
                {((getLeadNameForPhone(activeConversation.contact_phone, activeConversation.contact_name) || activeConversation.contact_phone).split(' ').map(n => n[0]).join('').slice(0, 2))}
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  {getLeadNameForPhone(activeConversation.contact_phone, activeConversation.contact_name) || activeConversation.contact_phone}
                </h3>
                <p className="text-xs text-muted-foreground">{activeConversation.contact_phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveLeadDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Save Lead
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSaveLeadDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Save Lead
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
                    {msg.reply_to_message_id && (
                      <div
                        className={cn(
                          'mb-2 p-2 rounded-md text-sm overflow-hidden',
                          msg.direction === 'outgoing'
                            ? 'bg-primary text-primary-foreground/90'
                            : 'bg-muted text-muted-foreground'
                        )}
                        title="Replied message"
                      >
                        <div className="text-xs font-medium mb-1 opacity-90">
                          {msg.direction === 'incoming'
                            ? (msg.whatsapp_conversations?.contact_name || msg.whatsapp_conversations?.contact_phone)
                            : 'You'}
                        </div>
                        <div
                          className="truncate"
                        >
                          <span className="italic text-xs text-muted-foreground">
                            Replied to message
                          </span>
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
                onClick={() => setPropertySuggestionsOpen(true)}
                className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                title="Send property suggestion"
                disabled={!selectedConversationId}
              >
                <Home className="w-5 h-5" />
              </button>
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

            {/* Bulk Send Hidden File Inputs */}
            <input
              type="file"
              accept="*/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="bulk-file-input"
            />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="bulk-image-input"
            />
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="bulk-document-input"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a conversation to start messaging
        </div>
      )}

      {/* Save Lead Dialog */}
      {activeConversation && (
        <SaveLeadDialog
          open={saveLeadDialogOpen}
          onOpenChange={setSaveLeadDialogOpen}
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

      {/* Property Suggestions Dialog */}
      <PropertySuggestions
        isOpen={propertySuggestionsOpen}
        onOpenChange={setPropertySuggestionsOpen}
        onSelectProperty={handleSendProperty}
      />

      {/* Bulk Send Dialog */}
      <Dialog open={bulkSendDialogOpen} onOpenChange={(open) => {
        setBulkSendDialogOpen(open);
        if (!open) {
          // Clear filters when dialog closes
          clearAllFilters();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SendHorizontal className="w-5 h-5" />
              Bulk Send Message
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selected Property Display */}
            {selectedProperty && (
              <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Selected Property:</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProperty(null);
                      // Remove property images from the message
                      setBulkMessage(prev => prev.replace(/\*[^*]+\*\n\n[\s\S]*?\n📞 \*Contact us for more details!\*\n\n?/, ''));
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{selectedProperty.title}</span>
                  {selectedProperty.images && selectedProperty.images.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({selectedProperty.images.length} image{selectedProperty.images.length > 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <textarea
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                placeholder={selectedProperty ? "Add additional message (optional)..." : "Type your message here..."}
                className="w-full min-h-[100px] p-3 border border-border rounded-md resize-none"
              />
            </div>

            {/* File Attachments */}
            <div>
              <label className="text-sm font-medium mb-2 block">Attachments (Optional)</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setPropertySuggestionsOpen(true)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                  title="Send property details"
                >
                  <Home className="w-5 h-5" />
                </button>
                <button
                  onClick={() => document.getElementById('bulk-file-input')?.click()}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={() => document.getElementById('bulk-image-input')?.click()}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                  title="Attach image"
                >
                  <Image className="w-5 h-5" />
                </button>
                <button
                  onClick={() => document.getElementById('bulk-document-input')?.click()}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                  title="Attach document"
                >
                  <FileText className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* File Previews */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
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
              </div>
            )}

            {/* Filters Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Filter Contacts</label>
                {getActiveFilterCount() > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-6 px-2 text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Lead Status Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Lead Status</label>
                  <Select value={leadStatusFilter} onValueChange={setLeadStatusFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="hot">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Hot
                        </div>
                      </SelectItem>
                      <SelectItem value="warm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          Warm
                        </div>
                      </SelectItem>
                      <SelectItem value="cold">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          Cold
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>



                {/* Property Type Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Property Type</label>
                  <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {getUniquePropertyTypes().map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Budget (₹)</label>
                  <Input
                    type="text"
                    placeholder="e.g. 90 L, 1 Cr, 500 K or 5000000"
                    value={budgetFilter}
                    onChange={(e) => setBudgetFilter(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            {/* Contacts Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">
                  Select Contacts ({selectedContacts.length}/{filteredConversations.length})
                  {getActiveFilterCount() > 0 && (
                    <span className="text-muted-foreground ml-1">
                      (filtered from {conversationList.length} total)
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedContacts.length === filteredConversations.length && filteredConversations.length > 0}
                    onCheckedChange={handleSelectAllContacts}
                  />
                  <span className="text-sm">Select All</span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-border rounded-md">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center gap-3 p-3 hover:bg-secondary/50 border-b border-border last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedContacts.includes(conv.id)}
                        onCheckedChange={() => handleContactToggle(conv.id)}
                      />
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0">
                        {getLeadNameForPhone(conv.contact_phone, conv.contact_name)?.split(' ').map(n => n[0]).join('').slice(0, 2) || conv.contact_phone.slice(-2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-sm truncate">
                            {getLeadNameForPhone(conv.contact_phone, conv.contact_name)}
                          </div>
                          {/* Show lead status badge if available */}
                          {(() => {
                            const lead = leads?.find(lead => {
                              const cleanConvPhone = conv.contact_phone.replace(/^\+91/, '').replace(/\D/g, '');
                              const cleanLeadPhone = lead.phone.replace(/^\+91/, '').replace(/\D/g, '');
                              return cleanLeadPhone === cleanConvPhone;
                            });
                            if (lead?.lead_status) {
                              const statusColors = {
                                hot: 'bg-red-100 text-red-800 border-red-200',
                                warm: 'bg-orange-100 text-orange-800 border-orange-200',
                                cold: 'bg-blue-100 text-blue-800 border-blue-200'
                              };
                              return (
                                <Badge
                                  variant="outline"
                                  className={`text-xs px-1 py-0 ${statusColors[lead.lead_status]}`}
                                >
                                  {lead.lead_status}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {conv.contact_phone}
                          {/* Show additional lead info */}
                          {(() => {
                            const lead = leads?.find(lead => {
                              const cleanConvPhone = conv.contact_phone.replace(/^\+91/, '').replace(/\D/g, '');
                              const cleanLeadPhone = lead.phone.replace(/^\+91/, '').replace(/\D/g, '');
                              return cleanLeadPhone === cleanConvPhone;
                            });
                            if (lead?.city) {
                              return <span className="ml-1">• {lead.city}</span>;
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    {getActiveFilterCount() > 0 ? 'No contacts match the selected filters' : 'No contacts available'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkSendDialogOpen(false);
                setSelectedContacts([]);
                setBulkMessage('');
                setSelectedProperty(null);
                clearAllFiles();
                clearAllFilters();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkSend}
              disabled={(!bulkMessage.trim() && selectedFiles.length === 0) || selectedContacts.length === 0}
              className="gradient-primary border-0"
            >
              <SendHorizontal className="w-4 h-4 mr-2" />
              Send to {selectedContacts.length} Contact{selectedContacts.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
