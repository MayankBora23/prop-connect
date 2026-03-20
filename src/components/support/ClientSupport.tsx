import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { LifeBuoy, Send, Bot, User, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useClientReplyToTicket,
  useClientSupportTickets,
  useCreateSupportTicket,
  useSupportTicketMessages,
  SupportTicketCategory,
  SupportTicketPriority,
  useSupportTicketsRealtimeClient,
} from '@/hooks/useSupportTickets';
import { useCurrentCompany } from '@/hooks/useCompany';

const SUPPORT_AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-ai-suggest`;

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'open':
      return 'secondary';
    case 'in_progress':
      return 'default';
    case 'resolved':
      return 'outline';
    case 'closed':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function categoryLabel(category: SupportTicketCategory) {
  switch (category) {
    case 'bug':
      return 'Bug';
    case 'feature_request':
      return 'Feature Request';
    case 'help':
      return 'Help';
    case 'integration':
      return 'Integration';
    default:
      return category;
  }
}

function priorityLabel(priority: SupportTicketPriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function ClientSupport() {
  const { toast } = useToast();
  const { data: tickets, isLoading: ticketsLoading } = useClientSupportTickets();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { data: company } = useCurrentCompany();

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId || !tickets) return null;
    return tickets.find((t) => t.id === selectedTicketId) ?? null;
  }, [selectedTicketId, tickets]);

  const { data: messages, isLoading: messagesLoading } = useSupportTicketMessages(selectedTicketId);
  // Clients never see internal notes (RLS should deny, so we don't query them).

  const createTicket = useCreateSupportTicket();
  const replyTicket = useClientReplyToTicket();

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isSolvingAI, setIsSolvingAI] = useState(false);
  const [priority, setPriority] = useState<SupportTicketPriority>('medium');
  const [category, setCategory] = useState<SupportTicketCategory>('help');

  const [replyDraft, setReplyDraft] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useSupportTicketsRealtimeClient();

  useEffect(() => {
    if (!aiQuestion.trim()) {
      setAiTitle('');
      setAiAnswer(null);
      return;
    }
    // Lightweight title suggestion: first line / first ~7 words.
    const firstLine = aiQuestion.trim().split('\n')[0]?.trim() || '';
    const words = firstLine.split(/\s+/).filter(Boolean);
    const suggested = words.slice(0, 7).join(' ');
    setAiTitle(suggested || '');
  }, [aiQuestion]);

  useEffect(() => {
    if (!selectedTicketId && tickets && tickets.length > 0) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const handleSolveWithAI = async () => {
    if (!aiQuestion.trim()) {
      toast({ title: 'Add a question first', description: 'Write what you need help with.' });
      return;
    }

    setIsSolvingAI(true);
    setAiAnswer(null);

    try {
      const industry_type = company?.industry;
      const resp = await fetch(SUPPORT_AI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Edge function is configured with verify_jwt=false.
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          question: aiQuestion,
          industry_type,
          category,
          priority,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Failed to get AI suggestion');
      }

      const data = await resp.json();
      if (!data?.answer) throw new Error('AI returned empty answer');
      setAiAnswer(data.answer);
    } catch (e: any) {
      toast({
        title: 'AI error',
        description: e?.message || 'Could not generate an answer',
        variant: 'destructive',
      });
    } finally {
      setIsSolvingAI(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!aiQuestion.trim()) {
      toast({ title: 'Add a question first', description: 'Write what you need help with.' });
      return;
    }
    if (!aiTitle.trim()) {
      toast({ title: 'Add a title first', description: 'Title helps us route your ticket.' });
      return;
    }

    try {
      await createTicket.mutateAsync({
        title: aiTitle.trim(),
        description: aiQuestion.trim(),
        priority,
        category,
      });

      setAiQuestion('');
      setAiTitle('');
      setAiAnswer(null);

      toast({ title: 'Ticket created', description: 'Support will respond shortly.' });
    } catch (e: any) {
      toast({
        title: 'Failed to create ticket',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReply = async () => {
    if (!selectedTicketId) return;
    if (!replyDraft.trim()) return;
    setIsReplying(true);
    try {
      await replyTicket.mutateAsync({ ticketId: selectedTicketId, message: replyDraft.trim() });
      setReplyDraft('');
    } catch (e: any) {
      toast({
        title: 'Reply failed',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsReplying(false);
    }
  };

  const handleQuestionKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateTicket();
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-5">
        <Card className="h-[calc(100vh-10rem)] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Your Tickets</CardTitle>
              </div>
              <Badge variant="outline">{tickets ? tickets.length : 0}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="space-y-3">
              <div className="text-sm font-medium">Ask a Question</div>

              <div className="space-y-2">
                <Input
                  placeholder="Title"
                  value={aiTitle}
                  onChange={(e) => setAiTitle(e.target.value)}
                />
                <Select value={category} onValueChange={(v) => setCategory(v as SupportTicketCategory)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="help">Help</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priority} onValueChange={(v) => setPriority(v as SupportTicketPriority)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder="Type your question... (Enter to create ticket, Shift+Enter for newline)"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={handleQuestionKeyDown}
                className="min-h-[90px]"
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleSolveWithAI}
                  disabled={isSolvingAI || !aiQuestion.trim()}
                >
                  {isSolvingAI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bot className="w-4 h-4 mr-2" />}
                  Solve with AI
                </Button>
                <Button type="button" className="flex-1 gradient-primary" onClick={handleCreateTicket} disabled={!aiQuestion.trim()}>
                  <Send className="w-4 h-4 mr-2" />
                  Create Ticket
                </Button>
              </div>

              {aiAnswer && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <div className="text-sm font-medium">AI Suggested Solution</div>
                    </div>
                    <Badge variant="secondary">Preview</Badge>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{aiAnswer}</div>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex-1 overflow-hidden">
              {ticketsLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading tickets...</div>
              ) : (
                <ScrollArea className="h-full">
                  {tickets && tickets.length > 0 ? (
                    <div className="space-y-2 pr-2">
                      {tickets.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className={cn(
                            'w-full text-left rounded-lg border p-3 transition-colors',
                            selectedTicketId === t.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/60'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{t.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {t.description}
                              </p>
                            </div>
                            <Badge variant={getStatusBadgeVariant(t.status)} className="shrink-0">
                              {t.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{categoryLabel(t.category)}</span>
                            <span>•</span>
                            <span>Priority: {priorityLabel(t.priority)}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-2">
                            Updated {format(new Date(t.updated_at), 'MMM d, p')}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      No tickets yet. Ask a question above to get help.
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-7">
        <Card className="h-[calc(100vh-10rem)] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">
                  {selectedTicket ? selectedTicket.title : 'Select a ticket'}
                </CardTitle>
                {selectedTicket && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <Badge variant={getStatusBadgeVariant(selectedTicket.status)}>
                      {selectedTicket.status.replace('_', ' ')}
                    </Badge>
                    <span>Priority: {priorityLabel(selectedTicket.priority)}</span>
                    <span>•</span>
                    <span>{categoryLabel(selectedTicket.category)}</span>
                  </div>
                )}
              </div>
              {selectedTicket && selectedTicket.assigned_to ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4" />
                  Assigned
                </div>
              ) : (
                <Badge variant="outline">Unassigned</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <div className="flex-1 p-4 overflow-hidden">
              {messagesLoading ? (
                <div className="text-sm text-muted-foreground">Loading conversation...</div>
              ) : !selectedTicket ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Choose a ticket to view the conversation.
                </div>
              ) : messages && messages.length > 0 ? (
                <ScrollArea className="h-full pr-2">
                  <div className="space-y-4">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          'flex',
                          m.sender_type === 'client' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                            m.sender_type === 'client'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <div className="text-sm">{m.message}</div>
                          <div className="mt-1 text-[11px] opacity-80 flex items-center gap-2">
                            {m.sender_type === 'client' ? (
                              <User className="w-3 h-3" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            {format(new Date(m.created_at), 'p')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No messages yet.
                </div>
              )}
            </div>

            <Separator />
            <div className="p-4 border-t">
              {!selectedTicket ? (
                <div className="text-sm text-muted-foreground">Select a ticket to reply.</div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Add Reply</div>
                  <Textarea
                    placeholder="Write your reply..."
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    disabled={isReplying || selectedTicket.status === 'closed'}
                    className="min-h-[80px]"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      {selectedTicket.status === 'closed' ? 'This ticket is closed.' : 'Your reply will be sent to support.'}
                    </div>
                    <Button
                      onClick={handleReply}
                      disabled={isReplying || !replyDraft.trim() || selectedTicket.status === 'closed'}
                      className="gradient-primary"
                    >
                      {isReplying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      Reply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

