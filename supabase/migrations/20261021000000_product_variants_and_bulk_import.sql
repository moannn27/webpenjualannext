CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE,
    color TEXT NOT NULL DEFAULT '',
    ram TEXT NOT NULL DEFAULT '',
    storage TEXT NOT NULL DEFAULT '',
    price NUMERIC(12, 2) CHECK (price IS NULL OR price >= 0),
    discount_price NUMERIC(12, 2) CHECK (discount_price IS NULL OR discount_price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT product_variants_have_option CHECK (NULLIF(BTRIM(color), '') IS NOT NULL OR NULLIF(BTRIM(ram), '') IS NOT NULL OR NULLIF(BTRIM(storage), '') IS NOT NULL),
    CONSTRAINT product_variants_discount_below_price CHECK (discount_price IS NULL OR price IS NULL OR discount_price < price),
    CONSTRAINT product_variants_id_product_id_unique UNIQUE (id, product_id)
);

CREATE UNIQUE INDEX product_variants_option_unique
    ON public.product_variants (product_id, LOWER(color), LOWER(ram), LOWER(storage));
CREATE INDEX product_variants_product_id_idx ON public.product_variants(product_id);
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view variants of published products" ON public.product_variants
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.products WHERE products.id = product_variants.product_id AND products.status = 'published') OR public.is_admin());
CREATE POLICY "Admins can insert product variants" ON public.product_variants FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update product variants" ON public.product_variants FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete product variants" ON public.product_variants FOR DELETE USING (public.is_admin());

ALTER TABLE public.cart_items ADD COLUMN variant_id UUID;
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_product_id_key;
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_variant_product_fk
    FOREIGN KEY (variant_id, product_id) REFERENCES public.product_variants(id, product_id) ON DELETE CASCADE;
CREATE UNIQUE INDEX cart_items_product_without_variant_unique ON public.cart_items(cart_id, product_id) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX cart_items_product_with_variant_unique ON public.cart_items(cart_id, product_id, variant_id) WHERE variant_id IS NOT NULL;

ALTER TABLE public.order_items ADD COLUMN variant_details JSONB;

