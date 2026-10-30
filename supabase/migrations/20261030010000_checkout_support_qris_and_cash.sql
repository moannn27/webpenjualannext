-- Migration: Support QRIS and Cash on Pickup payment methods & Auto-resolve product variants in process_checkout RPC

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
    v_resolved_variant_id UUID;
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
    IF p_payment_method NOT IN ('manual_transfer', 'qris', 'cash_on_pickup') THEN
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

        v_resolved_variant_id := v_item.variant_id;
        IF v_resolved_variant_id IS NULL THEN
            -- Auto-resolve to first in-stock variant if variants exist for this product
            SELECT id INTO v_resolved_variant_id
            FROM public.product_variants
            WHERE product_id = v_product.id
            ORDER BY (stock >= v_item.quantity) DESC, id ASC
            LIMIT 1;
        END IF;

        IF v_resolved_variant_id IS NULL THEN
            IF v_product.stock < v_item.quantity THEN RAISE EXCEPTION 'Insufficient stock for product %', v_product.name; END IF;
            v_price := COALESCE(v_product.discount_price, v_product.price);
            v_variant_details := NULL;
            v_product_name := v_product.name;
            UPDATE public.products SET stock = stock - v_item.quantity WHERE id = v_product.id;
        ELSE
            SELECT id, sku, color, ram, storage, price, discount_price, stock INTO v_variant
            FROM public.product_variants WHERE id = v_resolved_variant_id AND product_id = v_product.id FOR UPDATE;
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
