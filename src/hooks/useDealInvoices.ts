import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

export type DealInvoice = {
  id: string;
  deal_id: string;
  invoice_type: 'customer_invoice' | 'finance_invoice' | 'delivery_note';
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  gst_amount?: number | null;
  invoice_data?: any;
  pdf_url?: string | null;
  created_by?: string | null;
  created_at: string;
  company_id: string;
};

export function useDealInvoices(dealId?: string) {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['deal-invoices', dealId, company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabaseAny
        .from('deal_invoices')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (dealId) {
        query = query.eq('deal_id', dealId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useCreateDealInvoice() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (invoice: Omit<DealInvoice, 'id' | 'created_at' | 'company_id'>) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabaseAny
        .from('deal_invoices')
        .insert({
          ...invoice,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-invoices'] });
    },
  });
}

export function useUpdateDealInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<DealInvoice>) => {
      const { data, error } = await supabaseAny
        .from('deal_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-invoices'] });
    },
  });
}

export function useGenerateInvoice() {
  const createInvoice = useCreateDealInvoice();
  const updateInvoice = useUpdateDealInvoice();

  return useMutation({
    mutationFn: async ({
      dealId,
      invoiceType,
      dealData
    }: {
      dealId: string;
      invoiceType: 'customer_invoice' | 'finance_invoice' | 'delivery_note';
      dealData: any;
    }) => {
      // Check if invoice already exists
      const { data: existingInvoices } = await supabaseAny
        .from('deal_invoices')
        .select('id')
        .eq('deal_id', dealId)
        .eq('invoice_type', invoiceType)
        .limit(1);

      const invoiceExists = existingInvoices && existingInvoices.length > 0;

      // Generate invoice number (only if creating new)
      const invoiceNumber = invoiceExists
        ? undefined // Keep existing number if updating
        : await generateInvoiceNumber(invoiceType, dealData.company_id);

      // Calculate invoice data based on type
      const invoiceData = generateInvoiceData(invoiceType, dealData);

      if (invoiceExists) {
        // Update existing invoice
        return updateInvoice.mutateAsync({
          id: existingInvoices[0].id,
          invoice_date: new Date().toISOString().split('T')[0],
          total_amount: invoiceData.totalAmount,
          gst_amount: invoiceData.gstAmount,
          invoice_data: invoiceData,
        });
      } else {
        // Create new invoice
        return createInvoice.mutateAsync({
          deal_id: dealId,
          invoice_type: invoiceType,
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0],
          total_amount: invoiceData.totalAmount,
          gst_amount: invoiceData.gstAmount,
          invoice_data: invoiceData,
        });
      }
    },
  });
}

async function generateInvoiceNumber(invoiceType: string, companyId: string): Promise<string> {
  const prefix = invoiceType === 'customer_invoice' ? 'INV' :
                invoiceType === 'finance_invoice' ? 'FINV' : 'DLN';

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  // Get the last invoice number for this type and company
  const { data, error } = await supabaseAny
    .from('deal_invoices')
    .select('invoice_number')
    .eq('company_id', companyId)
    .eq('invoice_type', invoiceType)
    .like('invoice_number', `${prefix}-${currentYear}${currentMonth}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  let sequenceNumber = 1;
  if (data && data.length > 0) {
    const lastInvoiceNumber = data[0].invoice_number;
    const parts = lastInvoiceNumber.split('-');
    if (parts.length >= 3) {
      sequenceNumber = parseInt(parts[2]) + 1;
    }
  }

  return `${prefix}-${currentYear}${currentMonth}-${String(sequenceNumber).padStart(4, '0')}`;
}

function generateInvoiceData(invoiceType: string, dealData: any) {
  const baseData = {
    dealNumber: dealData.deal_number,
    customerName: dealData.customer_name,
    customerPhone: dealData.customer_phone,
    customerAddress: dealData.customer_address,
    vehicleDetails: {
      brand: dealData.vehicle_brand,
      model: dealData.vehicle_model,
      variant: dealData.vehicle_variant,
      year: dealData.vehicle_year,
      color: dealData.vehicle_color,
      chassisNumber: dealData.chassis_number,
      engineNumber: dealData.engine_number,
    },
    companyId: dealData.company_id,
    generatedAt: new Date().toISOString(),
  };

  if (invoiceType === 'customer_invoice') {
    return {
      ...baseData,
      type: 'Customer Invoice',
      items: [
        {
          description: `${dealData.vehicle_year} ${dealData.vehicle_brand} ${dealData.vehicle_model} ${dealData.vehicle_variant || ''}`.trim(),
          quantity: 1,
          unitPrice: dealData.ex_showroom_price,
          total: dealData.ex_showroom_price,
        },
        ...(dealData.rto_charges > 0 ? [{
          description: 'RTO Charges',
          quantity: 1,
          unitPrice: dealData.rto_charges,
          total: dealData.rto_charges,
        }] : []),
        ...(dealData.insurance_charges > 0 ? [{
          description: 'Insurance Charges',
          quantity: 1,
          unitPrice: dealData.insurance_charges,
          total: dealData.insurance_charges,
        }] : []),
        ...(dealData.accessories_cost > 0 ? [{
          description: 'Accessories',
          quantity: 1,
          unitPrice: dealData.accessories_cost,
          total: dealData.accessories_cost,
        }] : []),
        ...(dealData.other_charges > 0 ? [{
          description: 'Other Charges',
          quantity: 1,
          unitPrice: dealData.other_charges,
          total: dealData.other_charges,
        }] : []),
        ...(dealData.discount_amount > 0 ? [{
          description: 'Discount',
          quantity: 1,
          unitPrice: -dealData.discount_amount,
          total: -dealData.discount_amount,
        }] : []),
      ],
      subtotal: dealData.total_on_road_price - dealData.total_gst_amount,
      gstBreakup: {
        cgstRate: dealData.cgst_rate,
        sgstRate: dealData.sgst_rate,
        igstRate: dealData.igst_rate,
        cgstAmount: dealData.cgst_amount,
        sgstAmount: dealData.sgst_amount,
        igstAmount: dealData.igst_amount,
      },
      totalAmount: dealData.total_on_road_price,
      gstAmount: dealData.total_gst_amount,
    };
  } else if (invoiceType === 'finance_invoice') {
    return {
      ...baseData,
      type: 'Finance Company Invoice',
      financeCompany: dealData.finance_company_name,
      financeCompanyAddress: dealData.finance_company_address,
      loanAmount: dealData.loan_amount,
      loanTenure: dealData.loan_tenure_months,
      interestRate: dealData.interest_rate,
      emiAmount: dealData.emi_amount,
      processingFee: dealData.processing_fee,
      totalAmount: dealData.financed_amount + (dealData.processing_fee || 0),
      gstAmount: 0, // Finance invoices may not have GST
    };
  } else if (invoiceType === 'delivery_note') {
    return {
      ...baseData,
      type: 'Delivery Note',
      deliveryDate: dealData.delivery_date,
      deliveryLocation: dealData.delivery_location,
      deliveryNotes: dealData.delivery_notes,
      deliveryChallanNumber: dealData.delivery_challan_number,
      totalAmount: dealData.total_on_road_price,
      gstAmount: dealData.total_gst_amount,
    };
  }

  return baseData;
}