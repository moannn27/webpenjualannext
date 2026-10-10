import { BaseRepository } from './base'

export class ReviewRepository extends BaseRepository {
  async getByProduct(productId: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('*, users(full_name, avatar_url)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
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

  async create(reviewData: { user_id: string; product_id: string; rating: number; comment?: string }) {
    const supabase = await this.getClient()
    const existing = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', reviewData.user_id)
      .eq('product_id', reviewData.product_id)
      .maybeSingle()

    if (existing.data?.id) {
      const { error } = await supabase
        .from('reviews')
        .update({
          rating: reviewData.rating,
          comment: reviewData.comment,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.data.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('reviews')
        .insert(reviewData)
      if (error) throw error
    }
  }
}
