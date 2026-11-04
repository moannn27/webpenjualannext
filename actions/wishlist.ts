'use server'

import { WishlistService } from '@/services/wishlist.service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const wishlistService = new WishlistService()

export async function getWishlistAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  return await wishlistService.getWishlist(user.id)
}

export async function toggleWishlistAction(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Unauthorized", action: null }
  }

  try {
    const result = await wishlistService.toggleWishlist(user.id, productId)
    revalidatePath('/wishlist')
    return { success: true, ...result }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal memperbarui wishlist", action: null }
  }
}
