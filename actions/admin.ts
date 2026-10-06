'use server'

import { AdminService } from '@/services/admin.service'
import { getAdminAccess } from '@/lib/auth/admin'

const adminService = new AdminService()

export async function getDashboardStatsAction() {
  const { user, isAdmin } = await getAdminAccess()
  if (!user) throw new Error("Unauthorized")
  if (!isAdmin) throw new Error("Forbidden")
  
  return await adminService.getDashboardStats()
}
