-- Migration 20261105000000: Atomic Voucher Quota Management & User Role Protection
-- 1. Checks and sanitizes existing data before applying CHECK constraints
-- 2. Enforces table-level constraints ensuring voucher usage_count cannot exceed usage_limit
-- 3. Implements secure, non-replayable voucher reservation & consumption mechanism
-- 4. Restricts voucher quota manipulation RPCs strictly to service_role (revoked from authenticated/anon)
-- 5. Hardens public.users permissions with a bulletproof BEFORE UPDATE trigger preventing role tampering

-- ============================================================================
-- 1. SANITIZE EXISTING DATA BEFORE APPLYING CONSTRAINTS
-- Fixes any anomalous rows in public.vouchers to prevent migration failure.
-- ============================================================================
UPDATE public.vouchers
SET usage_count = 0
WHERE usage_count < 0;

UPDATE public.vouchers
SET usage_count = usage_limit
WHERE usage_limit IS NOT NULL AND usage_count > usage_limit;

-- ============================================================================
-- 2. VOUCHERS TABLE CONSTRAINTS
-- ============================================================================
ALTER TABLE public.vouchers
DROP CONSTRAINT IF EXISTS check_voucher_usage_limit;

ALTER TABLE public.vouchers
ADD CONSTRAINT check_voucher_usage_limit
CHECK (usage_limit IS NULL OR usage_count <= usage_limit);

ALTER TABLE public.vouchers
DROP CONSTRAINT IF EXISTS check_voucher_usage_count_non_negative;

ALTER TABLE public.vouchers
ADD CONSTRAINT check_voucher_usage_count_non_negative
CHECK (usage_count >= 0);

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

ALTER TABLE public.voucher_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.voucher_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.voucher_reservations TO service_role;

-- ============================================================================
-- 4. ATOMIC VOUCHER QUOTA CLAIM RPC (service_role only)
-- Atomically increments usage_count and creates a reservation record.
-- Concurrently safe under PostgreSQL row-level locks.
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

    -- Strict check against limit
    IF v_voucher.usage_limit IS NOT NULL AND v_voucher.usage_count >= v_voucher.usage_limit THEN
        RETURN NULL;
    END IF;

    -- 2. Increment usage_count atomically
    UPDATE public.vouchers
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = v_voucher.id;

    -- 3. Create reservation record
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
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_voucher_reservation(
    p_reservation_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_res RECORD;
BEGIN
    -- 1. Lock reservation row FOR UPDATE
    SELECT * INTO v_res
    FROM public.voucher_reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    -- If not found OR already released OR already consumed, return false without touching usage_count
    IF NOT FOUND OR v_res.status <> 'reserved' THEN
        RETURN FALSE;
    END IF;

    -- 2. Mark reservation as released
    UPDATE public.voucher_reservations
    SET status = 'released',
        updated_at = NOW()
    WHERE id = p_reservation_id;

    -- 3. Safely decrement usage_count
    UPDATE public.vouchers
    SET usage_count = GREATEST(0, usage_count - 1),
        updated_at = NOW()
    WHERE id = v_res.voucher_id;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.release_voucher_reservation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_voucher_reservation(UUID) TO service_role;

-- ============================================================================
-- 7. HARDEN PUBLIC.USERS TABLE-LEVEL PRIVILEGES
-- Re-assert explicit revocation of table-level UPDATE privileges for authenticated,
-- public, and anon roles. Only specific profile fields may be updated.
-- ============================================================================
REVOKE ALL ON TABLE public.users FROM PUBLIC, anon;
REVOKE UPDATE ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, role, created_at, updated_at) ON TABLE public.users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT UPDATE (full_name, phone, home_address) ON TABLE public.users TO authenticated;

-- ============================================================================
-- 8. BULLETPROOF BEFORE UPDATE TRIGGER ON PUBLIC.USERS
-- Prevents any unauthorized modification of the 'role' column, even if a future
-- migration or administrative mistake inadvertently grants table-level UPDATE.
-- Super admins executing admin_update_user_role and system/service_role remain allowed.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.guard_user_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_super_admin BOOLEAN;
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Allow internal service_role and postgres superuser maintenance
        IF current_user IN ('postgres', 'supabase_admin') OR auth.role() = 'service_role' THEN
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
