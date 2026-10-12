-- File Debug Sementara: supabase/tests/catalog_specification_filters_debug.sql
-- Menampung hasil seluruh 5 assertion filter spesifikasi katalog pgTAP ke dalam tabel sementara
-- agar Supabase SQL Editor dapat menampilkan hasil terpadu dalam satu result set.
-- Seluruh perubahan di-ROLLBACK dan aman dijalankan pada database staging.

BEGIN;

-- 1. Tabel penampung hasil assertion pgTAP
CREATE TEMP TABLE pgtap_debug_results (
    id serial PRIMARY KEY,
    test_num integer,
    result text
);

GRANT ALL ON TABLE pgtap_debug_results TO PUBLIC, anon, authenticated;
GRANT ALL ON SEQUENCE pgtap_debug_results_id_seq TO PUBLIC, anon, authenticated;

-- 2. Helper function SECURITY DEFINER:
-- Dijalankan sebagai owner (postgres), kebal terhadap pergantian role pengujian (anon).
-- Argument fungsi dievaluasi di level pemanggil (mempertahankan konteks role anon asli).
CREATE OR REPLACE FUNCTION pg_temp.record_tap(p_num integer, p_result text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
BEGIN
    INSERT INTO pg_temp.pgtap_debug_results (test_num, result)
    VALUES (p_num, p_result);
    RETURN p_result;
END;
$$;

GRANT EXECUTE ON FUNCTION pg_temp.record_tap(integer, text) TO PUBLIC, anon, authenticated;

-- Rencanakan 5 pengujian pgTAP
SELECT pg_temp.record_tap(0, plan(5));

-- Fixtures kategori, brand, produk, dan spesifikasi pengujian
INSERT INTO public.categories (id, name, slug) VALUES ('41000000-0000-4000-8000-000000000001', 'Catalog Filter QA', 'catalog-filter-qa');
INSERT INTO public.brands (id, name, slug) VALUES ('42000000-0000-4000-8000-000000000001', 'Catalog Filter QA', 'catalog-filter-qa');

INSERT INTO public.products (id, name, slug, description, price, discount_price, stock, sku, category_id, brand_id, status, created_at)
VALUES
  ('43000000-0000-4000-8000-000000000001', 'QA Laptop A', 'catalog-filter-qa-a', 'fixture', 3000, 1500, 4, 'CAT-QA-A', '41000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 'published', '2026-01-01'),
  ('43000000-0000-4000-8000-000000000002', 'QA Laptop B', 'catalog-filter-qa-b', 'fixture', 2000, NULL, 0, 'CAT-QA-B', '41000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 'published', '2026-01-02'),
  ('43000000-0000-4000-8000-000000000003', 'QA Laptop C', 'catalog-filter-qa-c', 'fixture', 1000, NULL, 2, 'CAT-QA-C', '41000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 'published', '2026-01-03');

INSERT INTO public.product_specifications (product_id, key, value, display_order) VALUES
  ('43000000-0000-4000-8000-000000000001', 'CPU', 'Core i5-1340P', 0),
  ('43000000-0000-4000-8000-000000000001', 'System Memory', '16 GB', 1),
  ('43000000-0000-4000-8000-000000000001', 'Graphics Card', 'RTX 4050', 2),
  ('43000000-0000-4000-8000-000000000001', 'Display Size', '14 inch', 3);

-- Jalankan pengujian di bawah konteks role publik (anon)
SET LOCAL ROLE anon;

SELECT pg_temp.record_tap(1, is(
  (public.search_catalog_products(p_category_id => '41000000-0000-4000-8000-000000000001', p_brand_id => '42000000-0000-4000-8000-000000000001', p_price_min => 1400, p_price_max => 1600, p_processor => 'i5', p_ram => '16', p_gpu => '4050', p_display => '14', p_in_stock => TRUE)->>'total')::INTEGER,
  1,
  'combined category, brand, effective price, processor, RAM, GPU, display and stock filters match the expected laptop'
));

SELECT pg_temp.record_tap(2, is(
  (public.search_catalog_products(p_processor => 'Core i7')->>'total')::INTEGER,
  0,
  'products with missing specifications do not match a requested processor'
));

SELECT pg_temp.record_tap(3, is(
  (public.search_catalog_products(p_page => 2, p_page_size => 1, p_category_id => '41000000-0000-4000-8000-000000000001', p_sort => 'price-low')->'rows'->0->>'id'),
  '43000000-0000-4000-8000-000000000001',
  'stable page sorting and pagination return the second product after the lowest effective price'
));

SELECT pg_temp.record_tap(4, is(
  (public.search_catalog_products(p_promo_only => TRUE, p_category_id => '41000000-0000-4000-8000-000000000001')->>'total')::INTEGER,
  1,
  'promo-only filtering includes a valid stored discount and excludes regular-price products'
));

SELECT pg_temp.record_tap(5, is(
  public.normalize_catalog_spec_key('Graphics Card'),
  'GPU',
  'vendor graphics-card labels normalize to the GPU comparison/filter key'
));

RESET ROLE;

-- Rekam hasil finish() ke dalam tabel debug
INSERT INTO pg_temp.pgtap_debug_results (test_num, result)
SELECT 999, * FROM finish();

-- Tampilkan semua hasil assertion dalam satu result set terpadu untuk Supabase SQL Editor
SELECT 
    id,
    CASE 
        WHEN result LIKE 'ok %' THEN 'PASS'
        WHEN result LIKE 'not ok %' THEN 'FAIL'
        WHEN result LIKE '#%' THEN 'DIAGNOSTIC'
        WHEN result LIKE '1..%' THEN 'PLAN'
        ELSE 'INFO'
    END AS status,
    test_num,
    CASE 
        WHEN result ~ '^(not )?ok [0-9]+ - ' THEN substring(result from '-(.*)$')
        ELSE NULL
    END AS test_name,
    result
FROM pg_temp.pgtap_debug_results
ORDER BY id;

ROLLBACK;

