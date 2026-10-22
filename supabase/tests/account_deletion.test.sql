-- Run only with pgTAP against a disposable local database. All fixtures roll back.
BEGIN;
SELECT plan(22);

SELECT ok(
  NOT (SELECT attnotnull FROM pg_attribute
       WHERE attrelid = 'public.orders'::regclass AND attname = 'user_id' AND NOT attisdropped),
  'orders can retain a transaction after the customer profile is removed'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint
          WHERE conrelid = 'public.orders'::regclass
            AND conname = 'orders_user_id_fkey'
            AND confdeltype = 'n'),
  'deleting a profile sets the order customer reference to null'
);
SELECT ok(
  NOT (SELECT attnotnull FROM pg_attribute
       WHERE attrelid = 'public.voucher_reservations'::regclass AND attname = 'user_id' AND NOT attisdropped),
  'voucher reservation history can be detached from a deleted user'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint
          WHERE conrelid = 'public.voucher_reservations'::regclass
            AND conname = 'voucher_reservations_user_id_fkey'
            AND confdeltype = 'n'),
  'voucher reservation owner is detached on profile deletion'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.list_user_storage_objects(uuid)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.list_user_storage_objects(uuid)', 'EXECUTE')
  AND has_function_privilege('service_role', 'public.list_user_storage_objects(uuid)', 'EXECUTE'),
  'only the server service role can inspect object ownership for deletion'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_trigger
          WHERE tgrelid = 'public.users'::regclass
            AND tgname = 'trg_guard_last_super_admin_delete'
            AND NOT tgisinternal),
  'database trigger protects the last super admin during concurrent deletion'
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true), ('reviews', 'reviews', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.objects (bucket_id, name, owner_id)
VALUES
  ('avatars', '71000000-0000-0000-0000-000000000001/avatar.webp', NULL),
  ('reviews', 'product/71000000-0000-0000-0000-000000000001/review.webp', NULL);
SELECT is(
  (SELECT count(*)::INTEGER FROM public.list_user_storage_objects('71000000-0000-0000-0000-000000000001')),
  2,
  'storage cleanup finds legacy files owned by UUID path even when owner_id is null'
);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('71000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'account-delete@example.invalid', '', '{}'::jsonb, '{"full_name":"Old Customer","phone":"081234567890"}'::jsonb, now(), now());

INSERT INTO public.categories (id, name, slug)
VALUES ('72000000-0000-0000-0000-000000000001', 'Delete Test', 'delete-test');
INSERT INTO public.brands (id, name, slug)
VALUES ('73000000-0000-0000-0000-000000000001', 'Delete Test', 'delete-test');
INSERT INTO public.products (id, name, slug, description, price, category_id, brand_id)
VALUES ('74000000-0000-0000-0000-000000000001', 'Delete Test Product', 'delete-test-product', 'test', 100, '72000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001');
INSERT INTO public.vouchers (id, code, discount_type, discount_value)
VALUES ('75000000-0000-0000-0000-000000000001', 'DELETE-TEST', 'fixed_amount', 1);
INSERT INTO public.orders (id, user_id, order_number, status, total_amount, shipping_amount, discount_amount, grand_total, shipping_address, courier)
VALUES ('76000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'DELETE-TEST-ORDER', 'pending', 100, 0, 0, 100, '{"recipient_name":"Test Customer","phone":"081234567890"}'::jsonb, 'standard');
SELECT ok(
  (SELECT shipping_address -> 'customer_snapshot' = jsonb_build_object(
    'name', 'Test Customer',
    'email', 'account-delete@example.invalid',
    'phone', '081234567890'
  ) FROM public.orders WHERE id = '76000000-0000-0000-0000-000000000001'),
  'new orders snapshot the verified customer name, Auth email, and checkout phone'
);
INSERT INTO public.order_items (id, order_id, product_id, product_name, price, quantity)
VALUES ('77000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 'Delete Test Product', 100, 1);
INSERT INTO public.payments (id, order_id, amount, payment_method, status)
VALUES ('78000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', 100, 'manual_transfer', 'pending');
INSERT INTO public.voucher_reservations (id, voucher_id, user_id, order_id, status)
VALUES ('79000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001', 'consumed');

DELETE FROM auth.users WHERE id = '71000000-0000-0000-0000-000000000001';

SELECT is((SELECT count(*)::INTEGER FROM public.users WHERE id = '71000000-0000-0000-0000-000000000001'), 0, 'Auth deletion removes the profile identity');
SELECT is((SELECT count(*)::INTEGER FROM public.orders WHERE id = '76000000-0000-0000-0000-000000000001'), 1, 'order history remains');
SELECT is((SELECT count(*)::INTEGER FROM public.order_items WHERE order_id = '76000000-0000-0000-0000-000000000001'), 1, 'order items remain');
SELECT is((SELECT count(*)::INTEGER FROM public.payments WHERE order_id = '76000000-0000-0000-0000-000000000001'), 1, 'payment history remains');
SELECT is((SELECT user_id FROM public.orders WHERE id = '76000000-0000-0000-0000-000000000001'), NULL::UUID, 'order no longer points to the deleted profile');
SELECT is((SELECT user_id FROM public.voucher_reservations WHERE id = '79000000-0000-0000-0000-000000000001'), NULL::UUID, 'voucher reservation no longer points to the deleted profile');
SELECT is((SELECT count(*)::INTEGER FROM public.cart WHERE user_id = '71000000-0000-0000-0000-000000000001'), 0, 'nontransactional cart data is removed by the profile cascade');
SELECT ok(
  (SELECT shipping_address -> 'customer_snapshot' = jsonb_build_object(
    'name', 'Test Customer',
    'email', 'account-delete@example.invalid',
    'phone', '081234567890'
  ) FROM public.orders WHERE id = '76000000-0000-0000-0000-000000000001'),
  'the customer snapshot remains intact after Auth and profile deletion'
);

SELECT set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::INTEGER FROM public.users WHERE id = '71000000-0000-0000-0000-000000000001'), 0, 'a deleted account JWT cannot read the removed profile through RLS');
SELECT is((SELECT count(*)::INTEGER FROM public.orders WHERE id = '76000000-0000-0000-0000-000000000001'), 0, 'a deleted account JWT cannot read the retained order through RLS');
SELECT is(
  (SELECT count(*)::INTEGER FROM public.order_items WHERE order_id = '76000000-0000-0000-0000-000000000001')
  + (SELECT count(*)::INTEGER FROM public.payments WHERE order_id = '76000000-0000-0000-0000-000000000001'),
  0,
  'a deleted account JWT cannot read retained order items or payments through RLS'
);
RESET ROLE;

INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('71000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'account-delete@example.invalid', '', '{}'::jsonb, '{"full_name":"New Customer"}'::jsonb, now(), now());

SELECT is((SELECT count(*)::INTEGER FROM auth.users WHERE lower(email) = lower('account-delete@example.invalid')), 1, 'the old email can be registered again');
SELECT is((SELECT role::TEXT FROM public.users WHERE id = '71000000-0000-0000-0000-000000000002'), 'customer', 'a re-registered identity receives the default customer role');
SELECT is((SELECT full_name || ':' || coalesce(phone, '') FROM public.users WHERE id = '71000000-0000-0000-0000-000000000002'), 'New Customer:', 'the new UUID receives no old profile name or phone');

SELECT * FROM finish();
ROLLBACK;
