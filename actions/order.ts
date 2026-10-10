'use server'

import { OrderService } from '@/services/order.service'
import { createClient } from '@/lib/supabase/server'
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
  if (order.status !== 'shipped') {
    throw new Error("Hanya pesanan yang sedang dikirim yang dapat dikonfirmasi sudah diterima.")
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'delivered', updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (updateError) throw new Error(updateError.message)
  revalidatePath('/profile')
  revalidatePath('/admin/orders')
  return { success: true }
}
