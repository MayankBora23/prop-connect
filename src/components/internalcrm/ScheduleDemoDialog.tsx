import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateInternalDemo } from '@/hooks/useInternalDemos';
import { useUpdateInternalLead, InternalLead } from '@/hooks/useInternalLeads';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Phone, Building2, Calendar, Clock } from 'lucide-react';

const scheduleDemoSchema = z.object({
    demo_date: z.string().min(1, 'Demo date is required'),
    demo_time: z.string().min(1, 'Demo time is required'),
    notes: z.string().trim().max(500, 'Notes must be less than 500 characters').optional().or(z.literal('')),
});

type ScheduleDemoFormData = z.infer<typeof scheduleDemoSchema>;

interface ScheduleDemoDialogProps {
    lead: InternalLead | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScheduled?: () => void;
}

export function ScheduleDemoDialog({ lead, open, onOpenChange, onScheduled }: ScheduleDemoDialogProps) {
    const { toast } = useToast();
    const createDemo = useCreateInternalDemo();
    const updateLead = useUpdateInternalLead();

    const form = useForm<ScheduleDemoFormData>({
        resolver: zodResolver(scheduleDemoSchema),
        defaultValues: {
            demo_date: '',
            demo_time: '',
            notes: '',
        },
    });

    const onSubmit = async (data: ScheduleDemoFormData) => {
        if (!lead) return;

        try {
            // 1. Create the demo record
            await createDemo.mutateAsync({
                lead_id: lead.id,
                demo_date: data.demo_date,
                demo_time: data.demo_time,
                notes: data.notes || null,
                status: 'scheduled',
            });

            // 2. Update lead stage to demo_scheduled if it's not already
            if (lead.stage !== 'demo_scheduled') {
                await updateLead.mutateAsync({
                    id: lead.id,
                    stage: 'demo_scheduled',
                });
            }

            toast({
                title: 'Demo scheduled',
                description: `CRM Demo for ${lead.lead_name} (${lead.company_name}) has been scheduled.`,
            });

            form.reset();
            onOpenChange(false);
            onScheduled?.();
        } catch (error: any) {
            console.error('Schedule demo error:', error);
            toast({
                title: 'Error scheduling demo',
                description: error?.message || 'Failed to schedule demo. Please try again.',
                variant: 'destructive',
            });
        }
    };

    if (!lead) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Schedule CRM Demo</DialogTitle>
                    <DialogDescription>
                        Book a demo session for {lead.lead_name}. This will also update the lead's stage.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/50 p-4 rounded-lg mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{lead.lead_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{lead.company_name}</span>
                    </div>
                    {lead.phone_no && (
                        <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{lead.phone_no}</span>
                        </div>
                    )}
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="demo_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Demo Date *</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="demo_time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Demo Time *</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Special requirements, focus areas for the demo..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createDemo.isPending || updateLead.isPending} className="gradient-primary border-0">
                                {(createDemo.isPending || updateLead.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Schedule Demo
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
