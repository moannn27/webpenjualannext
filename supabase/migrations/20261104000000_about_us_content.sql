-- ============================================================================
-- Migration: 20261104000000_about_us_content.sql
-- Description: Dedicated table and policies for About Us (Tentang Kami) content
-- Status: Safe & Idempotent (Do not execute automatically; apply via Supabase Console if desired)
-- ============================================================================

-- 1. Create about_us_content table
CREATE TABLE IF NOT EXISTS public.about_us_content (
  id TEXT PRIMARY KEY DEFAULT 'default',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.about_us_content ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Public can view about us content" ON public.about_us_content;
CREATE POLICY "Public can view about us content" ON public.about_us_content
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage about us content" ON public.about_us_content;
CREATE POLICY "Admins can manage about us content" ON public.about_us_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- 4. Idempotent trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_about_us_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_about_us_timestamp ON public.about_us_content;
CREATE TRIGGER tr_about_us_timestamp
BEFORE UPDATE ON public.about_us_content
FOR EACH ROW EXECUTE FUNCTION public.update_about_us_timestamp();

-- 5. Optional relaxation on storefront_settings constraint if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'storefront_settings_id_check'
      AND table_name = 'storefront_settings'
  ) THEN
    ALTER TABLE public.storefront_settings DROP CONSTRAINT storefront_settings_id_check;
  END IF;
END $$;

