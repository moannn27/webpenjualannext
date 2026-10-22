-- Preserve transaction and voucher history when an account is permanently deleted.
-- Auth user deletion still cascades to public.users; these nullable references are
-- detached so they do not block that cascade or erase historical records.
ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_user_id_fkey,
  ADD CONSTRAINT orders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.voucher_reservations
  ALTER COLUMN user_id DROP NOT NULL;

UPDATE public.voucher_reservations AS reservations
SET user_id = NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE users.id = reservations.user_id
);

ALTER TABLE public.voucher_reservations
  ADD CONSTRAINT voucher_reservations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Storage objects are owned outside the public Data API. This narrow RPC lets
-- the server find an account's objects, which it then removes with Storage API.
CREATE OR REPLACE FUNCTION public.list_user_storage_objects(p_user_id UUID)
RETURNS TABLE(bucket_id TEXT, name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT objects.bucket_id, objects.name
  FROM storage.objects AS objects
  WHERE objects.owner_id = p_user_id::TEXT
    OR (
      objects.bucket_id = 'avatars'
      AND (
        split_part(objects.name, '/', 1) = p_user_id::TEXT
        OR left(objects.name, length(p_user_id::TEXT) + 1) = p_user_id::TEXT || '.'
        OR left(objects.name, length(p_user_id::TEXT) + 1) = p_user_id::TEXT || '-'
        OR left(objects.name, length(p_user_id::TEXT) + 1) = p_user_id::TEXT || '_'
      )
    )
    OR (
      objects.bucket_id = 'reviews'
      AND (
        split_part(objects.name, '/', 1) = p_user_id::TEXT
        OR objects.name LIKE '%/' || p_user_id::TEXT || '/%'
        OR left(objects.name, length(p_user_id::TEXT) + 1) = p_user_id::TEXT || '.'
        OR left(objects.name, length(p_user_id::TEXT) + 1) = p_user_id::TEXT || '-'
        OR left(objects.name, length(p_user_id::TEXT) + 1) = p_user_id::TEXT || '_'
      )
    );
$$;

REVOKE ALL ON FUNCTION public.list_user_storage_objects(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_user_storage_objects(UUID) TO service_role;

-- Serialize concurrent account deletions so two requests cannot both pass the
-- application-level "last super admin" count and remove every super admin.
CREATE OR REPLACE FUNCTION public.guard_last_super_admin_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_super_admin_count BIGINT;
BEGIN
  IF OLD.role = 'super_admin'::public.user_role THEN
    PERFORM pg_advisory_xact_lock(71420, 261107);
    SELECT count(*) INTO v_super_admin_count
    FROM public.users
    WHERE role = 'super_admin'::public.user_role;

    IF v_super_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot delete the last super admin.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_last_super_admin_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_last_super_admin_delete ON public.users;
CREATE TRIGGER trg_guard_last_super_admin_delete
  BEFORE DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_last_super_admin_delete();
