-- Migration: Simplify Products Table for Generic Industry Support
-- Description: Remove unnecessary fields and add essential ones for any business type
-- Date: 2024-12-29

-- Step 1: Add new columns to existing products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS unit_type TEXT NOT NULL DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 0;

-- Step 2: Update existing records to use selling_price from base_price
-- (This assumes base_price was the selling price in the old schema)
UPDATE public.products
SET selling_price = COALESCE(base_price, 0)
WHERE selling_price IS NULL;

-- Step 3: Make selling_price NOT NULL after populating data
ALTER TABLE public.products
ALTER COLUMN selling_price SET NOT NULL;

-- Step 4: Drop old columns that are no longer needed
ALTER TABLE public.products
DROP COLUMN IF EXISTS brand,
DROP COLUMN IF EXISTS base_price,
DROP COLUMN IF EXISTS mrp,
DROP COLUMN IF EXISTS weight,
DROP COLUMN IF EXISTS dimensions,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS is_featured,
DROP COLUMN IF EXISTS is_digital,
DROP COLUMN IF EXISTS low_stock_threshold,
DROP COLUMN IF EXISTS images,
DROP COLUMN IF EXISTS tags;

-- Step 5: Create or update indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);

-- Step 6: Update RLS policies if needed (existing ones should work with new schema)

-- Note: Existing RLS policies and triggers remain compatible with the simplified schema
