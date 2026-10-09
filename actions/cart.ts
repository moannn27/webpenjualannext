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

export async function getProductCartQuantitiesAction(productId: string) {
  if (!productId) return []
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return await cartService.getProductCartQuantities(user.id, productId)
}

export async function addToCartAction(productId: string, quantity: number, variantId: string | null = null) {
  if (!productId || !Number.isInteger(quantity) || quantity < 1) throw new Error("Jumlah produk tidak valid")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const result = await cartService.addItem(user.id, productId, quantity, variantId)
  // The client updates the header count from the returned total; avoid a full
  // storefront layout refresh (which reloads all cart product media/specs).
  return { success: true, ...result }
}

export async function updateCartQuantityAction(itemId: string, productId: string, quantity: number, variantId: string | null = null) {
  if (!itemId || !productId || !Number.isInteger(quantity) || quantity < 1) throw new Error("Jumlah produk tidak valid")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  await cartService.updateQuantity(itemId, quantity, productId, variantId)
  revalidatePath('/', 'layout')
}

export async function removeFromCartAction(itemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  await cartService.removeItem(itemId)
  revalidatePath('/', 'layout')
}
