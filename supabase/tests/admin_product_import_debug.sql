-- File Debug Sementara: supabase/tests/admin_product_import_debug.sql
-- Menampung hasil seluruh assertion pgTAP bulk product import ke dalam tabel sementara
-- agar Supabase SQL Editor dapat menampilkan ringkasan lengkap PASS/FAIL dalam satu result set.
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
-- Dijalankan sebagai owner (postgres), kebal terhadap pergantian role pengujian.
-- Argument fungsi dievaluasi di level pemanggil (mempertahankan konteks role & JWT asli).
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

-- Rencanakan 3 pengujian pgTAP
SELECT pg_temp.record_tap(0, plan(3));

-- Fixtures khusus pengujian import
INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('11000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'import-admin@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());
UPDATE public.users SET role = 'admin' WHERE id = '11000000-0000-0000-0000-000000000001';
INSERT INTO public.categories (name, slug) VALUES ('Import Test Category', 'import-test-category');
INSERT INTO public.brands (name, slug) VALUES ('Import Test Brand', 'import-test-brand');

-- Jalankan pengujian di bawah konteks admin terotentikasi
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);

SELECT pg_temp.record_tap(1, throws_ok(
    $$SELECT public.bulk_import_products_v2('[
      {"importAction":"create","name":"Import valid","sku":"IMPORT-ROLLBACK-1","description":"source description","price":100,"discount_price":null,"stock":0,"category":"Import Test Category","brand":"Import Test Brand","status":"draft","is_best_seller":false,"is_new_arrival":false,"image_url":"","specifications":[{"key":"RAM","value":"16 GB","display_order":0}],"variants":[]},
      {"importAction":"create","name":"Import invalid","sku":"IMPORT-ROLLBACK-2","description":"source description","price":100,"discount_price":null,"stock":0,"category":"No such category","brand":"Import Test Brand","status":"draft","is_best_seller":false,"is_new_arrival":false,"image_url":"","specifications":[],"variants":[]}
    ]'::jsonb)$$,
    '22023',
    'Category not found for product Import invalid: No such category',
    'an invalid later row rejects the whole import call'
));
RESET ROLE;

-- Verifikasi atomisitas: seluruh batch dibatalkan dan tidak meninggalkan produk/spesifikasi parsial
SELECT pg_temp.record_tap(2, is(
    (SELECT count(*)::INTEGER FROM public.products WHERE sku IN ('IMPORT-ROLLBACK-1', 'IMPORT-ROLLBACK-2')),
    0,
    'failed import leaves no products partially inserted'
));

SELECT pg_temp.record_tap(3, is(
    (SELECT count(*)::INTEGER FROM public.product_specifications s JOIN public.products p ON p.id = s.product_id WHERE p.sku IN ('IMPORT-ROLLBACK-1', 'IMPORT-ROLLBACK-2')),
    0,
    'failed import leaves no specifications partially inserted'
));

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

