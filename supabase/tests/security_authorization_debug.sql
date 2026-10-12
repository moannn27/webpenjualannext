-- File Debug Sementara: supabase/tests/security_authorization_debug.sql
-- Menampung semua 37 assertion pgTAP ke dalam tabel sementara agar Supabase SQL Editor
-- dapat menampilkan ringkasan lengkap PASS/FAIL beserta nomor dan nama test.
-- Semua perubahan tetap di-ROLLBACK dan tidak mengubah data apapun.

BEGIN;

-- 1. Penampung hasil assertion pgTAP
CREATE TEMP TABLE pgtap_debug_results (
    id serial PRIMARY KEY,
    test_num integer,
    result text
);

GRANT ALL ON TABLE pgtap_debug_results TO PUBLIC, anon, authenticated;
GRANT ALL ON SEQUENCE pgtap_debug_results_id_seq TO PUBLIC, anon, authenticated;

-- 2. Helper function SECURITY DEFINER:
-- Berjalan sebagai definer (postgres), kebal terhadap pergantian role pengujian.
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

-- Rencanakan 37 pengujian
SELECT pg_temp.record_tap(0, plan(37));

-- Test 1 s/d 10: Hak akses skema, kolom, policy, dan trigger
SELECT pg_temp.record_tap(1, ok(
    NOT has_column_privilege('authenticated', 'public.users', 'role', 'UPDATE'),
    'authenticated users cannot update the role column'
));

SELECT pg_temp.record_tap(2, ok(
    has_column_privilege('authenticated', 'public.users', 'full_name', 'UPDATE')
    AND has_column_privilege('authenticated', 'public.users', 'phone', 'UPDATE')
    AND has_column_privilege('authenticated', 'public.users', 'home_address', 'UPDATE'),
    'authenticated users retain the supported self-service profile fields'
));

SELECT pg_temp.record_tap(3, ok(
    has_column_privilege('authenticated', 'public.payments', 'status', 'UPDATE'),
    'authenticated admins retain the payment status field used by the admin action'
));

SELECT pg_temp.record_tap(4, ok(
    NOT has_column_privilege('authenticated', 'public.payments', 'amount', 'UPDATE')
    AND NOT has_column_privilege('authenticated', 'public.payments', 'order_id', 'UPDATE')
    AND NOT has_column_privilege('authenticated', 'public.payments', 'midtrans_transaction_id', 'UPDATE')
    AND NOT has_column_privilege('authenticated', 'public.payments', 'payload', 'UPDATE'),
    'authenticated users cannot update sensitive payment fields'
));

SELECT pg_temp.record_tap(5, ok(
    EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
          AND policyname = 'Users can update their own profile'
          AND roles @> ARRAY['authenticated']::name[]
          AND qual LIKE '%auth.uid%'
          AND with_check LIKE '%auth.uid%'
    ),
    'profile self-update policy remains ownership scoped'
));

SELECT pg_temp.record_tap(6, ok(
    EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
          AND policyname = 'Admins can update all profiles'
          AND qual LIKE '%is_admin%'
          AND with_check LIKE '%is_admin%'
    ),
    'authorized admin profile update policy remains available'
));

SELECT pg_temp.record_tap(7, ok(
    (SELECT count(*) = 1 FROM pg_catalog.pg_policies
     WHERE schemaname = 'public' AND tablename = 'payments' AND cmd = 'UPDATE')
    AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies
        WHERE schemaname = 'public' AND tablename = 'payments'
          AND policyname = 'Admins can update payments'
          AND qual LIKE '%is_admin%'
          AND with_check LIKE '%is_admin%'
    ),
    'payment UPDATE is restricted to the single admin policy'
));

SELECT pg_temp.record_tap(8, ok(
    NOT has_function_privilege('anon', 'public.admin_update_user_role(uuid,public.user_role)', 'EXECUTE'),
    'anonymous users cannot call the role change RPC'
));

SELECT pg_temp.record_tap(9, ok(
    NOT has_table_privilege('anon', 'public.orders', 'INSERT')
    AND NOT has_table_privilege('anon', 'public.order_items', 'INSERT')
    AND NOT has_table_privilege('anon', 'public.payments', 'INSERT'),
    'anonymous users cannot insert into orders, order_items, or payments'
));

