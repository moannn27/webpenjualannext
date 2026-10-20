-- Migration 20261105000000: Atomic Voucher Quota Management & User Role Protection
-- 1. Enforces non-negative usage constraint (NOT VALID) and safe quota guard trigger
--    ensuring old oversubscribed vouchers do NOT fail when decremented/updated.
-- 2. Strictly avoids any silent mutation of historical voucher or order data.
-- 3. Implements secure, non-replayable voucher reservation & consumption with automatic 15-minute expiry.
-- 4. Restricts voucher quota manipulation RPCs strictly to service_role (revoked from authenticated/anon).
-- 5. Hardens public.users permissions with a bulletproof BEFORE UPDATE trigger preventing role tampering
--    without SECURITY DEFINER / current_user bypass flaws.

-- ============================================================================
-- 1. AUDIT POLICY: ZERO SILENT DATA MODIFICATIONS
-- Historical data is preserved as-is. We do NOT run silent UPDATE statements on
-- existing rows in public.vouchers. Any historical anomalies (e.g. usage_count > usage_limit)
-- are left intact so audit trails remain genuine and quota-leak risks on cancellation are avoided.
-- ============================================================================

-- ============================================================================
-- 2. VOUCHERS TABLE CONSTRAINTS & SAFE QUOTA GUARD TRIGGER
-- A naive table-level "CHECK (usage_count <= usage_limit)" would crash any subsequent
-- update or reservation release on historical oversubscribed vouchers (e.g. 12 -> 11).
-- Instead, we:
-- a) Drop any legacy restrictive check_voucher_usage_limit constraint.
-- b) Add check_voucher_usage_count_non_negative with NOT VALID.
-- c) Use a specialized BEFORE INSERT OR UPDATE trigger that strictly blocks new quota
--    overflows while explicitly allowing decrements (releasing reservations/cancellations)
--    and non-quota metadata updates on existing historical vouchers.
-- ============================================================================
ALTER TABLE public.vouchers
DROP CONSTRAINT IF EXISTS check_voucher_usage_limit;

ALTER TABLE public.vouchers
DROP CONSTRAINT IF EXISTS check_voucher_usage_count_non_negative;

ALTER TABLE public.vouchers
ADD CONSTRAINT check_voucher_usage_count_non_negative
CHECK (usage_count >= 0)
NOT VALID;

CREATE OR REPLACE FUNCTION public.guard_voucher_usage_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Ensure usage_count is never negative
    IF NEW.usage_count < 0 THEN
        RAISE EXCEPTION 'Voucher usage_count cannot be negative.'
            USING ERRCODE = '23514';
    END IF;

    -- 2. Prevent quota overflow on new vouchers (INSERT)
    IF TG_OP = 'INSERT' THEN
        IF NEW.usage_limit IS NOT NULL AND NEW.usage_count > NEW.usage_limit THEN
            RAISE EXCEPTION 'Voucher usage_count (%) exceeds usage_limit (%).', NEW.usage_count, NEW.usage_limit
                USING ERRCODE = '23514';
        END IF;
    END IF;

    -- 3. Prevent quota overflow on UPDATE:
    -- Only blocks if usage_count is being INCREMENTED above usage_limit.
    -- Explicitly allows DECREMENTS (e.g. 12 -> 11 when releasing reservations or cancelling orders)
    -- and metadata updates (is_active, title, dates) on existing historical vouchers.
    IF TG_OP = 'UPDATE' THEN
        IF NEW.usage_limit IS NOT NULL THEN
            IF NEW.usage_count > OLD.usage_count AND NEW.usage_count > NEW.usage_limit THEN
                RAISE EXCEPTION 'Voucher usage_count (%) cannot be incremented beyond usage_limit (%).', NEW.usage_count, NEW.usage_limit
                    USING ERRCODE = '23514';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_voucher_usage_limit ON public.vouchers;
CREATE TRIGGER trg_guard_voucher_usage_limit
    BEFORE INSERT OR UPDATE ON public.vouchers
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_voucher_usage_limit();

