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
  if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error("Jumlah produk tidak valid")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const result = await cartService.addItem(user.id, productId, quantity, variantId)
  revalidatePath('/', 'layout')
  return { success: true, ...result }
}

export async function updateCartQuantityAction(itemId: string, productId: string, quantity: number, variantId: string | null = null) {
  if (!itemId || !productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error("Jumlah produk tidak valid")
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

export async function syncCartAction(
  items: { productId: string; variantId?: string | null; quantity: number }[]
) {
  if (!Array.isArray(items)) throw new Error("Format data keranjang tidak valid")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const normalized = items.map((it) => ({
    productId: it.productId,
    variantId: it.variantId ?? null,
    quantity: Math.max(1, Math.min(999, Math.floor(it.quantity || 1))),
  }))

  const cart = await cartService.syncCart(user.id, normalized)
  revalidatePath('/cart')
  revalidatePath('/checkout')
  return { success: true, cart }
}
