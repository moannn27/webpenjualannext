-- Migration: Analytics Events & First-Party Privacy-Respecting Tracking
-- Creates additive, non-destructive analytics_events table with strict RLS and performance indexes.

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_name TEXT NOT NULL CHECK (event_name IN (
        'page_view',
        'view_item',
        'search',
        'search_no_results',
        'add_to_cart',
        'begin_checkout',
        'ai_recommendation_click'
    )),
    path TEXT NOT NULL,
    referrer_domain TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes for analytics aggregation queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
    ON public.analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created
    ON public.analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor
    ON public.analytics_events (visitor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
    ON public.analytics_events (session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_product_id
    ON public.analytics_events (product_id)
    WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_path
    ON public.analytics_events (path, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-run locally
DROP POLICY IF EXISTS "Admins can view analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Public can insert analytics events" ON public.analytics_events;

-- RLS: Only admins/super_admins can read analytics events
CREATE POLICY "Admins can view analytics events"
    ON public.analytics_events
    FOR SELECT
    USING (public.is_admin());

-- RLS: Anyone (anon and authenticated) can record valid telemetry events
CREATE POLICY "Public can insert analytics events"
    ON public.analytics_events
    FOR INSERT
    WITH CHECK (
        event_name IN (
            'page_view',
            'view_item',
            'search',
            'search_no_results',
            'add_to_cart',
            'begin_checkout',
            'ai_recommendation_click'
        )
    );

-- Comments for schema documentation
COMMENT ON TABLE public.analytics_events IS 'First-party pseudonymized e-commerce tracking events for Next Solution Store analytics';
COMMENT ON COLUMN public.analytics_events.visitor_id IS 'Anonymous random UUID stored in client localStorage (zero PII)';
COMMENT ON COLUMN public.analytics_events.session_id IS 'Anonymous session UUID regenerated after 30 minutes of inactivity';

