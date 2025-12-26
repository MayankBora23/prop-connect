import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateFinanceApplication } from '@/hooks/useFinanceApplications';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useDeals } from '@/hooks/useDeals';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const financeSchema = z.object({
  lead_id: z.string().min(1, 'Lead is required'),
  deal_id: z.string().uuid().optional(),
  application_number: z.string().trim().max(50, 'Application number must be less than 50 characters').optional().or(z.literal('')),
  applicant_name: z.string().trim().min(1, 'Applicant name is required').max(100, 'Applicant name must be less than 100 characters'),
  applicant_phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be less than 15 digits').regex(/^[0-9+\-\s]+$/, 'Invalid phone number format'),
  applicant_email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  monthly_income: z.number().min(0, 'Monthly income must be positive').optional(),
  employment_type: z.string().trim().max(50, 'Employment type must be less than 50 characters').optional().or(z.literal('')),
  requested_amount: z.number().min(0, 'Requested amount must be positive'),
  tenure_months: z.number().min(1, 'Tenure must be at least 1 month').max(84, 'Tenure cannot exceed 7 years'),
  interest_rate: z.number().min(0, 'Interest rate must be positive').max(50, 'Interest rate seems too high').optional(),
  bank_name: z.string().trim().max(100, 'Bank name must be less than 100 characters').optional().or(z.literal('')),
  remarks: z.string().trim().max(1000, 'Remarks must be less than 1000 characters').optional().or(z.literal('')),
  documents_required: z.array(z.string()).default([]),
  documents_submitted: z.array(z.string()).default([]),
});

type FinanceFormData = z.infer<typeof financeSchema>;

interface AddFinanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const financeStatuses = [
  { value: 'applied', label: 'Applied' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'disbursed', label: 'Disbursed' },
];

const employmentTypes = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self-employed', label: 'Self-employed' },
  { value: 'business-owner', label: 'Business Owner' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'other', label: 'Other' },
];

const commonDocuments = [
  'Aadhar Card',
  'PAN Card',
  'Salary Slips',
  'Bank Statements',
  'Address Proof',
  'Income Proof',
  'ID Proof',
];

export function AddFinanceDialog({ open, onOpenChange }: AddFinanceDialogProps) {
  const { toast } = useToast();
  const createFinanceApplication = useCreateFinanceApplication();
  const { data: leads } = useAutoLeads();
  const { data: deals } = useDeals();

  const form = useForm<FinanceFormData>({
    resolver: zodResolver(financeSchema),
    defaultValues: {
      lead_id: '',
      deal_id: undefined,
      application_number: '',
      applicant_name: '',
      applicant_phone: '',
      applicant_email: '',
      monthly_income: undefined,
      employment_type: '',
      requested_amount: 0,
      tenure_months: 60,
      interest_rate: undefined,
      bank_name: '',
      remarks: '',
      documents_required: [],
      documents_submitted: [],
    },
  });

  const selectedLeadId = form.watch('lead_id');
  const requestedAmount = form.watch('requested_amount') || 0;
  const tenureMonths = form.watch('tenure_months') || 60;
  const interestRate = form.watch('interest_rate') || 0;

  // Calculate EMI
  const monthlyRate = interestRate / 100 / 12;
  const emi = requestedAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
              (Math.pow(1 + monthlyRate, tenureMonths) - 1) || 0;

  // Filter deals by selected lead
  const relevantDeals = (deals || []).filter(deal => !selectedLeadId || deal.lead_id === selectedLeadId);

  const onSubmit = async (data: FinanceFormData) => {
    try {
      await createFinanceApplication.mutateAsync({
        lead_id: data.lead_id,
        deal_id: data.deal_id === 'none' ? null : data.deal_id || null,
        application_number: data.application_number || null,
        applicant_name: data.applicant_name,
        applicant_phone: data.applicant_phone,
        applicant_email: data.applicant_email || null,
        monthly_income: data.monthly_income,
        employment_type: data.employment_type || null,
        requested_amount: data.requested_amount,
        tenure_months: data.tenure_months,
        interest_rate: data.interest_rate,
        emi_amount: emi,
        status: 'applied',
        bank_name: data.bank_name || null,
        remarks: data.remarks || null,
        documents_required: data.documents_required,
        documents_submitted: data.documents_submitted,
      });

      toast({
        title: 'Finance application created',
        description: `Finance application for ${data.applicant_name} has been created successfully.`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create finance application error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to create finance application. Please try again.';
      toast({
        title: 'Error creating finance application',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Finance Application</DialogTitle>
          <DialogDescription>
            Create a finance application for vehicle purchase. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lead_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(leads || []).map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.name} - {lead.phone}
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
                name="deal_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select deal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No deal selected</SelectItem>
                        {relevantDeals.map((deal) => (
                          <SelectItem key={deal.id} value={deal.id}>
                            {deal.deal_number || `Deal ${deal.id.slice(-6)}`} - ₹{deal.final_price.toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="application_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto-generated if empty" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="applicant_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicant Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicant_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicant Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="applicant_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicant Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employmentTypes.map((type) => (
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthly_income"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Income (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Monthly income"
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
                name="requested_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requested Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Loan amount"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="tenure_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenure (Months) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="60"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interest_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="8.5"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-secondary p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">Monthly EMI</div>
                <div className="text-lg font-semibold text-primary">₹{emi.toFixed(0)}</div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="bank_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Preferred bank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional remarks or notes"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFinanceApplication.isPending} className="gradient-primary border-0">
                {createFinanceApplication.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Finance Application
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}