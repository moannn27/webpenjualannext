-- Editable homepage carousel and promotional banner content.
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'hero',
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS button_label TEXT;

ALTER TABLE public.banners
  ADD CONSTRAINT banners_placement_check CHECK (placement IN ('hero', 'promo'));

CREATE INDEX IF NOT EXISTS idx_banners_placement_order
  ON public.banners (placement, display_order);

-- Only super admins can change homepage content. Regular admins may still read it.
DROP POLICY IF EXISTS "Admins can insert banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can update banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can delete banners" ON public.banners;

CREATE POLICY "Super admins can insert banners" ON public.banners
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );
CREATE POLICY "Super admins can update banners" ON public.banners
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );
CREATE POLICY "Super admins can delete banners" ON public.banners
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );
