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
  vehicle_type: 'car' | 'bike';
  brand: string;
  model: string;
  variant?: string | null;
  year: number;
  price: number;
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
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
}

export interface QuoteWithRelations {
  id: string;
  lead_id?: string | null;
  vehicle_id: string;
  quote_number?: string | null;
  vehicle_price: number;
  discount_amount: number;
  accessories_cost: number;
  registration_cost: number;
  insurance_cost: number;
  finance_cost: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until?: string | null;
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
  } | null;
}
