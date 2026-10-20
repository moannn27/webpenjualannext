-- ============================================================================
-- MIGRATION: 20261106000000_security_hardening_storage_ratelimit_lockout.sql
-- PURPOSE:
-- 1. Perketat keamanan Supabase Storage (bucket avatars & reviews):
--    - Batasi tipe file: hanya image/jpeg, image/png, image/webp (Tolak SVG, HTML, dsb)
--    - Batasi ukuran file maksimum (2 MB per objek)
--    - Isolasi folder upload pengguna: <user_id>/filename (hanya pemilik dan admin yang dapat menulis)
-- 2. Persistent serverless rate limiting table & RPC (public.api_rate_limits)
--    - Mencegah spam & pembengkakan biaya API AI / endpoint publik
-- 3. Server-side password lockout storage di public.users
--    - Mencegah manipulasi status terkunci dari sisi client user_metadata
-- ============================================================================

-- ============================================================================
-- 1. SUPABASE STORAGE: HARDEN BUCKET SETTINGS (avatars & reviews)
-- ============================================================================
UPDATE storage.buckets
SET file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('avatars', 'reviews');

-- ============================================================================
-- 2. SUPABASE STORAGE: HARDEN POLICIES FOR 'avatars'
-- ============================================================================
DROP POLICY IF EXISTS "User Insert to avatars" ON storage.objects;
DROP POLICY IF EXISTS "User Update to avatars" ON storage.objects;
DROP POLICY IF EXISTS "User Delete to avatars" ON storage.objects;

-- INSERT: Wajib terautentikasi, path harus di bawah kepemilikan pengguna:
-- - Folder pengguna: <user_id>/filename
-- - Prefix user id: <user_id>.<ext> atau <user_id>-<uuid>.<ext>
-- - Atribut owner sama dengan auth.uid()
-- - Atau staf admin/super_admin
-- Ekstensi hanya jpg, jpeg, png, webp (SVG & HTML diblokir keras).
CREATE POLICY "User Insert to avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '.%'
    OR name LIKE auth.uid()::text || '-%'
    OR name LIKE auth.uid()::text || '_%'
    OR auth.uid() = owner
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

-- UPDATE: Hanya pemilik file atau admin yang berhak mengupdate, ekstensi tetap divalidasi.
CREATE POLICY "User Update to avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '.%'
    OR name LIKE auth.uid()::text || '-%'
    OR name LIKE auth.uid()::text || '_%'
    OR auth.uid() = owner
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
) WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '.%'
    OR name LIKE auth.uid()::text || '-%'
    OR name LIKE auth.uid()::text || '_%'
    OR auth.uid() = owner
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

-- DELETE: Hanya pemilik file atau admin yang berhak menghapus.
CREATE POLICY "User Delete to avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '.%'
    OR name LIKE auth.uid()::text || '-%'
    OR name LIKE auth.uid()::text || '_%'
    OR auth.uid() = owner
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
);

-- ============================================================================
-- 3. SUPABASE STORAGE: HARDEN POLICIES FOR 'reviews'
-- ============================================================================
DROP POLICY IF EXISTS "User Insert to reviews" ON storage.objects;
DROP POLICY IF EXISTS "User Update to reviews" ON storage.objects;
DROP POLICY IF EXISTS "User Delete to reviews" ON storage.objects;

-- INSERT: Wajib terautentikasi, path harus di bawah kepemilikan pengguna / produk:
-- - Folder pengguna: <user_id>/... atau <product_id>/<user_id>/...
-- - Prefix user id: <user_id>_<review_id>.<ext>
-- - Atribut owner sama dengan auth.uid()
-- - Atau staf admin/super_admin
-- Ekstensi hanya jpg, jpeg, png, webp (SVG & HTML diblokir keras).
CREATE POLICY "User Insert to reviews" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'reviews'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE auth.uid()::text || '/%'
    OR name LIKE '%/' || auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '.%'
    OR name LIKE auth.uid()::text || '-%'
    OR name LIKE auth.uid()::text || '_%'
    OR auth.uid() = owner
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

-- UPDATE: Hanya pemilik file atau admin yang berhak mengupdate.
CREATE POLICY "User Update to reviews" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'reviews'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE auth.uid()::text || '/%'
    OR name LIKE '%/' || auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '.%'
    OR name LIKE auth.uid()::text || '-%'
    OR name LIKE auth.uid()::text || '_%'
    OR auth.uid() = owner
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
) WITH CHECK (
  bucket_id = 'reviews'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE auth.uid()::text || '/%'
    OR name LIKE '%/' || auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '.%'
    OR name LIKE auth.uid()::text || '-%'
    OR name LIKE auth.uid()::text || '_%'
    OR auth.uid() = owner
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

-- DELETE: Hanya pemilik file atau admin yang berhak menghapus.
CREATE POLICY "User Delete to reviews" ON storage.objects
FOR DELETE USING (
  bucket_id = 'reviews'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR name LIKE auth.uid()::text || '/%'
    OR name LIKE '%/' || auth.uid()::text || '/%'
    OR name LIKE auth.uid()::text || '.%'
    OR name LIKE auth.uid()::text || '-%'
    OR name LIKE auth.uid()::text || '_%'
    OR auth.uid() = owner
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
);

-- ============================================================================
-- 4. PERSISTENT SERVERLESS RATE LIMITING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    key TEXT PRIMARY KEY,
    count INT NOT NULL DEFAULT 1,
    reset_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_reset_at ON public.api_rate_limits(reset_at);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.api_rate_limits TO service_role;

-- Atomic RPC function for checking & updating rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_limit INT,
    p_window_seconds INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_reset_at TIMESTAMPTZ;
    v_count INT;
    v_allowed BOOLEAN;
    v_remaining INT;
BEGIN
    -- Delete stale entries for this key
    DELETE FROM public.api_rate_limits
    WHERE key = p_key AND reset_at < v_now;

    -- Upsert atomic counter
    INSERT INTO public.api_rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::INTERVAL)
    ON CONFLICT (key) DO UPDATE
    SET count = public.api_rate_limits.count + 1
    RETURNING count, reset_at INTO v_count, v_reset_at;

    v_allowed := (v_count <= p_limit);
    v_remaining := GREATEST(0, p_limit - v_count);

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'count', v_count,
        'limit', p_limit,
        'remaining', v_remaining,
        'reset_seconds', GREATEST(1, EXTRACT(EPOCH FROM (v_reset_at - v_now))::INT)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;

-- ============================================================================
-- 5. SERVER-SIDE PASSWORD LOCKOUT COLUMNS (public.users)
-- ============================================================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_password_locked BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS failed_password_attempts INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS password_locked_at TIMESTAMPTZ;

-- Re-assert column privilege restrictions: authenticated users cannot mutate lockout columns
REVOKE UPDATE (is_password_locked, failed_password_attempts, password_locked_at) ON TABLE public.users FROM PUBLIC, anon, authenticated;

