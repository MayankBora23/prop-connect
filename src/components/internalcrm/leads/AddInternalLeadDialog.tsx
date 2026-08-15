import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateInternalLead } from '@/hooks/useInternalLeads';
import { useToast } from '@/hooks/use-toast';
import type { Enums } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';

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
  user_limit: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),
});

type InternalLeadFormData = z.infer<typeof internalLeadSchema>;

interface AddInternalLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const industries: { value: Enums<'industry_type'>; label: string }[] = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'education', label: 'Education' },
  { value: 'automobile_dealers', label: 'Automobile Dealers' },
  { value: 'internal_crm', label: 'Internal CRM' },
];

export function AddInternalLeadDialog({ open, onOpenChange }: AddInternalLeadDialogProps) {
  const { toast } = useToast();
  const createLead = useCreateInternalLead();

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
    },
  });

  const onSubmit = async (data: InternalLeadFormData) => {
    try {
      await createLead.mutateAsync({
        company_name: data.company_name,
        lead_name: data.lead_name,
        phone_no: data.phone_no || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        industry: data.industry,
        user_limit: data.user_limit ? Number(data.user_limit) : undefined,
      });

      toast({
        title: 'Lead created',
        description: `${data.company_name} - ${data.lead_name} has been added successfully.`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Create internal lead error:', error);
      toast({
        title: 'Error creating lead',
        description:
          error?.message || error?.error || 'Failed to create internal CRM lead. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Internal CRM Lead</DialogTitle>
          <DialogDescription>
            Capture potential customer details for the internal CRM platform. Fields marked with * are
            required.
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
                    <Textarea placeholder="Enter company or lead address" rows={3} {...field} />
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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLead.isPending} className="gradient-primary border-0">
                {createLead.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Lead
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

