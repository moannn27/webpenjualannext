CREATE OR REPLACE FUNCTION public.admin_bulk_delete_products(p_product_ids UUID[])
RETURNS TABLE(deleted_count INTEGER, archived_count INTEGER)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_ids UUID[];
  v_referenced_ids UUID[];
  v_deleted_count INTEGER := 0;
  v_archived_count INTEGER := 0;
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Operasi ini hanya dapat dijalankan melalui server admin.'
      USING ERRCODE = '42501';
  END IF;

  IF p_product_ids IS NULL OR pg_catalog.cardinality(p_product_ids) = 0 THEN
    RAISE EXCEPTION 'Pilih minimal satu produk.'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.cardinality(p_product_ids) > 500 THEN
    RAISE EXCEPTION 'Maksimal 500 produk dapat diproses sekaligus.'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(pg_catalog.array_agg(DISTINCT requested.id), ARRAY[]::UUID[])
  INTO v_ids
  FROM pg_catalog.unnest(p_product_ids) AS requested(id)
  WHERE requested.id IS NOT NULL;

  IF pg_catalog.cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'Tidak ada ID produk yang valid.'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.unnest(v_ids) AS requested(id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.products AS product
      WHERE product.id = requested.id
    )
  ) THEN
    RAISE EXCEPTION 'Sebagian produk sudah tidak tersedia. Muat ulang daftar produk lalu coba lagi.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(pg_catalog.array_agg(DISTINCT item.product_id), ARRAY[]::UUID[])
  INTO v_referenced_ids
  FROM public.order_items AS item
  WHERE item.product_id = ANY(v_ids);

  UPDATE public.products
  SET status = 'deleted'
  WHERE id = ANY(v_referenced_ids);
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  DELETE FROM public.products
  WHERE id = ANY(v_ids)
    AND NOT (id = ANY(v_referenced_ids));
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count, v_archived_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_bulk_delete_products(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_products(UUID[]) TO service_role;