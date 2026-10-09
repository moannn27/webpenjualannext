-- Update handle_order_status_stock trigger to support ready_for_pickup for pickup orders
CREATE OR REPLACE FUNCTION public.handle_order_status_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Cancelled orders cannot be reopened; create a new order instead.'
            USING ERRCODE = '22023';
    END IF;

    IF OLD.status <> NEW.status AND NOT (
        (OLD.status = 'pending'          AND NEW.status IN ('processing', 'cancelled')) OR
        (OLD.status = 'processing'       AND NEW.status IN ('shipped', 'ready_for_pickup', 'cancelled')) OR
        (OLD.status = 'shipped'          AND NEW.status = 'delivered') OR
        (OLD.status = 'ready_for_pickup' AND NEW.status = 'delivered')
    ) THEN
        RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status
            USING ERRCODE = '22023';
    END IF;

    RETURN NEW;
END;
$$;

