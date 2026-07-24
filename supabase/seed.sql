-- supabase/seed.sql

-- 1. Seed Categories
INSERT INTO public.categories (name, slug, description) VALUES
('Laptops', 'laptops', 'High performance laptops for work and gaming'),
('Smartphones', 'smartphones', 'Latest mobile devices'),
('Tablets', 'tablets', 'Portable tablets for everyday use');

-- 2. Seed Brands
INSERT INTO public.brands (name, slug, logo_url) VALUES
('Apple', 'apple', 'https://example.com/apple.png'),
('Samsung', 'samsung', 'https://example.com/samsung.png'),
('Asus', 'asus', 'https://example.com/asus.png');

-- 3. Seed Products
WITH cats AS (SELECT id, slug FROM public.categories),
     brs AS (SELECT id, slug FROM public.brands)
INSERT INTO public.products (
    category_id, brand_id, name, slug, description,
    price, discount_price, stock, sku,
    is_featured, is_best_seller, status
) VALUES
(
    (SELECT id FROM cats WHERE slug = 'laptops'),
    (SELECT id FROM brs WHERE slug = 'apple'),
    'MacBook Pro 16" M3 Max', 'macbook-pro-16-m3-max', 'Ultimate pro laptop',
    45000000, NULL, 50, 'MBP16M3M',
    true, true, 'published'
),
(
    (SELECT id FROM cats WHERE slug = 'smartphones'),
    (SELECT id FROM brs WHERE slug = 'samsung'),
    'Galaxy S24 Ultra', 'galaxy-s24-ultra', 'AI powered smartphone',
    22000000, 21000000, 100, 'SGS24U',
    true, true, 'published'
),
(
    (SELECT id FROM cats WHERE slug = 'laptops'),
    (SELECT id FROM brs WHERE slug = 'asus'),
    'ROG Zephyrus G14', 'rog-zephyrus-g14', 'Compact gaming laptop',
    30000000, NULL, 30, 'ROGG14',
    true, false, 'published'
);

-- 4. Seed Vouchers
INSERT INTO public.vouchers (code, description, discount_type, discount_value, min_purchase, is_active) VALUES
('WELCOME10', '10% off for new customers', 'percentage', 10, 0, true),
('FLAT500K', 'Flat Rp500,000 discount on 10M purchase', 'fixed_amount', 500000, 10000000, true);
