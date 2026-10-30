import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseCredentials } from '@/lib/supabase/config'
import { getActiveUserProfileStatus } from '@/lib/auth/active-profile'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const { url, key } = getSupabaseCredentials()
  const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/admin')
    || request.nextUrl.pathname.startsWith('/profile')
  const isCheckoutRoute = request.nextUrl.pathname === '/checkout' || (request.nextUrl.pathname.startsWith('/checkout/') && !request.nextUrl.pathname.startsWith('/checkout/success'))
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  const isServerAction = request.headers.has('Next-Action')
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register')
  const isPublicAuthAction = ['/login', '/register', '/auth/callback'].includes(request.nextUrl.pathname)
  const mustCheckActiveProfile = Boolean(user) && (
    isProtectedRoute || isCheckoutRoute || isApiRoute || (isServerAction && !isPublicAuthAction) || (isAuthPage && !isServerAction)
  )

  let activeProfileStatus: 'active' | 'missing' | 'unavailable' = 'missing'
  if (mustCheckActiveProfile && user) {
    activeProfileStatus = await getActiveUserProfileStatus(supabase, user.id)
  } else {
    activeProfileStatus = user ? 'active' : 'missing'
  }

  const clearDeletedUserSession = (response: NextResponse) => {
    for (const cookie of request.cookies.getAll()) {
      if (/^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name)) {
        response.cookies.set(cookie.name, '', { path: '/', maxAge: 0 })
      }
    }
    return response
  }

  if (user && mustCheckActiveProfile && activeProfileStatus === 'unavailable') {
    if (isApiRoute) return NextResponse.json({ error: 'Session verification unavailable' }, { status: 503 })
    if (isServerAction || isProtectedRoute || isCheckoutRoute) {
      return new NextResponse('Session verification unavailable', { status: 503 })
    }
  }

  if (user && mustCheckActiveProfile && activeProfileStatus === 'missing') {
    if (isApiRoute) {
      return clearDeletedUserSession(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    if (isServerAction) {
      return clearDeletedUserSession(new NextResponse('Unauthorized', { status: 401 }))
    }
  }

  if ((!user || (mustCheckActiveProfile && activeProfileStatus === 'missing')) && (isProtectedRoute || isCheckoutRoute) && !isServerAction) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return user
      ? clearDeletedUserSession(NextResponse.redirect(url))
      : NextResponse.redirect(url)
  }

  if (user && activeProfileStatus === 'active' && isAuthPage && !isServerAction) {
    const url = request.nextUrl.clone()
    url.pathname = '/profile'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
