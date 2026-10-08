-- Checkout reserves stock immediately. Release it exactly once when an order is cancelled.
-- Cancelled orders are terminal; creating a replacement order re-runs stock validation.
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
        (OLD.status = 'pending' AND NEW.status IN ('processing', 'cancelled')) OR
        (OLD.status = 'processing' AND NEW.status IN ('shipped', 'cancelled')) OR
        (OLD.status = 'shipped' AND NEW.status = 'delivered')
    ) THEN
        RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status
            USING ERRCODE = '22023';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_cancelled_order_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
        UPDATE public.products AS product
        SET stock = product.stock + cancelled_items.quantity
        FROM (
            SELECT product_id, SUM(quantity)::INTEGER AS quantity
            FROM public.order_items
            WHERE order_id = NEW.id
            GROUP BY product_id
        ) AS cancelled_items
        WHERE product.id = cancelled_items.product_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_status_transition_guard ON public.orders;
CREATE TRIGGER orders_status_transition_guard
    BEFORE UPDATE OF status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_stock();

DROP TRIGGER IF EXISTS orders_restore_stock_on_cancel ON public.orders;
CREATE TRIGGER orders_restore_stock_on_cancel
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.restore_cancelled_order_stock();

REVOKE ALL ON FUNCTION public.handle_order_status_stock() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_cancelled_order_stock() FROM PUBLIC, anon, authenticated;
