import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

// Define types for the deals table since it's not in the generated types yet
export interface Deal {
  id: string;
  lead_id: string;
  vehicle_id: string;
  booking_id?: string | null;
  deal_number?: string | null;
  deal_status: 'draft' | 'pending' | 'approved' | 'completed' | 'cancelled' | 'delivered';
  payment_status: 'pending' | 'partial' | 'completed' | 'refunded' | 'overdue';
  delivery_status: 'pending' | 'ready' | 'delivered' | 'cancelled';
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_variant?: string | null;
  vehicle_year: number;
  vehicle_color?: string | null;
  chassis_number?: string | null;
  engine_number?: string | null;
  vehicle_price: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_address?: string | null;
  customer_city?: string | null;
  customer_state?: string | null;
  customer_pincode?: string | null;
  ex_showroom_price: number;
  rto_charges: number;
  insurance_charges: number;
  accessories_cost: number;
  other_charges: number;
  discount_amount: number;
  total_on_road_price: number;
  token_amount: number;
  down_payment: number;
  financed_amount: number;
  total_paid: number;
  balance_amount: number;
  finance_type: 'none' | 'bank_loan' | 'finance_company' | 'dealer_finance';
  finance_company_name?: string | null;
  finance_company_address?: string | null;
  loan_amount?: number | null;
  loan_tenure_months?: number | null;
  interest_rate?: number | null;
  emi_amount?: number | null;
  processing_fee?: number | null;
  finance_approval_date?: string | null;
  disbursement_date?: string | null;
  finance_invoice_number?: string | null;
  customer_invoice_number?: string | null;
  customer_invoice_date?: string | null;
  finance_invoice_date?: string | null;
  cgst_rate?: number | null;
  sgst_rate?: number | null;
  igst_rate?: number | null;
  cgst_amount?: number | null;
  sgst_amount?: number | null;
  igst_amount?: number | null;
  total_gst_amount?: number | null;
  delivery_date?: string | null;
  delivery_location?: string | null;
  delivery_notes?: string | null;
  delivery_challan_number?: string | null;
  special_conditions?: string | null;
  payment_terms?: string | null;
  remarks?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  company_id?: string | null;
}

export type DealInsert = Omit<Deal, 'id' | 'created_at' | 'updated_at'>;
export type DealUpdate = Partial<DealInsert>;

export function useDeals() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['deals', company?.id],
    queryFn: async () => {
      if (!company?.id) {
        console.log('useDeals - no company id, returning empty array');
        return [];
      }


      const { data, error } = await supabaseAny
        .from('deals')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email
          ),
          vehicles (
            id,
            brand,
            model,
            year,
            fuel_type,
            variant,
            color
          ),
          bookings (
            id,
            booking_number,
            total_amount,
            vehicle_price,
            discount_amount,
            accessories_cost,
            registration_cost,
            insurance_cost,
            finance_cost
          )
        `)
        .or(`company_id.eq.${company.id},company_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('deals')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email,
            preferred_brand,
            preferred_model
          ),
          vehicles (
            id,
            brand,
            model,
            year,
            fuel_type,
            transmission,
            price,
            variant,
            color
          ),
          bookings (
            id,
            booking_number,
            total_amount,
            vehicle_price,
            discount_amount,
            accessories_cost,
            registration_cost,
            insurance_cost,
            finance_cost
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (deal: any) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabaseAny
        .from('deals')
        .insert({
          ...deal,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DealUpdate & { id: string }) => {
      const { data, error } = await supabaseAny
        .from('deals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseAny
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
