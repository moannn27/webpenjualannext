CREATE OR REPLACE FUNCTION public.normalize_catalog_spec_key(p_key TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
    SELECT CASE regexp_replace(lower(coalesce(p_key, '')), '[^a-z0-9]', '', 'g')
        WHEN 'processor' THEN 'Processor' WHEN 'cpu' THEN 'Processor' WHEN 'prosesor' THEN 'Processor'
        WHEN 'processorname' THEN 'Processor' WHEN 'processormodel' THEN 'Processor' WHEN 'processortype' THEN 'Processor' WHEN 'cpumodel' THEN 'Processor' WHEN 'chipset' THEN 'Processor'
        WHEN 'ram' THEN 'RAM' WHEN 'memory' THEN 'RAM' WHEN 'memorysize' THEN 'RAM' WHEN 'systemmemory' THEN 'RAM'
        WHEN 'storage' THEN 'Storage' WHEN 'penyimpanan' THEN 'Storage' WHEN 'harddrive' THEN 'Storage' WHEN 'disk' THEN 'Storage' WHEN 'ssd' THEN 'Storage' WHEN 'storagecapacity' THEN 'Storage'
        WHEN 'gpu' THEN 'GPU' WHEN 'graphics' THEN 'GPU' WHEN 'vga' THEN 'GPU' WHEN 'videocard' THEN 'GPU' WHEN 'graphiccard' THEN 'GPU' WHEN 'graphicscard' THEN 'GPU' WHEN 'graphicprocessor' THEN 'GPU' WHEN 'graphicchip' THEN 'GPU' WHEN 'gpumodel' THEN 'GPU' WHEN 'discretegraphics' THEN 'GPU'
        WHEN 'display' THEN 'Display' WHEN 'screen' THEN 'Display' WHEN 'layar' THEN 'Display' WHEN 'displaysize' THEN 'Display' WHEN 'displaysizeinch' THEN 'Display' WHEN 'displayinch' THEN 'Display' WHEN 'screensize' THEN 'Display' WHEN 'screendiagonal' THEN 'Display' WHEN 'panelsize' THEN 'Display'
        WHEN 'os' THEN 'OS' WHEN 'operatingsystem' THEN 'OS' WHEN 'systemsoftware' THEN 'OS'
        WHEN 'warranty' THEN 'Warranty' WHEN 'warrantyperiod' THEN 'Warranty' WHEN 'garansi' THEN 'Warranty'
        ELSE NULL
    END
$$;

CREATE OR REPLACE FUNCTION public.search_catalog_products(
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 24,
    p_category_id UUID DEFAULT NULL,
    p_brand_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_promo_only BOOLEAN DEFAULT FALSE,
    p_sort TEXT DEFAULT 'newest',
    p_price_min NUMERIC DEFAULT NULL,
    p_price_max NUMERIC DEFAULT NULL,
    p_processor TEXT DEFAULT NULL,
    p_ram TEXT DEFAULT NULL,
    p_storage TEXT DEFAULT NULL,
    p_gpu TEXT DEFAULT NULL,
    p_display TEXT DEFAULT NULL,
    p_in_stock BOOLEAN DEFAULT NULL
) RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
WITH matched AS (
    SELECT p.id, COALESCE(p.discount_price, p.price) AS payable_price, p.created_at, p.is_best_seller
    FROM public.products p
    JOIN public.brands b ON b.id = p.brand_id
    JOIN public.categories c ON c.id = p.category_id
    WHERE p.status = 'published'
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
      AND (NOT COALESCE(p_promo_only, FALSE) OR p.discount_price IS NOT NULL)
      AND (p_search IS NULL OR concat_ws(' ', p.name, p.sku, p.description, b.name, c.name) ILIKE '%' || p_search || '%')
      AND (p_price_min IS NULL OR COALESCE(p.discount_price, p.price) >= p_price_min)
      AND (p_price_max IS NULL OR COALESCE(p.discount_price, p.price) <= p_price_max)
      AND (p_in_stock IS NULL OR (p.stock > 0) = p_in_stock)
      AND (p_processor IS NULL OR EXISTS (SELECT 1 FROM public.product_specifications s WHERE s.product_id = p.id AND public.normalize_catalog_spec_key(s.key) = 'Processor' AND s.value ILIKE '%' || p_processor || '%'))
      AND (p_ram IS NULL OR EXISTS (SELECT 1 FROM public.product_specifications s WHERE s.product_id = p.id AND public.normalize_catalog_spec_key(s.key) = 'RAM' AND s.value ILIKE '%' || p_ram || '%'))
      AND (p_storage IS NULL OR EXISTS (SELECT 1 FROM public.product_specifications s WHERE s.product_id = p.id AND public.normalize_catalog_spec_key(s.key) = 'Storage' AND s.value ILIKE '%' || p_storage || '%'))
      AND (p_gpu IS NULL OR EXISTS (SELECT 1 FROM public.product_specifications s WHERE s.product_id = p.id AND public.normalize_catalog_spec_key(s.key) = 'GPU' AND s.value ILIKE '%' || p_gpu || '%'))
      AND (p_display IS NULL OR EXISTS (SELECT 1 FROM public.product_specifications s WHERE s.product_id = p.id AND public.normalize_catalog_spec_key(s.key) = 'Display' AND s.value ILIKE '%' || p_display || '%'))
), page_ids AS (
    SELECT m.id, row_number() OVER (ORDER BY
      CASE WHEN p_sort = 'price-low' THEN m.payable_price END ASC NULLS LAST,
      CASE WHEN p_sort = 'price-high' THEN m.payable_price END DESC NULLS LAST,
      CASE WHEN p_sort = 'popular' THEN m.is_best_seller::INTEGER END DESC NULLS LAST,
      m.created_at DESC, m.id
    ) AS row_num
    FROM matched m
    ORDER BY
      CASE WHEN p_sort = 'price-low' THEN m.payable_price END ASC NULLS LAST,
      CASE WHEN p_sort = 'price-high' THEN m.payable_price END DESC NULLS LAST,
      CASE WHEN p_sort = 'popular' THEN m.is_best_seller::INTEGER END DESC NULLS LAST,
      m.created_at DESC, m.id
    LIMIT LEAST(200, GREATEST(1, COALESCE(p_page_size, 24)))
    OFFSET (LEAST(1000000, GREATEST(1, COALESCE(p_page, 1))) - 1) * LEAST(200, GREATEST(1, COALESCE(p_page_size, 24)))
), page_rows AS (
    SELECT ids.row_num, jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(to_jsonb(p), '{brands}', to_jsonb(b), TRUE),
                '{categories}', to_jsonb(c), TRUE
            ),
            '{product_images}', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.is_primary DESC, i.display_order) FROM public.product_images i WHERE i.product_id = p.id), '[]'::JSONB), TRUE
        ),
        '{product_specifications}', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.display_order, s.key) FROM public.product_specifications s WHERE s.product_id = p.id), '[]'::JSONB), TRUE
    ) AS item
    FROM page_ids ids
    JOIN public.products p ON p.id = ids.id
    JOIN public.brands b ON b.id = p.brand_id
    JOIN public.categories c ON c.id = p.category_id
)
SELECT jsonb_build_object(
    'rows', COALESCE((SELECT jsonb_agg(page_rows.item ORDER BY page_rows.row_num) FROM page_rows), '[]'::JSONB),
    'total', (SELECT count(*) FROM matched)
)
$$;

