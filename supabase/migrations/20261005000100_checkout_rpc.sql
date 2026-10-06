-- Atomic Checkout RPC
-- This ensures stock validation, deduction, order creation, and cart clearance occur in a single ACID transaction.

CREATE OR REPLACE FUNCTION public.process_checkout(
    p_user_id UUID,
    p_address_id UUID,
    p_courier TEXT,
    p_shipping_amount NUMERIC,
    p_discount_amount NUMERIC,
    p_voucher_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cart_id UUID;
    v_order_id UUID;
    v_order_number TEXT;
    v_total_amount NUMERIC := 0;
    v_grand_total NUMERIC := 0;
    v_item RECORD;
    v_product RECORD;
BEGIN
    -- 1. Get user cart
    SELECT id INTO v_cart_id FROM public.cart WHERE user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cart not found for user';
    END IF;

    -- 2. Generate order number
    v_order_number := 'ORD-' || extract(epoch from now())::bigint || '-' || floor(random() * 1000)::text;

    -- 3. Create initial order (total_amount and grand_total will be updated)
    INSERT INTO public.orders (
        user_id, order_number, status, total_amount, shipping_amount, discount_amount, grand_total, shipping_address, courier
    ) VALUES (
        p_user_id, v_order_number, 'pending', 0, p_shipping_amount, p_discount_amount, 0, jsonb_build_object('id', p_address_id, 'snapshot', 'address snapshot'), p_courier
    ) RETURNING id INTO v_order_id;

    -- 4. Process cart items
    FOR v_item IN (SELECT * FROM public.cart_items WHERE cart_id = v_cart_id) LOOP
        
        -- Lock product row for update to prevent race conditions
        SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id FOR UPDATE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found', v_item.product_id;
        END IF;

        IF v_product.stock < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_product.name;
        END IF;

        -- Deduct stock
        UPDATE public.products SET stock = stock - v_item.quantity WHERE id = v_item.product_id;

        -- Calculate price
        DECLARE
            v_price NUMERIC;
        BEGIN
            v_price := COALESCE(v_product.discount_price, v_product.price);
            v_total_amount := v_total_amount + (v_price * v_item.quantity);

            -- Insert order item
            INSERT INTO public.order_items (
                order_id, product_id, product_name, price, quantity
            ) VALUES (
                v_order_id, v_product.id, v_product.name, v_price, v_item.quantity
            );
        END;
    END LOOP;

    -- Check if cart was empty
    IF v_total_amount = 0 THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;

    -- 5. Finalize totals
    v_grand_total := v_total_amount + p_shipping_amount - p_discount_amount;
    IF v_grand_total < 0 THEN
        v_grand_total := 0;
    END IF;

    UPDATE public.orders 
    SET total_amount = v_total_amount, grand_total = v_grand_total 
    WHERE id = v_order_id;

    -- 6. Clear cart
    DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

    -- 7. Update voucher usage if applicable
    IF p_voucher_id IS NOT NULL THEN
        -- Assuming a table vouchers exists with usage_count
        UPDATE public.vouchers SET usage_count = usage_count + 1 WHERE id = p_voucher_id;
    END IF;

    RETURN v_order_id;
END;
$$;
