'use server'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
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
      ? 'Email atau kata sandi salah.'
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { data: authData, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl.replace(/\/$/, '')}/auth/callback?next=/profile`,
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

function getOAuthRedirect(redirectPath: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const callback = new URL('/auth/callback', siteUrl)
  callback.searchParams.set('next', redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : '/profile')
  return callback.toString()
}

export async function loginWithGoogle(redirectPath: string = '/profile') {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getOAuthRedirect(redirectPath)
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
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: getOAuthRedirect(redirectPath)
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
