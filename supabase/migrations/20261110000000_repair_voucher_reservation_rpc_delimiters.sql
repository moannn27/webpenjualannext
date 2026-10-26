-- Migration 20261110000000: Repair Voucher Reservation Delimiters and Compatibility
-- Ensures public.release_voucher_reservation, public.consume_voucher_reservation,
-- and public.cleanup_expired_voucher_reservations are properly installed and idempotent
-- in environments where migration 20261105000000 was previously tracked.

CREATE OR REPLACE FUNCTION public.consume_voucher_reservation(
    p_reservation_id UUID,
    p_order_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_res RECORD;
BEGIN
    SELECT * INTO v_res
    FROM public.voucher_reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Idempotent check: If already consumed by this exact order, succeed safely
    IF v_res.status = 'consumed' AND v_res.order_id = p_order_id THEN
        RETURN TRUE;
    END IF;

    IF v_res.status <> 'reserved' THEN
        RETURN FALSE;
    END IF;

    UPDATE public.voucher_reservations
    SET status = 'consumed',
        order_id = p_order_id,
        updated_at = NOW()
    WHERE id = p_reservation_id;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_voucher_reservation(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_voucher_reservation(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.release_voucher_reservation(
    p_reservation_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_voucher_id UUID;
BEGIN
    -- 1. Identify parent voucher_id without holding lock yet
    SELECT voucher_id INTO v_voucher_id
    FROM public.voucher_reservations
    WHERE id = p_reservation_id AND status = 'reserved';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- 2. Lock parent voucher FIRST (consistent hierarchy: vouchers -> voucher_reservations)
    PERFORM 1
    FROM public.vouchers
    WHERE id = v_voucher_id
    FOR UPDATE;

    -- 3. Mark reservation as released (only if still 'reserved')
    UPDATE public.voucher_reservations
    SET status = 'released',
        updated_at = NOW()
    WHERE id = p_reservation_id AND status = 'reserved';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- 4. Safely decrement usage_count
    UPDATE public.vouchers
    SET usage_count = GREATEST(0, usage_count - 1),
        updated_at = NOW()
    WHERE id = v_voucher_id;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.release_voucher_reservation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_voucher_reservation(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_expired_voucher_reservations(
    p_older_than_minutes INT DEFAULT 15
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_voucher_id UUID;
    v_reclaimed_count INT := 0;
    v_total_cleaned INT := 0;
BEGIN
    IF p_older_than_minutes IS NULL OR p_older_than_minutes < 1 THEN
        p_older_than_minutes := 15;
    END IF;

    -- 1. Identify distinct vouchers that have stale reservations
    FOR v_voucher_id IN
        SELECT DISTINCT voucher_id
        FROM public.voucher_reservations
        WHERE status = 'reserved'
          AND created_at < NOW() - (p_older_than_minutes || ' minutes')::interval
    LOOP
        -- 2. Lock parent voucher FIRST with SKIP LOCKED
        -- Consistent locking order: public.vouchers -> public.voucher_reservations
        PERFORM 1
        FROM public.vouchers
        WHERE id = v_voucher_id
        FOR UPDATE SKIP LOCKED;

        IF FOUND THEN
            -- 3. Atomically release stale reservations for this locked voucher
            WITH stale_released AS (
                UPDATE public.voucher_reservations
                SET status = 'released',
                    updated_at = NOW()
                WHERE voucher_id = v_voucher_id
                  AND status = 'reserved'
                  AND created_at < NOW() - (p_older_than_minutes || ' minutes')::interval
                RETURNING id
            )
            SELECT count(*) INTO v_reclaimed_count FROM stale_released;

            -- 4. Decrement usage_count accordingly
            IF v_reclaimed_count > 0 THEN
                UPDATE public.vouchers
                SET usage_count = GREATEST(0, usage_count - v_reclaimed_count),
                    updated_at = NOW()
                WHERE id = v_voucher_id;

                v_total_cleaned := v_total_cleaned + v_reclaimed_count;
            END IF;
        END IF;
    END LOOP;

    RETURN v_total_cleaned;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_voucher_reservations(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_voucher_reservations(INT) TO service_role;
