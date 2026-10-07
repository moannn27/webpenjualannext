'use server'

import { createClient } from '@/lib/supabase/server'
import { forgotPasswordSchema } from '@/validators/auth.validator'

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) throw new Error("Masukkan alamat email yang valid.")

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function resetPasswordAction(formData: FormData) {
  const password = formData.get('password') as string
  if (!password || password.length < 6) throw new Error("Kata sandi harus memiliki minimal 6 karakter.")

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function resendVerificationAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) throw new Error("Masukkan alamat email yang valid.")

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${siteUrl.replace(/\/$/, '')}/auth/callback?next=/profile`,
    },
  })

  if (error) throw new Error(error.message)
  return { success: true }
}
