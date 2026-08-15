import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUpdateInternalLead } from '@/hooks/useInternalLeads';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { InternalLead } from '@/hooks/useInternalLeads';
import type { Enums } from '@/integrations/supabase/types';

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
    email: z
        .string()
        .trim()
        .email('Invalid email address')
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

export function EditInternalLeadDialog({ lead, open, onOpenChange }: EditInternalLeadDialogProps) {
    const { toast } = useToast();
    const updateLead = useUpdateInternalLead();

    const form = useForm<InternalLeadFormData>({
        resolver: zodResolver(internalLeadSchema),
        defaultValues: {
            company_name: '',
            lead_name: '',
            phone_no: '',
            email: '',
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
                email: lead.email || '',
                address: lead.address || '',
                industry: lead.industry,
                user_limit: lead.user_limit?.toString() || '',
                stage: lead.stage,
            });
        }
    }, [lead, form]);

    const onSubmit = async (data: InternalLeadFormData) => {
        if (!lead) return;

        try {
            await updateLead.mutateAsync({
                id: lead.id,
                company_name: data.company_name,
                lead_name: data.lead_name,
                phone_no: data.phone_no || null,
                email: data.email || null,
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
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Internal CRM Lead</DialogTitle>
                    <DialogDescription>
                        Update potential customer details. Fields marked with * are required.
                    </DialogDescription>
                </DialogHeader>

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
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter email address" type="email" {...field} />
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
            </DialogContent>
        </Dialog>
    );
}
