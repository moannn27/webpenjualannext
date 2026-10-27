'use server'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { loginSchema, registerSchema } from '@/validators/auth.validator'
import { normalizePhoneNumber, isValidIndonesianPhone, getPhoneVariants } from '@/lib/phone'

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Masukkan email yang valid dan kata sandi minimal 6 karakter.' }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message === 'Invalid login credentials'
      ? 'Email atau password tidak sesuai. Jika Anda sebelumnya mendaftar menggunakan Google, silakan login dengan Google terlebih dahulu, lalu buka Pengaturan > Keamanan untuk membuat password.'
      : error.message }
  }

  const requestedRedirect = formData.get('redirect')
  const redirectUrl = typeof requestedRedirect === 'string'
    ? new URL(requestedRedirect, 'http://localhost')
    : null
  const redirectPath = redirectUrl?.origin === 'http://localhost'
    ? `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
    : '/profile'
  if (redirectPath !== '/profile') redirect(redirectPath)

  const { data: profile } = await supabase.from('users').select('role').eq('id', data.user.id).maybeSingle()
  redirect(profile?.role === 'admin' || profile?.role === 'super_admin' ? '/admin' : '/profile')
}

export async function register(formData: FormData) {
  const rawPhone = String(formData.get('phone') ?? '').trim()
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
    phone: rawPhone,
  })
  if (!parsed.success) {
    return { error: 'Periksa kembali nama, email, nomor HP/WhatsApp, dan kata sandi (minimal 6 karakter).' }
  }

  if (!isValidIndonesianPhone(parsed.data.phone)) {
    return { error: 'Masukkan nomor HP / WhatsApp Indonesia yang valid (contoh: 08123456789 atau 628123456789).' }
  }

  const cleanPhone = normalizePhoneNumber(parsed.data.phone)
  const variants = getPhoneVariants(parsed.data.phone)
  const supabase = await createClient()

  // Anti-abuse: Check if phone number is already registered to any existing account
  try {
    const adminClient = getSupabaseAdminClient()
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .in('phone', variants)
      .limit(1)
      .maybeSingle()

    if (existingUser) {
      return { error: 'Nomor HP / WhatsApp sudah terdaftar pada akun lain. Silakan login atau gunakan nomor lain.' }
    }
  } catch {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .in('phone', variants)
      .limit(1)
      .maybeSingle()

    if (existingUser) {
      return { error: 'Nomor HP / WhatsApp sudah terdaftar pada akun lain. Silakan login atau gunakan nomor lain.' }
    }
  }

  const redirectCallbackUrl = await getOAuthRedirect('/profile')

  const { data: authData, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: redirectCallbackUrl,
      data: {
        full_name: parsed.data.full_name,
        phone: cleanPhone,
      },
    }
  })

  if (error) {
    const message = error.message.toLowerCase().includes('rate limit')
      ? 'Batas pengiriman email verifikasi Supabase sedang tercapai. Tunggu sebelum mencoba lagi, atau atur SMTP sendiri di Supabase.'
      : error.message
    return { error: message }
  }

  // Ensure phone is stored in public.users profile
  if (authData?.user?.id) {
    try {
      const adminClient = getSupabaseAdminClient()
      await adminClient
        .from('users')
        .update({ phone: cleanPhone, full_name: parsed.data.full_name })
        .eq('id', authData.user.id)
    } catch {
      // Ignore if trigger handled it or service client unavailable
    }
  }

  redirect('/login?message=Check your email to verify your account')
}

async function getOAuthRedirect(redirectPath: string) {
  let origin = ''
  const isDev = process.env.NODE_ENV === 'development'
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL

  // In production, prioritize the configured public domain (e.g. Netlify)
  if (!isDev && envSiteUrl && !envSiteUrl.includes('localhost')) {
    origin = envSiteUrl.startsWith('http') ? envSiteUrl : `https://${envSiteUrl}`
  } else {
    try {
      const headersList = await headers()
      const host = headersList.get('x-forwarded-host') || headersList.get('host')
      const proto = headersList.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http')
      if (host) {
        origin = `${proto}://${host}`
      }
    } catch {
      // headers() might not be available in non-request contexts
    }
  }

  if (!origin) {
    const siteUrl = envSiteUrl || 'http://localhost:3000'
    origin = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`
  }

  origin = origin.replace(/\/+$/, '')
  const callback = new URL('/auth/callback', origin)
  if (redirectPath && redirectPath !== '/profile' && redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
    callback.searchParams.set('next', redirectPath)
  }
  return callback.toString()
}

export async function loginWithGoogle(redirectPath: string = '/profile') {
  const supabase = await createClient()
  const redirectUri = await getOAuthRedirect(redirectPath)
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
    }
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function loginWithGithub(redirectPath: string = '/profile') {
  const supabase = await createClient()
  const redirectUri = await getOAuthRedirect(redirectPath)
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: redirectUri,
    }
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function logout() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
  redirect('/login')
}
