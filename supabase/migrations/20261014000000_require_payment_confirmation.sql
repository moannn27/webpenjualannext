CREATE OR REPLACE FUNCTION public.handle_order_status_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Cancelled orders cannot be reopened; create a new order instead.'
            USING ERRCODE = '22023';
    END IF;

    IF OLD.status <> NEW.status AND NOT (
        (OLD.status = 'pending' AND NEW.status IN ('processing', 'cancelled')) OR
        (OLD.status = 'processing' AND NEW.status IN ('shipped', 'cancelled')) OR
        (OLD.status = 'shipped' AND NEW.status = 'delivered')
    ) THEN
        RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status
            USING ERRCODE = '22023';
    END IF;

    IF NEW.status IN ('processing', 'shipped', 'delivered') AND NOT EXISTS (
        SELECT 1 FROM public.payments
        WHERE order_id = NEW.id AND status = 'success'
    ) THEN
        RAISE EXCEPTION 'Payment must be confirmed before an order can be processed.'
            USING ERRCODE = '22023';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_order_status_stock() FROM PUBLIC, anon, authenticated;
