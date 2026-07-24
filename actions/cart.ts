'use server'

import { CartService } from '@/services/cart.service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const cartService = new CartService()

export async function getCartAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  return await cartService.getCart(user.id)
}

export async function addToCartAction(productId: string, quantity: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  await cartService.addItem(user.id, productId, quantity)
  revalidatePath('/', 'layout')
}

export async function updateCartQuantityAction(itemId: string, productId: string, quantity: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  await cartService.updateQuantity(itemId, quantity, productId)
  revalidatePath('/', 'layout')
}

export async function removeFromCartAction(itemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  await cartService.removeItem(itemId)
  revalidatePath('/', 'layout')
}
