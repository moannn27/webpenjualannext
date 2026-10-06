CREATE TABLE public.shipping_methods (
    code TEXT PRIMARY KEY CHECK (code IN ('standard', 'express')),
    name TEXT NOT NULL,
    delivery_estimate TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_shipping_methods_updated_at
    BEFORE UPDATE ON public.shipping_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active shipping methods"
    ON public.shipping_methods FOR SELECT
    USING (is_active OR public.is_admin());
CREATE POLICY "Admins can insert shipping methods"
    ON public.shipping_methods FOR INSERT
    WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update shipping methods"
    ON public.shipping_methods FOR UPDATE
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete shipping methods"
    ON public.shipping_methods FOR DELETE
    USING (public.is_admin());

GRANT SELECT ON public.shipping_methods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shipping_methods TO authenticated;

INSERT INTO public.shipping_methods (code, name, delivery_estimate, price)
VALUES
    ('standard', 'Regular delivery', '3-5 business days', 25000),
    ('express', 'Express delivery', '1-2 business days', 50000)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    delivery_estimate = EXCLUDED.delivery_estimate,
    price = EXCLUDED.price;

DROP POLICY IF EXISTS "Users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "System/Admins can update payments" ON public.payments;

CREATE POLICY "Admins can insert payments"
    ON public.payments FOR INSERT
    WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update payments"
    ON public.payments FOR UPDATE
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP FUNCTION IF EXISTS public.process_checkout(UUID, UUID, TEXT, NUMERIC, NUMERIC, UUID);

CREATE FUNCTION public.process_checkout(
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
BEGIN
    IF auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Not authorized to checkout this cart'
            USING ERRCODE = '42501';
    END IF;

    IF NULLIF(BTRIM(p_recipient_name), '') IS NULL
        OR NULLIF(BTRIM(p_phone), '') IS NULL
        OR NULLIF(BTRIM(p_street_address), '') IS NULL
        OR NULLIF(BTRIM(p_city), '') IS NULL
        OR NULLIF(BTRIM(p_province), '') IS NULL
        OR NULLIF(BTRIM(p_postal_code), '') IS NULL THEN
        RAISE EXCEPTION 'Shipping address is incomplete'
            USING ERRCODE = '22023';
    END IF;

    IF p_payment_method IS DISTINCT FROM 'manual_transfer' THEN
        RAISE EXCEPTION 'Unsupported payment method'
            USING ERRCODE = '22023';
    END IF;

    SELECT id INTO v_cart_id
    FROM public.cart
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cart not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.cart_items WHERE cart_id = v_cart_id
    ) THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;

    SELECT price INTO v_shipping_amount
    FROM public.shipping_methods
    WHERE code = p_shipping_method AND is_active
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shipping method is unavailable'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.addresses (
        user_id, label, recipient_name, phone, street_address,
        city, province, postal_code, is_primary
    ) VALUES (
        p_user_id, 'Checkout', BTRIM(p_recipient_name), BTRIM(p_phone),
        BTRIM(p_street_address), BTRIM(p_city), BTRIM(p_province),
        BTRIM(p_postal_code), false
    ) RETURNING id INTO v_address_id;

    v_order_number := 'ORD-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 12));

    INSERT INTO public.orders (
        user_id, order_number, status, total_amount, shipping_amount,
        discount_amount, grand_total, shipping_address, courier
    ) VALUES (
        p_user_id, v_order_number, 'pending', 0, v_shipping_amount,
        0, 0,
        jsonb_build_object(
            'id', v_address_id,
            'recipient_name', BTRIM(p_recipient_name),
            'phone', BTRIM(p_phone),
            'street_address', BTRIM(p_street_address),
            'city', BTRIM(p_city),
            'province', BTRIM(p_province),
            'postal_code', BTRIM(p_postal_code)
        ),
        p_shipping_method
    ) RETURNING id INTO v_order_id;

    FOR v_item IN
        SELECT product_id, quantity
        FROM public.cart_items
        WHERE cart_id = v_cart_id
        ORDER BY product_id
        FOR UPDATE
    LOOP
        SELECT id, name, price, discount_price, stock, status
        INTO v_product
        FROM public.products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF NOT FOUND OR v_product.status <> 'published' THEN
            RAISE EXCEPTION 'A product in the cart is unavailable';
        END IF;

        IF v_product.stock < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_product.name;
        END IF;

        v_total_amount := v_total_amount
            + (COALESCE(v_product.discount_price, v_product.price) * v_item.quantity);
        v_item_count := v_item_count + 1;

        UPDATE public.products
        SET stock = stock - v_item.quantity
        WHERE id = v_product.id;

        INSERT INTO public.order_items (
            order_id, product_id, product_name, price, quantity
        ) VALUES (
            v_order_id, v_product.id, v_product.name,
            COALESCE(v_product.discount_price, v_product.price), v_item.quantity
        );
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;

    v_grand_total := v_total_amount + v_shipping_amount;

    UPDATE public.orders
    SET total_amount = v_total_amount,
        grand_total = v_grand_total
    WHERE id = v_order_id;

    INSERT INTO public.payments (order_id, amount, payment_method, status)
    VALUES (v_order_id, v_grand_total, p_payment_method, 'pending');

    DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

    RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.process_checkout(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_checkout(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
    TO authenticated;