-- Run only with pgTAP against a disposable local database. All fixtures roll back.
BEGIN;
SELECT plan(31);

SELECT ok(
    NOT has_column_privilege('authenticated', 'public.users', 'role', 'UPDATE'),
    'authenticated users cannot update the role column'
);
SELECT ok(
    has_column_privilege('authenticated', 'public.users', 'full_name', 'UPDATE')
    AND has_column_privilege('authenticated', 'public.users', 'phone', 'UPDATE')
    AND has_column_privilege('authenticated', 'public.users', 'home_address', 'UPDATE'),
    'authenticated users retain the supported self-service profile fields'
);
SELECT ok(
    has_column_privilege('authenticated', 'public.payments', 'status', 'UPDATE'),
    'authenticated admins retain the payment status field used by the admin action'
);
SELECT ok(
    NOT has_column_privilege('authenticated', 'public.payments', 'amount', 'UPDATE')
    AND NOT has_column_privilege('authenticated', 'public.payments', 'order_id', 'UPDATE')
    AND NOT has_column_privilege('authenticated', 'public.payments', 'midtrans_transaction_id', 'UPDATE')
    AND NOT has_column_privilege('authenticated', 'public.payments', 'payload', 'UPDATE'),
    'authenticated users cannot update sensitive payment fields'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
          AND policyname = 'Users can update their own profile'
          AND roles @> ARRAY['authenticated']::name[]
          AND qual LIKE '%auth.uid%'
          AND with_check LIKE '%auth.uid%'
    ),
    'profile self-update policy remains ownership scoped'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
          AND policyname = 'Admins can update all profiles'
          AND qual LIKE '%is_admin%'
          AND with_check LIKE '%is_admin%'
    ),
    'authorized admin profile update policy remains available'
);
SELECT ok(
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
);
SELECT ok(
    NOT has_function_privilege('anon', 'public.admin_update_user_role(uuid,public.user_role)', 'EXECUTE'),
    'anonymous users cannot call the role change RPC'
);

-- These fixtures exist only inside this rolled-back local pgTAP transaction.
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

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
SELECT lives_ok(
    $$UPDATE public.users SET full_name = 'Updated Customer' WHERE id = '10000000-0000-0000-0000-000000000001'$$,
    'customer can update an allowed field on their own profile'
);
SELECT throws_ok(
    $$UPDATE public.users SET role = 'admin' WHERE id = '10000000-0000-0000-0000-000000000001'$$,
    '42501', NULL,
    'customer cannot promote their own profile'
);
SELECT throws_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000001', 'admin')$$,
    '42501', NULL,
    'customer cannot invoke the role change RPC'
);
SELECT row_count(
    $$UPDATE public.users SET full_name = 'Changed Other User' WHERE id = '10000000-0000-0000-0000-000000000002'$$,
    0,
    'customer cannot update another profile'
);
SELECT row_count(
    $$UPDATE public.payments SET status = 'success' WHERE id = '30000000-0000-0000-0000-000000000001'$$,
    0,
    'customer cannot confirm their own payment'
);
SELECT row_count(
    $$UPDATE public.payments SET status = 'success' WHERE id = '30000000-0000-0000-0000-000000000002'$$,
    0,
    'customer cannot change another user payment'
);
SELECT throws_ok(
    $$UPDATE public.payments SET amount = 1 WHERE id = '30000000-0000-0000-0000-000000000001'$$,
    '42501', NULL,
    'customer cannot change payment amount'
);
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000099', true);
SELECT throws_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000001', 'admin')$$,
    '42501', NULL,
    'an authenticated identity without a registered profile cannot change roles'
);
RESET ROLE;

SELECT is(
    (SELECT role::text FROM public.users WHERE id = '10000000-0000-0000-0000-000000000001'),
    'customer',
    'denied self-promotion leaves the customer role unchanged'
);
SELECT is(
    (SELECT status::text FROM public.payments WHERE id = '30000000-0000-0000-0000-000000000001'),
    'pending',
    'denied customer payment update leaves status unchanged'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
SELECT lives_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000001', 'admin')$$,
    'super admin can change another account role through the RPC'
);
SELECT throws_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000001', NULL::public.user_role)$$,
    '22023', NULL,
    'role change RPC rejects a null role'
);
SELECT throws_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000099', 'admin')$$,
    'P0002', NULL,
    'role change RPC rejects an unregistered target profile'
);
SELECT throws_ok(
    $$SELECT public.admin_update_user_role('10000000-0000-0000-0000-000000000002', 'admin')$$,
    '22023', NULL,
    'super admin cannot demote their own account'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
SELECT lives_ok(
    $$UPDATE public.payments SET status = 'success' WHERE id = '30000000-0000-0000-0000-000000000002'$$,
    'admin can confirm payment status through the admin write path'
);
SELECT lives_ok(
    $$UPDATE public.payments SET status = 'success' WHERE id = '30000000-0000-0000-0000-000000000002'$$,
    'repeated payment success callback is idempotent'
);
SELECT throws_ok(
    $$UPDATE public.payments SET status = 'refunded' WHERE id = '30000000-0000-0000-0000-000000000002'$$,
    '22023', NULL,
    'refund is rejected while the order is not cancelled'
);
SELECT throws_ok(
    $$UPDATE public.payments SET amount = 1 WHERE id = '30000000-0000-0000-0000-000000000002'$$,
    '42501', NULL,
    'authenticated admin cannot update amount'
);
RESET ROLE;

SELECT is(
    (SELECT role::text FROM public.users WHERE id = '10000000-0000-0000-0000-000000000001'),
    'admin',
    'authorized RPC applies the requested role change'
);
SELECT is(
    (SELECT status::text FROM public.payments WHERE id = '30000000-0000-0000-0000-000000000002'),
    'success',
    'authorized admin update persists payment success'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
SELECT throws_ok(
    $$UPDATE public.payments SET amount = 1 WHERE id = '30000000-0000-0000-0000-000000000002'$$,
    '42501', NULL,
    'authenticated super admin cannot update amount outside the trusted RPC'
);
SELECT lives_ok(
    $$SELECT public.super_admin_correct_order_pickup('20000000-0000-0000-0000-000000000002', 'pending')$$,
    'trusted super-admin correction RPC can adjust amount through its authorized path'
);
RESET ROLE;
SELECT is(
    (SELECT amount::numeric FROM public.payments WHERE id = '30000000-0000-0000-0000-000000000002'),
    100000::numeric,
    'pickup correction keeps the payment amount synchronized'
);

SELECT * FROM finish();
ROLLBACK;
