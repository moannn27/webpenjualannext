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

  async create(reviewData: any) {
    const supabase = await this.getClient()
    const { error } = await supabase.from('reviews').insert(reviewData)
    if (error) throw error
  }
}
