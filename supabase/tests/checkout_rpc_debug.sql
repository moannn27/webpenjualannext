-- File Debug Sementara: supabase/tests/checkout_rpc_debug.sql
-- Menampung hasil seluruh 2 assertion RPC checkout pgTAP ke dalam tabel sementara
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
-- Dijalankan sebagai owner (postgres), kebal terhadap pergantian role pengujian (authenticated/anon).
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

-- Rencanakan 2 pengujian pgTAP
SELECT pg_temp.record_tap(0, plan(2));

-- Test 1: Verifikasi user anonymous tidak memiliki hak EXECUTE pada process_checkout
SELECT pg_temp.record_tap(1, ok(
    NOT has_function_privilege(
        'anon',
        'public.process_checkout(uuid, text, text, text, text, text, text, text, text)',
        'EXECUTE'
    ),
    'anonymous users cannot execute checkout'
));

-- Test 2: Verifikasi user authenticated ditolak jika checkout keranjang milik user lain
SET LOCAL ROLE authenticated;

SELECT pg_temp.record_tap(2, throws_ok(
    $$
        SELECT public.process_checkout(
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Test User', '081234567890', 'Jalan Test 1', 'Bandung',
            'Jawa Barat', '40115', 'standard', 'manual_transfer'
        )
    $$,
    '42501',
    'Not authorized to checkout this cart',
    'checkout rejects a request without a matching authenticated user'
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

