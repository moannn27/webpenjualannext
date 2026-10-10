-- Run only against a disposable local database with pgTAP after applying migrations.
BEGIN;
SELECT plan(3);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('11000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'import-admin@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());
UPDATE public.users SET role = 'admin' WHERE id = '11000000-0000-0000-0000-000000000001';
INSERT INTO public.categories (name, slug) VALUES ('Import Test Category', 'import-test-category');
INSERT INTO public.brands (name, slug) VALUES ('Import Test Brand', 'import-test-brand');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
SELECT throws_ok(
    $$SELECT public.bulk_import_products_v2('[
      {"importAction":"create","name":"Import valid","sku":"IMPORT-ROLLBACK-1","description":"source description","price":100,"discount_price":null,"stock":0,"category":"Import Test Category","brand":"Import Test Brand","status":"draft","is_best_seller":false,"is_new_arrival":false,"image_url":"","specifications":[{"key":"RAM","value":"16 GB","display_order":0}],"variants":[]},
      {"importAction":"create","name":"Import invalid","sku":"IMPORT-ROLLBACK-2","description":"source description","price":100,"discount_price":null,"stock":0,"category":"No such category","brand":"Import Test Brand","status":"draft","is_best_seller":false,"is_new_arrival":false,"image_url":"","specifications":[],"variants":[]}
    ]'::jsonb)$$,
    '22023',
    'Category not found for product Import invalid: No such category',
    'an invalid later row rejects the whole import call'
);
RESET ROLE;

SELECT is((SELECT count(*)::INTEGER FROM public.products WHERE sku IN ('IMPORT-ROLLBACK-1', 'IMPORT-ROLLBACK-2')), 0, 'failed import leaves no products partially inserted');
SELECT is((SELECT count(*)::INTEGER FROM public.product_specifications s JOIN public.products p ON p.id = s.product_id WHERE p.sku IN ('IMPORT-ROLLBACK-1', 'IMPORT-ROLLBACK-2')), 0, 'failed import leaves no specifications partially inserted');

SELECT * FROM finish();
ROLLBACK;
