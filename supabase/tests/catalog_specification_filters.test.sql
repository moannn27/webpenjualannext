-- Run only against a disposable local database after applying migrations.
BEGIN;
SELECT plan(5);

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

SET LOCAL ROLE anon;
SELECT is(
  (public.search_catalog_products(p_category_id => '41000000-0000-4000-8000-000000000001', p_brand_id => '42000000-0000-4000-8000-000000000001', p_price_min => 1400, p_price_max => 1600, p_processor => 'i5', p_ram => '16', p_gpu => '4050', p_display => '14', p_in_stock => TRUE)->>'total')::INTEGER,
  1,
  'combined category, brand, effective price, processor, RAM, GPU, display and stock filters match the expected laptop'
);
SELECT is(
  (public.search_catalog_products(p_processor => 'Core i7')->>'total')::INTEGER,
  0,
  'products with missing specifications do not match a requested processor'
);
SELECT is(
  (public.search_catalog_products(p_page => 2, p_page_size => 1, p_category_id => '41000000-0000-4000-8000-000000000001', p_sort => 'price-low')->'rows'->0->>'id'),
  '43000000-0000-4000-8000-000000000001',
  'stable page sorting and pagination return the second product after the lowest effective price'
);
SELECT is(
  (public.search_catalog_products(p_promo_only => TRUE, p_category_id => '41000000-0000-4000-8000-000000000001')->>'total')::INTEGER,
  1,
  'promo-only filtering includes a valid stored discount and excludes regular-price products'
);
SELECT is(public.normalize_catalog_spec_key('Graphics Card'), 'GPU', 'vendor graphics-card labels normalize to the GPU comparison/filter key');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
