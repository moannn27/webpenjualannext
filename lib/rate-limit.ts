import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export type RateLimitResult = {
  allowed: boolean
  count: number
  limit: number
  remaining: number
  resetSeconds: number
  source: 'database' | 'memory'
  unavailable?: boolean
  error?: string
}

export type CheckRateLimitOptions = {
  allowMemoryFallback?: boolean
}

// In-memory fallback cache strictly for local development resilience
type CacheEntry = {
  count: number
  resetAt: number
}

const inMemoryStore = new Map<string, CacheEntry>()

function cleanupInMemoryStore() {
  const now = Date.now()
  for (const [key, entry] of inMemoryStore.entries()) {
    if (entry.resetAt <= now) {
      inMemoryStore.delete(key)
    }
  }
}

/**
 * Extracts the real client IP using trusted edge proxy headers from supported hosting platforms (Netlify / Vercel).
 * Does NOT trust client-forgeable headers like cf-connecting-ip or x-real-ip that are not
 * authoritative in these deployment environments.
 */
export function getClientIp(request: Request): string {
  const isNetlify = process.env.NETLIFY === 'true' || Boolean(process.env.NETLIFY)

  // 1. If running on Netlify environment, prioritize Netlify Edge verified client IP header
  if (isNetlify) {
    const netlifyIp = request.headers.get('x-nf-client-connection-ip')
    if (netlifyIp) {
      const ip = netlifyIp.trim()
      if (ip) return ip
    }
  }

  // 2. Vercel trusted header (managed and overwritten exclusively by Vercel edge infrastructure)
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for')
  if (vercelForwarded) {
    const ips = vercelForwarded.split(',').map((ip) => ip.trim()).filter(Boolean)
    if (ips.length > 0) return ips[0]
  }

  // 3. Netlify trusted header fallback (when deployed on Netlify without env var or in Netlify Functions)
  const netlifyIp = request.headers.get('x-nf-client-connection-ip')
  if (netlifyIp && !vercelForwarded) {
    const ip = netlifyIp.trim()
    if (ip) return ip
  }

  // 4. Standard X-Forwarded-For:
  // In reverse proxy setups, client-injected headers are prepended while the trusted proxy
  // appends the verified connecting IP to the end.
  // We strictly take the rightmost IP to resist spoofing by clients prepending fake IPs.
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded.split(',').map((ip) => ip.trim()).filter(Boolean)
    if (ips.length > 0) return ips[ips.length - 1]
  }

  return '127.0.0.1'
}

/**
 * Checks and increments rate limit for a given key.
 *
 * In production:
 * - Uses PostgreSQL/Supabase table via check_rate_limit RPC (serverless persistent).
 * - If persistent store fails or RPC is missing, DOES NOT fallback to in-memory to prevent
 *   unmetered abuse / spam against external LLM APIs (Gemini). Returns unavailable: true.
 *
 * In development:
 * - Falls back to in-memory sliding-window cache if database is not available.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 15,
  windowSeconds: number = 60,
  options?: CheckRateLimitOptions
): Promise<RateLimitResult> {
  const safeLimit = Math.max(1, limit)
  const safeWindow = Math.max(1, windowSeconds)

  const isProduction = process.env.NODE_ENV === 'production'
  const allowFallback = options?.allowMemoryFallback ?? (!isProduction)

  let failureReason = ''

  // 1. Try persistent Supabase RPC
  try {
    const adminClient = getSupabaseAdminClient()
    const { data, error } = await adminClient.rpc('check_rate_limit', {
      p_key: key,
      p_limit: safeLimit,
      p_window_seconds: safeWindow,
    })

    if (!error && data && typeof data === 'object') {
      const parsed = data as {
        allowed?: boolean
        count?: number
        limit?: number
        remaining?: number
        reset_seconds?: number
      }

      if (typeof parsed.allowed === 'boolean') {
        return {
          allowed: parsed.allowed,
          count: Number(parsed.count ?? 1),
          limit: Number(parsed.limit ?? safeLimit),
          remaining: Number(parsed.remaining ?? 0),
          resetSeconds: Number(parsed.reset_seconds ?? safeWindow),
          source: 'database',
        }
      }
    }

    failureReason = error?.message ?? 'Invalid RPC response format'
  } catch (err: unknown) {
    failureReason = err instanceof Error ? err.message : 'Database RPC execution error'
  }

  // If persistent check failed and memory fallback is not allowed (production)
  if (!allowFallback) {
    return {
      allowed: false,
      count: safeLimit,
      limit: safeLimit,
      remaining: 0,
      resetSeconds: safeWindow,
      source: 'database',
      unavailable: true,
      error: failureReason || 'Persistent rate limiter unavailable in production',
    }
  }

  // 2. In-memory sliding window fallback (strictly for development / test environments)
  cleanupInMemoryStore()
  const now = Date.now()
  const windowMs = safeWindow * 1000
  const existing = inMemoryStore.get(key)

  if (!existing || existing.resetAt <= now) {
    const newEntry: CacheEntry = {
      count: 1,
      resetAt: now + windowMs,
    }
    inMemoryStore.set(key, newEntry)
    return {
      allowed: true,
      count: 1,
      limit: safeLimit,
      remaining: safeLimit - 1,
      resetSeconds: safeWindow,
      source: 'memory',
    }
  }

  existing.count += 1
  const remaining = Math.max(0, safeLimit - existing.count)
  const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))

  return {
    allowed: existing.count <= safeLimit,
    count: existing.count,
    limit: safeLimit,
    remaining,
    resetSeconds,
    source: 'memory',
  }
}


