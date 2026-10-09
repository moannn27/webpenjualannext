-- Preserve payment and fulfillment safeguards while supporting store pickup.
CREATE OR REPLACE FUNCTION public.handle_order_status_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_super_admin BOOLEAN;
    v_item RECORD;
    v_updated_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid() AND role = 'super_admin'
    ) INTO v_is_super_admin;

    IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' AND NOT v_is_super_admin THEN
        RAISE EXCEPTION 'Cancelled orders cannot be reopened; create a new order instead.'
            USING ERRCODE = '22023';
    END IF;

    IF OLD.status <> NEW.status AND NOT v_is_super_admin AND NOT (
        (OLD.status = 'pending' AND NEW.status IN ('processing', 'cancelled')) OR
        (OLD.status = 'processing' AND NEW.status IN ('shipped', 'ready_for_pickup', 'cancelled')) OR
        (OLD.status = 'shipped' AND NEW.status = 'delivered') OR
        (OLD.status = 'ready_for_pickup' AND NEW.status = 'delivered')
    ) THEN
        RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status
            USING ERRCODE = '22023';
    END IF;

    IF NEW.status = 'shipped' AND NEW.courier = 'pickup' THEN
        RAISE EXCEPTION 'Store pickup orders cannot be marked as shipped.'
            USING ERRCODE = '22023';
    END IF;

    IF NEW.status = 'ready_for_pickup' AND NEW.courier <> 'pickup' THEN
        RAISE EXCEPTION 'Only store pickup orders can be marked ready for pickup.'
            USING ERRCODE = '22023';
    END IF;

    IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' AND v_is_super_admin THEN
        IF EXISTS (
            SELECT 1
            FROM public.payments
            WHERE order_id = NEW.id AND status = 'refunded'
        ) THEN
            RAISE EXCEPTION 'A refunded order cannot be reopened.'
                USING ERRCODE = '22023';
        END IF;

        FOR v_item IN
            SELECT product_id, SUM(quantity)::INTEGER AS quantity
            FROM public.order_items
            WHERE order_id = NEW.id AND product_id IS NOT NULL
            GROUP BY product_id
            ORDER BY product_id
        LOOP
            UPDATE public.products
            SET stock = stock - v_item.quantity
            WHERE id = v_item.product_id AND stock >= v_item.quantity;

            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            IF v_updated_count = 0 THEN
                RAISE EXCEPTION 'Insufficient stock to reopen cancelled order for product %.', v_item.product_id
                    USING ERRCODE = '22023';
            END IF;
        END LOOP;
    END IF;

    IF NEW.status IN ('processing', 'shipped', 'ready_for_pickup', 'delivered') AND NOT EXISTS (
        SELECT 1
        FROM public.payments
        WHERE order_id = NEW.id AND status = 'success'
    ) THEN
        RAISE EXCEPTION 'Payment must be confirmed before an order can be processed.'
            USING ERRCODE = '22023';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_order_status_stock() FROM PUBLIC, anon, authenticated;
