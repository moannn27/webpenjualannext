-- Phase 5: Storage Setup & Policies

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('products', 'products', true),
  ('brands', 'brands', true),
  ('avatars', 'avatars', true),
  ('banners', 'banners', true),
  ('reviews', 'reviews', true),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for 'products' (Public Read, Admin Write)
CREATE POLICY "Public Access to products" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Admin Insert to products" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'products' AND (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);
CREATE POLICY "Admin Update to products" ON storage.objects FOR UPDATE USING (
  bucket_id = 'products' AND (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);
CREATE POLICY "Admin Delete to products" ON storage.objects FOR DELETE USING (
  bucket_id = 'products' AND (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);

-- 3. Storage Policies for 'brands' (Public Read, Admin Write)
CREATE POLICY "Public Access to brands" ON storage.objects FOR SELECT USING (bucket_id = 'brands');
CREATE POLICY "Admin Insert to brands" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'brands' AND (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);
CREATE POLICY "Admin Update to brands" ON storage.objects FOR UPDATE USING (
  bucket_id = 'brands' AND (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);
CREATE POLICY "Admin Delete to brands" ON storage.objects FOR DELETE USING (
  bucket_id = 'brands' AND (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);

-- 4. Storage Policies for 'banners' (Public Read, Admin Write)
CREATE POLICY "Public Access to banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Admin Insert to banners" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'banners' AND (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);
CREATE POLICY "Admin Update to banners" ON storage.objects FOR UPDATE USING (
  bucket_id = 'banners' AND (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);
CREATE POLICY "Admin Delete to banners" ON storage.objects FOR DELETE USING (
  bucket_id = 'banners' AND (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);

-- 5. Storage Policies for 'avatars' (Public Read, Owner/Admin Write)
CREATE POLICY "Public Access to avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "User Insert to avatars" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.role() = 'authenticated'
);
CREATE POLICY "User Update to avatars" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);
CREATE POLICY "User Delete to avatars" ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);

-- 6. Storage Policies for 'reviews' (Public Read, Owner/Admin Write)
CREATE POLICY "Public Access to reviews" ON storage.objects FOR SELECT USING (bucket_id = 'reviews');
CREATE POLICY "User Insert to reviews" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'reviews' AND auth.role() = 'authenticated'
);
CREATE POLICY "User Update to reviews" ON storage.objects FOR UPDATE USING (
  bucket_id = 'reviews' AND auth.role() = 'authenticated' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);
CREATE POLICY "User Delete to reviews" ON storage.objects FOR DELETE USING (
  bucket_id = 'reviews' AND auth.role() = 'authenticated' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
);

-- 7. Storage Policies for 'documents' (Private Read, Admin Write)
CREATE POLICY "Admin Access to documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Owner Access to documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND auth.role() = 'authenticated' AND (
    (auth.uid() = owner) OR (name LIKE auth.uid() || '/%')
  )
);
CREATE POLICY "Admin Insert to documents" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admin Update to documents" ON storage.objects FOR UPDATE USING (
  bucket_id = 'documents' AND auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admin Delete to documents" ON storage.objects FOR DELETE USING (
  bucket_id = 'documents' AND auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
