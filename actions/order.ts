'use server'

import { OrderService } from '@/services/order.service'
import { createClient } from '@/lib/supabase/server'

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
