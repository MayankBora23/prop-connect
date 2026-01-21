-- Migration: Optimize automobile tables with indexes and constraints
-- This migration adds performance optimizations and data integrity constraints for all automobile tables

-- Vehicles table optimizations
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON public.vehicles(brand);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON public.vehicles(model);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON public.vehicles(price);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON public.vehicles(year DESC);

-- Add check constraint for vehicle status
ALTER TABLE public.vehicles
ADD CONSTRAINT vehicles_status_check
CHECK (status IN ('available', 'sold', 'reserved', 'maintenance'));

-- Test Drives table optimizations
CREATE INDEX IF NOT EXISTS idx_test_drives_status ON public.test_drives(status);
CREATE INDEX IF NOT EXISTS idx_test_drives_date ON public.test_drives(test_drive_date);
CREATE INDEX IF NOT EXISTS idx_test_drives_vehicle ON public.test_drives(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_lead ON public.test_drives(lead_id);

-- Add check constraint for test drive status
ALTER TABLE public.test_drives
ADD CONSTRAINT test_drives_status_check
CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show'));

-- Quotes table optimizations
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON public.quotes(valid_until);
CREATE INDEX IF NOT EXISTS idx_quotes_vehicle ON public.quotes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_quotes_lead ON public.quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_total_amount ON public.quotes(total_amount);

-- Add check constraint for quote status
ALTER TABLE public.quotes
ADD CONSTRAINT quotes_status_check
CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired'));

-- Deals table optimizations
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_delivery_date ON public.deals(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deals_vehicle ON public.deals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_deals_lead ON public.deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_final_price ON public.deals(final_price);

-- Add check constraint for deal status
ALTER TABLE public.deals
ADD CONSTRAINT deals_status_check
CHECK (status IN ('pending', 'approved', 'completed', 'cancelled'));

-- Finance Applications table optimizations
CREATE INDEX IF NOT EXISTS idx_finance_applications_status ON public.finance_applications(status);
CREATE INDEX IF NOT EXISTS idx_finance_applications_approval_date ON public.finance_applications(approval_date);
CREATE INDEX IF NOT EXISTS idx_finance_applications_disbursement_date ON public.finance_applications(disbursement_date);
CREATE INDEX IF NOT EXISTS idx_finance_applications_lead ON public.finance_applications(lead_id);
CREATE INDEX IF NOT EXISTS idx_finance_applications_requested_amount ON public.finance_applications(requested_amount);

-- Add check constraint for finance status
ALTER TABLE public.finance_applications
ADD CONSTRAINT finance_applications_status_check
CHECK (status IN ('applied', 'approved', 'rejected', 'disbursed'));

-- Insurance Sales table optimizations
CREATE INDEX IF NOT EXISTS idx_insurance_sales_status ON public.insurance_sales(status);
CREATE INDEX IF NOT EXISTS idx_insurance_sales_start_date ON public.insurance_sales(start_date);
CREATE INDEX IF NOT EXISTS idx_insurance_sales_end_date ON public.insurance_sales(end_date);
CREATE INDEX IF NOT EXISTS idx_insurance_sales_lead ON public.insurance_sales(lead_id);
CREATE INDEX IF NOT EXISTS idx_insurance_sales_deal ON public.insurance_sales(deal_id);
CREATE INDEX IF NOT EXISTS idx_insurance_sales_coverage_amount ON public.insurance_sales(coverage_amount);

-- Add check constraint for insurance sale status
ALTER TABLE public.insurance_sales
ADD CONSTRAINT insurance_sales_status_check
CHECK (status IN ('quoted', 'sold', 'cancelled'));

-- Vehicle Images table optimizations
CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON public.vehicle_images(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_primary ON public.vehicle_images(vehicle_id, is_primary) WHERE is_primary = true;