SELECT pg_temp.record_tap(10, ok(
    NOT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.handle_new_user_cart()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.assign_daily_order_number()', 'EXECUTE'),
    'anonymous users cannot execute internal trigger functions'
));

-- Fixtures khusus transaksi rollback ini
INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'security-customer@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
    ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'security-superadmin@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());

UPDATE public.users SET role = 'super_admin' WHERE id = '10000000-0000-0000-0000-000000000002';

INSERT INTO public.orders (id, user_id, order_number, status, total_amount, shipping_amount, discount_amount, grand_total, shipping_address, courier)
VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'SECURITY-ORDER-001', 'pending', 100000, 0, 0, 100000, '{}'::jsonb, 'standard'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'SECURITY-ORDER-002', 'pending', 100000, 1000, 0, 101000, '{}'::jsonb, 'standard');

INSERT INTO public.payments (id, order_id, amount, payment_method, status)
VALUES
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 100000, 'manual_transfer', 'pending'),
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 101000, 'manual_transfer', 'pending');

-- Blok Pengujian Customer
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

SELECT pg_temp.record_tap(11, lives_ok(
    $$UPDATE public.users SET full_name = 'Updated Customer' WHERE id = '10000000-0000-0000-0000-000000000001'$$,
    'customer can update an allowed field on their own profile'
));

SELECT pg_temp.record_tap(12, throws_ok(
    $$UPDATE public.users SET role = 'admin' WHERE id = '10000000-0000-0000-0000-000000000001'$$,
    '42501', NULL,
    'customer cannot promote their own profile'
));

SELECT pg_temp.record_tap(13, throws_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000001', 'admin')$$,
    '42501', NULL,
    'customer cannot invoke the role change RPC'
));

SELECT pg_temp.record_tap(14, results_eq(
    $$WITH updated AS (
        UPDATE public.users SET full_name = 'Changed Other User' WHERE id = '10000000-0000-0000-0000-000000000002'
        RETURNING 1
    ) SELECT count(*) FROM updated$$,
    $$SELECT 0::bigint$$,
    'customer cannot update another profile'
));

SELECT pg_temp.record_tap(15, results_eq(
    $$WITH updated AS (
        UPDATE public.payments SET status = 'success' WHERE id = '30000000-0000-0000-0000-000000000001'
        RETURNING 1
    ) SELECT count(*) FROM updated$$,
    $$SELECT 0::bigint$$,
    'customer cannot confirm their own payment'
));

SELECT pg_temp.record_tap(16, results_eq(
    $$WITH updated AS (
        UPDATE public.payments SET status = 'success' WHERE id = '30000000-0000-0000-0000-000000000002'
        RETURNING 1
    ) SELECT count(*) FROM updated$$,
    $$SELECT 0::bigint$$,
    'customer cannot change another user payment'
));

SELECT pg_temp.record_tap(17, throws_ok(
    $$UPDATE public.payments SET amount = 1 WHERE id = '30000000-0000-0000-0000-000000000001'$$,
    '42501', NULL,
    'customer cannot change payment amount'
));

SELECT pg_temp.record_tap(18, throws_ok(
    $$INSERT INTO public.orders (id, user_id, order_number, status, total_amount, shipping_amount, discount_amount, grand_total, shipping_address, courier)
      VALUES ('20000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000001', 'FORGED-01', 'delivered', 0, 0, 0, 0, '{}'::jsonb, 'standard')$$,
    '42501', NULL,
    'customer cannot directly insert forged orders into public.orders'
));

SELECT pg_temp.record_tap(19, throws_ok(
    $$INSERT INTO public.order_items (id, order_id, product_id, product_name, price, quantity)
      VALUES ('40000000-0000-0000-0000-000000000099', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Forged Item', 0, 1)$$,
    '42501', NULL,
    'customer cannot directly insert items into public.order_items'
));

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000099', true);
SELECT pg_temp.record_tap(20, throws_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000001', 'admin')$$,
    '42501', NULL,
    'an authenticated identity without a registered profile cannot change roles'
));
RESET ROLE;

