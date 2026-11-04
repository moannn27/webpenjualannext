'use server'

import { CartService } from '@/services/cart.service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type StoredCartItem } from '@/store/useCartStore'

const cartService = new CartService()

export type AddToCartResult = {
  success: boolean
  error?: string
  cartCount?: number
  itemQuantity?: number
  cartItem?: StoredCartItem | null
}

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

export async function addToCartAction(
  productId: string,
  quantity: number,
  variantId: string | null = null
): Promise<AddToCartResult> {
  if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return { success: false, error: "Jumlah produk tidak valid" }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const result = await cartService.addItem(user.id, productId, quantity, variantId)
    revalidatePath('/', 'layout')
    return { success: true, ...result }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menambahkan produk ke keranjang"
    return { success: false, error: message }
  }
}

export async function updateCartQuantityAction(
  itemId: string,
  productId: string,
  quantity: number,
  variantId: string | null = null
) {
  if (!itemId || !productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return { success: false, error: "Jumlah produk tidak valid" }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  try {
    await cartService.updateQuantity(itemId, quantity, productId, variantId)
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal memperbarui jumlah" }
  }
}

export async function removeFromCartAction(itemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  try {
    await cartService.removeItem(itemId)
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal menghapus produk" }
  }
}

export async function syncCartAction(
  items: { productId: string; variantId?: string | null; quantity: number }[]
) {
  if (!Array.isArray(items)) return { success: false, error: "Format data keranjang tidak valid" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  try {
    const normalized = items.map((it) => ({
      productId: it.productId,
      variantId: it.variantId ?? null,
      quantity: Math.max(1, Math.min(999, Math.floor(it.quantity || 1))),
    }))

    const cart = await cartService.syncCart(user.id, normalized)
    revalidatePath('/cart')
    revalidatePath('/checkout')
    return { success: true, cart }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal menyinkronkan keranjang" }
  }
}
