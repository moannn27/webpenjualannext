'use server'

import { UserService } from '@/services/user.service'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordAdminActivity } from '@/lib/audit-log'
import { revalidatePath } from 'next/cache'

const userService = new UserService()

export async function getUserProfileAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  const profile = await userService.getProfile(user.id)
  return { 
    ...profile, 
    email: user.email ?? '',
    is_password_locked: Boolean(user.user_metadata?.is_password_locked),
    failed_password_attempts: Number(user.user_metadata?.failed_password_attempts ?? 0),
  }
}

export async function checkUserLockStatusAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isLocked: false }

  const isLocked = Boolean(user.user_metadata?.is_password_locked)
  return { isLocked }
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

export async function updateUserPasswordAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  if (Boolean(user.user_metadata?.is_password_locked)) {
    return {
      error: 'Form ubah kata sandi telah dikunci karena 3x salah kata sandi lama. Silakan hubungi admin toko agar dibantu reset kata sandi.',
      isLocked: true,
    }
  }

  const oldPassword = String(formData.get('old_password') ?? '').trim()
  const newPassword = String(formData.get('new_password') ?? '').trim()
  const confirmPassword = String(formData.get('confirm_password') ?? '').trim()

  if (!oldPassword) {
    return { error: 'Masukkan kata sandi lama Anda.' }
  }
  if (newPassword.length < 6) {
    return { error: 'Kata sandi baru minimal 6 karakter.' }
  }
  if (newPassword === oldPassword) {
    return { error: 'Kata sandi baru harus berbeda dengan kata sandi lama.' }
  }
  if (newPassword !== confirmPassword) {
    return { error: 'Konfirmasi kata sandi tidak cocok.' }
  }

  // Verifikasi kata sandi lama dengan autentikasi
  if (user.email) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    })
    if (signInError) {
      const currentFails = Number(user.user_metadata?.failed_password_attempts ?? 0) + 1
      const isLocked = currentFails >= 3

      const metadata = {
        ...user.user_metadata,
        failed_password_attempts: currentFails,
        is_password_locked: isLocked,
        password_locked_at: isLocked ? new Date().toISOString() : null,
      }

      try {
        const adminClient = getSupabaseAdminClient()
        await adminClient.auth.admin.updateUserById(user.id, { user_metadata: metadata })
      } catch {
        await supabase.auth.updateUser({ data: metadata })
      }

      if (isLocked) {
        await recordAdminActivity({
          admin_id: 'system',
          admin_name: 'Sistem Keamanan',
          admin_role: 'system',
          action: 'status_change',
          entity_type: 'account',
          entity_name: user.email || user.id,
          details: `Akun "${user.email || user.id}" terkunci otomatis setelah 3x salah memasukkan kata sandi lama`,
        })
      }

      revalidatePath('/admin/customers')

      return {
        error: isLocked
          ? 'Anda telah 3x salah memasukkan kata sandi lama. Akses ubah sandi dikunci. Silakan hubungi admin toko agar dibantu reset kata sandi.'
          : 'Kata sandi lama yang Anda masukkan salah.',
        isWrongOldPassword: true,
        failedCount: currentFails,
        isLocked,
      }
    }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    return { error: error.message }
  }

  // Bersihkan status kunci dan hitungan gagal setelah password berhasil diperbarui
  const clearedMeta = {
    ...user.user_metadata,
    failed_password_attempts: 0,
    is_password_locked: false,
    password_locked_at: null,
  }
  try {
    const adminClient = getSupabaseAdminClient()
    await adminClient.auth.admin.updateUserById(user.id, { user_metadata: clearedMeta })
  } catch {
    await supabase.auth.updateUser({ data: clearedMeta })
  }

  revalidatePath('/profile')
  revalidatePath('/admin/customers')
  return { success: true }
}
