-- Restore the variant gallery table when the original migration was recorded
-- without creating it. Keep the legacy variant image as the first gallery item.
CREATE TABLE IF NOT EXISTS public.product_variant_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  url TEXT NOT NULL CHECK (url ~* '^https://'),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (variant_id, url)
);

CREATE INDEX IF NOT EXISTS idx_product_variant_images_variant_order
  ON public.product_variant_images (variant_id, display_order);

ALTER TABLE public.product_variant_images ENABLE ROW LEVEL SECURITY;

-- Remove the original permissive policies before installing the scoped ones.
DROP POLICY IF EXISTS "Public can view product variant images" ON public.product_variant_images;
DROP POLICY IF EXISTS "Admins can manage product variant images" ON public.product_variant_images;
DROP POLICY IF EXISTS "Public can view images for published variants" ON public.product_variant_images;
DROP POLICY IF EXISTS "Admins can insert product variant images" ON public.product_variant_images;
DROP POLICY IF EXISTS "Admins can update product variant images" ON public.product_variant_images;
DROP POLICY IF EXISTS "Admins can delete product variant images" ON public.product_variant_images;

CREATE POLICY "Public can view images for published variants"
  ON public.product_variant_images FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.product_variants AS variant
      JOIN public.products AS product ON product.id = variant.product_id
      WHERE variant.id = product_variant_images.variant_id
        AND product.status = 'published'
    )
  );

CREATE POLICY "Admins can insert product variant images"
  ON public.product_variant_images FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update product variant images"
  ON public.product_variant_images FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete product variant images"
  ON public.product_variant_images FOR DELETE
  USING (public.is_admin());

INSERT INTO public.product_variant_images (variant_id, url, display_order)
SELECT variant.id, variant.image_url, 0
FROM public.product_variants AS variant
WHERE variant.image_url IS NOT NULL
  AND BTRIM(variant.image_url) <> ''
ON CONFLICT (variant_id, url) DO NOTHING;
