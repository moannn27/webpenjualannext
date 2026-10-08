CREATE OR REPLACE FUNCTION public.get_admin_sales_chart(p_days INTEGER DEFAULT 30)
RETURNS TABLE (day DATE, orders_count BIGINT, revenue NUMERIC, lifetime_revenue NUMERIC)
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
  WITH days AS (
    SELECT pg_catalog.generate_series(
      (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE - (LEAST(GREATEST(COALESCE(p_days, 30), 7), 90) - 1),
      (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE,
      INTERVAL '1 day'
    )::DATE AS day
  ), daily_sales AS (
    SELECT (created_at AT TIME ZONE 'Asia/Jakarta')::DATE AS day,
           COUNT(*)::BIGINT AS orders_count,
           COALESCE(SUM(grand_total), 0)::NUMERIC AS revenue
    FROM public.orders
    WHERE status = 'delivered'
      AND created_at >= (((NOW() AT TIME ZONE 'Asia/Jakarta')::DATE - (LEAST(GREATEST(COALESCE(p_days, 30), 7), 90) - 1))::TIMESTAMP AT TIME ZONE 'Asia/Jakarta')
    GROUP BY 1
  ), lifetime_sales AS (
    SELECT COALESCE(SUM(grand_total), 0)::NUMERIC AS revenue
    FROM public.orders
    WHERE status = 'delivered'
  )
  SELECT days.day, COALESCE(daily_sales.orders_count, 0), COALESCE(daily_sales.revenue, 0), lifetime_sales.revenue
  FROM days LEFT JOIN daily_sales USING (day) CROSS JOIN lifetime_sales
  ORDER BY days.day;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_sales_chart(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_sales_chart(INTEGER) TO authenticated;
