'use server'

import { AdminService } from '@/services/admin.service'
import { createClient } from '@/lib/supabase/server'

const adminService = new AdminService()

export async function getDashboardStatsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Further check logic would verify the 'role' of user in `users` table is admin
  
  return await adminService.getDashboardStats()
}
