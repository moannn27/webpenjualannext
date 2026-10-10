'use server'

import { ReviewService } from '@/services/review.service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const reviewService = new ReviewService()

export async function getProductReviewsAction(productId: string) {
  return await reviewService.getReviews(productId)
}

export async function getUserReviewsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  return await reviewService.getUserReviews(user.id)
}

export async function submitReviewAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const productId = String(formData.get('productId') ?? '').trim()
  const rating = parseInt(String(formData.get('rating') ?? '5'), 10)
  const comment = String(formData.get('comment') ?? '').trim()

  if (!productId) throw new Error("Produk tidak valid.")
  if (isNaN(rating) || rating < 1 || rating > 5) throw new Error("Rating harus antara 1 sampai 5 bintang.")

  await reviewService.createReview(user.id, productId, rating, comment)
  revalidatePath(`/product/${productId}`)
  revalidatePath('/profile')
  return { success: true }
}