CREATE OR REPLACE FUNCTION public.process_checkout(
    p_user_id UUID,
    p_recipient_name TEXT,
    p_phone TEXT,
    p_street_address TEXT,
    p_city TEXT,
    p_province TEXT,
    p_postal_code TEXT,
    p_shipping_method TEXT,
    p_payment_method TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_cart_id UUID;
    v_address_id UUID;
    v_order_id UUID;
    v_order_number TEXT;
    v_shipping_amount NUMERIC(12, 2);
    v_total_amount NUMERIC(12, 2) := 0;
    v_grand_total NUMERIC(12, 2);
    v_item_count INTEGER := 0;
    v_item RECORD;
    v_product RECORD;
    v_variant RECORD;
    v_price NUMERIC(12, 2);
    v_variant_details JSONB;
    v_product_name TEXT;
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Not authorized to checkout this cart' USING ERRCODE = '42501';
    END IF;
    IF NULLIF(BTRIM(p_recipient_name), '') IS NULL OR NULLIF(BTRIM(p_phone), '') IS NULL THEN
        RAISE EXCEPTION 'Recipient name and phone are required' USING ERRCODE = '22023';
    END IF;
    IF p_shipping_method <> 'pickup' AND (
        NULLIF(BTRIM(p_street_address), '') IS NULL OR NULLIF(BTRIM(p_city), '') IS NULL
        OR NULLIF(BTRIM(p_province), '') IS NULL OR NULLIF(BTRIM(p_postal_code), '') IS NULL
    ) THEN
        RAISE EXCEPTION 'Shipping address is incomplete' USING ERRCODE = '22023';
    END IF;
    IF p_payment_method IS DISTINCT FROM 'manual_transfer' THEN
        RAISE EXCEPTION 'Unsupported payment method' USING ERRCODE = '22023';
    END IF;

    SELECT id INTO v_cart_id FROM public.cart WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cart not found'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.cart_items WHERE cart_id = v_cart_id) THEN RAISE EXCEPTION 'Cart is empty'; END IF;
    SELECT price INTO v_shipping_amount FROM public.shipping_methods WHERE code = p_shipping_method AND is_active FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Shipping method is unavailable' USING ERRCODE = '22023'; END IF;
    IF p_shipping_method = 'pickup' AND v_shipping_amount <> 0 THEN RAISE EXCEPTION 'Store pickup must be free' USING ERRCODE = '22023'; END IF;

    IF p_shipping_method <> 'pickup' THEN
        INSERT INTO public.addresses (user_id, label, recipient_name, phone, street_address, city, province, postal_code, is_primary)
        VALUES (p_user_id, 'Checkout', BTRIM(p_recipient_name), BTRIM(p_phone), BTRIM(p_street_address), BTRIM(p_city), BTRIM(p_province), BTRIM(p_postal_code), false)
        RETURNING id INTO v_address_id;
    END IF;

    v_order_number := 'ORD-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 12));
    INSERT INTO public.orders (user_id, order_number, status, total_amount, shipping_amount, discount_amount, grand_total, shipping_address, courier)
    VALUES (
        p_user_id, v_order_number, 'pending', 0, v_shipping_amount, 0, 0,
        CASE WHEN p_shipping_method = 'pickup' THEN jsonb_build_object('fulfillment_type', 'pickup', 'pickup_location', 'Toko Next Solution', 'recipient_name', BTRIM(p_recipient_name), 'phone', BTRIM(p_phone))
        ELSE jsonb_build_object('id', v_address_id, 'fulfillment_type', 'delivery', 'recipient_name', BTRIM(p_recipient_name), 'phone', BTRIM(p_phone), 'street_address', BTRIM(p_street_address), 'city', BTRIM(p_city), 'province', BTRIM(p_province), 'postal_code', BTRIM(p_postal_code)) END,
        p_shipping_method
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT product_id, variant_id, quantity FROM public.cart_items WHERE cart_id = v_cart_id ORDER BY product_id, variant_id FOR UPDATE LOOP
        SELECT id, name, price, discount_price, stock, status INTO v_product
        FROM public.products WHERE id = v_item.product_id FOR UPDATE;
        IF NOT FOUND OR v_product.status <> 'published' THEN RAISE EXCEPTION 'A product in the cart is unavailable'; END IF;
        IF v_item.variant_id IS NULL THEN
            IF EXISTS (SELECT 1 FROM public.product_variants WHERE product_id = v_product.id) THEN
                RAISE EXCEPTION 'Choose a product variant before checkout';
            END IF;
            IF v_product.stock < v_item.quantity THEN RAISE EXCEPTION 'Insufficient stock for product %', v_product.name; END IF;
            v_price := COALESCE(v_product.discount_price, v_product.price);
            v_variant_details := NULL;
            v_product_name := v_product.name;
            UPDATE public.products SET stock = stock - v_item.quantity WHERE id = v_product.id;
        ELSE
            SELECT id, sku, color, ram, storage, price, discount_price, stock INTO v_variant
            FROM public.product_variants WHERE id = v_item.variant_id AND product_id = v_product.id FOR UPDATE;
            IF NOT FOUND THEN RAISE EXCEPTION 'A product variant in the cart is unavailable'; END IF;
            IF v_variant.stock < v_item.quantity THEN RAISE EXCEPTION 'Insufficient stock for variant of %', v_product.name; END IF;
            v_price := COALESCE(v_variant.discount_price, v_variant.price, v_product.discount_price, v_product.price);
            v_variant_details := jsonb_strip_nulls(jsonb_build_object('sku', NULLIF(v_variant.sku, ''), 'color', NULLIF(v_variant.color, ''), 'ram', NULLIF(v_variant.ram, ''), 'storage', NULLIF(v_variant.storage, '')));
            v_product_name := v_product.name;
            UPDATE public.product_variants SET stock = stock - v_item.quantity WHERE id = v_variant.id;
            UPDATE public.products SET stock = GREATEST(0, stock - v_item.quantity) WHERE id = v_product.id;
        END IF;
        v_total_amount := v_total_amount + (v_price * v_item.quantity);
        v_item_count := v_item_count + 1;
        INSERT INTO public.order_items (order_id, product_id, product_name, price, quantity, variant_details)
        VALUES (v_order_id, v_product.id, v_product_name, v_price, v_item.quantity, v_variant_details);
    END LOOP;

    IF v_item_count = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;
    v_grand_total := v_total_amount + v_shipping_amount;
    UPDATE public.orders SET total_amount = v_total_amount, grand_total = v_grand_total WHERE id = v_order_id;
    INSERT INTO public.payments (order_id, amount, payment_method, status) VALUES (v_order_id, v_grand_total, p_payment_method, 'pending');
    DELETE FROM public.cart_items WHERE cart_id = v_cart_id;
    RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.process_checkout(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_checkout(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.bulk_import_products(p_products JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_item JSONB;
    v_variant JSONB;
    v_spec JSONB;
    v_category_id UUID;
    v_brand_id UUID;
    v_product_id UUID;
    v_product_count INTEGER := 0;
    v_variant_stock INTEGER;
    v_price NUMERIC(12, 2);
    v_discount_price NUMERIC(12, 2);
    v_variant_price NUMERIC(12, 2);
    v_variant_discount NUMERIC(12, 2);
    v_name TEXT;
    v_sku TEXT;
    v_status TEXT;
    v_slug TEXT;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
    IF jsonb_typeof(p_products) <> 'array' OR jsonb_array_length(p_products) < 1 OR jsonb_array_length(p_products) > 500 THEN
        RAISE EXCEPTION 'Import must contain between 1 and 500 products' USING ERRCODE = '22023';
    END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_products) LOOP
        v_name := NULLIF(BTRIM(v_item->>'name'), '');
        v_sku := NULLIF(BTRIM(v_item->>'sku'), '');
        v_status := COALESCE(NULLIF(v_item->>'status', ''), 'published');
        v_price := (v_item->>'price')::NUMERIC(12, 2);
        v_discount_price := NULLIF(v_item->>'discount_price', '')::NUMERIC(12, 2);
        IF v_name IS NULL OR NULLIF(BTRIM(v_item->>'description'), '') IS NULL OR v_price < 0 OR (v_discount_price IS NOT NULL AND (v_discount_price < 0 OR v_discount_price >= v_price)) OR v_status NOT IN ('draft', 'published', 'archived') THEN
            RAISE EXCEPTION 'Product data is invalid: %', COALESCE(v_name, 'unnamed product') USING ERRCODE = '22023';
        END IF;
        SELECT id INTO v_category_id FROM public.categories WHERE LOWER(BTRIM(name)) = LOWER(BTRIM(v_item->>'category')) LIMIT 1;
        IF NOT FOUND THEN RAISE EXCEPTION 'Category not found for product %: %', v_name, v_item->>'category' USING ERRCODE = '22023'; END IF;
        SELECT id INTO v_brand_id FROM public.brands WHERE LOWER(BTRIM(name)) = LOWER(BTRIM(v_item->>'brand')) LIMIT 1;
        IF NOT FOUND THEN RAISE EXCEPTION 'Brand not found for product %: %', v_name, v_item->>'brand' USING ERRCODE = '22023'; END IF;

        v_variant_stock := 0;
        IF jsonb_typeof(v_item->'variants') = 'array' AND jsonb_array_length(v_item->'variants') > 0 THEN
            SELECT COALESCE(SUM((value->>'stock')::INTEGER), 0) INTO v_variant_stock FROM jsonb_array_elements(v_item->'variants');
        ELSE
            IF NULLIF(v_item->>'stock', '') IS NULL OR (v_item->>'stock')::INTEGER < 0 THEN
                RAISE EXCEPTION 'Stock is invalid for product %', v_name USING ERRCODE = '22023';
            END IF;
            v_variant_stock := COALESCE((v_item->>'stock')::INTEGER, 0);
        END IF;
        v_slug := REGEXP_REPLACE(REGEXP_REPLACE(LOWER(v_name), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g') || '-' || SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8);
        INSERT INTO public.products (name, slug, description, sku, price, discount_price, stock, category_id, brand_id, status, is_best_seller, is_new_arrival)
        VALUES (v_name, v_slug, BTRIM(v_item->>'description'), v_sku, v_price, v_discount_price, v_variant_stock, v_category_id, v_brand_id, v_status, COALESCE((v_item->>'is_best_seller')::BOOLEAN, false), COALESCE((v_item->>'is_new_arrival')::BOOLEAN, false))
        RETURNING id INTO v_product_id;

        IF NULLIF(BTRIM(v_item->>'image_url'), '') IS NOT NULL THEN
            IF v_item->>'image_url' !~* '^https://' THEN RAISE EXCEPTION 'Image URL for % must use HTTPS', v_name USING ERRCODE = '22023'; END IF;
            INSERT INTO public.product_images (product_id, url, is_primary, display_order) VALUES (v_product_id, BTRIM(v_item->>'image_url'), true, 0);
        END IF;
        IF jsonb_typeof(v_item->'specifications') = 'array' THEN
            FOR v_spec IN SELECT value FROM jsonb_array_elements(v_item->'specifications') LOOP
                IF NULLIF(BTRIM(v_spec->>'key'), '') IS NOT NULL AND NULLIF(BTRIM(v_spec->>'value'), '') IS NOT NULL THEN
                    INSERT INTO public.product_specifications (product_id, key, value, display_order)
                    VALUES (v_product_id, BTRIM(v_spec->>'key'), BTRIM(v_spec->>'value'), COALESCE((v_spec->>'display_order')::INTEGER, 0));
                END IF;
            END LOOP;
        END IF;
        IF jsonb_typeof(v_item->'variants') = 'array' THEN
            FOR v_variant IN SELECT value FROM jsonb_array_elements(v_item->'variants') LOOP
                v_variant_price := NULLIF(v_variant->>'price', '')::NUMERIC(12, 2);
                v_variant_discount := NULLIF(v_variant->>'discount_price', '')::NUMERIC(12, 2);
                IF (NULLIF(BTRIM(v_variant->>'color'), '') IS NULL AND NULLIF(BTRIM(v_variant->>'ram'), '') IS NULL AND NULLIF(BTRIM(v_variant->>'storage'), '') IS NULL)
                   OR (v_variant_discount IS NOT NULL AND v_variant_discount >= COALESCE(v_variant_price, v_price))
                   OR (v_variant_price IS NOT NULL AND v_variant_price < 0) OR (v_variant_discount IS NOT NULL AND v_variant_discount < 0)
                   OR COALESCE((v_variant->>'stock')::INTEGER, -1) < 0 THEN
                    RAISE EXCEPTION 'Variant data is invalid for product %', v_name USING ERRCODE = '22023';
                END IF;
                INSERT INTO public.product_variants (product_id, sku, color, ram, storage, price, discount_price, stock)
                VALUES (v_product_id, NULLIF(BTRIM(v_variant->>'sku'), ''), COALESCE(BTRIM(v_variant->>'color'), ''), COALESCE(BTRIM(v_variant->>'ram'), ''), COALESCE(BTRIM(v_variant->>'storage'), ''), v_variant_price, v_variant_discount, (v_variant->>'stock')::INTEGER);
            END LOOP;
        END IF;
        v_product_count := v_product_count + 1;
    END LOOP;
    RETURN v_product_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_import_products(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_import_products(JSONB) TO authenticated;
