'use server'

import { ReviewService } from '@/services/review.service'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireModulePermission } from '@/lib/auth/permissions'

const reviewService = new ReviewService()

export async function getProductReviewsAction(productId: string) {
  if (!isUuid(productId)) throw new Error('Produk tidak valid.')
  return reviewService.getReviews(productId)
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
  const orderId = String(formData.get('orderId') ?? '').trim()
  const rating = Number(String(formData.get('rating') ?? '5'))
  const comment = String(formData.get('comment') ?? '').trim()

  if (!isUuid(productId)) throw new Error("Produk tidak valid.")
  if (!isUuid(orderId)) throw new Error("Pesanan tidak valid.")
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Rating harus antara 1 sampai 5 bintang.")
  if (comment.length > 1000) throw new Error("Ulasan maksimal 1000 karakter.")

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (orderError) throw new Error(`Gagal memeriksa pesanan: ${orderError.message}`)
  if (!order || order.status !== 'delivered') {
    throw new Error('Ulasan hanya dapat diberikan untuk pesanan yang sudah diterima.')
  }

  const [{ data: orderItem, error: itemError }, { data: successfulPayment, error: paymentError }] =
    await Promise.all([
      supabase
        .from('order_items')
        .select('id')
        .eq('order_id', orderId)
        .eq('product_id', productId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('payments')
        .select('id')
        .eq('order_id', orderId)
        .eq('status', 'success')
        .limit(1)
        .maybeSingle(),
    ])
  if (itemError) throw new Error(`Gagal memeriksa produk pesanan: ${itemError.message}`)
  if (paymentError) throw new Error(`Gagal memeriksa pembayaran: ${paymentError.message}`)
  if (!orderItem) throw new Error('Produk ini tidak ditemukan di pesanan yang dipilih.')
  if (!successfulPayment) throw new Error('Pembayaran pesanan belum berhasil diverifikasi.')

  await reviewService.createReview(user.id, productId, orderId, rating, comment)
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
  order_id: string | null;
  order_number: string | null;
  is_verified: boolean;
  admin_reply: string | null;
  admin_replied_at: string | null;
  user_name: string;
  user_avatar?: string;
  product_name: string;
  product_image?: string;
};

async function queryAdminReviews(from: number, to: number) {
  const supabase = getSupabaseAdminClient()
  const { data, error, count } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, product_id, user_id, order_id, is_verified, admin_reply, admin_replied_at, products(id, name, product_images(url, is_primary)), users(full_name, avatar_url)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(`Gagal memuat ulasan admin: ${error.message}`)
  const rows = data ?? []
  const orderIds = [...new Set(rows.flatMap((row) => row.order_id ? [row.order_id] : []))]
  const orderNumberById = new Map<string, string>()

  if (orderIds.length > 0) {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number')
      .in('id', orderIds)

    if (ordersError) throw new Error(`Gagal memuat nomor pesanan ulasan: ${ordersError.message}`)
    for (const order of orders ?? []) {
      orderNumberById.set(order.id, order.order_number)
    }
  }

  const reviews = rows.map((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products
    const user = Array.isArray(row.users) ? row.users[0] : row.users
    const images = product?.product_images ?? []
    const primaryImage = images.find((image) => image.is_primary) ?? images[0]

    return {
      id: row.id,
      rating: row.rating,
      comment: row.comment ?? '',
      created_at: row.created_at,
      product_id: row.product_id,
      user_id: row.user_id,
      order_id: row.order_id,
      order_number: row.order_id ? orderNumberById.get(row.order_id) ?? null : null,
      is_verified: row.is_verified,
      admin_reply: row.admin_reply,
      admin_replied_at: row.admin_replied_at,
      user_name: user?.full_name || 'Pelanggan',
      user_avatar: user?.avatar_url || '',
      product_name: product?.name || 'Produk',
      product_image: primaryImage?.url || '',
    }
  })
  return { reviews, total: count ?? 0 }
}

export async function getAllReviewsForAdminAction(): Promise<AdminReviewWithDetails[]> {
  await requireModulePermission('content')
  const { reviews } = await queryAdminReviews(0, 99)
  return reviews
}

export async function getAdminReviewsPageAction(page: number): Promise<{
  reviews: AdminReviewWithDetails[];
  total: number;
  page: number;
}> {
  await requireModulePermission('content')
  if (!Number.isInteger(page) || page < 1 || page > 10000) {
    throw new Error('Halaman ulasan tidak valid.')
  }
  const pageSize = 50
  const { reviews, total } = await queryAdminReviews((page - 1) * pageSize, page * pageSize - 1)
  return { reviews, total, page }
}

export async function saveAdminReviewReplyAction(
  reviewId: string,
  reply: string
): Promise<{ success: true; reply: string | null; repliedAt: string | null }> {
  const { user } = await requireModulePermission('content')
  if (!isUuid(reviewId)) throw new Error('Ulasan tidak valid.')
  if (typeof reply !== 'string') throw new Error('Balasan ulasan tidak valid.')

  const normalizedReply = reply.trim()
  if (normalizedReply.length > 1000) throw new Error('Balasan maksimal 1000 karakter.')
  const repliedAt = normalizedReply ? new Date().toISOString() : null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .update({
      admin_reply: normalizedReply || null,
      admin_replied_at: repliedAt,
      admin_replied_by: normalizedReply ? user.id : null,
    })
    .eq('id', reviewId)
    .select('id, product_id')
    .maybeSingle()

  if (error) throw new Error(`Gagal menyimpan balasan: ${error.message}`)
  if (!data) throw new Error('Ulasan tidak ditemukan atau akses ditolak.')

  revalidatePath(`/product/${data.product_id}`)
  revalidatePath('/admin/reviews')
  revalidatePath('/')
  return { success: true, reply: normalizedReply || null, repliedAt }
}

export async function deleteAdminReviewAction(reviewId: string): Promise<{ success: true }> {
  await requireModulePermission('content')
  if (!isUuid(reviewId)) throw new Error('Ulasan tidak valid.')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .select('id, product_id')
    .maybeSingle()

  if (error) throw new Error(`Gagal menghapus ulasan: ${error.message}`)
  if (!data) throw new Error('Ulasan tidak ditemukan atau akses ditolak.')

  revalidatePath(`/product/${data.product_id}`)
  revalidatePath('/admin/reviews')
  revalidatePath('/')
  return { success: true }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function verifyFeaturedFallbackList(
  fallbackList: import('@/lib/storefront-settings').FeaturedReviewItem[]
): Promise<import('@/lib/storefront-settings').FeaturedReviewItem[]> {
  const reviewIds = fallbackList.map((review) => review.id).filter(isUuid)
  if (reviewIds.length === 0) {
    return fallbackList.map((review) => ({ ...review, is_verified: false }))
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .in('id', reviewIds)
    .eq('is_verified', true)
  if (error) throw new Error(`Gagal memverifikasi ulasan pilihan: ${error.message}`)
  const verifiedIds = new Set((data ?? []).map((review) => review.id))
  return fallbackList.map((review) => ({
    ...review,
    is_verified: verifiedIds.has(review.id),
  }))
}

export async function getStorefrontFeaturedReviewsAction(
  fallbackList: import('@/lib/storefront-settings').FeaturedReviewItem[] = [],
  selectedIds: string[] = []
): Promise<import('@/lib/storefront-settings').FeaturedReviewItem[]> {
  // Only reviews that still exist in the verified reviews table receive the purchase badge.
  if (fallbackList && fallbackList.length > 0 && (!selectedIds || selectedIds.length === 0)) {
    return verifyFeaturedFallbackList(fallbackList)
  }

  try {
    const supabase = getSupabaseAdminClient()

    // 1. If admin selected specific review IDs from real database reviews:
    if (selectedIds && selectedIds.length > 0) {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, product_id, products(id, name, product_images(url, is_primary)), users(full_name, avatar_url)')
        .in('id', selectedIds)
        .eq('is_verified', true)

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
      return verifyFeaturedFallbackList(fallbackList)
    }

    // 2. Fallback to top-rated recent reviews from database:
    const { data: topRows } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, product_id, products(id, name, product_images(url, is_primary)), users(full_name, avatar_url)')
      .eq('is_verified', true)
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
    if (fallbackList && fallbackList.length > 0) {
      return fallbackList.map((review) => ({ ...review, is_verified: false }))
    }
    const { DEFAULT_FEATURED_REVIEWS } = await import('@/lib/storefront-settings')
    return DEFAULT_FEATURED_REVIEWS
  }
}
