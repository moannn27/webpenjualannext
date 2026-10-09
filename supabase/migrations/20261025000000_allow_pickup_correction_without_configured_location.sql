CREATE OR REPLACE FUNCTION public.super_admin_correct_order_pickup(
    p_order_id UUID,
    p_status TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order RECORD;
    v_pickup_info JSONB;
    v_settings JSONB;
    v_store_name TEXT;
    v_store_address TEXT;
    v_maps_url TEXT;
    v_has_paid BOOLEAN;
    v_shipping_amount NUMERIC(12, 2);
    v_grand_total NUMERIC(12, 2);
    v_address JSONB;
    v_note TEXT;
    v_address_pending BOOLEAN;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Only a super admin can correct an order to store pickup.' USING ERRCODE = '42501';
    END IF;
    IF p_status NOT IN ('pending', 'processing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid order status.' USING ERRCODE = '22023';
    END IF;
    IF p_status = 'shipped' THEN
        RAISE EXCEPTION 'Store pickup orders cannot be marked as shipped.' USING ERRCODE = '22023';
    END IF;

    SELECT id, status, courier, total_amount, shipping_amount, grand_total, shipping_address
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.' USING ERRCODE = 'P0002'; END IF;
    IF v_order.courier = 'pickup' THEN RAISE EXCEPTION 'This order is already set for store pickup.' USING ERRCODE = '22023'; END IF;

    SELECT settings INTO v_settings
    FROM public.storefront_settings WHERE id = 'main';
    v_pickup_info := v_settings -> 'pickup_info';
    v_store_name := COALESCE(NULLIF(BTRIM(v_pickup_info ->> 'store_name'), ''), 'Toko Next Solution');
    v_store_address := COALESCE(
        NULLIF(BTRIM(v_pickup_info ->> 'store_address'), ''),
        NULLIF(BTRIM(v_settings -> 'store' ->> 'address'), '')
    );
    v_maps_url := NULLIF(BTRIM(v_pickup_info ->> 'maps_url'), '');
    v_address_pending := v_store_address IS NULL;
    IF v_address_pending THEN
        v_store_address := 'Alamat pengambilan akan dikonfirmasi admin melalui WhatsApp.';
        v_note := 'Alamat toko belum diatur. Admin harus menghubungi pelanggan melalui WhatsApp untuk mengonfirmasi lokasi pengambilan sebelum pesanan diambil.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.payments WHERE order_id = p_order_id AND status = 'success') INTO v_has_paid;
    v_shipping_amount := CASE WHEN v_has_paid THEN v_order.shipping_amount ELSE 0 END;
    v_grand_total := CASE WHEN v_has_paid THEN v_order.grand_total ELSE v_order.total_amount END;
    v_address := COALESCE(v_order.shipping_address, '{}'::JSONB) || jsonb_build_object(
        'fulfillment_type', 'pickup',
        'pickup_location', v_store_name,
        'pickup_address', v_store_address,
        'pickup_maps_url', v_maps_url,
        'pickup_address_pending', v_address_pending
    );
    IF v_has_paid AND v_order.shipping_amount > 0 THEN
        v_note := concat_ws(' ', v_note,
            'Metode penerimaan dikoreksi setelah pembayaran dikonfirmasi. Biaya pengiriman sebelumnya sebesar Rp ' || v_order.shipping_amount::TEXT || ' tetap tercatat; pengembalian biaya perlu diproses terpisah oleh admin.'
        );
    END IF;
    IF v_note IS NOT NULL THEN
        v_address := v_address || jsonb_build_object('fulfillment_change_note', v_note);
    END IF;

    IF NOT v_has_paid THEN
        UPDATE public.payments SET amount = v_grand_total
        WHERE order_id = p_order_id AND status IN ('pending', 'failed');
    END IF;
    UPDATE public.orders
    SET courier = 'pickup', status = p_status::public.order_status,
        shipping_amount = v_shipping_amount, grand_total = v_grand_total,
        shipping_address = v_address
    WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_correct_order_pickup(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.super_admin_correct_order_pickup(UUID, TEXT) TO authenticated;
