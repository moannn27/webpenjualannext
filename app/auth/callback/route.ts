import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

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
              email: user.email,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Pelanggan',
              role: 'customer',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })
          } else if (profile.role === 'admin' || profile.role === 'super_admin') {
            if (!requestedNext || requestedNext === '/profile') {
              next = '/admin'
            }
          }
        } catch (syncErr) {
          console.error('OAuth profile sync warning:', syncErr)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Authentication_Failed`)
}
