CREATE OR REPLACE FUNCTION public.snapshot_pickup_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_pickup_info JSONB;
    v_store_name TEXT;
    v_store_address TEXT;
    v_maps_url TEXT;
BEGIN
    IF NEW.courier IS DISTINCT FROM 'pickup' THEN
        RETURN NEW;
    END IF;

    SELECT settings -> 'pickup_info'
    INTO v_pickup_info
    FROM public.storefront_settings
    WHERE id = 'main';

    v_store_name := COALESCE(NULLIF(BTRIM(v_pickup_info ->> 'store_name'), ''), 'Toko Next Solution');
    v_store_address := NULLIF(BTRIM(v_pickup_info ->> 'store_address'), '');
    v_maps_url := NULLIF(BTRIM(v_pickup_info ->> 'maps_url'), '');

    IF v_store_address IS NULL THEN
        RAISE EXCEPTION 'Pickup location is not configured.' USING ERRCODE = '22023';
    END IF;

    NEW.shipping_address := COALESCE(NEW.shipping_address, '{}'::JSONB) || jsonb_build_object(
        'fulfillment_type', 'pickup',
        'pickup_location', v_store_name,
        'pickup_address', v_store_address,
        'pickup_maps_url', v_maps_url
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_pickup_location_before_order_insert ON public.orders;
CREATE TRIGGER snapshot_pickup_location_before_order_insert
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_pickup_location();
