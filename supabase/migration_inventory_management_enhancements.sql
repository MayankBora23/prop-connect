-- Migration: Inventory Management Enhancements
-- Description: Adds advanced inventory management features including reorder points,
--              stock alerts, location tracking, and auto-reorder functionality
-- Date: December 29, 2025
-- Version: 1.1.0

-- Start transaction for atomic migration
BEGIN;

-- 1a. Add sku column to order_items table for direct SKU storage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order_items'
        AND table_schema = 'public'
        AND column_name = 'sku'
    ) THEN
        ALTER TABLE public.order_items
        ADD COLUMN sku TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order_items'
        AND table_schema = 'public'
        AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.order_items
        ADD COLUMN product_name TEXT;
    END IF;
END $$;

-- 1. Add new columns to sku_inventory table for enhanced inventory management
DO $$
BEGIN
    -- Add columns one by one to handle existing tables gracefully
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sku_inventory'
        AND table_schema = 'public'
        AND column_name = 'reorder_point'
    ) THEN
        ALTER TABLE public.sku_inventory
        ADD COLUMN reorder_point INTEGER NOT NULL DEFAULT 10;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sku_inventory'
        AND table_schema = 'public'
        AND column_name = 'minimum_stock'
    ) THEN
        ALTER TABLE public.sku_inventory
        ADD COLUMN minimum_stock INTEGER NOT NULL DEFAULT 5;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sku_inventory'
        AND table_schema = 'public'
        AND column_name = 'maximum_stock'
    ) THEN
        ALTER TABLE public.sku_inventory
        ADD COLUMN maximum_stock INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sku_inventory'
        AND table_schema = 'public'
        AND column_name = 'location'
    ) THEN
        ALTER TABLE public.sku_inventory
        ADD COLUMN location TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sku_inventory'
        AND table_schema = 'public'
        AND column_name = 'supplier_id'
    ) THEN
        -- Only add foreign key if suppliers table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'suppliers'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.sku_inventory
            ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;
        ELSE
            ALTER TABLE public.sku_inventory
            ADD COLUMN supplier_id UUID;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sku_inventory'
        AND table_schema = 'public'
        AND column_name = 'last_restocked'
    ) THEN
        ALTER TABLE public.sku_inventory
        ADD COLUMN last_restocked TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sku_inventory'
        AND table_schema = 'public'
        AND column_name = 'auto_reorder'
    ) THEN
        ALTER TABLE public.sku_inventory
        ADD COLUMN auto_reorder BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 2. Add constraints for data integrity (with error handling)
DO $$
BEGIN
    -- Add reorder_point constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'sku_inventory_reorder_check'
        AND table_name = 'sku_inventory'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sku_inventory
        ADD CONSTRAINT sku_inventory_reorder_check CHECK (reorder_point >= 0);
    END IF;

    -- Add minimum_stock constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'sku_inventory_min_check'
        AND table_name = 'sku_inventory'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sku_inventory
        ADD CONSTRAINT sku_inventory_min_check CHECK (minimum_stock >= 0);
    END IF;

    -- Add maximum_stock constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'sku_inventory_max_check'
        AND table_name = 'sku_inventory'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.sku_inventory
        ADD CONSTRAINT sku_inventory_max_check CHECK (maximum_stock IS NULL OR maximum_stock >= minimum_stock);
    END IF;
END $$;

