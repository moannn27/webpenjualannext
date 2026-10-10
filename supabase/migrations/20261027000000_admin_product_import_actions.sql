CREATE OR REPLACE FUNCTION public.bulk_import_products_v2(p_products JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_item JSONB;
    v_action TEXT;
    v_target UUID;
    v_count INTEGER := 0;
    v_category UUID;
    v_brand UUID;
    v_sku TEXT;
    v_target_sku TEXT;
    v_variants JSONB;
    v_specs JSONB;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
    IF jsonb_typeof(p_products) <> 'array' OR jsonb_array_length(p_products) < 1 OR jsonb_array_length(p_products) > 500 THEN
        RAISE EXCEPTION 'Import must contain between 1 and 500 products' USING ERRCODE = '22023';
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_products) LOOP
        v_action := v_item->>'importAction';
        IF v_action NOT IN ('create', 'update') THEN RAISE EXCEPTION 'Each submitted product must explicitly choose create or update' USING ERRCODE = '22023'; END IF;
        IF jsonb_typeof(v_item->'variants') IS DISTINCT FROM 'array' OR jsonb_array_length(v_item->'variants') > 50
           OR jsonb_typeof(v_item->'specifications') IS DISTINCT FROM 'array' OR jsonb_array_length(v_item->'specifications') > 50 THEN
            RAISE EXCEPTION 'Product has more than 50 variants or specifications' USING ERRCODE = '22023';
        END IF;
        IF COALESCE((v_item->>'price')::NUMERIC, 0) <= 0
           OR (NULLIF(v_item->>'discount_price', '') IS NOT NULL AND
               ((v_item->>'discount_price')::NUMERIC <= 0 OR (v_item->>'discount_price')::NUMERIC >= (v_item->>'price')::NUMERIC)) THEN
            RAISE EXCEPTION 'Main price must be positive and promo price must be positive and lower than main price' USING ERRCODE = '22023';
        END IF;
        v_sku := NULLIF(BTRIM(v_item->>'sku'), '');
        IF v_action = 'create' THEN
            IF v_sku IS NOT NULL AND EXISTS (SELECT 1 FROM public.products WHERE LOWER(sku) = LOWER(v_sku)) THEN
                RAISE EXCEPTION 'SKU already exists: %', v_sku USING ERRCODE = '23505';
            END IF;
            PERFORM public.bulk_import_products(jsonb_build_array(v_item - 'importAction' - 'targetProductId' - 'warnings' - 'errors' - 'priceCandidates' - 'discountCandidates' - 'priceConfirmed' - 'discountPriceConfirmed' - 'selectedPriceColumn' - 'selectedDiscountColumn' - 'duplicateInFile' - 'duplicateInDatabase' - 'sourceRow'));
            IF NULLIF(BTRIM(v_item->>'image_url'), '') IS NOT NULL AND v_item->>'image_url' !~* '^https://' THEN RAISE EXCEPTION 'Image URL must use HTTPS' USING ERRCODE = '22023'; END IF;
        ELSE
            BEGIN v_target := (v_item->>'targetProductId')::UUID;
            EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Update requires a valid target product' USING ERRCODE = '22023'; END;
            SELECT sku INTO v_target_sku FROM public.products WHERE id = v_target FOR UPDATE;
            IF NOT FOUND OR (v_target_sku IS NOT NULL AND LOWER(v_target_sku) <> LOWER(COALESCE(v_sku, ''))) OR (v_target_sku IS NULL AND v_sku IS NOT NULL) THEN
                RAISE EXCEPTION 'Target product does not match the selected SKU' USING ERRCODE = '22023';
            END IF;
            SELECT id INTO v_category FROM public.categories WHERE LOWER(BTRIM(name)) = LOWER(BTRIM(v_item->>'category')) LIMIT 1;
            IF NOT FOUND THEN RAISE EXCEPTION 'Category not found: %', v_item->>'category' USING ERRCODE = '22023'; END IF;
            SELECT id INTO v_brand FROM public.brands WHERE LOWER(BTRIM(name)) = LOWER(BTRIM(v_item->>'brand')) LIMIT 1;
            IF NOT FOUND THEN RAISE EXCEPTION 'Brand not found: %', v_item->>'brand' USING ERRCODE = '22023'; END IF;
            IF NULLIF(BTRIM(v_item->>'name'), '') IS NULL OR NULLIF(BTRIM(v_item->>'description'), '') IS NULL
               OR (v_item->>'price')::NUMERIC <= 0 OR COALESCE((v_item->>'stock')::INTEGER, -1) < 0
               OR (NULLIF(v_item->>'discount_price', '') IS NOT NULL AND ((v_item->>'discount_price')::NUMERIC <= 0 OR (v_item->>'discount_price')::NUMERIC >= (v_item->>'price')::NUMERIC))
               OR v_item->>'status' NOT IN ('draft', 'published', 'archived') THEN
                RAISE EXCEPTION 'Product data is invalid' USING ERRCODE = '22023';
            END IF;
            UPDATE public.products SET name = BTRIM(v_item->>'name'), description = BTRIM(v_item->>'description'), price = (v_item->>'price')::NUMERIC,
                discount_price = NULLIF(v_item->>'discount_price', '')::NUMERIC,
                stock = CASE WHEN EXISTS (SELECT 1 FROM public.product_variants WHERE product_id = v_target)
                    THEN (SELECT COALESCE(SUM(stock), 0)::INTEGER FROM public.product_variants WHERE product_id = v_target)
                    ELSE (v_item->>'stock')::INTEGER END,
                category_id = v_category, brand_id = v_brand,
                is_best_seller = COALESCE((v_item->>'is_best_seller')::BOOLEAN, false), is_new_arrival = COALESCE((v_item->>'is_new_arrival')::BOOLEAN, false)
            WHERE id = v_target;
            v_specs := v_item->'specifications';
            IF jsonb_typeof(v_specs) = 'array' AND jsonb_array_length(v_specs) > 0 THEN
                DELETE FROM public.product_specifications WHERE product_id = v_target;
                INSERT INTO public.product_specifications(product_id, key, value, display_order)
                SELECT v_target, BTRIM(value->>'key'), BTRIM(value->>'value'), COALESCE((value->>'display_order')::INTEGER, 0)
                FROM jsonb_array_elements(v_specs) WHERE NULLIF(BTRIM(value->>'key'), '') IS NOT NULL AND NULLIF(BTRIM(value->>'value'), '') IS NOT NULL;
            END IF;
            IF NULLIF(BTRIM(v_item->>'image_url'), '') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.product_images WHERE product_id = v_target AND is_primary) THEN
                IF v_item->>'image_url' !~* '^https://' THEN RAISE EXCEPTION 'Image URL must use HTTPS' USING ERRCODE = '22023'; END IF;
                INSERT INTO public.product_images(product_id, url, is_primary, display_order) VALUES (v_target, BTRIM(v_item->>'image_url'), true, 0);
            END IF;
        END IF;
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_import_products_v2(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_import_products_v2(JSONB) TO authenticated;
