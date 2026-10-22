-- Preserve the customer's transaction-time identity inside the existing
-- shipping_address JSON. This remains available after the Auth profile is deleted.
CREATE OR REPLACE FUNCTION public.snapshot_order_customer_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_name TEXT;
  v_profile_phone TEXT;
  v_customer_email TEXT;
  v_snapshot JSONB;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT profile.full_name, profile.phone
  INTO v_profile_name, v_profile_phone
  FROM public.users AS profile
  WHERE profile.id = NEW.user_id;

  SELECT identity.email
  INTO v_customer_email
  FROM auth.users AS identity
  WHERE identity.id = NEW.user_id;

  v_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'name', COALESCE(
      NULLIF(BTRIM(NEW.shipping_address ->> 'recipient_name'), ''),
      NULLIF(BTRIM(v_profile_name), '')
    ),
    'email', NULLIF(BTRIM(v_customer_email), ''),
    'phone', COALESCE(
      NULLIF(BTRIM(NEW.shipping_address ->> 'phone'), ''),
      NULLIF(BTRIM(v_profile_phone), '')
    )
  ));

  NEW.shipping_address := COALESCE(NEW.shipping_address, '{}'::JSONB)
    || jsonb_build_object('customer_snapshot', v_snapshot);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_order_customer_identity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS snapshot_order_customer_identity_before_insert ON public.orders;
CREATE TRIGGER snapshot_order_customer_identity_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_order_customer_identity();
