import { Fragment, useEffect, useMemo, useState } from 'react';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { History, Loader2, Lock, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useLeadHistory, type LeadEntity, type LeadHistoryRow } from '@/hooks/useLeadHistory';
import { useProfiles } from '@/hooks/useProfiles';
import { getInteractionOptionsForIndustry, interactionLabel } from '@/lib/leadHistoryInteractionTypes';
import type { Enums } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

function dayHeading(dateIso: string): string {
  const d = new Date(dateIso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'd MMMM yyyy');
}

function interactionBadgeClass(slug: string): string {
  const palette: Record<string, string> = {
    call: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    whatsapp: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    meeting: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
    site_visit: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30',
    test_drive: 'bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/30',
    note: 'bg-muted text-foreground border-border',
    email: 'bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30',
    demo_class: 'bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500/30',
    fee_discussion: 'bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30',
  };
  return palette[slug] ?? 'bg-primary/10 text-primary border-primary/20';
}

function authorName(row: LeadHistoryRow): string {
  const n = row.profiles?.name?.trim();
  if (n) return n;
  return 'Team member';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

export interface LeadHistoryTimelineProps {
  leadId: string;
  leadEntity: LeadEntity;
  companyId: string;
  industry: Enums<'industry_type'> | null;
  enabled?: boolean;
}

export function LeadHistoryTimeline({
  leadId,
  leadEntity,
  companyId,
  industry,
  enabled = true,
}: LeadHistoryTimelineProps) {
  const { data: profiles } = useProfiles();
  const { entries, isLoading, isError, addEntry } = useLeadHistory({
    leadId,
    leadEntity,
    companyId,
    enabled,
  });

  const [message, setMessage] = useState('');
  const [interactionType, setInteractionType] = useState<string>('note');
  const [teamVisible, setTeamVisible] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');

  const interactionOptions = useMemo(() => getInteractionOptionsForIndustry(industry), [industry]);

  useEffect(() => {
    const first = interactionOptions[0]?.value;
    if (first && !interactionOptions.some((o) => o.value === interactionType)) {
      setInteractionType(first);
    }
  }, [interactionOptions, interactionType]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((row) => {
      if (q && !row.message.toLowerCase().includes(q)) return false;
      if (typeFilter !== 'all' && row.interaction_type !== typeFilter) return false;
      if (employeeFilter !== 'all' && row.created_by !== employeeFilter) return false;
      return true;
    });
  }, [entries, search, typeFilter, employeeFilter]);

  const handleAdd = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('Please write what happened before adding an entry.');
      return;
    }
    try {
      await addEntry.mutateAsync({
        lead_id: leadId,
        lead_entity: leadEntity,
        company_id: companyId,
        interaction_type: interactionType,
        message: trimmed,
        visibility: teamVisible ? 'team' : 'private',
        raw_data: {},
      });
      setMessage('');
      toast.success('History entry added');
    } catch (e: unknown) {
      console.error(e);
      toast.error('Could not add history entry');
    }
  };

  if (isError) {
    return (
      <p className="text-sm text-destructive px-1 py-4">
        Unable to load history. Check your connection and try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <div className="rounded-xl border bg-card/60 p-3 sm:p-4 space-y-3 shrink-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="lead-history-message" className="text-xs text-muted-foreground">
              Write what happened with the client…
            </Label>
            <Textarea
              id="lead-history-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Discussed budget, follow-up next Tuesday…"
              className="resize-none min-h-[88px]"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="space-y-2 flex-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground">Interaction type</Label>
              <Select value={interactionType} onValueChange={setInteractionType}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interactionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/80 px-3 py-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium leading-none">Team visible</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Off = private (you + managers)
                  </p>
                </div>
                <Switch checked={teamVisible} onCheckedChange={setTeamVisible} />
              </div>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => void handleAdd()}
                disabled={addEntry.isPending}
              >
                {addEntry.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding…
                  </>
                ) : (
                  'Add entry'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in messages…"
            className="pl-9 h-9 bg-background"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 bg-background">
            <SelectValue placeholder="Interaction type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {interactionOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-9 bg-background">
            <SelectValue placeholder="Employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {(profiles ?? []).map((p) => (
              <SelectItem key={p.user_id} value={p.user_id}>
                {p.name || p.user_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1 min-h-[240px] sm:min-h-[320px] rounded-xl border bg-muted/20">
        <div className="p-3 sm:p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading timeline…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {entries.length === 0
                ? 'No interactions yet. Add the first note above.'
                : 'No entries match your filters.'}
            </div>
          ) : (
            filtered.map((row, index) => {
              const prev = index > 0 ? filtered[index - 1] : null;
              const showDay =
                !prev || !isSameDay(new Date(row.created_at), new Date(prev.created_at));
              const isPrivate = row.visibility === 'private';

              return (
                <Fragment key={row.id}>
                  {showDay && (
                    <div className="flex justify-center py-2">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-background/90 border px-3 py-1 rounded-full">
                        {dayHeading(row.created_at)}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-3 items-start">
                    <Avatar className="h-9 w-9 shrink-0 border">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials(authorName(row))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-foreground">
                          {authorName(row)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(row.created_at), 'MMM d, yyyy · h:mm a')}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-semibold capitalize border',
                            interactionBadgeClass(row.interaction_type)
                          )}
                        >
                          {interactionLabel(row.interaction_type, industry)}
                        </Badge>
                        {isPrivate && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            Private
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          'rounded-2xl rounded-tl-md px-3 py-2.5 text-sm leading-relaxed shadow-sm border bg-background',
                          'max-w-[min(100%,42rem)]'
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-foreground">{row.message}</p>
                      </div>
                    </div>
                  </div>
                </Fragment>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export interface LeadHistoryDialogProps extends LeadHistoryTimelineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectTitle: string;
}

export function LeadHistoryDialog({
  open,
  onOpenChange,
  subjectTitle,
  ...timeline
}: LeadHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-[100vw] w-[min(100vw-1rem,56rem)] h-[min(100dvh-1rem,820px)] p-0 gap-0',
          'flex flex-col overflow-hidden sm:rounded-xl'
        )}
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0 text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">Lead history</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm line-clamp-2">
                {subjectTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col px-4 pb-4 pt-3 overflow-hidden">
          <LeadHistoryTimeline {...timeline} enabled={timeline.enabled !== false && open} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
