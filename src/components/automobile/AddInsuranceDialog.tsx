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
import { useCreateInsuranceSale } from '@/hooks/useInsuranceSales';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useDeals } from '@/hooks/useDeals';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const insuranceSchema = z.object({
  lead_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  policy_number: z.string().trim().max(50, 'Policy number must be less than 50 characters').optional().or(z.literal('')),
  insurance_type: z.string().trim().min(1, 'Insurance type is required').max(100, 'Insurance type must be less than 100 characters'),
  provider_name: z.string().trim().min(1, 'Provider name is required').max(100, 'Provider name must be less than 100 characters'),
  coverage_amount: z.number().min(0, 'Coverage amount must be positive'),
  premium_amount: z.number().min(0, 'Premium amount must be positive'),
  policy_term_months: z.number().min(1, 'Policy term must be at least 1 month').max(120, 'Policy term cannot exceed 10 years'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  commission_amount: z.number().min(0, 'Commission cannot be negative').optional(),
  agent_name: z.string().trim().max(100, 'Agent name must be less than 100 characters').optional().or(z.literal('')),
  remarks: z.string().trim().max(1000, 'Remarks must be less than 1000 characters').optional().or(z.literal('')),
});

type InsuranceFormData = z.infer<typeof insuranceSchema>;

interface AddInsuranceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const insuranceStatuses = [
  { value: 'quoted', label: 'Quoted' },
  { value: 'sold', label: 'Sold' },
  { value: 'cancelled', label: 'Cancelled' },
];

const insuranceTypes = [
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'third_party', label: 'Third Party' },
  { value: 'zero_depreciation', label: 'Zero Depreciation' },
  { value: 'own_damage', label: 'Own Damage' },
];

const providers = [
  { value: 'bajaj_allianz', label: 'Bajaj Allianz' },
  { value: 'icici_lombard', label: 'ICICI Lombard' },
  { value: 'hdfc_ergo', label: 'HDFC Ergo' },
  { value: 'reliance_general', label: 'Reliance General' },
  { value: 'new_india_assurance', label: 'New India Assurance' },
  { value: 'oriental_insurance', label: 'Oriental Insurance' },
  { value: 'united_india', label: 'United India' },
  { value: 'national_insurance', label: 'National Insurance' },
  { value: 'other', label: 'Other' },
];

export function AddInsuranceDialog({ open, onOpenChange }: AddInsuranceDialogProps) {
  const { toast } = useToast();
  const createInsuranceSale = useCreateInsuranceSale();
  const { data: leads } = useAutoLeads();
  const { data: deals } = useDeals();

  const form = useForm<InsuranceFormData>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      lead_id: undefined,
      deal_id: undefined,
      policy_number: '',
      insurance_type: '',
      provider_name: '',
      coverage_amount: 0,
      premium_amount: 0,
      policy_term_months: 12,
      start_date: '',
      end_date: '',
      commission_amount: undefined,
      agent_name: '',
      remarks: '',
    },
  });

  const selectedLeadId = form.watch('lead_id');
  const startDate = form.watch('start_date');
  const policyTermMonths = form.watch('policy_term_months') || 12;

  // Auto-calculate end date
  const calculateEndDate = () => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + policyTermMonths);
    return end.toISOString().split('T')[0];
  };

  // Update end date when start date or term changes
  const endDate = calculateEndDate();
  if (endDate && endDate !== form.watch('end_date')) {
    form.setValue('end_date', endDate);
  }

  // Filter deals by selected lead
  const relevantDeals = (deals || []).filter(deal => !selectedLeadId || deal.lead_id === selectedLeadId);

  const onSubmit = async (data: InsuranceFormData) => {
    try {
      await createInsuranceSale.mutateAsync({
        lead_id: data.lead_id === 'none' ? null : data.lead_id || null,
        deal_id: data.deal_id === 'none' ? null : data.deal_id || null,
        policy_number: data.policy_number || null,
        insurance_type: data.insurance_type,
        provider_name: data.provider_name,
        coverage_amount: data.coverage_amount,
        premium_amount: data.premium_amount,
        policy_term_months: data.policy_term_months,
        start_date: data.start_date,
        end_date: data.end_date,
        status: 'quoted',
        commission_amount: data.commission_amount,
        agent_name: data.agent_name || null,
        remarks: data.remarks || null,
      });

      toast({
        title: 'Insurance sale created',
        description: `Insurance policy has been created successfully.`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create insurance sale error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to create insurance sale. Please try again.';
      toast({
        title: 'Error creating insurance sale',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Insurance Sale</DialogTitle>
          <DialogDescription>
            Create an insurance policy sale. Fields marked with * are required.
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
                    <FormLabel>Lead (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No lead selected</SelectItem>
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
              name="policy_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Number</FormLabel>
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
                name="insurance_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select insurance type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {insuranceTypes.map((type) => (
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
                name="provider_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Name *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select insurance provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.value} value={provider.value}>
                            {provider.label}
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
                name="coverage_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coverage Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Sum insured amount"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="premium_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Premium Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Annual premium"
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
                name="policy_term_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Term (Months) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="12"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 12)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={endDate} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="commission_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Agent commission"
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
                name="agent_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Insurance agent name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional remarks or coverage details"
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
              <Button type="submit" disabled={createInsuranceSale.isPending} className="gradient-primary border-0">
                {createInsuranceSale.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Insurance Sale
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}