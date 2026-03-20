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
import { useUpdateStudent } from '@/hooks/useStudents';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Student } from '@/hooks/useStudents';
import { useProfiles } from '@/hooks/useProfiles';
import {
  formatDateSeparator,
  formatInteractionType,
  formatTime,
  InteractionType,
  useAddStudentHistoryEntry,
  useStudentHistoryEntries,
  useStudentHistoryRealtime,
} from '@/hooks/useLeadHistory';

const studentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15),
  email: z.string().trim().email('Invalid email address').max(255).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  parent_name: z.string().trim().max(100).optional().or(z.literal('')),
  parent_phone: z.string().trim().max(15).optional().or(z.literal('')),
  parent_email: z.string().trim().email('Invalid email address').max(255).optional().or(z.literal('')),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'details' | 'history';
}

export function EditStudentDialog({ student, open, onOpenChange, initialTab = 'details' }: EditStudentDialogProps) {
  const { toast } = useToast();
  const updateStudent = useUpdateStudent();
  const { data: profiles } = useProfiles();

  const [activeTab, setActiveTab] = useState<'details' | 'history'>(initialTab);

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      date_of_birth: '',
      address: '',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        name: student.name,
        phone: student.phone,
        email: student.email || '',
        date_of_birth: student.date_of_birth || '',
        address: student.address || '',
        parent_name: student.parent_name || '',
        parent_phone: student.parent_phone || '',
        parent_email: student.parent_email || '',
      });
    }
  }, [student, form]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
  }, [open, initialTab]);

  const { data: historyEntries, isLoading: historyLoading } = useStudentHistoryEntries(student?.id);
  useStudentHistoryRealtime(student?.id);
  const addEntry = useAddStudentHistoryEntry(student?.id);

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

  const interactionTypeOptions: Array<{ value: InteractionType; label: string }> = [
    { value: 'call', label: 'Call' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'note', label: 'Note' },
    { value: 'demo_class', label: 'Demo Class' },
    { value: 'fee_discussion', label: 'Fee Discussion' },
  ];

  const filteredEntries = useMemo(() => {
    const startMs = dateStart ? new Date(dateStart).setHours(0, 0, 0, 0) : null;
    const endMs = dateEnd ? new Date(dateEnd).setHours(23, 59, 59, 999) : null;
    const kw = searchKeyword.trim().toLowerCase();

    return (historyEntries || []).filter((e: any) => {
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
        groups.push({ dateKey, label: formatDateSeparator(d), entries: [e] });
      } else {
        const g = groups.find((gg) => gg.dateKey === dateKey);
        if (g) g.entries.push(e);
      }
    }
    return groups;
  }, [filteredEntries]);

  const onSubmit = async (data: StudentFormData) => {
    if (!student) return;

    try {
      await updateStudent.mutateAsync({
        id: student.id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        date_of_birth: data.date_of_birth || null,
        address: data.address || null,
        parent_name: data.parent_name || null,
        parent_phone: data.parent_phone || null,
        parent_email: data.parent_email || null,
      });

      toast({
        title: 'Success',
        description: 'Student updated successfully',
      });

      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update student',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update student information and details.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter student name" {...field} />
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
                    <FormLabel>Phone Number *</FormLabel>
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
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter student address"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Parent Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="parent_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter parent name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parent_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter parent phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parent_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter parent email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateStudent.isPending}>
                {updateStudent.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Student'
                )}
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
                      <Select
                        value={newInteractionType}
                        onValueChange={(v) => setNewInteractionType(v as InteractionType)}
                      >
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
                      Add entry for: <span className="font-medium text-foreground">{student?.name ?? 'Student'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Message</label>
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Write interaction details..."
                      className="resize-none"
                      rows={3}
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
                      disabled={!student?.id || addEntry.isPending || newMessage.trim().length === 0}
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
