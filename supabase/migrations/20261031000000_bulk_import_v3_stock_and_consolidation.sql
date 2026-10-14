-- Migration: 20261031000000_bulk_import_v3_stock_and_consolidation.sql
-- Description: Update bulk_import_products_v3 to support atomic product consolidation, safe stock policies, and row-level locking

CREATE OR REPLACE FUNCTION public.bulk_import_products_v3(p_products JSONB)
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
    v_variant JSONB;
    v_specs JSONB;
    v_variant_price NUMERIC(12, 2);
    v_variant_discount NUMERIC(12, 2);
    v_matched_variant_id UUID;
    v_var_sku TEXT;
    v_var_color TEXT;
    v_var_ram TEXT;
    v_var_storage TEXT;
    v_var_stock INTEGER;
    v_consolidation_targets JSONB;
    v_c_target JSONB;
    v_c_uuid UUID;
    v_primary_id UUID;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
    IF jsonb_typeof(p_products) <> 'array' OR jsonb_array_length(p_products) < 1 OR jsonb_array_length(p_products) > 500 THEN
        RAISE EXCEPTION 'Import must contain between 1 and 500 products' USING ERRCODE = '22023';
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_products) LOOP
        v_action := v_item->>'importAction';
        IF v_action NOT IN ('create', 'update', 'consolidate') THEN
            RAISE EXCEPTION 'Each submitted product must explicitly choose create, update, or consolidate' USING ERRCODE = '22023';
        END IF;
        IF jsonb_typeof(v_item->'variants') IS DISTINCT FROM 'array' OR jsonb_array_length(v_item->'variants') > 50
           OR jsonb_typeof(v_item->'specifications') IS DISTINCT FROM 'array' OR jsonb_array_length(v_item->'specifications') > 50 THEN
            RAISE EXCEPTION 'Product has more than 50 variants or specifications' USING ERRCODE = '22023';
        END IF;
        IF COALESCE((v_item->>'price')::NUMERIC, 0) <= 0
           OR (NULLIF(v_item->>'discount_price', '') IS NOT NULL AND
               ((v_item->>'discount_price')::NUMERIC <= 0 OR (v_item->>'discount_price')::NUMERIC >= (v_item->>'price')::NUMERIC)) THEN
            RAISE EXCEPTION 'Main price must be positive and promo price must be positive and lower than main price' USING ERRCODE = '22023';
        END IF;
        IF COALESCE((v_item->>'stock')::INTEGER, -1) < 0 THEN
            RAISE EXCEPTION 'Stock must be non-negative' USING ERRCODE = '22023';
        END IF;
        v_sku := NULLIF(BTRIM(v_item->>'sku'), '');

        IF v_action = 'create' THEN
            IF v_sku IS NOT NULL AND EXISTS (SELECT 1 FROM public.products WHERE LOWER(sku) = LOWER(v_sku)) THEN
                RAISE EXCEPTION 'SKU already exists: %', v_sku USING ERRCODE = '23505';
            END IF;
            PERFORM public.bulk_import_products(jsonb_build_array(v_item - 'importAction' - 'targetProductId' - 'consolidationTargetIds' - 'consolidationInfo' - 'warnings' - 'errors' - 'priceCandidates' - 'discountCandidates' - 'priceConfirmed' - 'discountPriceConfirmed' - 'selectedPriceColumn' - 'selectedDiscountColumn' - 'duplicateInFile' - 'duplicateInDatabase' - 'sourceRow' - 'currentStock' - 'fileStock' - 'stockDelta' - 'stockPolicy' - 'stockChangeReason'));
            IF NULLIF(BTRIM(v_item->>'image_url'), '') IS NOT NULL AND v_item->>'image_url' !~* '^https://' THEN RAISE EXCEPTION 'Image URL must use HTTPS' USING ERRCODE = '22023'; END IF;

        ELSIF v_action = 'update' THEN
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

            UPDATE public.products SET name = BTRIM(v_item->>'name'), description = BTRIM(v_item->>'description'), price = (v_item->>'price')::NUMERIC,
                discount_price = NULLIF(v_item->>'discount_price', '')::NUMERIC,
                category_id = v_category, brand_id = v_brand,
                status = COALESCE(NULLIF(v_item->>'status', ''), status),
                is_best_seller = COALESCE((v_item->>'is_best_seller')::BOOLEAN, false), is_new_arrival = COALESCE((v_item->>'is_new_arrival')::BOOLEAN, false)
            WHERE id = v_target;

            -- Upsert variants on product update
            v_variants := v_item->'variants';
            IF jsonb_typeof(v_variants) = 'array' AND jsonb_array_length(v_variants) > 0 THEN
                FOR v_variant IN SELECT value FROM jsonb_array_elements(v_variants) LOOP
                    v_variant_price := NULLIF(v_variant->>'price', '')::NUMERIC(12, 2);
                    v_variant_discount := NULLIF(v_variant->>'discount_price', '')::NUMERIC(12, 2);
                    v_var_sku := NULLIF(BTRIM(v_variant->>'sku'), '');
                    v_var_color := COALESCE(BTRIM(v_variant->>'color'), '');
                    v_var_ram := COALESCE(BTRIM(v_variant->>'ram'), '');
                    v_var_storage := COALESCE(BTRIM(v_variant->>'storage'), '');
                    v_var_stock := COALESCE((v_variant->>'stock')::INTEGER, 0);

                    IF (NULLIF(v_var_color, '') IS NULL AND NULLIF(v_var_ram, '') IS NULL AND NULLIF(v_var_storage, '') IS NULL)
                       OR (v_variant_discount IS NOT NULL AND v_variant_discount >= COALESCE(v_variant_price, (v_item->>'price')::NUMERIC))
                       OR (v_variant_price IS NOT NULL AND v_variant_price < 0) OR (v_variant_discount IS NOT NULL AND v_variant_discount < 0)
                       OR v_var_stock < 0 THEN
                        RAISE EXCEPTION 'Variant data is invalid for product %', v_item->>'name' USING ERRCODE = '22023';
                    END IF;

                    SELECT id INTO v_matched_variant_id FROM public.product_variants
                    WHERE product_id = v_target AND (
                        (v_var_sku IS NOT NULL AND LOWER(sku) = LOWER(v_var_sku))
                        OR (LOWER(color) = LOWER(v_var_color) AND LOWER(ram) = LOWER(v_var_ram) AND LOWER(storage) = LOWER(v_var_storage))
                    ) FOR UPDATE LIMIT 1;

                    IF v_matched_variant_id IS NOT NULL THEN
                        UPDATE public.product_variants
                        SET sku = v_var_sku, color = v_var_color, ram = v_var_ram, storage = v_var_storage,
                            price = v_variant_price, discount_price = v_variant_discount, stock = v_var_stock,
                            updated_at = NOW()
                        WHERE id = v_matched_variant_id;
                    ELSE
                        INSERT INTO public.product_variants (product_id, sku, color, ram, storage, price, discount_price, stock)
                        VALUES (v_target, v_var_sku, v_var_color, v_var_ram, v_var_storage, v_variant_price, v_variant_discount, v_var_stock);
                    END IF;
                END LOOP;

                -- Parent stock = SUM of variant stock (no double counting)
                UPDATE public.products SET stock = (
                    SELECT COALESCE(SUM(stock), 0)::INTEGER FROM public.product_variants WHERE product_id = v_target
                ) WHERE id = v_target;
            ELSE
                UPDATE public.products SET stock = CASE
                    WHEN EXISTS (SELECT 1 FROM public.product_variants WHERE product_id = v_target)
                        THEN (SELECT COALESCE(SUM(stock), 0)::INTEGER FROM public.product_variants WHERE product_id = v_target)
                    ELSE (v_item->>'stock')::INTEGER
                END WHERE id = v_target;
            END IF;

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

        ELSIF v_action = 'consolidate' THEN
            v_consolidation_targets := v_item->'consolidationTargetIds';
            IF jsonb_typeof(v_consolidation_targets) IS DISTINCT FROM 'array' OR jsonb_array_length(v_consolidation_targets) < 1 THEN
                RAISE EXCEPTION 'Consolidation requires at least one target product ID' USING ERRCODE = '22023';
            END IF;

            -- Pick the primary target product to upgrade as parent
            v_primary_id := (v_consolidation_targets->>0)::UUID;
            PERFORM 1 FROM public.products WHERE id = v_primary_id FOR UPDATE;

            SELECT id INTO v_category FROM public.categories WHERE LOWER(BTRIM(name)) = LOWER(BTRIM(v_item->>'category')) LIMIT 1;
            IF NOT FOUND THEN RAISE EXCEPTION 'Category not found: %', v_item->>'category' USING ERRCODE = '22023'; END IF;
            SELECT id INTO v_brand FROM public.brands WHERE LOWER(BTRIM(name)) = LOWER(BTRIM(v_item->>'brand')) LIMIT 1;
            IF NOT FOUND THEN RAISE EXCEPTION 'Brand not found: %', v_item->>'brand' USING ERRCODE = '22023'; END IF;

            -- 1. Archive secondary products and rename their SKU so original SKU is free
            FOR v_c_target IN SELECT value FROM jsonb_array_elements(v_consolidation_targets) OFFSET 1 LOOP
                IF v_c_target IS NOT NULL THEN
                    v_c_uuid := (v_c_target #>> '{}')::UUID;
                    UPDATE public.products
                    SET status = 'archived',
                        sku = COALESCE(sku, 'CONSOLIDATED') || '-CONSOLIDATED-' || SUBSTRING(id::TEXT, 1, 6)
                    WHERE id = v_c_uuid;
                END IF;
            END LOOP;

            -- 2. Upgrade primary product to be the parent product
            UPDATE public.products SET
                name = BTRIM(v_item->>'name'),
                sku = v_sku,
                description = BTRIM(v_item->>'description'),
                price = (v_item->>'price')::NUMERIC,
                discount_price = NULLIF(v_item->>'discount_price', '')::NUMERIC,
                category_id = v_category,
                brand_id = v_brand,
                status = COALESCE(NULLIF(v_item->>'status', ''), 'published'),
                is_best_seller = COALESCE((v_item->>'is_best_seller')::BOOLEAN, false),
                is_new_arrival = COALESCE((v_item->>'is_new_arrival')::BOOLEAN, false)
            WHERE id = v_primary_id;

            -- 3. Upsert all variants under the primary parent product
            v_variants := v_item->'variants';
            IF jsonb_typeof(v_variants) = 'array' AND jsonb_array_length(v_variants) > 0 THEN
                FOR v_variant IN SELECT value FROM jsonb_array_elements(v_variants) LOOP
                    v_variant_price := NULLIF(v_variant->>'price', '')::NUMERIC(12, 2);
                    v_variant_discount := NULLIF(v_variant->>'discount_price', '')::NUMERIC(12, 2);
                    v_var_sku := NULLIF(BTRIM(v_variant->>'sku'), '');
                    v_var_color := COALESCE(BTRIM(v_variant->>'color'), '');
                    v_var_ram := COALESCE(BTRIM(v_variant->>'ram'), '');
                    v_var_storage := COALESCE(BTRIM(v_variant->>'storage'), '');
                    v_var_stock := COALESCE((v_variant->>'stock')::INTEGER, 0);

                    IF (NULLIF(v_var_color, '') IS NULL AND NULLIF(v_var_ram, '') IS NULL AND NULLIF(v_var_storage, '') IS NULL)
                       OR (v_variant_discount IS NOT NULL AND v_variant_discount >= COALESCE(v_variant_price, (v_item->>'price')::NUMERIC))
                       OR (v_variant_price IS NOT NULL AND v_variant_price < 0) OR (v_variant_discount IS NOT NULL AND v_variant_discount < 0)
                       OR v_var_stock < 0 THEN
                        RAISE EXCEPTION 'Variant data is invalid for product %', v_item->>'name' USING ERRCODE = '22023';
                    END IF;

                    SELECT id INTO v_matched_variant_id FROM public.product_variants
                    WHERE product_id = v_primary_id AND (
                        (v_var_sku IS NOT NULL AND LOWER(sku) = LOWER(v_var_sku))
                        OR (LOWER(color) = LOWER(v_var_color) AND LOWER(ram) = LOWER(v_var_ram) AND LOWER(storage) = LOWER(v_var_storage))
                    ) FOR UPDATE LIMIT 1;

                    IF v_matched_variant_id IS NOT NULL THEN
                        UPDATE public.product_variants
                        SET sku = v_var_sku, color = v_var_color, ram = v_var_ram, storage = v_var_storage,
                            price = v_variant_price, discount_price = v_variant_discount, stock = v_var_stock,
                            updated_at = NOW()
                        WHERE id = v_matched_variant_id;
                    ELSE
                        INSERT INTO public.product_variants (product_id, sku, color, ram, storage, price, discount_price, stock)
                        VALUES (v_primary_id, v_var_sku, v_var_color, v_var_ram, v_var_storage, v_variant_price, v_variant_discount, v_var_stock);
                    END IF;
                END LOOP;

                -- Parent stock = sum of variant stock
                UPDATE public.products SET stock = (
                    SELECT COALESCE(SUM(stock), 0)::INTEGER FROM public.product_variants WHERE product_id = v_primary_id
                ) WHERE id = v_primary_id;
            ELSE
                UPDATE public.products SET stock = CASE
                    WHEN EXISTS (SELECT 1 FROM public.product_variants WHERE product_id = v_primary_id)
                        THEN (SELECT COALESCE(SUM(stock), 0)::INTEGER FROM public.product_variants WHERE product_id = v_primary_id)
                    ELSE (v_item->>'stock')::INTEGER
                END WHERE id = v_primary_id;
            END IF;

            -- 4. Move cart items, wishlist, and gallery images from secondary products
            FOR v_c_target IN SELECT value FROM jsonb_array_elements(v_consolidation_targets) OFFSET 1 LOOP
                IF v_c_target IS NOT NULL THEN
                    v_c_uuid := (v_c_target #>> '{}')::UUID;

                    -- Merge duplicate cart items without variant
                    UPDATE public.cart_items ci
                    SET quantity = ci.quantity + old_ci.quantity,
                        updated_at = NOW()
                    FROM public.cart_items old_ci
                    WHERE old_ci.product_id = v_c_uuid
                      AND old_ci.variant_id IS NULL
                      AND ci.product_id = v_primary_id
                      AND ci.variant_id IS NULL
                      AND ci.cart_id = old_ci.cart_id;

                    -- Delete duplicate cart items without variant that were merged
                    DELETE FROM public.cart_items
                    WHERE product_id = v_c_uuid
                      AND variant_id IS NULL
                      AND cart_id IN (
                          SELECT cart_id FROM public.cart_items WHERE product_id = v_primary_id AND variant_id IS NULL
                      );

                    -- Repoint remaining cart items without variant to v_primary_id
                    UPDATE public.cart_items
                    SET product_id = v_primary_id
                    WHERE product_id = v_c_uuid AND variant_id IS NULL;

                    -- Match cart items that had variants to newly upserted variants under v_primary_id
                    UPDATE public.cart_items old_ci
                    SET product_id = v_primary_id,
                        variant_id = new_v.id,
                        updated_at = NOW()
                    FROM public.product_variants old_v
                    JOIN public.product_variants new_v
                      ON new_v.product_id = v_primary_id
                     AND (
                         (NULLIF(BTRIM(old_v.sku), '') IS NOT NULL AND LOWER(new_v.sku) = LOWER(old_v.sku))
                         OR (LOWER(new_v.color) = LOWER(old_v.color) AND LOWER(new_v.ram) = LOWER(old_v.ram) AND LOWER(new_v.storage) = LOWER(old_v.storage))
                     )
                    WHERE old_ci.product_id = v_c_uuid
                      AND old_ci.variant_id = old_v.id;

                    -- Clean up any remaining invalid cart items for v_c_uuid to avoid foreign key violations
                    DELETE FROM public.cart_items WHERE product_id = v_c_uuid;

                    -- Move wishlist items to primary product (deduplicating existing ones)
                    DELETE FROM public.wishlist
                    WHERE product_id = v_c_uuid
                      AND user_id IN (SELECT user_id FROM public.wishlist WHERE product_id = v_primary_id);

                    UPDATE public.wishlist
                    SET product_id = v_primary_id
                    WHERE product_id = v_c_uuid;

                    -- Move secondary images to primary product as gallery images
                    UPDATE public.product_images
                    SET product_id = v_primary_id,
                        is_primary = false
                    WHERE product_id = v_c_uuid
                      AND url NOT IN (SELECT url FROM public.product_images WHERE product_id = v_primary_id);
                END IF;
            END LOOP;

            -- 5. Update specifications
            v_specs := v_item->'specifications';
            IF jsonb_typeof(v_specs) = 'array' AND jsonb_array_length(v_specs) > 0 THEN
                DELETE FROM public.product_specifications WHERE product_id = v_primary_id;
                INSERT INTO public.product_specifications(product_id, key, value, display_order)
                SELECT v_primary_id, BTRIM(value->>'key'), BTRIM(value->>'value'), COALESCE((value->>'display_order')::INTEGER, 0)
                FROM jsonb_array_elements(v_specs) WHERE NULLIF(BTRIM(value->>'key'), '') IS NOT NULL AND NULLIF(BTRIM(value->>'value'), '') IS NOT NULL;
            END IF;

            -- 6. Insert primary image if specified and absent
            IF NULLIF(BTRIM(v_item->>'image_url'), '') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.product_images WHERE product_id = v_primary_id AND is_primary) THEN
                IF v_item->>'image_url' !~* '^https://' THEN RAISE EXCEPTION 'Image URL must use HTTPS' USING ERRCODE = '22023'; END IF;
                INSERT INTO public.product_images(product_id, url, is_primary, display_order) VALUES (v_primary_id, BTRIM(v_item->>'image_url'), true, 0);
            END IF;
        END IF;

        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_import_products_v3(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_import_products_v3(JSONB) TO authenticated;