-- ============================================================================
-- 3. VOUCHER RESERVATIONS TABLE
-- Tracks atomic reservation tokens to guarantee quota releases are non-replayable
-- and cannot decrease counts of completed orders.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.voucher_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('reserved', 'consumed', 'released')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voucher_reservations_voucher_id ON public.voucher_reservations(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_reservations_status ON public.voucher_reservations(status);
CREATE INDEX IF NOT EXISTS idx_voucher_reservations_stale_active ON public.voucher_reservations(voucher_id, created_at)
    WHERE status = 'reserved';

ALTER TABLE public.voucher_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.voucher_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.voucher_reservations TO service_role;

-- ============================================================================
-- 4. ATOMIC VOUCHER QUOTA CLAIM RPC (service_role only)
-- Atomically increments usage_count and creates a reservation record.
-- Opportunistically reclaims stale reservations (> 15 mins) for this voucher
-- so orphaned reservations from crashes never permanently lock quota.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_voucher_quota(
    p_voucher_id UUID,
    p_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_voucher RECORD;
    v_reservation_id UUID;
    v_reclaimed_count INT := 0;
BEGIN
    -- 1. Lock voucher row FOR UPDATE
    SELECT id, is_active, usage_limit, usage_count, start_date, end_date
    INTO v_voucher
    FROM public.vouchers
    WHERE id = p_voucher_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    IF NOT v_voucher.is_active THEN
        RETURN NULL;
    END IF;

    IF v_voucher.start_date IS NOT NULL AND NOW() < v_voucher.start_date THEN
        RETURN NULL;
    END IF;

    IF v_voucher.end_date IS NOT NULL AND NOW() > v_voucher.end_date THEN
        RETURN NULL;
    END IF;

    -- 2. Opportunistically reclaim stale reservations (> 15 minutes old) for this voucher
    -- Prevents server crash or dropped connection from locking quota forever.
    WITH stale_released AS (
        UPDATE public.voucher_reservations
        SET status = 'released',
            updated_at = NOW()
        WHERE voucher_id = p_voucher_id
          AND status = 'reserved'
          AND created_at < NOW() - INTERVAL '15 minutes'
        RETURNING id
    )
    SELECT count(*) INTO v_reclaimed_count FROM stale_released;

    IF v_reclaimed_count > 0 THEN
        UPDATE public.vouchers
        SET usage_count = GREATEST(0, usage_count - v_reclaimed_count),
            updated_at = NOW()
        WHERE id = p_voucher_id;

        v_voucher.usage_count := GREATEST(0, v_voucher.usage_count - v_reclaimed_count);
    END IF;

    -- 3. Strict check against limit
    IF v_voucher.usage_limit IS NOT NULL AND v_voucher.usage_count >= v_voucher.usage_limit THEN
        RETURN NULL;
    END IF;

    -- 4. Increment usage_count atomically
    UPDATE public.vouchers
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = v_voucher.id;

    -- 5. Create reservation record
    INSERT INTO public.voucher_reservations (voucher_id, user_id, status)
    VALUES (v_voucher.id, p_user_id, 'reserved')
    RETURNING id INTO v_reservation_id;

    RETURN v_reservation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_voucher_quota(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_voucher_quota(UUID, UUID) TO service_role;

-- ============================================================================
-- 5. CONSUME VOUCHER RESERVATION RPC (service_role only)
-- Permanently locks a reservation as consumed when an order checkout succeeds.
-- Idempotent & non-replayable: only transitions from 'reserved' -> 'consumed'.
-- ============================================================================
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

    IF NOT FOUND OR v_res.status <> 'reserved' THEN
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

-- ============================================================================
-- 6. ATOMIC VOUCHER QUOTA RELEASE RPC (service_role only)
-- Non-replayable rollback: Only decrements usage_count if the reservation is
-- still in 'reserved' state. Once consumed or released, repeat calls are NO-OP.
-- DEADLOCK PREVENTION: Enforces uniform locking order (public.vouchers -> public.voucher_reservations)
-- matching claim_voucher_quota and cleanup_expired_voucher_reservations.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_voucher_reservation(
    p_reservation_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $
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
$;

REVOKE ALL ON FUNCTION public.release_voucher_reservation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_voucher_reservation(UUID) TO service_role;

-- ============================================================================
-- 7. CLEANUP EXPIRED VOUCHER RESERVATIONS RPC (service_role only)
-- Periodic maintenance function to sweep any stale reservations across all vouchers.
-- DEADLOCK PREVENTION: Enforces uniform locking order (public.vouchers -> public.voucher_reservations)
-- matching claim_voucher_quota. Uses FOR UPDATE SKIP LOCKED on vouchers, guaranteeing that
-- if claim_voucher_quota is currently processing a voucher, cleanup gracefully skips it
-- without blocking or deadlocking (claim_voucher_quota reclaims stale rows inline anyway).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_voucher_reservations(
    p_older_than_minutes INT DEFAULT 15
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $
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
$;

REVOKE ALL ON FUNCTION public.cleanup_expired_voucher_reservations(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_voucher_reservations(INT) TO service_role;

-- ============================================================================
-- 8. HARDEN PUBLIC.USERS TABLE-LEVEL PRIVILEGES
-- Re-assert explicit revocation of table-level UPDATE privileges for authenticated,
-- public, and anon roles. Only specific profile fields may be updated.
-- ============================================================================
REVOKE ALL ON TABLE public.users FROM PUBLIC, anon;
REVOKE UPDATE ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, role, created_at, updated_at) ON TABLE public.users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT UPDATE (full_name, phone, home_address) ON TABLE public.users TO authenticated;

-- ============================================================================
-- 9. BULLETPROOF BEFORE UPDATE TRIGGER ON PUBLIC.USERS
-- Prevents any unauthorized modification of the 'role' column.
-- SECURITY DEFINER BARS: Does NOT check current_user, because inside a SECURITY DEFINER
-- function current_user is ALWAYS the function owner ('postgres'), which caused a bypass!
-- Instead, inspects auth.role() and auth.uid() from the client JWT session, ensuring:
-- - Direct DB maintenance (psql/migrations) is permitted only when no JWT claim is present.
-- - Internal service_role backend calls are permitted.
-- - Regular users (customer) and ordinary staff (admin) are strictly blocked (42501).
-- - Super admins executing through admin_update_user_role are permitted.
-- - Self-demotion and demoting the last super admin are blocked (22023).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_user_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_super_admin BOOLEAN;
    v_super_admin_count BIGINT;
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Allow internal service_role and direct database console / migration maintenance
        -- (where auth.role and request.jwt claims are completely unset).
        -- NEVER test current_user here: in a SECURITY DEFINER function, current_user
        -- evaluates to 'postgres' for ALL callers, which previously opened a bypass!
        IF auth.role() = 'service_role'
           OR (session_user IN ('postgres', 'supabase_admin')
               AND nullif(current_setting('request.jwt.claim.role', true), '') IS NULL
               AND nullif(current_setting('request.jwt.claim.sub', true), '') IS NULL) THEN
            RETURN NEW;
        END IF;

        -- Verify caller is an authenticated super_admin
        SELECT EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'super_admin'
        ) INTO v_is_super_admin;

        IF NOT v_is_super_admin THEN
            RAISE EXCEPTION 'Modifying user role is restricted exclusively to super administrators.'
                USING ERRCODE = '42501';
        END IF;

        -- Prevent self-demotion
        IF OLD.id = auth.uid() AND NEW.role <> 'super_admin' THEN
            RAISE EXCEPTION 'A super admin cannot demote their own account.'
                USING ERRCODE = '22023';
        END IF;

        -- Prevent demoting the last super admin
        IF OLD.role = 'super_admin' AND NEW.role <> 'super_admin' THEN
            SELECT count(*) INTO v_super_admin_count
            FROM public.users
            WHERE role = 'super_admin';
            IF v_super_admin_count <= 1 THEN
                RAISE EXCEPTION 'Cannot demote the last super admin.'
                    USING ERRCODE = '22023';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_role_update ON public.users;
CREATE TRIGGER trg_guard_user_role_update
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_user_role_update();

REVOKE ALL ON FUNCTION public.guard_user_role_update() FROM PUBLIC, anon, authenticated;
