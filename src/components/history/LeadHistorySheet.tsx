import { useEffect, useMemo, useState } from 'react';
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parse,
} from 'date-fns';
import { Clock, History, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useAddLeadInteraction,
  useLeadHistory,
  useLeadHistoryRealtime,
  useSoftDeleteLeadInteraction,
  useUpdateLeadInteraction,
  type LeadHistoryLeadType,
  type LeadInteraction,
} from '@/hooks/useLeadHistory';
import { useCurrentProfile } from '@/hooks/useProfiles';

type Props = {
  leadId: string;
  leadType: LeadHistoryLeadType;
  leadName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const INTERACTION_OPTIONS: Record<
  LeadHistoryLeadType,
  { value: string; label: string }[]
> = {
  real_estate: [
    { value: 'call', label: 'Call' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'site_visit', label: 'Site Visit' },
    { value: 'booking_discussion', label: 'Booking Discussion' },
    { value: 'note', label: 'Note' },
  ],
  automobile: [
    { value: 'call', label: 'Call' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'test_drive', label: 'Test Drive' },
    { value: 'price_negotiation', label: 'Price Negotiation' },
    { value: 'note', label: 'Note' },
  ],
  internal_crm: [
    { value: 'call', label: 'Call' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'demo', label: 'Demo' },
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'note', label: 'Note' },
  ],
};

function interactionBadgeClass(type: string): string {
  switch (type) {
    case 'call':
      return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100';
    case 'whatsapp':
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
    case 'meeting':
      return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100';
    case 'site_visit':
    case 'test_drive':
      return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100';
    case 'demo':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100';
    case 'note':
      return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100';
  }
}

function interactionLabel(leadType: LeadHistoryLeadType, value: string): string {
  const list = INTERACTION_OPTIONS[leadType];
  return list.find((o) => o.value === value)?.label ?? value;
}

function dayLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'd MMMM yyyy');
}

function dayKey(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd');
}

function filterInteractions(
  rows: LeadInteraction[],
  typeFilter: string,
  employeeFilter: string,
  fromStr: string,
  toStr: string
): LeadInteraction[] {
  const from = fromStr ? startOfDay(parse(fromStr, 'yyyy-MM-dd', new Date())) : null;
  const to = toStr ? endOfDay(parse(toStr, 'yyyy-MM-dd', new Date())) : null;

  return rows.filter((row) => {
    if (typeFilter !== 'all' && row.interaction_type !== typeFilter) return false;
    if (employeeFilter !== 'all' && row.created_by_name !== employeeFilter) return false;
    const t = parseISO(row.created_at);
    if (from && to) {
      if (!isWithinInterval(t, { start: from, end: to })) return false;
    } else if (from && t < from) return false;
    else if (to && t > to) return false;
    return true;
  });
}

