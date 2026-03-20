import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUpdateInternalLead } from '@/hooks/useInternalLeads';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { InternalLead } from '@/hooks/useInternalLeads';
import type { Enums } from '@/integrations/supabase/types';
import { useProfiles } from '@/hooks/useProfiles';
import {
  formatDateSeparator,
  formatInteractionType,
  formatTime,
  InteractionType,
  useAddInternalLeadHistoryEntry,
  useInternalLeadHistoryEntries,
  useInternalLeadHistoryRealtime,
} from '@/hooks/useLeadHistory';

const internalLeadSchema = z.object({
    company_name: z.string().trim().min(1, 'Company name is required').max(200),
    lead_name: z.string().trim().min(1, 'Lead name is required').max(150),
    phone_no: z
        .string()
        .trim()
        .max(20)
        .regex(/^[0-9+\-\s]*$/, 'Invalid phone number format')
        .optional()
        .or(z.literal('')),
    address: z.string().trim().max(500).optional().or(z.literal('')),
    industry: z.custom<Enums<'industry_type'>>(),
    user_limit: z.string().trim().optional().or(z.literal('')),
    stage: z.string(),
});

type InternalLeadFormData = z.infer<typeof internalLeadSchema>;

interface EditInternalLeadDialogProps {
    lead: InternalLead | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialTab?: 'details' | 'history';
}

const industries: { value: Enums<'industry_type'>; label: string }[] = [
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'education', label: 'Education' },
    { value: 'automobile_dealers', label: 'Automobile Dealers' },
    { value: 'internal_crm', label: 'Internal CRM' },
];

const stages = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'demo_scheduled', label: 'Demo Scheduled' },
    { value: 'trial_started', label: 'Trial Started' },
    { value: 'closed_won', label: 'Closed Won' },
    { value: 'closed_lost', label: 'Closed Lost' },
];

