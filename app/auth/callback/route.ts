import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseCredentials } from '@/lib/supabase/config'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

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

  if (code) {
    let redirectResponse = NextResponse.redirect(`${targetOrigin}${next}`)

    const { url, key } = getSupabaseCredentials()
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get('cookie') || ''
          return cookieHeader
            .split(';')
            .map((c) => {
              const [name, ...val] = c.trim().split('=')
              return { name, value: val.join('=') }
            })
            .filter((c) => c.name)
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, {
              ...options,
              path: options?.path ?? '/',
              sameSite: options?.sameSite ?? 'lax',
              secure: !isLocalEnv || options?.secure,
            })
          })
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        try {
          const adminClient = getSupabaseAdminClient()
          const { data: profile } = await adminClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

          if (!profile) {
            await adminClient.from('users').upsert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Pelanggan',
              role: 'customer',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })
          } else if (profile.role === 'admin' || profile.role === 'super_admin') {
            if (!requestedNext || requestedNext === '/profile') {
              next = '/admin'
              redirectResponse.headers.set('Location', `${targetOrigin}${next}`)
            }
          }
        } catch (syncErr) {
          console.error('OAuth profile sync warning:', syncErr)
        }
      }

      return redirectResponse
    } else {
      console.error('OAuth code exchange error:', error)
      return NextResponse.redirect(`${targetOrigin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  // Handle OAuth provider error params (e.g. error_description from Google / Supabase)
  const errorDescription = searchParams.get('error_description') || searchParams.get('error') || 'Authentication_Failed'
  return NextResponse.redirect(`${targetOrigin}/login?error=${encodeURIComponent(errorDescription)}`)
}
