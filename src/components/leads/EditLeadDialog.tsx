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
import { useUpdateLead } from '@/hooks/useLeads';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProfiles } from '@/hooks/useProfiles';
import {
  formatDateSeparator,
  formatInteractionType,
  formatTime,
  InteractionType,
  useAddLeadHistoryEntry,
  useLeadHistoryEntries,
  useLeadHistoryRealtime,
} from '@/hooks/useLeadHistory';
import { useCurrentCompany } from '@/hooks/useCompany';

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be less than 15 digits').regex(/^[0-9+\-\s]+$/, 'Invalid phone number format'),
  email: z.string().trim().email('Invalid email address').max(255).optional().or(z.literal('')),
  budget: z.string().trim().min(1, 'Budget is required').max(50, 'Budget must be less than 50 characters'),
  location: z.string().trim().max(200, 'Location must be less than 200 characters').optional().or(z.literal('')),
  property_type: z.string().trim().max(50).optional().or(z.literal('')),
  source: z.string().trim().max(50).optional().or(z.literal('')),
  stage: z.enum(['new', 'contacted', 'follow-up', 'site-visit', 'negotiation', 'closed-won', 'closed-lost']).default('new'),
  lead_status: z.enum(['hot', 'warm', 'cold']).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface EditLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'details' | 'history';
}

const propertyTypes = ['1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'Plot', 'Commercial', 'Villa'];
const sources = ['Facebook Ads', 'Google Ads', 'WhatsApp', '99acres', 'MagicBricks', 'Housing.com', 'Referral', 'Walk-in', 'Other'];

export function EditLeadDialog({ lead, open, onOpenChange, initialTab = 'details' }: EditLeadDialogProps) {
  const { toast } = useToast();
  const updateLead = useUpdateLead();
  const { data: company } = useCurrentCompany();
  const { data: profiles } = useProfiles();

  const [activeTab, setActiveTab] = useState<'details' | 'history'>(initialTab);

  React.useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
  }, [open, initialTab]);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: lead?.name || '',
      phone: lead?.phone || '',
      email: lead?.email || '',
      budget: lead?.budget || '',
      location: lead?.location || '',
      property_type: lead?.property_type || '',
      source: lead?.source || '',
      stage: lead?.stage || 'new',
      lead_status: lead?.lead_status || 'cold',
    },
  });

  // Update form values when lead changes
  React.useEffect(() => {
    if (lead) {
      form.reset({
        name: lead.name,
        phone: lead.phone,
        email: lead.email || '',
        budget: lead.budget || '',
        location: lead.location || '',
        property_type: lead.property_type || '',
        source: lead.source || '',
        stage: lead.stage,
        lead_status: lead.lead_status || 'cold',
      });
    }
  }, [lead, form]);

  const onSubmit = async (data: LeadFormData) => {
    if (!lead) return;

    try {
      await updateLead.mutateAsync({
        id: lead.id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        budget: data.budget,
        location: data.location || null,
        property_type: data.property_type || null,
        source: data.source || null,
        stage: data.stage,
        lead_status: data.lead_status,
      });

      toast({
        title: 'Lead updated',
        description: `${data.name} has been updated successfully.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Update lead error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to update lead. Please try again.';
      toast({
        title: 'Error updating lead',
        description,
        variant: 'destructive',
      });
    }
  };

  const { data: historyEntries, isLoading: historyLoading } = useLeadHistoryEntries(lead?.id);
  useLeadHistoryRealtime(lead?.id);
  const addEntry = useAddLeadHistoryEntry(lead?.id);

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
    { value: 'site_visit', label: 'Site Visit' },
    { value: 'booking_discussion', label: 'Booking Discussion' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>
            Update the lead details. Fields marked with * are required.
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

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ₹50L - ₹1Cr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter preferred location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="property_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {propertyTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lead source" />
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

                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="follow-up">Follow-up</SelectItem>
                          <SelectItem value="site-visit">Site Visit</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="closed-won">Closed Won</SelectItem>
                          <SelectItem value="closed-lost">Closed Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lead_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lead status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hot">Hot</SelectItem>
                          <SelectItem value="warm">Warm</SelectItem>
                          <SelectItem value="cold">Cold</SelectItem>
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
                    <div>
                      <label className="text-sm font-medium mb-1 block">Employee</label>
                      <div className="text-sm text-muted-foreground">
                        Logged in: <span className="font-medium text-foreground">{company ? 'Employee' : 'User'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Message</label>
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Write interaction details (what happened, requirement, status, next step...)"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewMessage('')}
                      disabled={addEntry.isPending}
                    >
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
                    <Input
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Search in message..."
                    />
                  </div>

                  {historyLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-lg border bg-muted/30 animate-pulse" />
                      ))}
                    </div>
                  ) : filteredEntries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No interactions found. Add the first entry above.
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
