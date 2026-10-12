-- Migration 20261029000000: Security Hardening for RLS, Grants, and SECURITY DEFINER functions
-- Closes direct customer order/order_item insertion, adds WITH CHECK constraints,
-- sets search_path = '' on all definer/trigger functions, and revokes excessive grants.

-- ============================================================================
-- 1. REVOKE EXCESSIVE WRITE PRIVILEGES FROM ANON AND PUBLIC
-- ============================================================================
REVOKE INSERT, UPDATE, DELETE ON TABLE
    public.users,
    public.orders,
    public.order_items,
    public.payments,
    public.cart,
    public.cart_items,
    public.addresses,
    public.products,
    public.product_variants,
    public.product_images,
    public.product_specifications,
    public.categories,
    public.brands,
    public.vouchers,
    public.storefront_settings,
    public.shipping_methods
FROM PUBLIC, anon;

-- ============================================================================
-- 2. HARDEN ORDERS & ORDER_ITEMS RLS POLICIES
-- Regular orders MUST ONLY be created via atomic process_checkout RPC (SECURITY DEFINER).
-- Direct table insertion is restricted exclusively to authenticated admins.
-- ============================================================================
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON public.orders;

CREATE POLICY "Admins can insert orders"
    ON public.orders FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can insert order items" ON public.order_items;

CREATE POLICY "Admins can insert order items"
    ON public.order_items FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

-- ============================================================================
-- 3. HARDEN UPDATE POLICIES WITH 'WITH CHECK' (PREVENT ROW REASSIGNMENT / IDOR)
-- ============================================================================
DROP POLICY IF EXISTS "Users can update cart items" ON public.cart_items;
CREATE POLICY "Users can update cart items"
    ON public.cart_items FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.cart WHERE cart.id = cart_items.cart_id AND cart.user_id = (SELECT auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.cart WHERE cart.id = cart_items.cart_id AND cart.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can update their addresses" ON public.addresses;
CREATE POLICY "Users can update their addresses"
    ON public.addresses FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id OR public.is_admin())
    WITH CHECK ((SELECT auth.uid()) = user_id OR public.is_admin());

-- ============================================================================
-- 4. HARDEN SECURITY DEFINER HELPER: public.is_admin()
-- Search path secured against hijacking, explicit schema qualification.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin')
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ============================================================================
-- 5. HARDEN AUTH/USER TRIGGER FUNCTIONS (SECURE SEARCH_PATH & REVOKE DIRECT EXECUTE)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.users (id, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        'customer'
    );
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user_cart()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.cart (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user_cart() FROM PUBLIC, anon, authenticated;

-- Ensure trigger functions cannot be called via direct RPC
REVOKE ALL ON FUNCTION public.assign_daily_order_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.snapshot_pickup_location() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_storefront_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_storefront_settings_timestamp() FROM PUBLIC, anon, authenticated;

