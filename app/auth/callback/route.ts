import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseCredentials } from '@/lib/supabase/config'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

type CookieSetOptions = Parameters<NextResponse['cookies']['set']>[2]
type CookieItem = {
  name: string
  value: string
  options?: CookieSetOptions
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next')
  let next = requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/profile'

  // Resolve true public origin (essential for Netlify, Vercel, and reverse proxies)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || (forwardedHost?.includes('localhost') ? 'http' : 'https')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL

  let targetOrigin = origin
  if (!isLocalEnv && siteUrl && !siteUrl.includes('localhost')) {
    targetOrigin = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`
  } else if (!isLocalEnv && forwardedHost) {
    targetOrigin = `${forwardedProto}://${forwardedHost}`
  } else if (!isLocalEnv && origin.startsWith('http://') && !origin.includes('localhost')) {
    targetOrigin = origin.replace('http://', 'https://')
  }

  targetOrigin = targetOrigin.replace(/\/+$/, '')
  const isHttps = targetOrigin.startsWith('https://') || forwardedProto === 'https'

  if (code) {
    const cookieStore = await cookies()
    const cookieMap = new Map<string, string>()

    // Pre-populate with existing cookies from cookieStore and request headers
    cookieStore.getAll().forEach((c) => {
      cookieMap.set(c.name, c.value)
    })

    const rawCookieHeader = request.headers.get('cookie') || ''
    if (rawCookieHeader) {
      rawCookieHeader.split(';').forEach((item) => {
        const [rawName, ...rawVal] = item.trim().split('=')
        if (rawName && !cookieMap.has(rawName)) {
          cookieMap.set(rawName, rawVal.join('='))
        }
      })
    }

    const cookiesToSetList: CookieItem[] = []

    const { url, key } = getSupabaseCredentials()
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieMap.set(name, value)
            cookiesToSetList.push({ name, value, options })
            try {
              cookieStore.set(name, value, {
                ...options,
                path: options?.path ?? '/',
                sameSite: options?.sameSite ?? 'lax',
                secure: isHttps ? (options?.secure ?? true) : false,
              })
            } catch {
              // Ignore if cookieStore is sealed or read-only
            }
          })
        },
      },
    })

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const user = data?.user ?? (await supabase.auth.getUser()).data?.user

      if (user) {
        try {
          const adminClient = getSupabaseAdminClient()
          const { data: profile } = await adminClient
            .from('users')
            .select('id, role, avatar_url')
            .eq('id', user.id)
            .maybeSingle()

          const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email ? user.email.split('@')[0] : 'Pelanggan')
          const avatarUrl =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null

          if (!profile) {
            await adminClient.from('users').upsert({
              id: user.id,
              full_name: fullName,
              avatar_url: avatarUrl,
              role: 'customer',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })

            // Ensure cart exists for new OAuth user
            const { data: cart } = await adminClient
              .from('cart')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle()

            if (!cart) {
              await adminClient.from('cart').insert({ user_id: user.id })
            }
          } else {
            // If profile exists but lacks avatar while Google provides one, populate it
            if (!profile.avatar_url && avatarUrl) {
              await adminClient
                .from('users')
                .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
                .eq('id', user.id)
            }

            if (profile.role === 'admin' || profile.role === 'super_admin') {
              if (!requestedNext || requestedNext === '/profile') {
                next = '/admin'
              }
            }
          }
        } catch (syncErr) {
          console.error('OAuth profile sync warning:', syncErr)
        }
      }

      const redirectResponse = NextResponse.redirect(`${targetOrigin}${next}`, { status: 302 })

      // Apply all session cookies to redirectResponse headers
      cookiesToSetList.forEach(({ name, value, options }) => {
        redirectResponse.cookies.set(name, value, {
          ...options,
          path: options?.path ?? '/',
          sameSite: options?.sameSite ?? 'lax',
          secure: isHttps ? (options?.secure ?? true) : false,
        })
      })

      return redirectResponse
    } else {
      console.error('OAuth code exchange error:', error)
      return NextResponse.redirect(`${targetOrigin}/login?error=${encodeURIComponent(error.message)}`, { status: 302 })
    }
  }

  // Handle OAuth provider error params (e.g. error_description from Google / Supabase)
  const errorDescription = searchParams.get('error_description') || searchParams.get('error') || 'Authentication_Failed'
  return NextResponse.redirect(`${targetOrigin}/login?error=${encodeURIComponent(errorDescription)}`, { status: 302 })
}

