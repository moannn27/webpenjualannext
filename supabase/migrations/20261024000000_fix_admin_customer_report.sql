CREATE OR REPLACE FUNCTION public.get_admin_customers_report(
    p_offset INTEGER DEFAULT 0,
    p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ,
    total_orders BIGINT,
    completed_orders BIGINT,
    completed_spend NUMERIC,
    last_order_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.users AS admin_user
        WHERE admin_user.id = auth.uid() AND admin_user.role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH customer_order_totals AS (
        SELECT o.user_id,
               COUNT(*)::BIGINT AS total_orders,
               COUNT(*) FILTER (WHERE o.status = 'delivered')::BIGINT AS completed_orders,
               COALESCE(SUM(o.grand_total) FILTER (WHERE o.status = 'delivered'), 0)::NUMERIC AS completed_spend,
               MAX(o.created_at) AS last_order_at
        FROM public.orders AS o
        GROUP BY o.user_id
    )
    SELECT u.id, u.full_name, u.phone, u.created_at,
           COALESCE(t.total_orders, 0), COALESCE(t.completed_orders, 0),
           COALESCE(t.completed_spend, 0), t.last_order_at
    FROM public.users AS u
    LEFT JOIN customer_order_totals AS t ON t.user_id = u.id
    WHERE u.role = 'customer'
    ORDER BY u.created_at DESC, u.id
    OFFSET LEAST(GREATEST(COALESCE(p_offset, 0), 0), 1000000000)
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 500), 1), 500);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_customers_report(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_customers_report(INTEGER, INTEGER) TO authenticated;
