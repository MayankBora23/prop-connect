import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  useWhatsAppConversations,
  useWhatsAppMessages,
  useCreateWhatsAppMessage,
  useWhatsAppMessagesRealtime,
  useDeleteWhatsAppConversation,
  useClearWhatsAppChat,
  useDeleteWhatsAppMessage,
  useConversationRealtime,
} from '@/hooks/useWhatsApp';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useCurrentCompany } from '@/hooks/useCompany';
import { useStudents } from '@/hooks/useStudents';
import { ChatHeaderControls } from '../inbox/ChatHeaderControls';
import { HumanTakeoverBanner } from '../inbox/HumanTakeoverBanner';
import { AgentAvailabilitySelector } from '../inbox/AgentAvailabilitySelector';
import { cn } from '@/lib/utils';
import { ChevronLeft, Send, Paperclip, Image, FileText, Check, CheckCheck, Search, MessageSquare, MoreVertical, Edit, Trash2, MessageSquareOff, X, Download, Reply, GraduationCap, SendHorizontal, User, RefreshCw, LayoutTemplate, Bell, ArrowLeft } from 'lucide-react';
import { TemplateSelectorDialog } from '../whatsapp-templates/TemplateSelectorDialog';
import { useApprovedTemplates, useSendTemplate } from '@/hooks/useWhatsAppTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { CourseSuggestions } from './CourseSuggestions';
import { SaveStudentDialog } from './SaveStudentDialog';
import { DeleteContactDialog } from '../inbox/DeleteContactDialog';
import { SetReminderDialog } from '../inbox/SetReminderDialog';
import { WhatsAppMessage } from '@/hooks/useWhatsApp';
import type { Course } from '@/hooks/useCourses';

