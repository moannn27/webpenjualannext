import { BaseRepository } from './base'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { PostgrestError } from '@supabase/supabase-js'

function createReviewPersistenceError(action: string, error: PostgrestError): Error {
  const databaseMessage = error.message || 'Kesalahan database tidak diketahui.'
  const missingOrderColumn =
    (error.code === '42703' && /reviews\.order_id|column .*order_id/i.test(databaseMessage)) ||
    (error.code === 'PGRST204' && /order_id/i.test(databaseMessage))

  if (missingOrderColumn) {
    return new Error(
      `Fitur ulasan terverifikasi belum aktif pada database Supabase ini. Terapkan migration ` +
      `20261114000000_verified_product_reviews.sql pada project yang dipakai aplikasi. ` +
      `Jika migration sudah diterapkan, refresh schema cache Supabase. Detail: ${databaseMessage}`
    )
  }

  return new Error(`Gagal ${action}${error.code ? ` (${error.code})` : ''}: ${databaseMessage}`)
}

export class ReviewRepository extends BaseRepository {
  async getRatingSummaries(productIds: string[]) {
    const uniqueProductIds = [...new Set(productIds.filter(Boolean))]
    const summaries = new Map<string, { rating: number; count: number }>()
    if (uniqueProductIds.length === 0) return summaries

    const supabase = await this.getClient()
    const totalsByProduct = new Map<string, { sum: number; count: number }>()
    const pageSize = 500

    for (let productIndex = 0; productIndex < uniqueProductIds.length; productIndex += 100) {
      const productIdBatch = uniqueProductIds.slice(productIndex, productIndex + 100)
      const { data: firstPage, error: firstPageError, count } = await supabase
        .from('reviews')
        .select('id, product_id, rating', { count: 'exact' })
        .in('product_id', productIdBatch)
        .eq('is_verified', true)
        .gte('rating', 1)
        .lte('rating', 5)
        .order('id', { ascending: true })
        .range(0, pageSize - 1)

      if (firstPageError) {
        throw new Error(`Gagal menghitung rating produk: ${firstPageError.message}`)
      }

      const expectedRows = count ?? firstPage?.length ?? 0
      let offset = 0
      let page = firstPage ?? []

      while (offset < expectedRows) {
        if (page.length === 0) {
          throw new Error('Gagal menghitung rating produk: halaman ulasan tidak lengkap.')
        }

        for (const review of page) {
          const current = totalsByProduct.get(review.product_id) ?? { sum: 0, count: 0 }
          current.sum += review.rating
          current.count += 1
          totalsByProduct.set(review.product_id, current)
        }

        offset += page.length
        if (offset >= expectedRows) break

        const { data: nextPage, error: nextPageError } = await supabase
          .from('reviews')
          .select('id, product_id, rating')
          .in('product_id', productIdBatch)
          .eq('is_verified', true)
          .gte('rating', 1)
          .lte('rating', 5)
          .order('id', { ascending: true })
          .range(offset, offset + pageSize - 1)

        if (nextPageError) {
          throw new Error(`Gagal menghitung rating produk: ${nextPageError.message}`)
        }
        page = nextPage ?? []
      }
    }

    for (const [productId, totals] of totalsByProduct) {
      summaries.set(productId, {
        rating: totals.sum / totals.count,
        count: totals.count,
      })
    }

    return summaries
  }

  async getByProduct(productId: string) {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('id, product_id, rating, comment, image_url, created_at, is_verified, admin_reply, admin_replied_at, users(full_name, avatar_url)')
      .eq('product_id', productId)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
    if (error) throw error

    return (data ?? []).map((review) => {
      const user = Array.isArray(review.users) ? review.users[0] : review.users
      return {
        ...review,
        users: user
          ? { full_name: user.full_name, avatar_url: user.avatar_url }
          : null,
      }
    })
  }

  async getUserReviews(userId: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('id, product_id, rating, comment, created_at')
      .eq('user_id', userId)
    if (error) throw error
    return data ?? []
  }

  async create(reviewData: {
    user_id: string
    product_id: string
    order_id: string
    rating: number
    comment?: string
  }) {
    const supabase = await this.getClient()
    const existing = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', reviewData.user_id)
      .eq('product_id', reviewData.product_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing.error) {
      throw createReviewPersistenceError('memeriksa ulasan sebelumnya', existing.error)
    }

    if (existing.data?.id) {
      const { error } = await supabase
        .from('reviews')
        .update({
          order_id: reviewData.order_id,
          rating: reviewData.rating,
          comment: reviewData.comment,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.data.id)
      if (error) throw createReviewPersistenceError('memperbarui ulasan', error)
    } else {
      const { error } = await supabase
        .from('reviews')
        .insert(reviewData)
      if (error) throw createReviewPersistenceError('menyimpan ulasan', error)
    }
  }
}