export function EditInternalLeadDialog({ lead, open, onOpenChange, initialTab = 'details' }: EditInternalLeadDialogProps) {
    const { toast } = useToast();
    const updateLead = useUpdateInternalLead();
    const { data: profiles } = useProfiles();

    const [activeTab, setActiveTab] = useState<'details' | 'history'>(initialTab);

    const form = useForm<InternalLeadFormData>({
        resolver: zodResolver(internalLeadSchema),
        defaultValues: {
            company_name: '',
            lead_name: '',
            phone_no: '',
            address: '',
            industry: 'real_estate',
            user_limit: '',
            stage: 'new',
        },
    });

    // Update form values when lead changes
    React.useEffect(() => {
        if (lead) {
            form.reset({
                company_name: lead.company_name,
                lead_name: lead.lead_name,
                phone_no: lead.phone_no || '',
                address: lead.address || '',
                industry: lead.industry,
                user_limit: lead.user_limit?.toString() || '',
                stage: lead.stage,
            });
        }
    }, [lead, form]);

    React.useEffect(() => {
        if (!open) return;
        setActiveTab(initialTab);
    }, [open, initialTab]);

    const { data: historyEntries, isLoading: historyLoading } = useInternalLeadHistoryEntries(lead?.id);
    useInternalLeadHistoryRealtime(lead?.id);
    const addEntry = useAddInternalLeadHistoryEntry(lead?.id);

    const [newInteractionType, setNewInteractionType] = useState<InteractionType>('note');
    const [newMessage, setNewMessage] = useState('');

    // Filters
    const [interactionTypeFilter, setInteractionTypeFilter] = useState<string>('all');
    const [employeeFilter, setEmployeeFilter] = useState<string>('all');
    const [dateStart, setDateStart] = useState<string>('');
    const [dateEnd, setDateEnd] = useState<string>('');
    const [searchKeyword, setSearchKeyword] = useState<string>('');

    const profileNameById = useMemo(() => {
        const map = new Map<string, string>();
        (profiles || []).forEach((p: any) => {
            if (!p?.user_id) return;
            map.set(p.user_id, p.name || p.user_id);
        });
        return map;
    }, [profiles]);

    const filteredEntries = useMemo(() => {
        const startMs = dateStart ? new Date(dateStart).setHours(0, 0, 0, 0) : null;
        const endMs = dateEnd ? new Date(dateEnd).setHours(23, 59, 59, 999) : null;
        const kw = searchKeyword.trim().toLowerCase();

        return (historyEntries || []).filter((e) => {
            if (interactionTypeFilter !== 'all' && e.interaction_type !== interactionTypeFilter) return false;
            if (employeeFilter !== 'all' && e.created_by !== employeeFilter) return false;
            const createdAt = new Date(e.created_at).getTime();
            if (startMs !== null && createdAt < startMs) return false;
            if (endMs !== null && createdAt > endMs) return false;
            if (kw && !e.message.toLowerCase().includes(kw)) return false;
            return true;
        });
    }, [historyEntries, interactionTypeFilter, employeeFilter, dateStart, dateEnd, searchKeyword]);

    const groupedByDate = useMemo(() => {
        const groups: Array<{ dateKey: string; label: string; entries: typeof filteredEntries }> = [];
        const seen = new Set<string>();
        for (const e of filteredEntries) {
            const d = new Date(e.created_at);
            const dateKey = d.toISOString().slice(0, 10);
            if (!seen.has(dateKey)) {
                seen.add(dateKey);
                groups.push({ dateKey, label: formatDateSeparator(d), entries: [e as any] });
            } else {
                const g = groups.find((gg) => gg.dateKey === dateKey);
                if (g) g.entries.push(e as any);
            }
        }
        return groups;
    }, [filteredEntries]);

    const interactionTypeOptions: Array<{ value: InteractionType; label: string }> = [
        { value: 'call', label: 'Call' },
        { value: 'meeting', label: 'Meeting' },
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'note', label: 'Note' },
    ];

    const onSubmit = async (data: InternalLeadFormData) => {
        if (!lead) return;

        try {
            await updateLead.mutateAsync({
                id: lead.id,
                company_name: data.company_name,
                lead_name: data.lead_name,
                phone_no: data.phone_no || null,
                address: data.address || null,
                industry: data.industry,
                user_limit: data.user_limit ? Number(data.user_limit) : null,
                stage: data.stage as any,
            });

            toast({
                title: 'Lead updated',
                description: `${data.company_name} - ${data.lead_name} has been updated successfully.`,
            });

            onOpenChange(false);
        } catch (error: any) {
            console.error('Update internal lead error:', error);
            toast({
                title: 'Error updating lead',
                description: error?.message || 'Failed to update internal CRM lead. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Internal CRM Lead</DialogTitle>
                    <DialogDescription>
                        Update potential customer details. Fields marked with * are required.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="company_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter company name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="lead_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lead Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter primary contact name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone_no"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone No</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter phone number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter company or lead address" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="industry"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Industry *</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={(value) => field.onChange(value as Enums<'industry_type'>)}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select industry" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {industries.map((ind) => (
                                                    <SelectItem key={ind.value} value={ind.value}>
                                                        {ind.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="user_limit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>User Limit</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={1}
                                                placeholder="e.g., 25"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="stage"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stage</FormLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select stage" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {stages.map((st) => (
                                                <SelectItem key={st.value} value={st.value}>
                                                    {st.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateLead.isPending} className="gradient-primary border-0">
                                {updateLead.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Update Lead
                            </Button>
                        </div>
                            </form>
                        </Form>
                    </TabsContent>

                    <TabsContent value="history" className="mt-4">
                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Add Interaction</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Type</label>
                                            <Select value={newInteractionType} onValueChange={(v) => setNewInteractionType(v as InteractionType)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select interaction type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {interactionTypeOptions.map((t) => (
                                                        <SelectItem key={t.value} value={t.value}>
                                                            {t.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Add entry for: <span className="font-medium text-foreground">{lead?.lead_name ?? 'Lead'}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Message</label>
                                        <Textarea
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Write interaction details..."
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-3">
                                        <Button type="button" variant="outline" onClick={() => setNewMessage('')} disabled={addEntry.isPending}>
                                            Clear
                                        </Button>
                                        <Button
                                            type="button"
                                            className="gradient-primary border-0"
                                            disabled={!lead?.id || addEntry.isPending || newMessage.trim().length === 0}
                                            onClick={async () => {
                                                try {
                                                    await addEntry.mutateAsync({
                                                        interaction_type: newInteractionType,
                                                        message: newMessage.trim(),
                                                    });
                                                    setNewMessage('');
                                                    setNewInteractionType('note');
                                                    toast({ title: 'History added', description: 'Interaction logged successfully.' });
                                                } catch (err: any) {
                                                    toast({
                                                        title: 'Failed to add history',
                                                        description: err?.message ?? 'Please try again.',
                                                        variant: 'destructive',
                                                    });
                                                }
                                            }}
                                        >
                                            {addEntry.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            Add Entry
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Timeline</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Type</label>
                                            <Select value={interactionTypeFilter} onValueChange={setInteractionTypeFilter}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Filter type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All</SelectItem>
                                                    {interactionTypeOptions.map((t) => (
                                                        <SelectItem key={t.value} value={t.value}>
                                                            {t.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Employee</label>
                                            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Filter employee" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All employees</SelectItem>
                                                    {(profiles || []).map((p: any) => (
                                                        <SelectItem key={p.user_id} value={p.user_id}>
                                                            {p.name || p.user_id}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Start</label>
                                            <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-1 block">End</label>
                                            <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1 block">Search</label>
                                        <Input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="Search in message..." />
                                    </div>

                                    {historyLoading ? (
                                        <div className="space-y-3">
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <div key={i} className="h-14 rounded-lg border bg-muted/30 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : filteredEntries.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No interactions found.
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {groupedByDate.map((group) => (
                                                <div key={group.dateKey} className="space-y-2">
                                                    <div className="text-xs font-semibold text-muted-foreground text-center">
                                                        {group.label}
                                                    </div>
                                                    <div className="space-y-2">
                                                        {group.entries.map((entry: any) => {
                                                            const createdByName = profileNameById.get(entry.created_by) || entry.created_by;
                                                            const ownerName =
                                                                entry.assigned_to ? profileNameById.get(entry.assigned_to) || entry.assigned_to : null;
                                                            return (
                                                                <div key={entry.id} className="flex gap-3 items-start">
                                                                    <div className="w-[92px] shrink-0 text-xs text-muted-foreground">
                                                                        {formatTime(new Date(entry.created_at))}
                                                                    </div>
                                                                    <div className="flex-1 rounded-lg border bg-card p-3">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="font-medium text-foreground">{createdByName}</span>
                                                                            <Badge variant="secondary" className="text-[11px]">
                                                                                {formatInteractionType(entry.interaction_type)}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="mt-1 text-sm whitespace-pre-wrap">{entry.message}</div>
                                                                        {ownerName && ownerName !== createdByName && (
                                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                                Owner: <span className="text-foreground font-medium">{ownerName}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
