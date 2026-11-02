ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS admin_replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_replied_by UUID;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN
    GENERATED ALWAYS AS (order_id IS NOT NULL) STORED;

CREATE INDEX IF NOT EXISTS idx_reviews_order_id
  ON public.reviews(order_id)
  WHERE order_id IS NOT NULL;

WITH verified_orders AS (
  SELECT DISTINCT ON (r.id)
    r.id AS review_id,
    o.id AS order_id
  FROM public.reviews AS r
  JOIN public.orders AS o
    ON o.user_id = r.user_id
   AND o.status = 'delivered'
  JOIN public.order_items AS oi
    ON oi.order_id = o.id
   AND oi.product_id = r.product_id
  WHERE EXISTS (
    SELECT 1
    FROM public.payments AS p
    WHERE p.order_id = o.id
      AND p.status = 'success'
  )
  ORDER BY r.id, o.created_at, o.id
)
UPDATE public.reviews AS r
SET order_id = verified_orders.order_id
FROM verified_orders
WHERE r.id = verified_orders.review_id
  AND r.order_id IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_verified_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_requires_purchase_check BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_requires_purchase_check := TRUE;
    IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Ulasan hanya dapat dibuat oleh pemilik akun.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.order_id IS NULL THEN
      RAISE EXCEPTION 'Pesanan yang sudah diterima wajib dipilih untuk mengirim ulasan.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.admin_reply IS NOT NULL
      OR NEW.admin_replied_at IS NOT NULL
      OR NEW.admin_replied_by IS NOT NULL THEN
      RAISE EXCEPTION 'Balasan admin tidak dapat disertakan saat membuat ulasan.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    v_requires_purchase_check :=
      NEW.order_id IS DISTINCT FROM OLD.order_id
      OR NEW.rating IS DISTINCT FROM OLD.rating
      OR NEW.comment IS DISTINCT FROM OLD.comment
      OR NEW.image_url IS DISTINCT FROM OLD.image_url;

    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.product_id IS DISTINCT FROM OLD.product_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Identitas ulasan tidak dapat diubah.'
        USING ERRCODE = '42501';
    END IF;

    v_is_admin := COALESCE(public.is_admin(), FALSE);

    IF (
      NEW.admin_reply IS DISTINCT FROM OLD.admin_reply
      OR NEW.admin_replied_at IS DISTINCT FROM OLD.admin_replied_at
      OR NEW.admin_replied_by IS DISTINCT FROM OLD.admin_replied_by
    ) AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Hanya admin yang dapat mengubah balasan ulasan.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.rating IS DISTINCT FROM OLD.rating
      OR NEW.comment IS DISTINCT FROM OLD.comment
      OR NEW.image_url IS DISTINCT FROM OLD.image_url
      OR NEW.order_id IS DISTINCT FROM OLD.order_id THEN
      IF auth.uid() IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Hanya pemilik ulasan yang dapat mengubah isi ulasan.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF NEW.admin_reply IS NOT NULL AND (
    pg_catalog.btrim(NEW.admin_reply) = ''
    OR char_length(NEW.admin_reply) > 1000
    OR NEW.admin_replied_at IS NULL
    OR NEW.admin_replied_by IS DISTINCT FROM auth.uid()
  ) THEN
    RAISE EXCEPTION 'Balasan admin tidak valid.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.admin_reply IS NULL AND (
    NEW.admin_replied_at IS NOT NULL
    OR NEW.admin_replied_by IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Metadata balasan harus dihapus bersama balasannya.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.comment IS NOT NULL AND char_length(NEW.comment) > 1000 THEN
    RAISE EXCEPTION 'Ulasan maksimal 1000 karakter.'
      USING ERRCODE = '22001';
  END IF;

  IF v_requires_purchase_check THEN
    IF NEW.order_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.orders AS o
      JOIN public.order_items AS oi
        ON oi.order_id = o.id
       AND oi.product_id = NEW.product_id
      WHERE o.id = NEW.order_id
        AND o.user_id = NEW.user_id
        AND o.status = 'delivered'
        AND EXISTS (
          SELECT 1
          FROM public.payments AS p
          WHERE p.order_id = o.id
            AND p.status = 'success'
        )
    ) THEN
      RAISE EXCEPTION 'Ulasan hanya dapat diberikan untuk produk dalam pesanan lunas yang sudah diterima.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.user_id::TEXT || ':' || NEW.product_id::TEXT, 0)
  );

  IF TG_OP = 'INSERT' AND EXISTS (
    SELECT 1
    FROM public.reviews AS existing
    WHERE existing.user_id = NEW.user_id
      AND existing.product_id = NEW.product_id
      AND existing.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'Anda sudah memberikan ulasan untuk produk ini.'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_verified_review ON public.reviews;
CREATE TRIGGER enforce_verified_review
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_verified_review();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their reviews" ON public.reviews;

CREATE POLICY "Public can view reviews"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert verified reviews"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users and admins can update reviews"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()))
  WITH CHECK ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

CREATE POLICY "Users and admins can delete reviews"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_admin()));

REVOKE ALL ON public.reviews FROM anon, authenticated;
GRANT SELECT (
  id,
  product_id,
  user_id,
  rating,
  comment,
  image_url,
  created_at,
  updated_at,
  is_verified,
  admin_reply,
  admin_replied_at
) ON public.reviews TO anon, authenticated;
GRANT INSERT (user_id, product_id, order_id, rating, comment, image_url)
  ON public.reviews TO authenticated;
GRANT UPDATE (
  rating,
  comment,
  image_url,
  order_id,
  admin_reply,
  admin_replied_at,
  admin_replied_by,
  updated_at
) ON public.reviews TO authenticated;
GRANT DELETE ON public.reviews TO authenticated;