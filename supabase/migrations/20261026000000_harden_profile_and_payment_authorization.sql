-- Restrict profile updates to self-service fields. Role changes go through a
-- super-admin-only RPC so RLS row ownership cannot grant role-column access.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.users;

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Admins can update all profiles"
    ON public.users FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

REVOKE UPDATE ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, role, full_name, phone, avatar_url, created_at, updated_at, home_address)
    ON TABLE public.users FROM PUBLIC, anon, authenticated;
GRANT UPDATE (full_name, phone, home_address)
    ON TABLE public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    p_user_id UUID,
    p_role public.user_role
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_role public.user_role;
    v_target_role public.user_role;
    v_super_admin_count BIGINT;
BEGIN
    IF auth.uid() IS NULL OR p_user_id IS NULL OR p_role IS NULL
       OR p_role NOT IN ('customer', 'admin', 'super_admin') THEN
        RAISE EXCEPTION 'Invalid role change request.' USING ERRCODE = '22023';
    END IF;

    -- Serialize role changes so concurrent demotions cannot remove the last
    -- super admin. Re-check the actor after obtaining the lock.
    PERFORM pg_catalog.pg_advisory_xact_lock(20261026, 1);

    SELECT role INTO v_actor_role
    FROM public.users
    WHERE id = auth.uid();
    IF NOT FOUND OR v_actor_role IS DISTINCT FROM 'super_admin'::public.user_role THEN
        RAISE EXCEPTION 'Only a super admin can change account roles.' USING ERRCODE = '42501';
    END IF;

    SELECT role INTO v_target_role
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found.' USING ERRCODE = 'P0002';
    END IF;

    IF p_user_id = auth.uid() AND p_role <> 'super_admin' THEN
        RAISE EXCEPTION 'A super admin cannot demote their own account.' USING ERRCODE = '22023';
    END IF;

    IF v_target_role = 'super_admin' AND p_role <> 'super_admin' THEN
        SELECT count(*) INTO v_super_admin_count
        FROM public.users
        WHERE role = 'super_admin';
        IF v_super_admin_count <= 1 THEN
            RAISE EXCEPTION 'Cannot demote the last super admin.' USING ERRCODE = '22023';
        END IF;
    END IF;

    UPDATE public.users SET role = p_role WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_role(UUID, public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, public.user_role) TO authenticated;

-- The older owner-based payment UPDATE policy was removed by
-- 20261006090000_checkout_shipping_hardening.sql. Reassert an admin-only policy
-- and narrow the authenticated grant to the one field used by the admin UI.
DROP POLICY IF EXISTS "System/Admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;

CREATE POLICY "Admins can update payments"
    ON public.payments FOR UPDATE TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

REVOKE UPDATE ON TABLE public.payments FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, order_id, amount, payment_method, status,
               midtrans_transaction_id, midtrans_snap_token, payload, created_at, updated_at)
    ON TABLE public.payments FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status) ON TABLE public.payments TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_payment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_actor_role public.user_role;
BEGIN
    SELECT role INTO v_actor_role
    FROM public.users
    WHERE id = auth.uid();

    IF (NEW.id, NEW.order_id, NEW.amount, NEW.payment_method,
        NEW.midtrans_transaction_id, NEW.midtrans_snap_token, NEW.payload, NEW.created_at)
       IS DISTINCT FROM
       (OLD.id, OLD.order_id, OLD.amount, OLD.payment_method,
        OLD.midtrans_transaction_id, OLD.midtrans_snap_token, OLD.payload, OLD.created_at)
       AND v_actor_role IS DISTINCT FROM 'super_admin'::public.user_role
       AND current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Sensitive payment fields can only be changed by an authorized super admin process.'
            USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'super_admin') THEN
            RAISE EXCEPTION 'Only an admin can change payment status.' USING ERRCODE = '42501';
        END IF;

        IF NOT (
            (OLD.status = 'pending' AND NEW.status IN ('success', 'failed'))
            OR (OLD.status = 'failed' AND NEW.status = 'success')
            OR (OLD.status = 'success' AND NEW.status = 'refunded'
                AND EXISTS (
                    SELECT 1 FROM public.orders
                    WHERE id = NEW.order_id AND status = 'cancelled'
                ))
        ) THEN
            RAISE EXCEPTION 'Invalid payment status transition: % -> %.', OLD.status, NEW.status
                USING ERRCODE = '22023';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_payment_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_payment_update ON public.payments;
CREATE TRIGGER guard_payment_update
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.guard_payment_update();
