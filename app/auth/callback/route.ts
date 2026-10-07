import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next')
  let next = requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/profile'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      if (!requestedNext || requestedNext === '/profile') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
          if (profile?.role === 'admin' || profile?.role === 'super_admin') next = '/admin'
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Authentication_Failed`)
}
