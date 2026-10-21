import { createClient } from '@supabase/supabase-js'

// Polyfill native WebSocket for Node.js runtime environments (< v22)
// preventing @supabase/realtime-js initialization failure.
if (typeof WebSocket === 'undefined' && typeof globalThis !== 'undefined') {
  // @ts-expect-error Node.js runtime compatibility
  globalThis.WebSocket = class DummyWebSocket {};
}

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase admin credentials missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
