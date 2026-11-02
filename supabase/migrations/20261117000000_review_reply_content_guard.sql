CREATE OR REPLACE FUNCTION private.enforce_review_reply_content_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (
    NEW.admin_reply IS DISTINCT FROM OLD.admin_reply
    OR NEW.admin_replied_at IS DISTINCT FROM OLD.admin_replied_at
    OR NEW.admin_replied_by IS DISTINCT FROM OLD.admin_replied_by
  ) AND NOT COALESCE(private.can_manage_review_content(), FALSE) THEN
    RAISE EXCEPTION 'Hanya admin dengan izin Konten yang dapat mengubah balasan ulasan.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_review_reply_content_permission()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_review_reply_content_permission ON public.reviews;
CREATE TRIGGER enforce_review_reply_content_permission
  BEFORE UPDATE OF admin_reply, admin_replied_at, admin_replied_by
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_review_reply_content_permission();