CREATE OR REPLACE FUNCTION public.lookup_admin_import_skus(p_skus TEXT[])
RETURNS TABLE(product_id UUID, sku TEXT, match_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
    END IF;
    IF cardinality(p_skus) > 500 THEN
        RAISE EXCEPTION 'SKU lookup is limited to 500 products' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
    SELECT matches.product_id, matches.sku, matches.match_type
    FROM (
        SELECT p.id AS product_id, p.sku, 'product'::TEXT AS match_type FROM public.products p WHERE p.sku IS NOT NULL
        UNION ALL
        SELECT v.product_id, v.sku, 'variant'::TEXT FROM public.product_variants v WHERE v.sku IS NOT NULL
    ) matches
    WHERE lower(btrim(matches.sku)) IN (SELECT lower(btrim(input_sku)) FROM unnest(p_skus) AS input_skus(input_sku));
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_catalog_spec_key(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_catalog_spec_key(TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.search_catalog_products(INTEGER, INTEGER, UUID, UUID, TEXT, BOOLEAN, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_catalog_products(INTEGER, INTEGER, UUID, UUID, TEXT, BOOLEAN, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.lookup_admin_import_skus(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_admin_import_skus(TEXT[]) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_products_published_effective_price
    ON public.products ((COALESCE(discount_price, price)))
    WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_product_specs_normalized_filter
    ON public.product_specifications (product_id, public.normalize_catalog_spec_key(key))
    WHERE public.normalize_catalog_spec_key(key) IS NOT NULL;
