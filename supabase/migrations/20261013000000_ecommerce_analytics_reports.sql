CREATE OR REPLACE FUNCTION public.get_admin_ecommerce_report(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 30), 7), 365);
  v_start DATE := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE - (LEAST(GREATEST(COALESCE(p_days, 30), 7), 365) - 1);
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  WITH scoped_orders AS (
    SELECT id, user_id, status, grand_total, (created_at AT TIME ZONE 'Asia/Jakarta')::DATE AS day
    FROM public.orders
    WHERE created_at >= (v_start::TIMESTAMP AT TIME ZONE 'Asia/Jakarta')
  ), daily AS (
    SELECT day,
           COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT AS orders_count,
           COALESCE(SUM(grand_total) FILTER (WHERE status = 'delivered'), 0)::NUMERIC AS revenue
    FROM scoped_orders
    GROUP BY day
  ), product_order_sales AS (
    SELECT oi.product_id,
           SUM(oi.quantity)::BIGINT AS units_sold,
           SUM(oi.quantity * oi.price)::NUMERIC AS item_revenue,
           COUNT(DISTINCT o.id)::BIGINT AS order_count
    FROM scoped_orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.status = 'delivered'
    GROUP BY oi.product_id
  ), product_sales AS (
    SELECT p.id, p.name,
           COALESCE(pos.units_sold, 0)::BIGINT AS units_sold,
           COALESCE(pos.item_revenue, 0)::NUMERIC AS item_revenue,
           COALESCE(pos.order_count, 0)::BIGINT AS order_count
    FROM public.products p
    LEFT JOIN product_order_sales pos ON pos.product_id = p.id
    WHERE p.status = 'published'
  ), customer_sales AS (
    SELECT u.id, COALESCE(u.full_name, 'Pelanggan') AS name, u.phone,
           COUNT(o.id) FILTER (WHERE o.status = 'delivered')::BIGINT AS completed_orders,
           COALESCE(SUM(o.grand_total) FILTER (WHERE o.status = 'delivered'), 0)::NUMERIC AS spend,
           MAX(o.day) FILTER (WHERE o.status = 'delivered') AS last_order_day
    FROM public.users u
    LEFT JOIN scoped_orders o ON o.user_id = u.id
    WHERE u.role = 'customer'
    GROUP BY u.id, u.full_name, u.phone
  ), summary AS (
    SELECT COUNT(*)::BIGINT AS total_orders,
           COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_orders,
           COUNT(*) FILTER (WHERE status IN ('processing', 'shipped'))::BIGINT AS active_orders,
           COUNT(*) FILTER (WHERE status = 'delivered')::BIGINT AS completed_orders,
           COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT AS cancelled_orders,
           COALESCE(SUM(grand_total) FILTER (WHERE status = 'delivered'), 0)::NUMERIC AS completed_sales,
           COUNT(DISTINCT user_id) FILTER (WHERE status = 'delivered')::BIGINT AS buying_customers
    FROM scoped_orders
  )
  SELECT jsonb_build_object(
    'days', v_days,
    'summary', (SELECT jsonb_build_object(
      'total_orders', total_orders,
      'pending_orders', pending_orders,
      'active_orders', active_orders,
      'completed_orders', completed_orders,
      'cancelled_orders', cancelled_orders,
      'completed_sales', completed_sales,
      'average_order_value', CASE WHEN completed_orders > 0 THEN completed_sales / completed_orders ELSE 0 END,
      'buying_customers', buying_customers,
      'repeat_customers', (SELECT COUNT(*) FROM customer_sales WHERE completed_orders > 1),
      'pending_payment_orders', (SELECT COUNT(DISTINCT p.order_id) FROM public.payments p JOIN scoped_orders o ON o.id = p.order_id WHERE p.status = 'pending' AND o.status <> 'cancelled'),
      'successful_payment_orders', (SELECT COUNT(DISTINCT p.order_id) FROM public.payments p JOIN scoped_orders o ON o.id = p.order_id WHERE p.status = 'success'),
      'failed_payment_orders', (SELECT COUNT(DISTINCT p.order_id) FROM public.payments p JOIN scoped_orders o ON o.id = p.order_id WHERE p.status IN ('failed', 'expired')),
      'refunded_orders', (SELECT COUNT(DISTINCT p.order_id) FROM public.payments p JOIN scoped_orders o ON o.id = p.order_id WHERE p.status = 'refunded'),
      'new_customers', (SELECT COUNT(*) FROM public.users WHERE role = 'customer' AND created_at >= (v_start::TIMESTAMP AT TIME ZONE 'Asia/Jakarta'))
    ) FROM summary),
    'daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'day', dates.day::DATE,
      'orders', COALESCE(daily.orders_count, 0),
      'revenue', COALESCE(daily.revenue, 0)
    ) ORDER BY dates.day), '[]'::JSONB)
      FROM pg_catalog.generate_series(v_start::TIMESTAMP, ((NOW() AT TIME ZONE 'Asia/Jakarta')::DATE)::TIMESTAMP, INTERVAL '1 day') AS dates(day)
      LEFT JOIN daily ON daily.day = dates.day::DATE),
    'best_products', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.units_sold DESC, r.item_revenue DESC), '[]'::JSONB) FROM (SELECT id, name, units_sold, item_revenue, order_count FROM product_sales WHERE units_sold > 0 ORDER BY units_sold DESC, item_revenue DESC LIMIT 10) r),
    'least_products', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.units_sold ASC, r.name), '[]'::JSONB) FROM (SELECT id, name, units_sold, item_revenue, order_count FROM product_sales ORDER BY units_sold ASC, name ASC LIMIT 10) r),
    'top_customers', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.spend DESC, r.completed_orders DESC), '[]'::JSONB) FROM (SELECT id, name, phone, completed_orders, spend, last_order_day FROM customer_sales WHERE completed_orders > 0 ORDER BY spend DESC, completed_orders DESC LIMIT 20) r)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_orders_created_at_status
  ON public.orders (created_at, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items (order_id);

REVOKE ALL ON FUNCTION public.get_admin_ecommerce_report(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_ecommerce_report(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_customers_report(p_offset INTEGER DEFAULT 0, p_limit INTEGER DEFAULT 500)
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
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
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
    FROM public.orders o
    GROUP BY o.user_id
  )
  SELECT u.id, u.full_name, u.phone, u.created_at,
         COALESCE(t.total_orders, 0), COALESCE(t.completed_orders, 0),
         COALESCE(t.completed_spend, 0), t.last_order_at
  FROM public.users u
  LEFT JOIN customer_order_totals t ON t.user_id = u.id
  WHERE u.role = 'customer'
  ORDER BY u.created_at DESC, u.id
  OFFSET LEAST(GREATEST(COALESCE(p_offset, 0), 0), 1000000000)
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 500), 1), 500);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_customers_report(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_customers_report(INTEGER, INTEGER) TO authenticated;
