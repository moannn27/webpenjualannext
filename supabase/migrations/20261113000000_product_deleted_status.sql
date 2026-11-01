-- Preserve product and variant rows referenced by historical orders while
-- allowing admins to remove them from catalog and archive views.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_status_check
  CHECK (status IN ('draft', 'published', 'archived', 'deleted'));
