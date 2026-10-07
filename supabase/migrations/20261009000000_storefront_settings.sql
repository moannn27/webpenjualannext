CREATE TABLE IF NOT EXISTS public.storefront_settings (
  id TEXT PRIMARY KEY DEFAULT 'main' CHECK (id = 'main'),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.storefront_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read storefront settings" ON public.storefront_settings;
CREATE POLICY "Public can read storefront settings" ON public.storefront_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admins can manage storefront settings" ON public.storefront_settings;
CREATE POLICY "Super admins can manage storefront settings" ON public.storefront_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

INSERT INTO public.storefront_settings (id, settings)
VALUES ('main', '{
  "sections": {
    "categories": {"visible": true, "title": "Belanja berdasarkan kategori", "subtitle": "Temukan yang kamu cari."},
    "bestsellers": {"visible": true, "title": "Produk Terlaris", "subtitle": "Pilihan favorit pelanggan."},
    "promo": {"visible": true, "title": "Promo Pilihan", "subtitle": "Penawaran khusus dari Next Solution."},
    "newArrivals": {"visible": true, "title": "Produk Terbaru", "subtitle": "Jelajahi koleksi terbaru."},
    "brands": {"visible": true, "title": "Brand Pilihan", "subtitle": "Jelajahi brand favorit."},
    "whyUs": {"visible": true, "title": "Kenapa Belanja di Next Solution?", "subtitle": "Produk pilihan dan layanan untuk kebutuhanmu."},
    "testimonials": {"visible": true, "title": "Kata Pelanggan", "subtitle": "Pengalaman pelanggan Next Solution."},
    "faq": {"visible": true, "title": "Pertanyaan Umum", "subtitle": "Butuh bantuan? Kami siap membantu."}
  },
  "store": {"description": "Temukan perangkat elektronik dan aksesori pilihan untuk kebutuhanmu.", "address": "", "email": "", "phone": "", "whatsapp": "", "copyright": "Hak cipta dilindungi."}
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_storefront_settings_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS update_storefront_settings_timestamp ON public.storefront_settings;
CREATE TRIGGER update_storefront_settings_timestamp BEFORE UPDATE ON public.storefront_settings
FOR EACH ROW EXECUTE FUNCTION public.update_storefront_settings_timestamp();
