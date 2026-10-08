-- Human-readable daily order numbers. The counter row is atomically incremented,
-- so concurrent checkouts cannot receive the same sequence for a Jakarta day.
CREATE TABLE IF NOT EXISTS public.order_number_counters (
    order_date DATE PRIMARY KEY,
    last_number BIGINT NOT NULL CHECK (last_number > 0)
);

REVOKE ALL ON public.order_number_counters FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assign_daily_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order_date DATE;
    v_sequence BIGINT;
BEGIN
    v_order_date := (COALESCE(NEW.created_at, NOW()) AT TIME ZONE 'Asia/Jakarta')::DATE;

    INSERT INTO public.order_number_counters (order_date, last_number)
    VALUES (v_order_date, 1)
    ON CONFLICT (order_date) DO UPDATE
      SET last_number = public.order_number_counters.last_number + 1
    RETURNING last_number INTO v_sequence;

    NEW.order_number := 'ORD-' || TO_CHAR(v_order_date, 'YYYYMMDD') || '-' || LPAD(v_sequence::TEXT, 2, '0');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_daily_order_number ON public.orders;
CREATE TRIGGER assign_daily_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.assign_daily_order_number();
