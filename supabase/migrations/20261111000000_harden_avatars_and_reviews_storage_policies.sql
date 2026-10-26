-- Migration 20261111000000: Harden Storage Policies for Avatars and Reviews
-- Strictly isolates user uploads to their own user-scoped paths (disallowing arbitrary root uploads)
-- and strictly blocks dangerous file extensions (SVG, HTML, etc.).

-- ============================================================================
-- 1. AVATARS STORAGE BUCKET POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "User Insert to avatars" ON storage.objects;
DROP POLICY IF EXISTS "User Update to avatars" ON storage.objects;
DROP POLICY IF EXISTS "User Delete to avatars" ON storage.objects;

-- INSERT: Must be authenticated, path MUST strictly belong to the user's UID scope or admin.
-- 'auth.uid() = owner' is deliberately NOT used on INSERT to prevent users from bypassing
-- path isolation rules for newly created rows.
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
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

-- UPDATE: Only owner, path owner, or admin can update existing avatar objects.
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
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

-- DELETE: Only owner, path owner, or admin can delete avatar objects.
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
-- 2. REVIEWS STORAGE BUCKET POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "User Insert to reviews" ON storage.objects;
DROP POLICY IF EXISTS "User Update to reviews" ON storage.objects;
DROP POLICY IF EXISTS "User Delete to reviews" ON storage.objects;

-- INSERT: Must be authenticated, path MUST strictly include the user's UID or admin.
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
    OR name LIKE '%/' || auth.uid()::text || '.%'
    OR name LIKE '%/' || auth.uid()::text || '-%'
    OR name LIKE '%/' || auth.uid()::text || '_%'
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

-- UPDATE: Only owner, path owner, or admin can update review images.
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
    OR name LIKE '%/' || auth.uid()::text || '.%'
    OR name LIKE '%/' || auth.uid()::text || '-%'
    OR name LIKE '%/' || auth.uid()::text || '_%'
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
    OR name LIKE '%/' || auth.uid()::text || '.%'
    OR name LIKE '%/' || auth.uid()::text || '-%'
    OR name LIKE '%/' || auth.uid()::text || '_%'
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

-- DELETE: Only owner, path owner, or admin can delete review images.
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
    OR name LIKE '%/' || auth.uid()::text || '.%'
    OR name LIKE '%/' || auth.uid()::text || '-%'
    OR name LIKE '%/' || auth.uid()::text || '_%'
    OR auth.uid() = owner
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
);
