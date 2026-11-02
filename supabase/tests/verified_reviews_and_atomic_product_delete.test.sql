-- Run only against a disposable local database with pgTAP after applying migrations.
BEGIN;
SELECT plan(32);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.reviews'::regclass
      AND attname = 'order_id'
      AND NOT attisdropped
  ),
  'reviews retain the order used to verify a purchase'
);
SELECT ok(
  (SELECT attgenerated = 's'
   FROM pg_attribute
   WHERE attrelid = 'public.reviews'::regclass
     AND attname = 'is_verified'
     AND NOT attisdropped),
  'review verification is derived from its verified order reference'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.reviews'::regclass
      AND tgname = 'enforce_verified_review'
      AND NOT tgisinternal
  ) AND EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.reviews'::regclass
      AND tgname = 'enforce_review_reply_content_permission'
      AND NOT tgisinternal
  ),
  'review ownership, purchase, and reply-permission rules are enforced by database triggers'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.reviews', 'INSERT')
    AND NOT has_column_privilege('anon', 'public.reviews', 'order_id', 'INSERT'),
  'anonymous users cannot insert reviews'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.reviews', 'order_id', 'SELECT')
    AND has_column_privilege('authenticated', 'public.reviews', 'is_verified', 'SELECT'),
  'customers can see verification state without exposing internal order IDs'
);
SELECT ok(
  has_column_privilege('authenticated', 'public.reviews', 'order_id', 'INSERT')
    AND has_column_privilege('authenticated', 'public.reviews', 'admin_reply', 'UPDATE'),
  'authenticated review actions have only the required write columns'
);
SELECT ok(
  NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.admin_bulk_delete_products(uuid[])'::regprocedure),
  'bulk product deletion runs with the caller privileges'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.admin_bulk_delete_products(uuid[])', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.admin_bulk_delete_products(uuid[])', 'EXECUTE')
    AND has_function_privilege('service_role', 'public.admin_bulk_delete_products(uuid[])', 'EXECUTE'),
  'only the server service role can invoke the bulk delete'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
      AND policyname = 'Users and content admins can update reviews'
      AND qual IS NOT NULL
      AND with_check IS NOT NULL
  ),
  'review updates have both row visibility and row ownership checks'
);
SELECT ok(
  NOT has_function_privilege('anon', 'private.can_manage_review_content()', 'EXECUTE')
    AND has_function_privilege('authenticated', 'private.can_manage_review_content()', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'private.enforce_review_reply_content_permission()', 'EXECUTE'),
  'only authenticated users can call the private permission helper, not the trigger function'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
      AND policyname = 'Users and content admins can update reviews'
      AND qual LIKE '%can_manage_review_content%'
      AND with_check LIKE '%can_manage_review_content%'
  )
    AND EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'reviews'
        AND policyname = 'Users and content admins can delete reviews'
        AND qual LIKE '%can_manage_review_content%'
    ),
  'admin review writes are gated by the content module permission'
);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('81000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'review-buyer@example.invalid', '', '{}'::jsonb, '{"full_name":"Review Buyer"}'::jsonb, now(), now()),
  ('81000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'review-admin@example.invalid', '', '{}'::jsonb, '{"full_name":"Review Admin"}'::jsonb, now(), now());
UPDATE public.users
SET role = 'admin'
WHERE id = '81000000-0000-0000-0000-000000000002';
UPDATE public.storefront_settings
SET settings = pg_catalog.jsonb_set(
  settings,
  '{admin_permissions}',
  '{"81000000-0000-0000-0000-000000000002":["products"]}'::JSONB,
  TRUE
)
WHERE id = 'main';

INSERT INTO public.categories (id, name, slug)
VALUES ('82000000-0000-0000-0000-000000000001', 'Review Test', 'review-test');
INSERT INTO public.brands (id, name, slug)
VALUES ('83000000-0000-0000-0000-000000000001', 'Review Test', 'review-test');
INSERT INTO public.products (id, name, slug, description, price, category_id, brand_id)
VALUES
  ('84000000-0000-0000-0000-000000000001', 'Review Test Product', 'review-test-product', 'test', 100, '82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001'),
  ('84000000-0000-0000-0000-000000000002', 'Unreferenced Test Product', 'unreferenced-test-product', 'test', 100, '82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001');
INSERT INTO public.orders (id, user_id, order_number, status, total_amount, shipping_amount, discount_amount, grand_total, shipping_address, courier)
VALUES
  ('86000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'REVIEW-DELIVERED', 'delivered', 100, 0, 0, 100, '{"recipient_name":"Review Buyer","phone":"081234567890"}'::jsonb, 'standard'),
  ('86000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000001', 'REVIEW-PENDING', 'pending', 100, 0, 0, 100, '{"recipient_name":"Review Buyer","phone":"081234567890"}'::jsonb, 'standard'),
  ('86000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000002', 'REVIEW-ADMIN-DELIVERED', 'delivered', 100, 0, 0, 100, '{"recipient_name":"Review Admin","phone":"081234567890"}'::jsonb, 'standard');
INSERT INTO public.order_items (id, order_id, product_id, product_name, price, quantity)
VALUES
  ('87000000-0000-0000-0000-000000000001', '86000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'Review Test Product', 100, 1),
  ('87000000-0000-0000-0000-000000000002', '86000000-0000-0000-0000-000000000002', '84000000-0000-0000-0000-000000000001', 'Review Test Product', 100, 1),
  ('87000000-0000-0000-0000-000000000003', '86000000-0000-0000-0000-000000000003', '84000000-0000-0000-0000-000000000001', 'Review Test Product', 100, 1);
INSERT INTO public.payments (id, order_id, amount, payment_method, status)
VALUES
  ('88000000-0000-0000-0000-000000000001', '86000000-0000-0000-0000-000000000001', 100, 'manual_transfer', 'success'),
  ('88000000-0000-0000-0000-000000000002', '86000000-0000-0000-0000-000000000002', 100, 'manual_transfer', 'success'),
  ('88000000-0000-0000-0000-000000000003', '86000000-0000-0000-0000-000000000003', 100, 'manual_transfer', 'success');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
SELECT lives_ok(
  $$INSERT INTO public.reviews (user_id, product_id, order_id, rating, comment)
    VALUES ('81000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', '86000000-0000-0000-0000-000000000001', 5, 'Barang diterima dengan baik')$$,
  'a buyer can review a paid and delivered product from their order'
);
SELECT is(
  (SELECT is_verified FROM public.reviews WHERE user_id = '81000000-0000-0000-0000-000000000001' AND product_id = '84000000-0000-0000-0000-000000000001'),
  true,
  'the saved review is marked verified'
);
SELECT throws_ok(
  $$INSERT INTO public.reviews (user_id, product_id, order_id, rating)
    VALUES ('81000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', '86000000-0000-0000-0000-000000000002', 4)$$,
  '23514',
  'Ulasan hanya dapat diberikan untuk produk dalam pesanan lunas yang sudah diterima.',
  'a pending order cannot verify a review'
);
SELECT throws_ok(
  $$INSERT INTO public.reviews (user_id, product_id, order_id, rating)
    VALUES ('81000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', '86000000-0000-0000-0000-000000000001', 4)$$,
  '23505',
  'Anda sudah memberikan ulasan untuk produk ini.',
  'one customer cannot create duplicate reviews for a product'
);
SELECT throws_ok(
  $$UPDATE public.reviews
    SET admin_reply = 'Terima kasih', admin_replied_at = now(), admin_replied_by = '81000000-0000-0000-0000-000000000001'
    WHERE user_id = '81000000-0000-0000-0000-000000000001'
      AND product_id = '84000000-0000-0000-0000-000000000001'$$,
  '42501',
  'Hanya admin yang dapat mengubah balasan ulasan.',
  'customers cannot impersonate an admin reply'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
SELECT lives_ok(
  $$INSERT INTO public.reviews (user_id, product_id, order_id, rating, comment)
    VALUES ('81000000-0000-0000-0000-000000000002', '84000000-0000-0000-0000-000000000001', '86000000-0000-0000-0000-000000000003', 5, 'Ulasan admin')$$,
  'an admin can review a verified purchase they own'
);
SELECT throws_ok(
  $$UPDATE public.reviews
    SET admin_reply = 'Unauthorized own reply',
        admin_replied_at = now(),
        admin_replied_by = '81000000-0000-0000-0000-000000000002'
    WHERE user_id = '81000000-0000-0000-0000-000000000002'
      AND product_id = '84000000-0000-0000-0000-000000000001'$$,
  '42501',
  'Hanya admin dengan izin Konten yang dapat mengubah balasan ulasan.',
  'an admin without content permission cannot reply to their own review'
);
SELECT is(
  (SELECT admin_reply FROM public.reviews WHERE user_id = '81000000-0000-0000-0000-000000000002' AND product_id = '84000000-0000-0000-0000-000000000001'),
  NULL,
  'the admin own-review reply remains unchanged without content permission'
);
SELECT lives_ok(
  $$UPDATE public.reviews
    SET admin_reply = 'Unauthorized reply',
        admin_replied_at = now(),
        admin_replied_by = '81000000-0000-0000-0000-000000000002'
    WHERE user_id = '81000000-0000-0000-0000-000000000001'
      AND product_id = '84000000-0000-0000-0000-000000000001'$$,
  'an admin without content permission cannot change a customer reply'
);
SELECT is(
  (SELECT admin_reply FROM public.reviews WHERE user_id = '81000000-0000-0000-0000-000000000001' AND product_id = '84000000-0000-0000-0000-000000000001'),
  NULL,
  'review reply remains unchanged without content permission'
);
SELECT lives_ok(
  $$DELETE FROM public.reviews
    WHERE user_id = '81000000-0000-0000-0000-000000000001'
      AND product_id = '84000000-0000-0000-0000-000000000001'$$,
  'an admin without content permission cannot delete a customer review'
);
SELECT is(
  (SELECT count(*)::integer FROM public.reviews WHERE user_id = '81000000-0000-0000-0000-000000000001'),
  1,
  'review remains present without content permission'
);
RESET ROLE;
UPDATE public.storefront_settings
SET settings = pg_catalog.jsonb_set(
  settings,
  '{admin_permissions}',
  '{"81000000-0000-0000-0000-000000000002":["products","content"]}'::JSONB,
  TRUE
)
WHERE id = 'main';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
SELECT lives_ok(
  $$UPDATE public.reviews
    SET admin_reply = 'Terima kasih atas ulasannya.',
        admin_replied_at = now(),
        admin_replied_by = '81000000-0000-0000-0000-000000000002'
    WHERE user_id = '81000000-0000-0000-0000-000000000001'
      AND product_id = '84000000-0000-0000-0000-000000000001'$$,
  'an admin can publish a review reply'
);
SELECT is(
  (SELECT admin_reply FROM public.reviews WHERE user_id = '81000000-0000-0000-0000-000000000001' AND product_id = '84000000-0000-0000-0000-000000000001'),
  'Terima kasih atas ulasannya.',
  'the admin reply is stored for product-page display'
);
SELECT lives_ok(
  $$DELETE FROM public.reviews
    WHERE user_id = '81000000-0000-0000-0000-000000000001'
      AND product_id = '84000000-0000-0000-0000-000000000001'$$,
  'an admin can delete a customer review'
);
SELECT is(
  (SELECT count(*)::integer FROM public.reviews WHERE user_id = '81000000-0000-0000-0000-000000000001'),
  0,
  'deleted reviews no longer remain visible'
);
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT throws_ok(
  $$SELECT * FROM public.admin_bulk_delete_products(ARRAY[
    '84000000-0000-0000-0000-000000000001'::uuid,
    '84000000-0000-0000-0000-000000000002'::uuid,
    '84000000-0000-0000-0000-000000000003'::uuid
  ])$$,
  'P0002',
  'Sebagian produk sudah tidak tersedia. Muat ulang daftar produk lalu coba lagi.',
  'a missing product aborts the whole bulk deletion'
);
SELECT is(
  (SELECT count(*)::integer FROM public.products WHERE id = '84000000-0000-0000-0000-000000000002'),
  1,
  'the failed bulk operation leaves unreferenced products untouched'
);
SELECT results_eq(
  $$SELECT deleted_count, archived_count
    FROM public.admin_bulk_delete_products(ARRAY[
      '84000000-0000-0000-0000-000000000001'::uuid,
      '84000000-0000-0000-0000-000000000002'::uuid
    ])$$,
  $$VALUES (1, 1)$$,
  'a valid bulk delete removes unreferenced products and archives order-linked products'
);
RESET ROLE;

SELECT is(
  (SELECT status FROM public.products WHERE id = '84000000-0000-0000-0000-000000000001'),
  'deleted',
  'order-linked product history is retained with the product hidden'
);
SELECT is(
  (SELECT count(*)::integer FROM public.products WHERE id = '84000000-0000-0000-0000-000000000002'),
  0,
  'products without order history are physically deleted'
);

SELECT * FROM finish();
ROLLBACK;
