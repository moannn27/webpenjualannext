CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.can_manage_review_content()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT users.role = 'super_admin'
      FROM public.users AS users
      WHERE users.id = (SELECT auth.uid())
    ),
    FALSE
  ) OR EXISTS (
    SELECT 1
    FROM public.users AS users
    JOIN public.storefront_settings AS settings
      ON settings.id = 'main'
    WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
      AND CASE
        WHEN pg_catalog.jsonb_typeof(
          settings.settings -> 'admin_permissions' -> users.id::TEXT
        ) = 'array'
        THEN (
          settings.settings -> 'admin_permissions' -> users.id::TEXT
        ) @> '["content"]'::JSONB
        ELSE FALSE
      END
  );
$$;

REVOKE ALL ON FUNCTION private.can_manage_review_content() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_manage_review_content() TO authenticated;

DROP POLICY IF EXISTS "Users and admins can update reviews" ON public.reviews;
CREATE POLICY "Users and content admins can update reviews"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT private.can_manage_review_content())
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR (SELECT private.can_manage_review_content())
  );

DROP POLICY IF EXISTS "Users and admins can delete reviews" ON public.reviews;
CREATE POLICY "Users and content admins can delete reviews"
  ON public.reviews
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT private.can_manage_review_content())
  );