export function LeadHistorySheet({ leadId, leadType, leadName, open, onOpenChange }: Props) {
  const { data: interactions, isLoading } = useLeadHistory(leadId, leadType);
  useLeadHistoryRealtime(leadId);

  const { data: currentProfile } = useCurrentProfile();
  const addInteraction = useAddLeadInteraction();
  const updateInteraction = useUpdateLeadInteraction();
  const softDelete = useSoftDeleteLeadInteraction();

  const [note, setNote] = useState('');
  const [interactionType, setInteractionType] = useState(() => INTERACTION_OPTIONS[leadType][0].value);
  const [filterType, setFilterType] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [deletePopoverId, setDeletePopoverId] = useState<string | null>(null);

  useEffect(() => {
    setInteractionType(INTERACTION_OPTIONS[leadType][0].value);
  }, [leadType]);

  const employees = useMemo(() => {
    const names = new Set<string>();
    (interactions || []).forEach((r) => {
      if (r.created_by_name) names.add(r.created_by_name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [interactions]);

  const hasAnyInteractions = (interactions?.length ?? 0) > 0;

  const filtered = useMemo(
    () => filterInteractions(interactions || [], filterType, filterEmployee, fromDate, toDate),
    [interactions, filterType, filterEmployee, fromDate, toDate]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, LeadInteraction[]>();
    filtered.forEach((row) => {
      const k = dayKey(row.created_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(row);
    });
    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return keys.map((k) => ({
      key: k,
      label: dayLabel(parseISO(k + 'T12:00:00')),
      items: (map.get(k) || []).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));
  }, [filtered]);

  const summary = useMemo(() => {
    const all = interactions || [];
    if (all.length === 0) {
      return { total: 0, first: null as string | null, last: null as string | null };
    }
    const sorted = [...all].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return {
      total: all.length,
      first: sorted[0].created_at,
      last: sorted[sorted.length - 1].created_at,
    };
  }, [interactions]);

  const canModifyRow = (row: LeadInteraction) => {
    const role = currentProfile?.role;
    const privileged = role === 'super_admin' || role === 'admin';
    const owner = currentProfile?.id === row.created_by;
    return owner || privileged;
  };

  const handleAdd = async () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    await addInteraction.mutateAsync({
      leadId,
      leadType,
      interaction_type: interactionType,
      note: trimmed,
    });
    setNote('');
    setInteractionType(INTERACTION_OPTIONS[leadType][0].value);
  };

  const clearFilters = () => {
    setFilterType('all');
    setFilterEmployee('all');
    setFromDate('');
    setToDate('');
  };

  const saveEdit = async (row: LeadInteraction) => {
    await updateInteraction.mutateAsync({
      id: row.id,
      note: editDraft,
      leadId,
    });
    setEditingId(null);
  };

  const confirmDelete = async (row: LeadInteraction) => {
    await softDelete.mutateAsync({ id: row.id, leadId });
    setDeletePopoverId(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full md:w-[650px] sm:max-w-none overflow-y-auto p-0 flex flex-col">
        <div className="p-6 pb-0">
          <SheetHeader className="text-left space-y-1 pr-8">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Lead History
            </SheetTitle>
            <SheetDescription className="line-clamp-2">{leadName}</SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 flex flex-col gap-4 p-6 pt-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Log an interaction — what happened with this client?"
              className="min-h-[88px] resize-y"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end sm:justify-between">
              <div className="flex-1">
                <Select value={interactionType} onValueChange={setInteractionType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERACTION_OPTIONS[leadType].map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="sm:w-auto shrink-0"
                disabled={!note.trim() || addInteraction.isPending}
                onClick={() => void handleAdd()}
              >
                {addInteraction.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Add Entry'
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 text-xs">
            <div className="flex flex-col gap-1 min-w-[120px]">
              <span className="text-muted-foreground">Type</span>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {INTERACTION_OPTIONS[leadType].map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 min-w-[120px]">
              <span className="text-muted-foreground">Employee</span>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">From</span>
              <Input type="date" className="h-8 text-xs w-[150px]" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">To</span>
              <Input type="date" className="h-8 text-xs w-[150px]" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <button
              type="button"
              className="text-xs text-primary underline-offset-4 hover:underline pb-1"
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>

          <div className="flex-1 min-h-[200px]">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-4 w-14 shrink-0 mt-1" />
                    <Skeleton className="h-20 flex-1 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : !hasAnyInteractions ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
                <Clock className="h-10 w-10 opacity-40" />
                <p className="text-sm">No interactions logged yet — add the first one above</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
                <Clock className="h-10 w-10 opacity-40" />
                <p className="text-sm">No interactions match these filters — try adjusting or Clear</p>
              </div>
            ) : (
              <div className="space-y-8">
                {grouped.map((group) => (
                  <div key={group.key}>
                    <div className="relative flex items-center gap-3 py-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground shrink-0 px-1">{group.label}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="space-y-4 mt-2">
                      {group.items.map((row) => (
                        <div key={row.id} className="flex gap-3 items-start">
                          <span className="text-xs text-muted-foreground w-14 shrink-0 pt-1.5 text-right tabular-nums">
                            {format(parseISO(row.created_at), 'h:mm a')}
                          </span>
                          <div
                            className={cn(
                              'flex-1 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm group/bubble relative',
                              'pr-10'
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground">{row.created_by_name}</span>
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', interactionBadgeClass(row.interaction_type))}>
                                {interactionLabel(leadType, row.interaction_type)}
                              </Badge>
                            </div>
                            {editingId === row.id ? (
                              <div className="mt-2 space-y-2">
                                <Textarea
                                  className="min-h-[72px] text-sm"
                                  value={editDraft}
                                  onChange={(e) => setEditDraft(e.target.value)}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={updateInteraction.isPending}
                                    onClick={() => void saveEdit(row)}
                                  >
                                    {updateInteraction.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => setEditingId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">{row.note}</p>
                            )}
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {formatDistanceToNow(parseISO(row.created_at), { addSuffix: true })}
                            </p>

                            {canModifyRow(row) && editingId !== row.id && (
                              <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingId(row.id);
                                    setEditDraft(row.note);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Popover open={deletePopoverId === row.id} onOpenChange={(o) => setDeletePopoverId(o ? row.id : null)}>
                                  <PopoverTrigger asChild>
                                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56 p-3" align="end">
                                    <p className="text-sm font-medium mb-2">Delete this entry?</p>
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeletePopoverId(null)}>
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-7 text-xs"
                                        disabled={softDelete.isPending}
                                        onClick={() => void confirmDelete(row)}
                                      >
                                        {softDelete.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground border-t pt-3 mt-auto">
            {summary.total} interactions total
            {summary.first && summary.last ? (
              <>
                {' '}
                · First contact: {format(parseISO(summary.first), 'd MMM yyyy')} · Last contact:{' '}
                {format(parseISO(summary.last), 'd MMM yyyy')}
              </>
            ) : null}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
