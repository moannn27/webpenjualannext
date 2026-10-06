'use server'

import { UserService } from '@/services/user.service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const userService = new UserService()

export async function getUserProfileAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  return await userService.getProfile(user.id)
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  
  await userService.updateProfile(user.id, { full_name: fullName, phone })
  revalidatePath('/profile')
}