-- 3. Create function for low stock alerts
CREATE OR REPLACE FUNCTION get_low_stock_alerts(p_company_id UUID)
RETURNS TABLE (
  sku TEXT,
  product_name TEXT,
  current_stock INTEGER,
  available_stock INTEGER,
  reorder_point INTEGER,
  minimum_stock INTEGER,
  location TEXT,
  alert_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.sku,
    p.name::TEXT,
    si.current_stock,
    si.available_stock,
    si.reorder_point,
    si.minimum_stock,
    si.location,
    CASE
      WHEN si.current_stock = 0 THEN 'out_of_stock'
      WHEN si.current_stock <= si.minimum_stock THEN 'critical'
      WHEN si.available_stock <= si.reorder_point THEN 'reorder_soon'
      ELSE 'normal'
    END as alert_level
  FROM public.sku_inventory si
  LEFT JOIN public.products p ON p.sku = si.sku
  WHERE si.company_id = p_company_id
    AND si.company_id = p_company_id
    AND (
      si.current_stock = 0
      OR si.current_stock <= si.minimum_stock
      OR si.available_stock <= si.reorder_point
    )
  ORDER BY
    CASE
      WHEN si.current_stock = 0 THEN 1
      WHEN si.current_stock <= si.minimum_stock THEN 2
      WHEN si.available_stock <= si.reorder_point THEN 3
      ELSE 4
    END,
    si.available_stock ASC;
END;
$$;

-- 4. Create function to update inventory settings
CREATE OR REPLACE FUNCTION update_inventory_settings(
  p_sku TEXT,
  p_company_id UUID,
  p_reorder_point INTEGER DEFAULT NULL,
  p_minimum_stock INTEGER DEFAULT NULL,
  p_maximum_stock INTEGER DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_auto_reorder BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_count INTEGER;
BEGIN
  -- Validate inputs
  IF p_reorder_point < 0 OR p_minimum_stock < 0 THEN
    RAISE EXCEPTION 'Reorder point and minimum stock must be non-negative';
  END IF;

  IF p_maximum_stock IS NOT NULL AND p_maximum_stock < p_minimum_stock THEN
    RAISE EXCEPTION 'Maximum stock must be greater than or equal to minimum stock';
  END IF;

  -- Update inventory settings
  UPDATE public.sku_inventory
  SET
    reorder_point = COALESCE(p_reorder_point, reorder_point),
    minimum_stock = COALESCE(p_minimum_stock, minimum_stock),
    maximum_stock = p_maximum_stock,
    location = COALESCE(p_location, location),
    supplier_id = p_supplier_id,
    auto_reorder = COALESCE(p_auto_reorder, auto_reorder),
    last_updated = now()
  WHERE sku = p_sku AND company_id = p_company_id;

  GET DIAGNOSTICS update_count = ROW_COUNT;

  RETURN update_count > 0;
END;
$$;

-- 5. Create function to get inventory summary
CREATE OR REPLACE FUNCTION get_inventory_summary(p_company_id UUID)
RETURNS TABLE (
  total_skus BIGINT,
  low_stock_count BIGINT,
  critical_stock_count BIGINT,
  out_of_stock_count BIGINT,
  total_value DECIMAL(12,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_skus,
    COUNT(*) FILTER (WHERE available_stock <= reorder_point AND current_stock > 0) as low_stock_count,
    COUNT(*) FILTER (WHERE current_stock <= minimum_stock AND current_stock > 0) as critical_stock_count,
    COUNT(*) FILTER (WHERE current_stock = 0) as out_of_stock_count,
    COALESCE(SUM(current_stock * COALESCE(p.selling_price, 0)), 0) as total_value
  FROM public.sku_inventory si
  LEFT JOIN public.products p ON p.sku = si.sku AND p.company_id = si.company_id
  WHERE si.company_id = p_company_id;
END;
$$;

-- 6. Create index for better performance on inventory queries
CREATE INDEX IF NOT EXISTS idx_sku_inventory_alerts
ON public.sku_inventory(company_id, current_stock, available_stock, reorder_point, minimum_stock);

CREATE INDEX IF NOT EXISTS idx_sku_inventory_location
ON public.sku_inventory(company_id, location)
WHERE location IS NOT NULL;

-- 7. Update existing RLS policies to include new columns
-- (No changes needed as policies work on row level, not column level)

-- 8. Insert default inventory settings for existing SKUs without settings
INSERT INTO public.sku_inventory (
  sku,
  opening_stock,
  current_stock,
  reserved_stock,
  reorder_point,
  minimum_stock,
  auto_reorder,
  company_id,
  last_updated
)
SELECT
  p.sku,
  0 as opening_stock,
  0 as current_stock,
  0 as reserved_stock,
  10 as reorder_point,
  5 as minimum_stock,
  false as auto_reorder,
  p.company_id,
  now() as last_updated
FROM public.products p
WHERE p.sku IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.sku_inventory si
    WHERE si.sku = p.sku AND si.company_id = p.company_id
  );

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_low_stock_alerts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_inventory_settings(TEXT, UUID, INTEGER, INTEGER, INTEGER, TEXT, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_summary(UUID) TO authenticated;

-- 10. Add comments for documentation
COMMENT ON COLUMN public.sku_inventory.reorder_point IS 'Stock level at which reorder alerts should be triggered';
COMMENT ON COLUMN public.sku_inventory.minimum_stock IS 'Critical stock level requiring immediate action';
COMMENT ON COLUMN public.sku_inventory.maximum_stock IS 'Optional maximum stock level for overstock warnings';
COMMENT ON COLUMN public.sku_inventory.location IS 'Storage location or warehouse identifier';
COMMENT ON COLUMN public.sku_inventory.supplier_id IS 'Preferred supplier for automatic reordering';
COMMENT ON COLUMN public.sku_inventory.last_restocked IS 'Date and time of last stock replenishment';
COMMENT ON COLUMN public.sku_inventory.auto_reorder IS 'Flag to enable automatic reordering when stock reaches reorder point';

COMMENT ON FUNCTION get_low_stock_alerts(UUID) IS 'Returns products that need attention based on stock levels';
COMMENT ON FUNCTION update_inventory_settings(TEXT, UUID, INTEGER, INTEGER, INTEGER, TEXT, UUID, BOOLEAN) IS 'Updates inventory management settings for a specific SKU';
COMMENT ON FUNCTION get_inventory_summary(UUID) IS 'Returns summary statistics for company inventory';

-- Commit transaction
COMMIT;

-- Verification queries (run these after migration to verify)
-- SELECT * FROM get_inventory_summary('your-company-id-here');
-- SELECT * FROM get_low_stock_alerts('your-company-id-here');
