import { useEffect, useMemo, useState } from 'react';
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
import { useUpdateAutoLead } from '@/hooks/useAutoLeads';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useProfiles } from '@/hooks/useProfiles';
import type { AutoLead } from '@/hooks/useAutoLeads';
import {
  formatDateSeparator,
  formatInteractionType,
  formatTime,
  InteractionType,
  useAddAutoLeadHistoryEntry,
  useAutoLeadHistoryEntries,
  useAutoLeadHistoryRealtime,
} from '@/hooks/useLeadHistory';

const autoLeadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be less than 15 digits').regex(/^[0-9+\-\s]+$/, 'Invalid phone number format'),
  email: z.string().trim().email('Invalid email address').max(255).optional().or(z.literal('')),
  preferred_vehicle_type: z.enum(['car', 'bike']).optional(),
  preferred_brand: z.string().trim().max(100, 'Brand must be less than 100 characters').optional().or(z.literal('')),
  preferred_model: z.string().trim().max(100, 'Model must be less than 100 characters').optional().or(z.literal('')),
  budget_min: z.number().min(0, 'Minimum budget must be positive').optional(),
  budget_max: z.number().min(0, 'Maximum budget must be positive').optional(),
  financing_needed: z.boolean().default(false),
  insurance_needed: z.boolean().default(false),
  test_drive_requested: z.boolean().default(false),
  source: z.string().trim().max(50).optional().or(z.literal('')),
  status: z.enum(['new_lead', 'contacted', 'test_drive_scheduled', 'quotation_shared', 'negotiation_final_discussion', 'booking_done', 'delivered_sold']).default('new_lead'),
});

type AutoLeadFormData = z.infer<typeof autoLeadSchema>;

interface EditAutoLeadDialogProps {
  lead: AutoLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'details' | 'history';
}

const vehicleTypes = [
  { value: 'car', label: 'Car' },
  { value: 'bike', label: 'Bike' },
];

const sources = ['Facebook Ads', 'Google Ads', 'WhatsApp', 'CarDekho', 'Cardekho', 'OLX', 'Referral', 'Walk-in', 'Website', 'Other'];

const statusOptions = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'test_drive_scheduled', label: 'Test Drive Scheduled' },
  { value: 'quotation_shared', label: 'Quotation Shared' },
  { value: 'negotiation_final_discussion', label: 'Negotiation / Final Discussion' },
  { value: 'booking_done', label: 'Booking Done' },
  { value: 'delivered_sold', label: 'Delivered / Sold' },
];

export function EditAutoLeadDialog({ lead, open, onOpenChange, initialTab = 'details' }: EditAutoLeadDialogProps) {
  const { toast } = useToast();
  const updateLead = useUpdateAutoLead();
  const { data: profiles } = useProfiles();

  const [activeTab, setActiveTab] = useState<'details' | 'history'>(initialTab);

  const form = useForm<AutoLeadFormData>({
    resolver: zodResolver(autoLeadSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      preferred_vehicle_type: undefined,
      preferred_brand: '',
      preferred_model: '',
      budget_min: undefined,
      budget_max: undefined,
      financing_needed: false,
      insurance_needed: false,
      test_drive_requested: false,
      source: '',
      status: 'new_lead',
    },
  });

  // Reset form when lead changes
  useEffect(() => {
    if (lead) {
      form.reset({
        name: lead.name,
        phone: lead.phone,
        email: lead.email || '',
        preferred_vehicle_type: lead.preferred_vehicle_type || undefined,
        preferred_brand: lead.preferred_brand || '',
        preferred_model: lead.preferred_model || '',
        budget_min: lead.budget_min || undefined,
        budget_max: lead.budget_max || undefined,
        financing_needed: lead.financing_needed,
        insurance_needed: lead.insurance_needed,
        test_drive_requested: lead.test_drive_requested,
        source: lead.source || '',
        status: lead.status as any,
      });
    }
  }, [lead, form]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
  }, [open, initialTab]);

  const { data: historyEntries, isLoading: historyLoading } = useAutoLeadHistoryEntries(lead?.id);
  useAutoLeadHistoryRealtime(lead?.id);
  const addEntry = useAddAutoLeadHistoryEntry(lead?.id);

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
    { value: 'test_drive', label: 'Test Drive' },
    { value: 'price_negotiation', label: 'Price Negotiation' },
  ];

  const onSubmit = async (data: AutoLeadFormData) => {
    if (!lead) return;

    try {
      await updateLead.mutateAsync({
        id: lead.id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        preferred_vehicle_type: data.preferred_vehicle_type || null,
        preferred_brand: data.preferred_brand || null,
        preferred_model: data.preferred_model || null,
        budget_min: data.budget_min || null,
        budget_max: data.budget_max || null,
        financing_needed: data.financing_needed,
        insurance_needed: data.insurance_needed,
        test_drive_requested: data.test_drive_requested,
        source: data.source || null,
        status: data.status,
      });

      toast({
        title: 'Success',
        description: 'Auto lead updated successfully',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating auto lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to update auto lead',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Auto Lead</DialogTitle>
          <DialogDescription>
            Update the auto lead information below.
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
                <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter lead name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                </div>

                <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sources.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
                </div>

                <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="preferred_vehicle_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicleTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="preferred_brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Toyota, Honda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Corolla, City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                </div>

                <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Min (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Minimum budget"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Max (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Maximum budget"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                </div>

                <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
                />

                <div className="space-y-3">
              <FormLabel>Requirements</FormLabel>
              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="financing_needed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(!!checked)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Needs Financing</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="insurance_needed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(!!checked)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Needs Insurance</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="test_drive_requested"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(!!checked)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Test Drive Requested</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateLead.isPending}>
                    {updateLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                      Add entry for: <span className="font-medium text-foreground">{lead?.name ?? 'Lead'}</span>
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