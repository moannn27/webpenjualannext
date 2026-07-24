'use server'

import { createClient } from '@/lib/supabase/server'

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) throw new Error("Email is required")

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function resetPasswordAction(formData: FormData) {
  const password = formData.get('password') as string
  if (!password) throw new Error("Password is required")

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function resendVerificationAction(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) throw new Error("Email is required")

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/profile`,
    },
  })

  if (error) throw new Error(error.message)
  return { success: true }
}