export function EducationWhatsAppInbox() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [courseSuggestionsOpen, setCourseSuggestionsOpen] = useState(false);
  const [saveStudentDialogOpen, setSaveStudentDialogOpen] = useState(false);
  const [deleteContactDialogOpen, setDeleteContactDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [bulkSendDialogOpen, setBulkSendDialogOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<WhatsAppMessage | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { data: currentProfile } = useCurrentProfile();
  const { data: company } = useCurrentCompany();
  const { data: approvedTemplates = [] } = useApprovedTemplates();
  const bulkSendTemplate = useSendTemplate();

  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [bulkMessageType, setBulkMessageType] = useState<'free_form' | 'template'>('free_form');
  const [bulkSelectedTemplateId, setBulkSelectedTemplateId] = useState<string>('');
  const [bulkTemplateVariableValues, setBulkTemplateVariableValues] = useState<Record<string, string>>({});

  const currentUserRole = currentProfile?.role || 'sales';
  const currentProfileId = currentProfile?.id || '';

  const isMetaProvider = company?.whatsapp_provider === 'meta';

  // Filter states for bulk send
  const [studentStageFilter, setStudentStageFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');

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
  const createMessage = useCreateWhatsAppMessage();
  const deleteConversation = useDeleteWhatsAppConversation();
  const clearChat = useClearWhatsAppChat();
  const deleteMessage = useDeleteWhatsAppMessage();
  const { data: students } = useStudents();
  const { toast } = useToast();

  // Subscribe to conversation changes for realtime updates
  useEffect(() => {
    const subscription = supabase
      .channel('education-whatsapp-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
        },
        () => {
          console.log('Education conversations updated, refetching...');
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

  // Filter conversations to show those that match student phone numbers OR are AI conversations
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
  const studentPhones = new Set((students || []).map(student => normalizePhone(student.phone)));
  const studentConversations = (conversations || []).filter(conv => {
    const normalizedConvPhone = normalizePhone(conv.contact_phone);
    const matchesStudent = studentPhones.has(normalizedConvPhone);
    const isAiConversation = conv.is_new_user === true || conv.ai_enabled === true;
    const isCompletedAiLead = !conv.is_new_user && !conv.ai_enabled && (conv.interest || conv.course || conv.study_mode || conv.budget);
    const matchesSearch = searchTerm === '' ||
      (conv.contact_name || conv.contact_phone).toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact_phone.includes(searchTerm);

    return (matchesStudent || isAiConversation || isCompletedAiLead) && matchesSearch;
  });

  const activeConversation = selectedConversationId ? conversations?.find(c => c.id === selectedConversationId) : null;

  const isWithin24HourWindow = useMemo(() => {
    if (!activeConversation?.last_customer_message_at) return false;
    const hoursElapsed = (Date.now() - new Date(activeConversation.last_customer_message_at).getTime()) / 3600000;
    return hoursElapsed < 24;
  }, [activeConversation]);

  const activeMessages = messagesData?.data || [];
  const [missingOriginals, setMissingOriginals] = useState<Record<string, boolean>>({});

  useConversationRealtime(selectedConversationId || '');

  useEffect(() => {
    setBannerDismissed(false);
  }, [selectedConversationId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { conversationId } = (e as CustomEvent<{ conversationId: string }>).detail;
      const conv = conversations?.find((c) => c.id === conversationId);
      if (conv) setSelectedConversationId(conv.id);
    };
    window.addEventListener('navigate-to-whatsapp-conversation', handler);
    return () => window.removeEventListener('navigate-to-whatsapp-conversation', handler);
  }, [conversations]);

  useEffect(() => {
    const pending = sessionStorage.getItem('pendingWhatsAppConversationId');
    if (!pending || !conversations?.length) return;
    const conv = conversations.find((c) => c.id === pending);
    if (conv) {
      setSelectedConversationId(conv.id);
      sessionStorage.removeItem('pendingWhatsAppConversationId');
    }
  }, [conversations]);

  const canSendMessage = useMemo(() => {
    if (!activeConversation) return false;
    if (['super_admin', 'admin', 'manager'].includes(currentUserRole)) return true;
    if (activeConversation.chat_status === 'ai_handling') return false;
    if (activeConversation.assigned_to === currentProfileId) return true;
    if (!activeConversation.assigned_to) return true;
    return false;
  }, [activeConversation, currentUserRole, currentProfileId]);

  const canSendFreeForm = useMemo(() => {
    if (!canSendMessage) return false;
    if (isMetaProvider && !isWithin24HourWindow) return false;
    return true;
  }, [canSendMessage, isMetaProvider, isWithin24HourWindow]);

  // Get student info for the active conversation
  const activeStudent = students?.find(student => normalizePhone(student.phone) === normalizePhone(activeConversation?.contact_phone || ''));

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
    if (isMetaProvider && bulkMessageType === 'template') {
      if (!bulkSelectedTemplateId) return;
    } else {
      if (!bulkMessage.trim() && selectedFiles.length === 0) return;
    }
    if (selectedContacts.length === 0) return;

    try {
      let totalSent = 0;
      let totalFailed = 0;

      for (const contactId of selectedContacts) {
        try {
          // Find the conversation for this contact
          const conversation = conversations?.find(conv => conv.id === contactId);
          if (!conversation) continue;

          if (isMetaProvider && bulkMessageType === 'template') {
            const contactName = conversation ? (students?.find(s => s.phone === conversation.contact_phone)?.name || conversation.contact_name || '') : '';
            const resolvedValues = { ...bulkTemplateVariableValues };

            const selectedTpl = approvedTemplates.find(t => t.id === bulkSelectedTemplateId);
            selectedTpl?.variables.forEach((v) => {
              if (['customer_name', 'student_name', 'name'].includes(v.toLowerCase()) && !resolvedValues[v]) {
                resolvedValues[v] = contactName || '';
              }
            });

            await bulkSendTemplate.mutateAsync({
              conversationId: contactId,
              templateId: bulkSelectedTemplateId,
              variableValues: resolvedValues
            });

            totalSent++;

            if (selectedContacts.length > 1) {
              await new Promise(resolve => setTimeout(resolve, 3500));
            }
            continue;
          }

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

          // Include course images if a course was selected
          if (selectedCourse && selectedCourse.subjects_covered && selectedCourse.subjects_covered.length > 0) {
            // For bulk send, we'll send course info but not images since we don't have course images
            // This can be extended later when course images are added
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
      setSelectedCourse(null);
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
    if (studentStageFilter !== 'all') count++;
    if (courseFilter !== 'all') count++;
    if (batchFilter !== 'all') count++;
    return count;
  };

  // Filter conversations based on student data and selected filters
  const getFilteredConversations = () => {
    if (!students || getActiveFilterCount() === 0) {
      return studentConversations;
    }

    return studentConversations.filter(conv => {
      // Find the corresponding student for this conversation
      const student = students.find(student => {
        const cleanConvPhone = conv.contact_phone.replace(/^\+91/, '').replace(/\D/g, '');
        const cleanStudentPhone = student.phone.replace(/^\+91/, '').replace(/\D/g, '');
        return cleanStudentPhone === cleanConvPhone;
      });

      if (!student) return false; // Only show contacts that are students

      // Apply filters - for now, just filter by stage since enrollment info is complex
      if (studentStageFilter !== 'all' && student.stage !== studentStageFilter) {
        return false;
      }

      // TODO: Add enrollment-based filtering when needed
      // For now, we'll keep it simple

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
    setStudentStageFilter('all');
    setCourseFilter('all');
    setBatchFilter('all');
  };

  const handleSendCourse = async (course: Course) => {
    // If bulk send dialog is open, add course to bulk send instead of sending immediately
    if (bulkSendDialogOpen) {
      setSelectedCourse(course);
      setCourseSuggestionsOpen(false);

      // Format course details for bulk message
      const courseMessage = `*${course.name}*\n\n` +
        `${course.description ? `${course.description}\n\n` : ''}` +
        `📚 *Course Type:* ${course.course_type.charAt(0).toUpperCase() + course.course_type.slice(1)}\n` +
        `⏰ *Duration:* ${course.duration_months} months\n` +
        `${course.max_students ? `👥 *Max Students:* ${course.max_students}\n` : ''}` +
        `${course.teachers?.name ? `👨‍🏫 *Instructor:* ${course.teachers.name}\n` : ''}` +
        `${course.subjects_covered && course.subjects_covered.length > 0 ? `\n📖 *Subjects Covered:*\n${course.subjects_covered.join(', ')}\n` : ''}` +
        `${course.price ? `\n💰 *Price:* ₹${course.price}\n\n` : ''}` +
        `🎓 *Contact us for enrollment details!*`;

      setBulkMessage(prev => prev ? `${prev}\n\n${courseMessage}` : courseMessage);

      return;
    }

    // Original single send functionality
    if (!selectedConversationId) return;

    try {
      // Format course details to match CourseCard display
      const courseMessage = `*${course.name}*\n\n` +
        `${course.description ? `${course.description}\n\n` : ''}` +
        `📚 *Course Type:* ${course.course_type.charAt(0).toUpperCase() + course.course_type.slice(1)}\n` +
        `⏰ *Duration:* ${course.duration_months} months\n` +
        `${course.max_students ? `👥 *Max Students:* ${course.max_students}\n` : ''}` +
        `${course.teachers?.name ? `👨‍🏫 *Instructor:* ${course.teachers.name}\n` : ''}` +
        `${course.subjects_covered && course.subjects_covered.length > 0 ? `\n📖 *Subjects Covered:*\n${course.subjects_covered.join(', ')}\n` : ''}` +
        `${course.price ? `\n💰 *Price:* ₹${course.price}\n\n` : ''}` +
        `🎓 *Contact us for enrollment details!*`;

      let fileUrls: string[] = [];
      let fileNames: string[] = [];
      let fileTypes: string[] = [];

      // Include course materials if available (future enhancement)
      // For now, we'll just send the course details

      // Send the course details via WhatsApp
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          conversation_id: selectedConversationId,
          body: courseMessage.trim(),
          file_urls: fileUrls.length > 0 ? fileUrls : null,
          file_names: fileNames.length > 0 ? fileNames : null,
          file_types: fileTypes.length > 0 ? fileTypes : null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send course: ${errorText}`);
      }

      const result = await response.json();
      console.log('Course sent successfully:', result);

      toast({
        title: 'Course sent',
        description: 'Course details have been sent successfully',
      });
    } catch (error) {
      console.error('Send course error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send course details',
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
    if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedConversationId || !canSendMessage) return;

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
      <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] card-elevated overflow-hidden animate-fade-in">
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
    <>
      <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] card-elevated overflow-hidden animate-fade-in">
            {/* Conversations List */}
            <div className={cn(
              'border-r border-border flex flex-col',
              'w-full md:w-80 shrink-0',
              isMobile && selectedConversationId ? 'hidden' : 'flex'
            )}>
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground flex-1">Conversations</h2>
                <AgentAvailabilitySelector />
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
                  placeholder="Search student conversations..."
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
              {studentConversations.length > 0 ? (
                studentConversations.map((conv) => {
                  const student = students?.find(s => s.phone === conv.contact_phone);
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
                          {student?.name.split(' ').map(n => n[0]).join('').slice(0, 2) ||
                            (conv.contact_name || conv.contact_phone).split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground text-sm truncate">
                              {student?.name || conv.contact_name || conv.contact_phone}
                            </span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {format(new Date(conv.last_message_at), 'h:mm a')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground truncate">
                              {student ? `${student.email || 'Student'}` : conv.contact_phone}
                            </p>
                            {student && (
                              <Badge variant="outline" className="text-xs">
                                {student.stage.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          {/* TODO: Add enrollment info display when needed */}
                        </div>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No student conversations yet. Students will appear here when they send WhatsApp messages.
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
      {activeConversation && activeMessages ? (
        <div className={cn(
          'flex-1 flex flex-col overflow-hidden',
          isMobile && !selectedConversationId ? 'hidden' : 'flex'
        )}>
              {/* Chat Header */}
              <div className="min-h-16 py-2 px-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-border bg-card gap-2">
          <div className="flex items-center gap-3">
            {isMobile && selectedConversationId && (
              <button
                onClick={() => setSelectedConversationId(null)}
                className="md:hidden p-2 -ml-1 rounded-md hover:bg-accent shrink-0"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {(activeStudent?.name || activeConversation.contact_name || activeConversation.contact_phone).split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {activeStudent?.name || activeConversation.contact_name || activeConversation.contact_phone}
                    </h3>
                    <p className="text-xs text-muted-foreground">{activeConversation.contact_phone}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {activeStudent?.stage && (
                        <Badge variant="outline" className="text-xs">
                          {activeStudent.stage.replace('_', ' ')}
                        </Badge>
                      )}
                      {/* TODO: Add enrollment info display when needed */}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end w-full sm:w-auto">
                  {activeConversation && currentProfile?.company_id && (
                    <ChatHeaderControls
                      conversation={activeConversation}
                      companyId={currentProfile.company_id}
                      currentUserRole={currentUserRole}
                      currentProfileId={currentProfileId}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSaveStudentDialogOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Save Student
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
                          <DropdownMenuItem
                            onClick={() => setReminderDialogOpen(true)}
                            disabled={!activeConversation}
                          >
                            <Bell className="mr-2 h-4 w-4" />
                            Set Reminder
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
                    </ChatHeaderControls>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSaveStudentDialogOpen(true)}
                    className="hidden sm:flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Save Student
                  </Button>
                </div>
              </div>

              {activeConversation && currentProfile?.company_id && !bannerDismissed && (
                <HumanTakeoverBanner
                  conversation={activeConversation}
                  companyId={currentProfile.company_id}
                  onDismiss={() => setBannerDismissed(true)}
                />
              )}

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
                {!canSendMessage && activeConversation?.assigned_to && (
                  <div className="mb-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    This chat is assigned to {activeConversation.assigned_profile?.name || 'another agent'}. Only they can reply.
                  </div>
                )}

                {isMetaProvider && !isWithin24HourWindow && (
                  <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm flex items-center justify-between text-orange-800">
                    <span className="font-medium">24-hour window closed. Send a pre-approved template to continue.</span>
                    <Button size="sm" onClick={() => setTemplateSelectorOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white border-0 text-xs">
                      Send Template
                    </Button>
                  </div>
                )}

                {isMetaProvider && isWithin24HourWindow && (
                  <div className="mb-2 text-[10px] text-green-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Service window open
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCourseSuggestionsOpen(true)}
                      className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                      title="Send course suggestion"
                      disabled={!selectedConversationId || !canSendFreeForm}
                    >
                      <GraduationCap className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAttachmentClick('file')}
                      className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                      title="Attach file"
                      disabled={!canSendFreeForm}
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAttachmentClick('image')}
                      className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                      title="Attach image"
                      disabled={!canSendFreeForm}
                    >
                      <Image className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAttachmentClick('document')}
                      className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                      title="Attach document"
                      disabled={!canSendFreeForm}
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    {isMetaProvider && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full hover:bg-secondary text-muted-foreground shrink-0"
                        onClick={() => setTemplateSelectorOpen(true)}
                        title="Send Template"
                        type="button"
                      >
                        <LayoutTemplate className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={selectedFiles.length > 0 ? `Sending ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}...` : "Type a message..."}
                      className="flex-1"
                      disabled={!canSendFreeForm}
                      onKeyDown={(e) => e.key === 'Enter' && canSendFreeForm && handleSendMessage()}
                    />
                    <Button
                      size="icon"
                      className="gradient-primary border-0 rounded-full shrink-0"
                      onClick={handleSendMessage}
                      disabled={createMessage.isPending || (!newMessage.trim() && selectedFiles.length === 0) || !selectedConversationId || !canSendFreeForm}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
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
              Select a student conversation to start messaging
            </div>
          )}
        </div>

      {/* Course Suggestions Dialog */}
      <CourseSuggestions
        isOpen={courseSuggestionsOpen}
        onOpenChange={setCourseSuggestionsOpen}
        onSelectCourse={handleSendCourse}
      />

      {/* Bulk Send Dialog */}
      <Dialog open={bulkSendDialogOpen} onOpenChange={(open) => {
        setBulkSendDialogOpen(open);
        if (!open) {
          // Clear filters when dialog closes
          clearAllFilters();
        }
      }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SendHorizontal className="w-5 h-5" />
              Bulk Send Message
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isMetaProvider && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Message Type</label>
                <Select
                  value={bulkMessageType}
                  onValueChange={(val: 'free_form' | 'template') => setBulkMessageType(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_form">Free-form Message</SelectItem>
                    <SelectItem value="template">Template Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {isMetaProvider && bulkMessageType === 'template' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Approved Template</label>
                  <Select
                    value={bulkSelectedTemplateId}
                    onValueChange={(val) => {
                      setBulkSelectedTemplateId(val);
                      const t = approvedTemplates.find(x => x.id === val);
                      const initialVals: Record<string, string> = {};
                      t?.variables.forEach(v => {
                        initialVals[v] = '';
                      });
                      setBulkTemplateVariableValues(initialVals);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(() => {
                  const t = approvedTemplates.find(x => x.id === bulkSelectedTemplateId);
                  if (!t || t.variables.length === 0) return null;
                  return (
                    <div className="space-y-3 bg-secondary/30 p-4 border rounded-lg">
                      <span className="text-xs font-semibold text-muted-foreground block mb-2">Template Variables</span>
                      {t.variables.map(v => (
                        <div key={v} className="grid grid-cols-3 items-center gap-3">
                          <label className="text-xs font-medium truncate col-span-1">{v}</label>
                          <Input
                            placeholder={`Value for ${v}...`}
                            className="h-8 text-xs col-span-2"
                            value={bulkTemplateVariableValues[v] || ''}
                            onChange={(e) => setBulkTemplateVariableValues(prev => ({ ...prev, [v]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <>
                {/* Selected Course Display */}
                {selectedCourse && (
                  <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Selected Course:</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCourse(null);
                          // Remove course details from the message
                          setBulkMessage(prev => prev.replace(/\*[^*]+\*\n\n[\s\S]*?\n🎓 \*Contact us for enrollment details!\*\n\n?/, ''));
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{selectedCourse.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({selectedCourse.duration_months} months)
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
                    placeholder={selectedCourse ? "Add additional message (optional)..." : "Type your message here..."}
                    className="w-full min-h-[100px] p-3 border border-border rounded-md resize-none"
                  />
                </div>

                {/* File Attachments */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Attachments (Optional)</label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setCourseSuggestionsOpen(true)}
                      className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
                      title="Send course details"
                    >
                      <GraduationCap className="w-5 h-5" />
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
              </>
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
                {/* Student Stage Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Student Stage</label>
                  <Select value={studentStageFilter} onValueChange={setStudentStageFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All Stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      <SelectItem value="new_students">New Students</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="demo_scheduled">Demo Scheduled</SelectItem>
                      <SelectItem value="demo_attended">Demo Attended</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="fees_discussed">Fees Discussed</SelectItem>
                      <SelectItem value="enrolled">Enrolled</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Course Filter - TODO: Implement when enrollment system is integrated */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Enrolled Course</label>
                  <Select value={courseFilter} onValueChange={setCourseFilter} disabled>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All Courses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Batch Filter - TODO: Implement when enrollment system is integrated */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Batch</label>
                  <Select value={batchFilter} onValueChange={setBatchFilter} disabled>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All Batches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
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
                      (filtered from {studentConversations.length} total)
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
                        {students?.find(s => s.phone === conv.contact_phone)?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || conv.contact_phone.slice(-2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-sm truncate">
                            {students?.find(s => s.phone === conv.contact_phone)?.name || conv.contact_name}
                          </div>
                          {/* Show student stage badge if available */}
                          {(() => {
                            const student = students?.find(s => s.phone === conv.contact_phone);
                            if (student?.stage) {
                              const stageColors = {
                                new_students: 'bg-blue-100 text-blue-800 border-blue-200',
                                contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                demo_scheduled: 'bg-orange-100 text-orange-800 border-orange-200',
                                demo_attended: 'bg-purple-100 text-purple-800 border-purple-200',
                                interested: 'bg-green-100 text-green-800 border-green-200',
                                fees_discussed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                                enrolled: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                                lost: 'bg-red-100 text-red-800 border-red-200'
                              };
                              return (
                                <Badge
                                  variant="outline"
                                  className={`text-xs px-1 py-0 ${stageColors[student.stage] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
                                >
                                  {student.stage.replace('_', ' ')}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {conv.contact_phone}
                          {/* TODO: Show enrollment info when available */}
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
                setSelectedCourse(null);
                clearAllFiles();
                clearAllFilters();
                setBulkMessageType('free_form');
                setBulkSelectedTemplateId('');
                setBulkTemplateVariableValues({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkSend}
              disabled={
                selectedContacts.length === 0 ||
                ((isMetaProvider && bulkMessageType === 'template')
                  ? !bulkSelectedTemplateId || (approvedTemplates.find(x => x.id === bulkSelectedTemplateId)?.variables.some(v => !bulkTemplateVariableValues[v]?.trim()) ?? false)
                  : (!bulkMessage.trim() && selectedFiles.length === 0))
              }
              className="gradient-primary border-0"
            >
              <SendHorizontal className="w-4 h-4 mr-2" />
              Send to {selectedContacts.length} Contact{selectedContacts.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Student Dialog */}
      {activeConversation && (
        <SaveStudentDialog
          open={saveStudentDialogOpen}
          onOpenChange={setSaveStudentDialogOpen}
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

      <SetReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        conversationId={activeConversation?.id ?? ''}
        contactName={
          students?.find((s) => s.phone === activeConversation?.contact_phone)?.name
          || activeConversation?.contact_name
          || 'Contact'
        }
      />

      {activeConversation && (
        <TemplateSelectorDialog
          open={templateSelectorOpen}
          onOpenChange={setTemplateSelectorOpen}
          conversationId={activeConversation.id}
          contactName={students?.find(s => s.phone === activeConversation.contact_phone)?.name || activeConversation.contact_name || undefined}
          onSent={() => refetchMessages()}
        />
      )}
    </>
  );
}
