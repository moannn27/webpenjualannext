-- Migration 0003: Vouchers & Indexes

-- 1. Create Vouchers table
CREATE TABLE public.vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
    min_purchase NUMERIC(12,2) DEFAULT 0,
    max_discount NUMERIC(12,2),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    usage_limit INTEGER,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for vouchers updated_at
CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Policies for Vouchers
CREATE POLICY "Public can view active vouchers" ON public.vouchers FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins can insert vouchers" ON public.vouchers FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update vouchers" ON public.vouchers FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete vouchers" ON public.vouchers FOR DELETE USING (public.is_admin());

-- 2. Add voucher relation to orders
ALTER TABLE public.orders ADD COLUMN voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL;

-- 3. Create missing indexes for performance
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_brand_id ON public.products(brand_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_status ON public.products(status);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);

CREATE INDEX idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON public.cart_items(product_id);

CREATE INDEX idx_wishlist_user_id ON public.wishlist(user_id);
CREATE INDEX idx_wishlist_product_id ON public.wishlist(product_id);

CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);

CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_specs_product_id ON public.product_specifications(product_id);
