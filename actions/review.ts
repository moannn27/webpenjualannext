'use server'

import { ReviewService } from '@/services/review.service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const reviewService = new ReviewService()

export async function getProductReviewsAction(productId: string) {
  return await reviewService.getReviews(productId)
}

export async function submitReviewAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const productId = formData.get('productId') as string
  const rating = parseInt(formData.get('rating') as string, 10)
  const comment = formData.get('comment') as string

  await reviewService.createReview(user.id, productId, rating, comment)
  revalidatePath(`/products/${productId}`)
}
