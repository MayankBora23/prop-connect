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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCreateDeal } from '@/hooks/useDeals';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { useVehicles } from '@/hooks/useVehicles';
import { useBookings } from '@/hooks/useBookings';
import { useCreateDealPayment } from '@/hooks/useDealPayments';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calculator, FileText, CreditCard, Truck, Receipt } from 'lucide-react';
import type { BookingWithRelations } from '@/hooks/useAutoTypes';

const dealSchema = z.object({
  // Basic Deal Information
  lead_id: z.string().min(1, 'Lead is required'),
  vehicle_id: z.string().min(1, 'Vehicle is required'),
  deal_number: z.string().optional(),
  rc_number: z.string().min(1, 'RC Number is required'),


  // Vehicle Details
  chassis_number: z.string().optional(),
  engine_number: z.string().optional(),
  vehicle_color: z.string().optional(),

  // Customer Details
  customer_address: z.string().optional(),
  customer_city: z.string().optional(),
  customer_state: z.string().optional(),
  customer_pincode: z.string().optional(),

  // Price Breakdown
  ex_showroom_price: z.number().min(0, 'Ex-showroom price must be positive'),
  rto_charges: z.number().min(0, 'RTO charges cannot be negative').default(0),
  insurance_charges: z.number().min(0, 'Insurance charges cannot be negative').default(0),
  accessories_cost: z.number().min(0, 'Accessories cost cannot be negative').default(0),
  gst_and_other_charges: z.number().min(0, 'GST and other charges cannot be negative').default(0),
  discount_amount: z.number().min(0, 'Discount cannot be negative').default(0),

  // Payment Information
  token_amount: z.number().min(0, 'Token amount cannot be negative').default(0),
  down_payment: z.number().min(0, 'Down payment cannot be negative').default(0),

  // Finance Details
  finance_type: z.enum(['none', 'bank_loan', 'finance_company', 'dealer_finance']).default('none'),
  finance_company_name: z.string().optional(),
  finance_company_address: z.string().optional(),
  loan_amount: z.number().optional(),
  loan_tenure_months: z.number().optional(),
  interest_rate: z.number().optional(),
  emi_amount: z.number().optional(),
  processing_fee: z.number().min(0, 'Processing fee cannot be negative').default(0),


  // Delivery Information
  delivery_date: z.string().optional(),
  delivery_location: z.string().optional(),
  delivery_notes: z.string().optional(),

  // Additional Information
  special_conditions: z.string().optional(),
  payment_terms: z.string().optional(),
  remarks: z.string().optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface AddDealDialogProps {
  booking?: BookingWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const financeTypes = [
  { value: 'none', label: 'No Finance' },
  { value: 'bank_loan', label: 'Bank Loan' },
  { value: 'finance_company', label: 'Finance Company' },
  { value: 'dealer_finance', label: 'Dealer Finance' },
];


export function AddDealDialog({ booking, open, onOpenChange }: AddDealDialogProps) {
  const { toast } = useToast();
  const createDeal = useCreateDeal();
  const createPayment = useCreateDealPayment();
  const { data: leads } = useAutoLeads();
  const { data: vehicles } = useVehicles();
  const { data: bookings } = useBookings();

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      lead_id: '',
      vehicle_id: '',
      deal_number: '',
      rc_number: '',
      chassis_number: '',
      engine_number: '',
      vehicle_color: '',
      customer_address: '',
      customer_city: '',
      customer_state: '',
      customer_pincode: '',
      ex_showroom_price: 0,
      rto_charges: 0,
      insurance_charges: 0,
      accessories_cost: 0,
      gst_and_other_charges: 0,
      discount_amount: 0,
      token_amount: 0,
      down_payment: 0,
      finance_type: 'none',
      finance_company_name: '',
      finance_company_address: '',
      loan_amount: undefined,
      loan_tenure_months: undefined,
      interest_rate: undefined,
      emi_amount: undefined,
      processing_fee: 0,
      delivery_date: '',
      delivery_location: '',
      delivery_notes: '',
      special_conditions: '',
      payment_terms: '',
      remarks: '',
    },
  });

  // Auto-fetch data when booking is provided
  useEffect(() => {
    if (booking && open) {
      // Auto-fill from booking data
      form.setValue('lead_id', booking.lead_id || '');
      form.setValue('vehicle_id', booking.vehicle_id);

      // Auto-fill price breakdown from booking
      form.setValue('ex_showroom_price', booking.vehicle_price);
      form.setValue('rto_charges', booking.registration_cost);
      form.setValue('insurance_charges', booking.insurance_cost);
      form.setValue('accessories_cost', booking.accessories_cost);
      form.setValue('discount_amount', booking.discount_amount);
      form.setValue('down_payment', booking.down_payment);
      form.setValue('token_amount', booking.token_amount);

      // Calculate financed amount
      const totalOnRoad = calculateTotalOnRoad(form.getValues());
      const financedAmount = Math.max(0, totalOnRoad - booking.down_payment);
      form.setValue('loan_amount', financedAmount > 0 ? financedAmount : undefined);
    }
  }, [booking, open, form]);

  const calculateTotalOnRoad = (values: DealFormData) => {
    return (
      values.ex_showroom_price +
      values.rto_charges +
      values.insurance_charges +
      values.accessories_cost +
      values.gst_and_other_charges -
      values.discount_amount
    );
  };

  const calculateGST = (values: DealFormData) => {
    // GST and other charges is now included in the gst_and_other_charges field
    return {
      gstAndOtherCharges: values.gst_and_other_charges,
      totalGST: values.gst_and_other_charges,
    };
  };

  const calculateEMI = (loanAmount: number, interestRate: number, tenureMonths: number) => {
    if (!loanAmount || !interestRate || !tenureMonths) return 0;

    const monthlyRate = interestRate / 100 / 12;
    const emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
               (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi);
  };

  // Watch form values for calculations
  const watchedValues = form.watch();
  const totalOnRoadPrice = calculateTotalOnRoad(watchedValues);
  const gstBreakdown = calculateGST(watchedValues);
  const financedAmount = Math.max(0, totalOnRoadPrice - watchedValues.down_payment - watchedValues.token_amount);

  // Auto-calculate EMI when finance details change
  useEffect(() => {
    const { loan_amount, interest_rate, loan_tenure_months } = watchedValues;
    if (loan_amount && interest_rate && loan_tenure_months) {
      const emi = calculateEMI(loan_amount, interest_rate, loan_tenure_months);
      form.setValue('emi_amount', emi);
    }
  }, [watchedValues.loan_amount, watchedValues.interest_rate, watchedValues.loan_tenure_months, form]);

  const onSubmit = async (data: DealFormData) => {
    try {
      const totalOnRoad = calculateTotalOnRoad(data);
      const gst = calculateGST(data);

      // Create the deal
      const dealData = await createDeal.mutateAsync({
        lead_id: data.lead_id,
        vehicle_id: data.vehicle_id,
        booking_id: booking?.id || null,
        deal_number: data.deal_number || null,
        rc_number: data.rc_number,
        payment_status: 'pending',
        delivery_status: 'pending',

        // Vehicle details
        vehicle_brand: vehicles?.find(v => v.id === data.vehicle_id)?.brand || '',
        vehicle_model: vehicles?.find(v => v.id === data.vehicle_id)?.model || '',
        vehicle_variant: vehicles?.find(v => v.id === data.vehicle_id)?.variant || null,
        vehicle_year: vehicles?.find(v => v.id === data.vehicle_id)?.year || new Date().getFullYear(),
        vehicle_color: data.vehicle_color || null,
        chassis_number: data.chassis_number || null,
        engine_number: data.engine_number || null,
        vehicle_price: data.ex_showroom_price,

        // Customer details
        customer_name: leads?.find(l => l.id === data.lead_id)?.name || '',
        customer_phone: leads?.find(l => l.id === data.lead_id)?.phone || '',
        customer_email: leads?.find(l => l.id === data.lead_id)?.email || null,
        customer_address: data.customer_address || null,
        customer_city: data.customer_city || null,
        customer_state: data.customer_state || null,
        customer_pincode: data.customer_pincode || null,

        // Price breakdown
        ex_showroom_price: data.ex_showroom_price,
        rto_charges: data.rto_charges,
        insurance_charges: data.insurance_charges,
        accessories_cost: data.accessories_cost,
        other_charges: data.gst_and_other_charges, // Using existing other_charges field but with GST content
        discount_amount: data.discount_amount,
        total_on_road_price: totalOnRoad,

        // Payment info
        token_amount: data.token_amount,
        down_payment: data.down_payment,
        financed_amount: financedAmount,
        total_paid: data.token_amount + data.down_payment,
        balance_amount: totalOnRoad - (data.token_amount + data.down_payment),

        // Finance details
        finance_type: data.finance_type,
        finance_company_name: data.finance_type !== 'none' ? data.finance_company_name : null,
        finance_company_address: data.finance_type !== 'none' ? data.finance_company_address : null,
        loan_amount: data.finance_type !== 'none' ? data.loan_amount : null,
        loan_tenure_months: data.finance_type !== 'none' ? data.loan_tenure_months : null,
        interest_rate: data.finance_type !== 'none' ? data.interest_rate : null,
        emi_amount: data.finance_type !== 'none' ? data.emi_amount : null,
        processing_fee: data.finance_type !== 'none' ? data.processing_fee : 0,

        // GST and Other Charges (now included in other_charges field)
        total_gst_amount: gst.totalGST,

        // Delivery
        delivery_date: data.delivery_date || null,
        delivery_location: data.delivery_location || null,
        delivery_notes: data.delivery_notes || null,

        // Additional
        special_conditions: data.special_conditions || null,
        payment_terms: data.payment_terms || null,
        remarks: data.remarks || null,
      });

      // Note: Invoices are now generated manually from the DealsView
      // to avoid duplicate key constraint issues

      // Record initial payments
      const payments = [];
      if (data.token_amount > 0) {
        payments.push({
          deal_id: dealData.id,
          payment_date: new Date().toISOString().split('T')[0],
          payment_type: 'token',
          amount: data.token_amount,
          payment_method: 'cash', // Default, can be updated later
        });
      }
      if (data.down_payment > 0) {
        payments.push({
          deal_id: dealData.id,
          payment_date: new Date().toISOString().split('T')[0],
          payment_type: 'down_payment',
          amount: data.down_payment,
          payment_method: 'cash', // Default, can be updated later
        });
      }

      // Create payment records
      for (const payment of payments) {
        try {
          await createPayment.mutateAsync(payment);
        } catch (paymentError) {
          console.warn('Failed to record payment:', paymentError);
        }
      }

      toast({
        title: 'Deal created',
        description: `Deal has been created successfully. You can now generate invoices from the deals list.`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create deal error:', error);
      const description =
        error?.message || error?.error || JSON.stringify(error) || 'Failed to create deal. Please try again.';
      toast({
        title: 'Error creating deal',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create Deal {booking ? `(from Booking ${booking.booking_number || booking.id.slice(-6)})` : ''}
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive vehicle deal with pricing, finance, and delivery details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic" className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-1">
                  <Calculator className="w-4 h-4" />
                  Pricing
                </TabsTrigger>
                <TabsTrigger value="finance" className="flex items-center gap-1">
                  <CreditCard className="w-4 h-4" />
                  Finance
                </TabsTrigger>
                <TabsTrigger value="delivery" className="flex items-center gap-1">
                  <Truck className="w-4 h-4" />
                  Delivery
                </TabsTrigger>
                <TabsTrigger value="invoice" className="flex items-center gap-1">
                  <Receipt className="w-4 h-4" />
                  Invoice
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="lead_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!!booking}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select customer" />
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
                        name="vehicle_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!!booking}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select vehicle" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(vehicles || []).map((vehicle) => (
                                  <SelectItem key={vehicle.id} value={vehicle.id}>
                                    {vehicle.year} {vehicle.brand} {vehicle.model} {vehicle.variant && `(${vehicle.variant})`}
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
                        name="deal_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deal Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Auto-generated if empty" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rc_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RC Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter RC Number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div></div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="chassis_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chassis Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter chassis number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="engine_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Engine Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter engine number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vehicle_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter vehicle color" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Price Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ex_showroom_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ex-Showroom Price (₹) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
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
                        name="rto_charges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RTO Charges (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="insurance_charges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Insurance Charges (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
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
                        name="accessories_cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Accessories Cost (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="gst_and_other_charges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GST and Other Charges (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
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
                        name="discount_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Amount (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
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

                    <div className="bg-secondary p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Total On-Road Price</div>
                          <div className="text-2xl font-bold text-primary">₹{totalOnRoadPrice.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Total GST Amount</div>
                          <div className="text-2xl font-bold text-primary">₹{gstBreakdown.totalGST.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="token_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Token Amount (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
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
                        name="down_payment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Down Payment (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
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

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Amount to be Financed</div>
                      <div className="text-xl font-semibold text-blue-600">₹{financedAmount.toLocaleString()}</div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="finance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Finance Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="finance_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Finance Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select finance type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {financeTypes.map((type) => (
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

                    {watchedValues.finance_type !== 'none' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="finance_company_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Finance Company Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter finance company name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="processing_fee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Processing Fee (₹)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
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

                        <FormField
                          control={form.control}
                          name="finance_company_address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Finance Company Address</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Enter finance company address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="loan_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Loan Amount (₹) *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
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
                            name="loan_tenure_months"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tenure (Months) *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                                    placeholder="0"
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

                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-sm text-muted-foreground">Calculated EMI</div>
                          <div className="text-xl font-semibold text-green-600">
                            ₹{watchedValues.emi_amount?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="delivery" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Delivery Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="delivery_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="delivery_location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Location</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter delivery location" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="delivery_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any special delivery instructions" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="special_conditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Conditions</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any special conditions or terms" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="payment_terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Payment schedule and terms" {...field} />
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
                            <Textarea placeholder="Additional remarks or notes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invoice" className="space-y-4">

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customer_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter customer address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="customer_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter city" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customer_state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter state" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customer_pincode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pincode</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter pincode" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDeal.isPending} className="gradient-primary border-0">
                {createDeal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Deal
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}