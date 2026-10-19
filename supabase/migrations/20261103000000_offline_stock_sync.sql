-- Migration: 20261103000000_offline_stock_sync.sql
-- Description: Add stock_sync_history and stock_sync_items tables for tracking offline stock synchronization

CREATE TABLE IF NOT EXISTS public.stock_sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_hash TEXT,
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    admin_name TEXT NOT NULL DEFAULT 'Admin',
    total_rows INTEGER NOT NULL DEFAULT 0,
    matched_count INTEGER NOT NULL DEFAULT 0,
    unmatched_count INTEGER NOT NULL DEFAULT 0,
    conflict_count INTEGER NOT NULL DEFAULT 0,
    applied_count INTEGER NOT NULL DEFAULT 0,
    include_external_warehouse BOOLEAN NOT NULL DEFAULT FALSE,
    online_orders_accounted BOOLEAN NOT NULL DEFAULT FALSE,
    summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_sync_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id UUID NOT NULL REFERENCES public.stock_sync_history(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    previous_stock INTEGER NOT NULL DEFAULT 0,
    new_stock INTEGER NOT NULL DEFAULT 0,
    excel_stock INTEGER NOT NULL DEFAULT 0,
    external_warehouse_stock INTEGER NOT NULL DEFAULT 0,
    web_reconciled_qty INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'applied',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_sync_history_created_at_idx ON public.stock_sync_history(created_at DESC);
CREATE INDEX IF NOT EXISTS stock_sync_items_sync_id_idx ON public.stock_sync_items(sync_id);
CREATE INDEX IF NOT EXISTS stock_sync_items_sku_idx ON public.stock_sync_items(sku);

-- RLS policies
ALTER TABLE public.stock_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_sync_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view stock sync history" ON public.stock_sync_history
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert stock sync history" ON public.stock_sync_history
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can view stock sync items" ON public.stock_sync_items
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert stock sync items" ON public.stock_sync_items
    FOR INSERT WITH CHECK (public.is_admin());

