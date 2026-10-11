'use server'

import { OrderService } from '@/services/order.service'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recordAdminActivity } from '@/lib/audit-log'
import { revalidatePath } from 'next/cache'

const orderService = new OrderService()

export async function getUserOrdersAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  return await orderService.getOrders(user.id)
}

export async function getOrderDetailAction(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  const order = await orderService.getOrder(orderId)
  if (order.user_id !== user.id) {
     throw new Error("Forbidden")
  }
  return order
}

export async function confirmOrderDeliveredAction(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id, status, courier')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error("Pesanan tidak ditemukan.")
  if (order.user_id !== user.id) throw new Error("Akses ditolak.")
  if (order.status !== 'shipped' && order.status !== 'ready_for_pickup') {
    throw new Error("Hanya pesanan yang sedang dikirim atau siap diambil yang dapat dikonfirmasi sudah diterima.")
  }

  const adminClient = getSupabaseAdminClient()
  const now = new Date().toISOString()
  const { error: updateError } = await adminClient
    .from('orders')
    .update({ status: 'delivered', updated_at: now })
    .eq('id', orderId)

  if (updateError) throw new Error(updateError.message)

  // Record activity log for admin
  await recordAdminActivity({
    admin_id: user.id,
    admin_name: user.email || 'Pelanggan',
    admin_role: 'customer',
    action: 'update',
    entity_type: 'order',
    entity_name: `Pesanan #${orderId.slice(0, 8)}`,
    details: `Pelanggan telah mengonfirmasi bahwa barang pesanan #${orderId.slice(0, 8)} sudah diterima dengan baik. Status pesanan diperbarui menjadi Selesai (delivered).`,
  })

  revalidatePath('/profile')
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
  revalidatePath('/admin/reports')
  return { success: true }
}
