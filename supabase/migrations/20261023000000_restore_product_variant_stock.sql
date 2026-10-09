-- Keep the exact variant on each order item so cancellation/reopening can
-- release or reserve the same inventory that checkout changed.
ALTER TABLE public.order_items ADD COLUMN variant_id UUID;

UPDATE public.order_items AS oi
SET variant_id = pv.id
FROM public.product_variants AS pv
WHERE oi.product_id = pv.product_id
  AND oi.variant_details IS NOT NULL
  AND LOWER(pv.color) = LOWER(COALESCE(oi.variant_details ->> 'color', ''))
  AND LOWER(pv.ram) = LOWER(COALESCE(oi.variant_details ->> 'ram', ''))
  AND LOWER(pv.storage) = LOWER(COALESCE(oi.variant_details ->> 'storage', ''));

ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey
    FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;
CREATE INDEX order_items_variant_id_idx ON public.order_items(variant_id) WHERE variant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.attach_order_item_variant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_variant_id UUID;
BEGIN
    IF NEW.variant_details IS NULL THEN
        NEW.variant_id := NULL;
        RETURN NEW;
    END IF;

    SELECT pv.id INTO v_variant_id
    FROM public.product_variants AS pv
    WHERE pv.product_id = NEW.product_id
      AND LOWER(pv.color) = LOWER(COALESCE(NEW.variant_details ->> 'color', ''))
      AND LOWER(pv.ram) = LOWER(COALESCE(NEW.variant_details ->> 'ram', ''))
      AND LOWER(pv.storage) = LOWER(COALESCE(NEW.variant_details ->> 'storage', ''))
    LIMIT 1;

    IF v_variant_id IS NULL THEN
        RAISE EXCEPTION 'The selected product variant no longer exists.' USING ERRCODE = '22023';
    END IF;
    NEW.variant_id := v_variant_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attach_order_item_variant_before_insert ON public.order_items;
CREATE TRIGGER attach_order_item_variant_before_insert
    BEFORE INSERT ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.attach_order_item_variant();
DROP TRIGGER IF EXISTS attach_order_item_variant_before_update ON public.order_items;
CREATE TRIGGER attach_order_item_variant_before_update
    BEFORE UPDATE OF product_id, variant_details ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.attach_order_item_variant();
REVOKE ALL ON FUNCTION public.attach_order_item_variant() FROM PUBLIC, anon, authenticated;

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
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
    ) INTO v_is_super_admin;

    IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' AND NOT v_is_super_admin THEN
        RAISE EXCEPTION 'Cancelled orders cannot be reopened; create a new order instead.' USING ERRCODE = '22023';
    END IF;
    IF OLD.status <> NEW.status AND NOT v_is_super_admin AND NOT (
        (OLD.status = 'pending' AND NEW.status IN ('processing', 'cancelled')) OR
        (OLD.status = 'processing' AND NEW.status IN ('shipped', 'ready_for_pickup', 'cancelled')) OR
        (OLD.status = 'shipped' AND NEW.status = 'delivered') OR
        (OLD.status = 'ready_for_pickup' AND NEW.status = 'delivered')
    ) THEN
        RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status USING ERRCODE = '22023';
    END IF;
    IF NEW.status = 'shipped' AND NEW.courier = 'pickup' THEN
        RAISE EXCEPTION 'Store pickup orders cannot be marked as shipped.' USING ERRCODE = '22023';
    END IF;
    IF NEW.status = 'ready_for_pickup' AND NEW.courier <> 'pickup' THEN
        RAISE EXCEPTION 'Only store pickup orders can be marked ready for pickup.' USING ERRCODE = '22023';
    END IF;

    IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' AND v_is_super_admin THEN
        IF EXISTS (SELECT 1 FROM public.payments WHERE order_id = NEW.id AND status = 'refunded') THEN
            RAISE EXCEPTION 'A refunded order cannot be reopened.' USING ERRCODE = '22023';
        END IF;
        FOR v_item IN
            SELECT product_id, variant_id, SUM(quantity)::INTEGER AS quantity
            FROM public.order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
            GROUP BY product_id, variant_id ORDER BY product_id, variant_id
        LOOP
            UPDATE public.products SET stock = stock - v_item.quantity
            WHERE id = v_item.product_id AND stock >= v_item.quantity;
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            IF v_updated_count = 0 THEN
                RAISE EXCEPTION 'Insufficient stock to reopen cancelled order for product %.', v_item.product_id USING ERRCODE = '22023';
            END IF;
            IF v_item.variant_id IS NOT NULL THEN
                UPDATE public.product_variants SET stock = stock - v_item.quantity
                WHERE id = v_item.variant_id AND product_id = v_item.product_id AND stock >= v_item.quantity;
                GET DIAGNOSTICS v_updated_count = ROW_COUNT;
                IF v_updated_count = 0 THEN
                    RAISE EXCEPTION 'Insufficient variant stock to reopen cancelled order for product %.', v_item.product_id USING ERRCODE = '22023';
                END IF;
            END IF;
        END LOOP;
    END IF;

    IF NEW.status IN ('processing', 'shipped', 'ready_for_pickup', 'delivered') AND NOT EXISTS (
        SELECT 1 FROM public.payments WHERE order_id = NEW.id AND status = 'success'
    ) THEN
        RAISE EXCEPTION 'Payment must be confirmed before an order can be processed.' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_cancelled_order_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_item RECORD;
    v_updated_count INTEGER;
BEGIN
    IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
        FOR v_item IN
            SELECT product_id, variant_id, SUM(quantity)::INTEGER AS quantity
            FROM public.order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
            GROUP BY product_id, variant_id ORDER BY product_id, variant_id
        LOOP
            UPDATE public.products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
            IF v_item.variant_id IS NOT NULL THEN
                UPDATE public.product_variants SET stock = stock + v_item.quantity
                WHERE id = v_item.variant_id AND product_id = v_item.product_id;
                GET DIAGNOSTICS v_updated_count = ROW_COUNT;
                IF v_updated_count = 0 THEN
                    RAISE EXCEPTION 'Product variant is missing while restoring cancelled order stock.' USING ERRCODE = '22023';
                END IF;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_order_status_stock() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_cancelled_order_stock() FROM PUBLIC, anon, authenticated;
