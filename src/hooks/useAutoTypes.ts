// Type definitions for automobile components with joined relations
// These types help bypass Supabase type generation issues for automobile tables

export interface AutoLeadWithRelations {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  preferred_vehicle_type?: 'car' | 'bike' | null;
  preferred_brand?: string | null;
  preferred_model?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  financing_needed: boolean;
  insurance_needed: boolean;
  test_drive_requested: boolean;
  source?: string | null;
  status: string;
  notes: string[];
  tags: string[];
  assigned_to?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  last_contact?: string | null;
  company_id: string;
}

export interface VehicleWithRelations {
  id: string;
  vehicle_type: 'car' | 'bike' | 'used_car' | 'used_bike';
  brand: string;
  model: string;
  variant?: string | null;
  year: number;
  price: number;
  quantity: number;
  fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'cng';
  transmission: 'manual' | 'automatic' | 'cvt' | 'dct';
  mileage?: number | null;
  engine_capacity?: string | null;
  seating_capacity?: number | null;
  color?: string | null;
  vin?: string | null;
  stock_number?: string | null;
  description?: string | null;
  location?: string | null;
  status: 'available' | 'sold' | 'reserved' | 'maintenance';
  odometer_reading?: number | null;
  ownership_count?: number | null;
  rc_status?: 'available' | 'pending' | 'missing' | null;
  insurance_status?: 'valid' | 'expired' | 'pending' | 'missing' | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
}

export interface BookingWithRelations {
  id: string;
  lead_id?: string | null;
  vehicle_id: string;
  booking_number?: string | null;
  booking_date: string;
  delivery_date?: string | null;
  delivery_location?: string | null;
  special_requests?: string | null;
  vehicle_price: number;
  discount_amount: number;
  accessories_cost: number;
  registration_cost: number;
  insurance_cost: number;
  finance_cost: number;
  total_amount: number;
  down_payment: number;
  token_amount: number;
  remaining_balance: number;
  payment_status: 'pending' | 'partial' | 'completed';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string | null;
  terms_conditions?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  // Joined relations
  auto_leads?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  vehicles?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    fuel_type: string;
    variant?: string | null;
    transmission?: string | null;
    mileage?: number | null;
    color?: string | null;
    price?: number | null;
  } | null;
}

export interface QuoteWithRelations {
  id: string;
  lead_id?: string | null;
  vehicle_id: string;
  quote_number?: string | null;
  quote_date: string;
  valid_until?: string | null;
  vehicle_price: number;
  discount_amount?: number | null;
  accessories_cost?: number | null;
  registration_cost?: number | null;
  insurance_cost?: number | null;
  total_amount: number;
  status?: string | null;
  notes?: string | null;
  terms_conditions?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  auto_leads?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    preferred_brand?: string | null;
    preferred_model?: string | null;
  } | null;
  vehicles?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    fuel_type: string;
    transmission?: string | null;
    price?: number | null;
    variant?: string | null;
  } | null;
}

export interface TestDriveWithRelations {
  id: string;
  lead_id?: string | null;
  vehicle_id: string;
  driver_name: string;
  driver_phone: string;
  driver_license?: string | null;
  test_drive_date: string;
  test_drive_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  feedback?: string | null;
  notes?: string | null;
  rating?: number | null;
  assigned_to?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  // Joined relations
  auto_leads?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  vehicles?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    fuel_type: string;
    variant?: string | null;
    transmission?: string | null;
    mileage?: number | null;
    color?: string | null;
  } | null;
}

export interface DealWithRelations {
  id: string;
  lead_id: string;
  vehicle_id: string;
  booking_id?: string | null;
  deal_number?: string | null;

  // Status Tracking
  deal_status: 'draft' | 'pending' | 'approved' | 'completed' | 'cancelled' | 'delivered';
  payment_status: 'pending' | 'partial' | 'completed' | 'refunded' | 'overdue';
  delivery_status: 'pending' | 'ready' | 'delivered' | 'cancelled';

  // Vehicle Details
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_variant?: string | null;
  vehicle_year: number;
  vehicle_color?: string | null;
  chassis_number?: string | null;
  engine_number?: string | null;
  rc_number?: string | null;
  vehicle_price: number;

  // Customer Details
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_address?: string | null;
  customer_city?: string | null;
  customer_state?: string | null;
  customer_pincode?: string | null;

  // Price Breakdown
  ex_showroom_price: number;
  rto_charges: number;
  insurance_charges: number;
  accessories_cost: number;
  other_charges: number;
  discount_amount: number;
  total_on_road_price: number;

  // Payment Information
  token_amount: number;
  down_payment: number;
  financed_amount: number;
  total_paid: number;
  balance_amount: number;

  // Finance/Loan Details
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

  // Invoice Information
  customer_invoice_number?: string | null;
  customer_invoice_date?: string | null;
  finance_invoice_date?: string | null;

  // GST Information
  cgst_rate?: number | null;
  sgst_rate?: number | null;
  igst_rate?: number | null;
  cgst_amount?: number | null;
  sgst_amount?: number | null;
  igst_amount?: number | null;
  total_gst_amount?: number | null;

  // Delivery Information
  delivery_date?: string | null;
  delivery_location?: string | null;
  delivery_notes?: string | null;
  delivery_challan_number?: string | null;

  // Additional Information
  special_conditions?: string | null;
  payment_terms?: string | null;
  remarks?: string | null;

  // Metadata
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;

  // Joined relations
  auto_leads?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  vehicles?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    fuel_type: string;
    variant?: string | null;
    color?: string | null;
  } | null;
  bookings?: {
    id: string;
    booking_number?: string | null;
    total_amount: number;
    vehicle_price: number;
    discount_amount: number;
    accessories_cost: number;
    registration_cost: number;
    insurance_cost: number;
    finance_cost: number;
  } | null;
}

export interface DealInvoiceWithRelations {
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
}

export interface DealPaymentWithRelations {
  id: string;
  deal_id: string;
  payment_date: string;
  payment_type: string;
  amount: number;
  payment_method?: string | null;
  reference_number?: string | null;
  remarks?: string | null;
  created_by?: string | null;
  created_at: string;
  company_id: string;
}
