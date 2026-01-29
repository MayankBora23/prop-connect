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
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Image, FileText, Check, CheckCheck, Search, MessageSquare, MoreVertical, Edit, Trash2, MessageSquareOff, X, Download, Reply, Car, SendHorizontal, User } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VehicleSuggestions } from './VehicleSuggestions';
import { SaveAutoLeadDialog } from './SaveAutoLeadDialog';
import { DeleteContactDialog } from '../inbox/DeleteContactDialog';
import { WhatsAppMessage } from '@/hooks/useWhatsApp';
import type { Vehicle } from '@/hooks/useVehicles';

export function AutomobileWhatsAppInbox() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleSuggestionsOpen, setVehicleSuggestionsOpen] = useState(false);
  const [saveAutoLeadDialogOpen, setSaveAutoLeadDialogOpen] = useState(false);
  const [deleteContactDialogOpen, setDeleteContactDialogOpen] = useState(false);
  const [bulkSendDialogOpen, setBulkSendDialogOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<WhatsAppMessage | null>(null);

  // Filter states for bulk send
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const { data: conversations, isLoading: conversationsLoading, refetch: refetchConversations } = useWhatsAppConversations();
  const { data: messagesData } = useWhatsAppMessagesRealtime(selectedConversationId || '');
  const createMessage = useCreateWhatsAppMessage();
  const deleteConversation = useDeleteWhatsAppConversation();
  const clearChat = useClearWhatsAppChat();
  const deleteMessage = useDeleteWhatsAppMessage();
  const { data: autoLeads } = useAutoLeads();
  const { toast } = useToast();

  // Subscribe to conversation changes for realtime updates
  useEffect(() => {
    const subscription = supabase
      .channel('automobile-whatsapp-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
        },
        () => {
          console.log('Automobile conversations updated, refetching...');
          refetchConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [refetchConversations]);

  // Filter conversations to show those that match auto lead phone numbers OR are AI conversations
  // Normalize phone numbers to ensure consistent comparison
  const normalizePhone = (phone: string) => phone.replace(/^\+91/, '').replace(/\D/g, '');
  const formatPhoneNumber = (phone: string) => {
    // Remove any non-numeric characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    // If it starts with country code, format it
    if (cleaned.startsWith('+91')) {
      const number = cleaned.slice(3);
      return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      const number = cleaned.slice(2);
      return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
    } else if (cleaned.length === 10) {
      // Assume Indian number without country code
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone; // Return original if can't format
  };
  const leadPhones = new Set((autoLeads || []).map(lead => normalizePhone(lead.phone)));
  const leadConversations = (conversations || []).filter(conv => {
    const normalizedConvPhone = normalizePhone(conv.contact_phone);
    const matchesLead = leadPhones.has(normalizedConvPhone);
    const isAiConversation = conv.is_new_user === true || conv.ai_enabled === true;
    const isCompletedAiLead = !conv.is_new_user && !conv.ai_enabled && (conv.purpose || conv.vehicle_type || conv.brand || conv.budget);
    const matchesSearch = searchTerm === '' ||
      (conv.contact_name || conv.contact_phone).toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact_phone.includes(searchTerm);

    return (matchesLead || isAiConversation || isCompletedAiLead) && matchesSearch;
  });

  const activeConversation = selectedConversationId ? conversations?.find(c => c.id === selectedConversationId) : null;
  const activeMessages = messagesData?.data || [];
  const [missingOriginals, setMissingOriginals] = useState<Record<string, boolean>>({});

  // Get auto lead info for the active conversation
  const activeLead = autoLeads?.find(lead => normalizePhone(lead.phone) === normalizePhone(activeConversation?.contact_phone || ''));

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

          // Include vehicle images if a vehicle was selected
          if (selectedVehicle && selectedVehicle.images && selectedVehicle.images.length > 0) {
            // For bulk send, we'll send vehicle info but not images since we don't have vehicle images
            // This can be extended later when vehicle images are added
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
      setSelectedVehicle(null);
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

  const getActiveFilterCount = () => {
    let count = 0;
    if (leadStatusFilter !== 'all') count++;
    if (vehicleTypeFilter !== 'all') count++;
    if (brandFilter !== 'all') count++;
    return count;
  };

  // Filter conversations based on auto lead data and selected filters
  const getFilteredConversations = () => {
    if (!autoLeads || getActiveFilterCount() === 0) {
      return leadConversations;
    }

    return leadConversations.filter(conv => {
      // Find the corresponding auto lead for this conversation
      const lead = autoLeads.find(lead => {
        const cleanConvPhone = conv.contact_phone.replace(/^\+91/, '').replace(/\D/g, '');
        const cleanLeadPhone = lead.phone.replace(/^\+91/, '').replace(/\D/g, '');
        return cleanLeadPhone === cleanConvPhone;
      });

      if (!lead) return false; // Only show contacts that are auto leads

      // Apply filters
      if (leadStatusFilter !== 'all' && lead.status !== leadStatusFilter) {
        return false;
      }

      if (vehicleTypeFilter !== 'all' && lead.preferred_vehicle_type !== vehicleTypeFilter) {
        return false;
      }

      if (brandFilter !== 'all' && lead.preferred_brand !== brandFilter) {
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
    setVehicleTypeFilter('all');
    setBrandFilter('all');
  };

  const handleSendVehicle = async (vehicle: Vehicle) => {
    // If bulk send dialog is open, add vehicle to bulk send instead of sending immediately
    if (bulkSendDialogOpen) {
      setSelectedVehicle(vehicle);
      setVehicleSuggestionsOpen(false);

      // Format vehicle details for bulk message
      const vehicleMessage = `*${vehicle.brand} ${vehicle.model} ${vehicle.variant ? `(${vehicle.variant})` : ''}*\n\n` +
        `${vehicle.description ? `${vehicle.description}\n\n` : ''}` +
        `🚗 *Vehicle Type:* ${vehicle.vehicle_type.charAt(0).toUpperCase() + vehicle.vehicle_type.slice(1)}\n` +
        `📅 *Year:* ${vehicle.year}\n` +
        `${vehicle.fuel_type ? `⛽ *Fuel Type:* ${vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1)}\n` : ''}` +
        `${vehicle.transmission ? `⚙️ *Transmission:* ${vehicle.transmission.charAt(0).toUpperCase() + vehicle.transmission.slice(1)}\n` : ''}` +
        `${vehicle.mileage ? `📏 *Mileage:* ${vehicle.mileage} km\n` : ''}` +
        `${vehicle.seating_capacity ? `👥 *Seating Capacity:* ${vehicle.seating_capacity}\n` : ''}` +
        `${vehicle.color ? `🎨 *Color:* ${vehicle.color}\n` : ''}` +
        `${vehicle.price ? `\n💰 *Price:* ₹${Number(vehicle.price).toLocaleString('en-IN')}\n\n` : ''}` +
        `🏪 *Contact us for test drive and booking details!*`;

      setBulkMessage(prev => prev ? `${prev}\n\n${vehicleMessage}` : vehicleMessage);

      return;
    }

    // Original single send functionality
    if (!selectedConversationId) return;

    try {
      // Format vehicle details to match VehicleCard display
      const vehicleMessage = `*${vehicle.brand} ${vehicle.model} ${vehicle.variant ? `(${vehicle.variant})` : ''}*\n\n` +
        `${vehicle.description ? `${vehicle.description}\n\n` : ''}` +
        `🚗 *Vehicle Type:* ${vehicle.vehicle_type.charAt(0).toUpperCase() + vehicle.vehicle_type.slice(1)}\n` +
        `📅 *Year:* ${vehicle.year}\n` +
        `${vehicle.fuel_type ? `⛽ *Fuel Type:* ${vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1)}\n` : ''}` +
        `${vehicle.transmission ? `⚙️ *Transmission:* ${vehicle.transmission.charAt(0).toUpperCase() + vehicle.transmission.slice(1)}\n` : ''}` +
        `${vehicle.mileage ? `📏 *Mileage:* ${vehicle.mileage} km\n` : ''}` +
        `${vehicle.seating_capacity ? `👥 *Seating Capacity:* ${vehicle.seating_capacity}\n` : ''}` +
        `${vehicle.color ? `🎨 *Color:* ${vehicle.color}\n` : ''}` +
        `${vehicle.price ? `\n💰 *Price:* ₹${Number(vehicle.price).toLocaleString('en-IN')}\n\n` : ''}` +
        `🏪 *Contact us for test drive and booking details!*`;

      let fileUrls: string[] = [];
      let fileNames: string[] = [];
      let fileTypes: string[] = [];

      // Include vehicle materials if available (future enhancement)
      // For now, we'll just send the vehicle details

      // Send the vehicle details via WhatsApp
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          conversation_id: selectedConversationId,
          body: vehicleMessage.trim(),
          file_urls: fileUrls.length > 0 ? fileUrls : null,
          file_names: fileNames.length > 0 ? fileNames : null,
          file_types: fileTypes.length > 0 ? fileTypes : null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send vehicle: ${errorText}`);
      }

      const result = await response.json();
      console.log('Vehicle sent successfully:', result);

      toast({
        title: 'Vehicle sent',
        description: 'Vehicle details have been sent successfully',
      });
    } catch (error) {
      console.error('Send vehicle error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send vehicle details',
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
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search auto lead conversations..."
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
              {leadConversations.length > 0 ? (
                leadConversations.map((conv) => {
                  const lead = autoLeads?.find(l => normalizePhone(l.phone) === normalizePhone(conv.contact_phone));
                  return (
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
                              {lead ? `${lead.preferred_brand || 'Lead'} • ${lead.preferred_vehicle_type || 'Vehicle'}` : formatPhoneNumber(conv.contact_phone)}
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
                    </div>
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
              <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {(activeLead?.name || activeConversation.contact_name || activeConversation.contact_phone).split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {activeLead?.name || activeConversation.contact_name || activeConversation.contact_phone}
                    </h3>
                    <p className="text-xs text-muted-foreground">{formatPhoneNumber(activeConversation.contact_phone)}</p>
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSaveAutoLeadDialogOpen(true)}
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
                      <DropdownMenuItem onClick={() => setSaveAutoLeadDialogOpen(true)}>
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
                    onClick={() => setVehicleSuggestionsOpen(true)}
                    className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                    title="Send vehicle suggestion"
                    disabled={!selectedConversationId}
                  >
                    <Car className="w-5 h-5" />
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
              Select an auto lead conversation to start messaging
            </div>
          )}
        </div>
      </CardContent>

      {/* Vehicle Suggestions Dialog */}
      <VehicleSuggestions
        isOpen={vehicleSuggestionsOpen}
        onOpenChange={setVehicleSuggestionsOpen}
        onSelectVehicle={handleSendVehicle}
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
            {/* Selected Vehicle Display */}
            {selectedVehicle && (
              <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Selected Vehicle:</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedVehicle(null);
                      // Remove vehicle details from the message
                      setBulkMessage(prev => prev.replace(/\*[^*]+\*\n\n[\s\S]*?\n🏪 \*Contact us for test drive and booking details!\*\n\n?/, ''));
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{selectedVehicle.brand} {selectedVehicle.model}</span>
                  <span className="text-xs text-muted-foreground">
                    ({selectedVehicle.year})
                  </span>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <textarea
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                placeholder={selectedVehicle ? "Add additional message (optional)..." : "Type your message here..."}
                className="w-full min-h-[100px] p-3 border border-border rounded-md resize-none"
              />
            </div>

            {/* File Attachments */}
            <div>
              <label className="text-sm font-medium mb-2 block">Attachments (Optional)</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setVehicleSuggestionsOpen(true)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                  title="Send vehicle details"
                >
                  <Car className="w-5 h-5" />
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
                      <SelectItem value="new_lead">New Lead</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="test_drive_scheduled">Test Drive Scheduled</SelectItem>
                      <SelectItem value="quotation_shared">Quotation Shared</SelectItem>
                      <SelectItem value="negotiation_final_discussion">Negotiation/Final Discussion</SelectItem>
                      <SelectItem value="booking_done">Booking Done</SelectItem>
                      <SelectItem value="delivered_sold">Delivered/Sold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Vehicle Type Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Vehicle Type</label>
                  <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="bike">Bike</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Brand Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Preferred Brand</label>
                  <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {autoLeads?.filter(lead => lead.preferred_brand).map(lead => (
                        <SelectItem key={lead.preferred_brand} value={lead.preferred_brand!}>
                          {lead.preferred_brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      (filtered from {leadConversations.length} total)
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
                        {autoLeads?.find(l => normalizePhone(l.phone) === normalizePhone(conv.contact_phone))?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || conv.contact_phone.slice(-2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-sm truncate">
                            {autoLeads?.find(l => normalizePhone(l.phone) === normalizePhone(conv.contact_phone))?.name || conv.contact_name}
                          </div>
                          {/* Show lead status badge if available */}
                          {(() => {
                            const lead = autoLeads?.find(l => normalizePhone(l.phone) === normalizePhone(conv.contact_phone));
                            if (lead?.status) {
                              const statusColors = {
                                new_lead: 'bg-blue-100 text-blue-800 border-blue-200',
                                contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                test_drive_scheduled: 'bg-orange-100 text-orange-800 border-orange-200',
                                quotation_shared: 'bg-purple-100 text-purple-800 border-purple-200',
                                negotiation_final_discussion: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                                booking_done: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                                delivered_sold: 'bg-green-100 text-green-800 border-green-200'
                              };
                              return (
                                <Badge
                                  variant="outline"
                                  className={`text-xs px-1 py-0 ${statusColors[lead.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
                                >
                                  {lead.status.replace('_', ' ')}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPhoneNumber(conv.contact_phone)}
                          {/* TODO: Show vehicle preferences when available */}
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
                setSelectedVehicle(null);
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

      {/* Save Auto Lead Dialog */}
      {activeConversation && (
        <SaveAutoLeadDialog
          open={saveAutoLeadDialogOpen}
          onOpenChange={setSaveAutoLeadDialogOpen}
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
    </Card>
  );
}
