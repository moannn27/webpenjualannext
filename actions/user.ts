'use server'

import { UserService } from '@/services/user.service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const userService = new UserService()

export async function getUserProfileAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  const profile = await userService.getProfile(user.id)
  return { ...profile, email: user.email ?? '' }
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const homeAddress = String(formData.get('home_address') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (fullName.length < 2 || fullName.length > 100) throw new Error('Nama harus terdiri dari 2 sampai 100 karakter.')
  if (phone.length > 30 || (phone && !/^[+0-9() .-]{8,30}$/.test(phone))) throw new Error('Format nomor HP tidak valid.')
  if (homeAddress.length > 500) throw new Error('Alamat maksimal 500 karakter.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Masukkan alamat email yang valid.')

  await userService.updateProfile(user.id, { full_name: fullName, phone: phone || null, home_address: homeAddress || null })
  let emailChangePending = false
  let emailUpdateError: string | null = null
  if (email !== (user.email ?? '').toLowerCase()) {
    const { error } = await supabase.auth.updateUser({ email })
    if (error) emailUpdateError = error.message
    else emailChangePending = true
  }
  revalidatePath('/profile')
  return { success: true, emailChangePending, emailUpdateError }
}
