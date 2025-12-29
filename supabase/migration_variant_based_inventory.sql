-- Migration for variant-based product, SKU, and inventory system
-- Run this migration to implement the variant-based inventory logic

-- 1. Add variant fields to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'simple',
ADD COLUMN IF NOT EXISTS variant_group_id TEXT;

-- Add check constraint for product_type
ALTER TABLE public.products
ADD CONSTRAINT product_type_check
CHECK (product_type IN ('simple', 'variant'));

-- 2. Remove stock_quantity from products table (stock will be managed via inventory table)
ALTER TABLE public.products
DROP COLUMN IF EXISTS stock_quantity;

-- 3. Create inventory_ledger table for tracking all inventory movements
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('stock_in', 'stock_out', 'return_to_stock', 'adjustment')),
  quantity INTEGER NOT NULL,
  reference_id UUID, -- order_id, return_id, etc.
  reference_type TEXT, -- 'order', 'return', 'purchase', etc.
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Create indexes for inventory_ledger
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_sku ON public.inventory_ledger(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_reference ON public.inventory_ledger(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_company ON public.inventory_ledger(company_id);

-- 4. Create new_inventory table (replacing the old inventory table for SKU-based management)
CREATE TABLE IF NOT EXISTS public.sku_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  opening_stock INTEGER NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
  reorder_point INTEGER NOT NULL DEFAULT 10,
  minimum_stock INTEGER NOT NULL DEFAULT 5,
  maximum_stock INTEGER,
  location TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  last_restocked TIMESTAMP WITH TIME ZONE,
  auto_reorder BOOLEAN NOT NULL DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  CONSTRAINT sku_inventory_stock_check CHECK (current_stock >= 0),
  CONSTRAINT sku_inventory_reserved_check CHECK (reserved_stock >= 0),
  CONSTRAINT sku_inventory_available_check CHECK (available_stock >= 0),
  CONSTRAINT sku_inventory_reorder_check CHECK (reorder_point >= 0),
  CONSTRAINT sku_inventory_min_check CHECK (minimum_stock >= 0),
  CONSTRAINT sku_inventory_max_check CHECK (maximum_stock IS NULL OR maximum_stock >= minimum_stock)
);

-- Create indexes for sku_inventory
CREATE INDEX IF NOT EXISTS idx_sku_inventory_sku ON public.sku_inventory(sku);
CREATE INDEX IF NOT EXISTS idx_sku_inventory_company ON public.sku_inventory(company_id);

-- 5. Enable RLS on new tables
ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku_inventory ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for inventory_ledger
CREATE POLICY "Users can view inventory ledger in their company"
ON public.inventory_ledger FOR SELECT
USING (company_id IN (
  SELECT id FROM public.companies WHERE id = company_id
));

CREATE POLICY "Users can create inventory ledger entries in their company"
ON public.inventory_ledger FOR INSERT
WITH CHECK (company_id IN (
  SELECT id FROM public.companies WHERE id = company_id
));

-- 7. Create RLS policies for sku_inventory
CREATE POLICY "Users can view sku inventory in their company"
ON public.sku_inventory FOR SELECT
USING (company_id IN (
  SELECT id FROM public.companies WHERE id = company_id
));

CREATE POLICY "Users can create sku inventory in their company"
ON public.sku_inventory FOR INSERT
WITH CHECK (company_id IN (
  SELECT id FROM public.companies WHERE id = company_id
));

CREATE POLICY "Users can update sku inventory"
ON public.sku_inventory FOR UPDATE
USING (company_id IN (
  SELECT id FROM public.companies WHERE id = company_id
));

-- 8. Update existing products to have product_type = 'simple' if null
UPDATE public.products
SET product_type = 'simple'
WHERE product_type IS NULL;

-- 9. Create a function to generate variant group IDs
CREATE OR REPLACE FUNCTION generate_variant_group_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  counter INTEGER := 1;
BEGIN
  -- Generate a 3-character code from product name or random
  new_id := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 3));

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.products WHERE variant_group_id = new_id) LOOP
    new_id := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 3));
    counter := counter + 1;
    IF counter > 1000 THEN
      RAISE EXCEPTION 'Could not generate unique variant group ID';
    END IF;
  END LOOP;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Create a function to generate SKUs for variants
CREATE OR REPLACE FUNCTION generate_variant_sku(
  group_id TEXT,
  sequence INTEGER,
  variant TEXT
)
RETURNS TEXT AS $$
BEGIN
  -- Format: GROUPID-SEQUENCE-VARIANT (e.g., TSH-001-RED)
  RETURN UPPER(group_id || '-' || LPAD(sequence::TEXT, 3, '0') || '-' || variant);
END;
$$ LANGUAGE plpgsql;

-- 11. Create a function to automatically create inventory entry for new SKU
CREATE OR REPLACE FUNCTION create_inventory_for_sku(
  p_sku TEXT,
  p_company_id UUID,
  p_opening_stock INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  inventory_id UUID;
BEGIN
  INSERT INTO public.sku_inventory (sku, opening_stock, current_stock, company_id)
  VALUES (p_sku, p_opening_stock, p_opening_stock, p_company_id)
  RETURNING id INTO inventory_id;

  -- Create ledger entry for opening stock if > 0
  IF p_opening_stock > 0 THEN
    INSERT INTO public.inventory_ledger (sku, action, quantity, reference_type, notes, company_id)
    VALUES (p_sku, 'stock_in', p_opening_stock, 'opening_stock', 'Opening stock entry', p_company_id);
  END IF;

  RETURN inventory_id;
END;
$$ LANGUAGE plpgsql;

-- 12. Create a trigger function to automatically create inventory entries
CREATE OR REPLACE FUNCTION trigger_create_inventory_for_product()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create inventory for products that have SKU and are not parent variants
  IF NEW.sku IS NOT NULL AND (NEW.product_type IS NULL OR NEW.product_type = 'simple') THEN
    -- Check if inventory already exists
    IF NOT EXISTS (SELECT 1 FROM public.sku_inventory WHERE sku = NEW.sku AND company_id = NEW.company_id) THEN
      PERFORM create_inventory_for_sku(NEW.sku, NEW.company_id, 0);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create a function to update inventory stock levels
CREATE OR REPLACE FUNCTION update_inventory_stock(
  p_sku TEXT,
  p_quantity_change INTEGER,
  p_company_id UUID
)
RETURNS VOID AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT current_stock INTO current_stock
  FROM public.sku_inventory
  WHERE sku = p_sku AND company_id = p_company_id;

  -- If no inventory record exists, create one
  IF current_stock IS NULL THEN
    INSERT INTO public.sku_inventory (sku, opening_stock, current_stock, company_id)
    VALUES (p_sku, 0, GREATEST(0, p_quantity_change), p_company_id);
  ELSE
    -- Update current stock
    UPDATE public.sku_inventory
    SET current_stock = GREATEST(0, current_stock + p_quantity_change),
        last_updated = now()
    WHERE sku = p_sku AND company_id = p_company_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 14. Create trigger on products table
DROP TRIGGER IF EXISTS trigger_create_inventory_for_product ON public.products;
CREATE TRIGGER trigger_create_inventory_for_product
  AFTER INSERT OR UPDATE OF sku ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_inventory_for_product();
