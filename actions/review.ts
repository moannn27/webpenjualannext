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
  revalidatePath('/')
  return { success: true }
}

export type AdminReviewWithDetails = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  product_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  product_name: string;
  product_image?: string;
};

export async function getAllReviewsForAdminAction(): Promise<AdminReviewWithDetails[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, product_id, user_id, products(id, name, slug, price, product_images(url, is_primary)), users(full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching reviews for admin:', error)
      return []
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment || '',
      created_at: row.created_at,
      product_id: row.products?.id || row.product_id,
      user_id: row.user_id,
      user_name: row.users?.full_name || 'Pelanggan Terverifikasi',
      user_avatar: row.users?.avatar_url || '',
      product_name: row.products?.name || 'Produk',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      product_image: row.products?.product_images?.find((img: any) => img.is_primary)?.url || row.products?.product_images?.[0]?.url || '',
    }))
  } catch (err) {
    console.error('Failed to load admin reviews:', err)
    return []
  }
}

export async function getStorefrontFeaturedReviewsAction(
  fallbackList: import('@/lib/storefront-settings').FeaturedReviewItem[] = [],
  selectedIds: string[] = []
): Promise<import('@/lib/storefront-settings').FeaturedReviewItem[]> {
  // If admin has configured featured reviews and no explicit DB selection overrides it, return them directly
  if (fallbackList && fallbackList.length > 0 && (!selectedIds || selectedIds.length === 0)) {
    return fallbackList
  }

  try {
    const supabase = await createClient()

    // 1. If admin selected specific review IDs from real database reviews:
    if (selectedIds && selectedIds.length > 0) {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, product_id, user_id, products(id, name, slug, price, product_images(url, is_primary)), users(full_name, avatar_url)')
        .in('id', selectedIds)

      if (!error && data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((row: any) => ({
          id: row.id,
          user_name: row.users?.full_name || 'Pelanggan Terverifikasi',
          user_avatar: row.users?.avatar_url || '',
          product_id: row.products?.id || row.product_id,
          product_name: row.products?.name || 'Produk Next Solution',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          product_image: row.products?.product_images?.find((img: any) => img.is_primary)?.url || row.products?.product_images?.[0]?.url || '',
          rating: row.rating,
          comment: row.comment || '',
          date_text: new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          is_verified: true,
        }))
      }
    }

    if (fallbackList && fallbackList.length > 0) {
      return fallbackList
    }

    // 2. Fallback to top-rated recent reviews from database:
    const { data: topRows } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, product_id, user_id, products(id, name, slug, price, product_images(url, is_primary)), users(full_name, avatar_url)')
      .gte('rating', 4)
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(6)

    if (topRows && topRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return topRows.map((row: any) => ({
        id: row.id,
        user_name: row.users?.full_name || 'Pelanggan Terverifikasi',
        user_avatar: row.users?.avatar_url || '',
        product_id: row.products?.id || row.product_id,
        product_name: row.products?.name || 'Produk Next Solution',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        product_image: row.products?.product_images?.find((img: any) => img.is_primary)?.url || row.products?.product_images?.[0]?.url || '',
        rating: row.rating,
        comment: row.comment || '',
        date_text: new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        is_verified: true,
      }))
    }

    const { DEFAULT_FEATURED_REVIEWS } = await import('@/lib/storefront-settings')
    return DEFAULT_FEATURED_REVIEWS
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && (err as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE') {
      throw err
    }
    console.error('Failed to get storefront featured reviews:', err)
    if (fallbackList && fallbackList.length > 0) return fallbackList
    const { DEFAULT_FEATURED_REVIEWS } = await import('@/lib/storefront-settings')
    return DEFAULT_FEATURED_REVIEWS
  }
}