-- Verifikasi integritas data pasca-percobaan customer
SELECT pg_temp.record_tap(21, is(
    (SELECT role::text FROM public.users WHERE id = '10000000-0000-0000-0000-000000000001'),
    'customer',
    'denied self-promotion leaves the customer role unchanged'
));

SELECT pg_temp.record_tap(22, is(
    (SELECT status::text FROM public.payments WHERE id = '30000000-0000-0000-0000-000000000001'),
    'pending',
    'denied customer payment update leaves status unchanged'
));

SELECT pg_temp.record_tap(23, ok(
    (SELECT count(*) FROM public.orders WHERE order_number = 'FORGED-01') = 0,
    'forged order insert was completely blocked'
));

SELECT pg_temp.record_tap(24, ok(
    (SELECT count(*) FROM public.order_items WHERE id = '40000000-0000-0000-0000-000000000099') = 0,
    'forged order item insert was completely blocked'
));

-- Blok Pengujian Super Admin
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

SELECT pg_temp.record_tap(25, lives_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000001', 'admin')$$,
    'super admin can change another account role through the RPC'
));

SELECT pg_temp.record_tap(26, throws_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000001', NULL::public.user_role)$$,
    '22023', NULL,
    'role change RPC rejects a null role'
));

SELECT pg_temp.record_tap(27, throws_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000099', 'admin')$$,
    'P0002', NULL,
    'role change RPC rejects an unregistered target profile'
));

SELECT pg_temp.record_tap(28, throws_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000002', 'admin')$$,
    '22023', NULL,
    'super admin cannot demote their own account'
));
RESET ROLE;

-- Blok Pengujian Admin Update Status Pembayaran
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

SELECT pg_temp.record_tap(29, lives_ok(
    $$UPDATE public.payments SET status = 'success' WHERE id = '30000000-0000-0000-0000-000000000002'$$,
    'admin can confirm payment status through the admin write path'
));

SELECT pg_temp.record_tap(30, lives_ok(
    $$UPDATE public.payments SET status = 'success' WHERE id = '30000000-0000-0000-0000-000000000002'$$,
    'repeated payment success callback is idempotent'
));

SELECT pg_temp.record_tap(31, throws_ok(
    $$UPDATE public.payments SET status = 'refunded' WHERE id = '30000000-0000-0000-0000-000000000002'$$,
    '22023', NULL,
    'refund is rejected while the order is not cancelled'
));

SELECT pg_temp.record_tap(32, throws_ok(
    $$UPDATE public.payments SET amount = 1 WHERE id = '30000000-0000-0000-0000-000000000002'$$,
    '42501', NULL,
    'authenticated admin cannot update amount'
));
RESET ROLE;

SELECT pg_temp.record_tap(33, is(
    (SELECT role::text FROM public.users WHERE id = '10000000-0000-0000-0000-000000000001'),
    'admin',
    'authorized RPC applies the requested role change'
));

SELECT pg_temp.record_tap(34, is(
    (SELECT status::text FROM public.payments WHERE id = '30000000-0000-0000-0000-000000000002'),
    'success',
    'authorized admin update persists payment success'
));

-- Blok Pengujian Super Admin Pickup Correction
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

SELECT pg_temp.record_tap(35, throws_ok(
    $$UPDATE public.payments SET amount = 1 WHERE id = '30000000-0000-0000-0000-000000000002'$$,
    '42501', NULL,
    'authenticated super admin cannot update amount outside the trusted RPC'
));

SELECT pg_temp.record_tap(36, lives_ok(
    $$SELECT public.super_admin_correct_order_pickup('20000000-0000-0000-0000-000000000002', 'pending')$$,
    'trusted super-admin correction RPC executes through its authorized path'
));
RESET ROLE;

SELECT pg_temp.record_tap(37, is(
    (SELECT amount::numeric FROM public.payments WHERE id = '30000000-0000-0000-0000-000000000002'),
    101000::numeric,
    'pickup correction preserves recorded payment amount for already-confirmed orders'
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

