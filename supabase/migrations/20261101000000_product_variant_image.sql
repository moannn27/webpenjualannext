-- Migration: 20261101000000_product_variant_image.sql
-- Description: Add image_url column to product_variants for per-variant image support

ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.product_variants.image_url IS 'Dedicated product variant image URL';

