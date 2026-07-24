import { BaseRepository } from './base'

export class WishlistRepository extends BaseRepository {
  async getUserWishlist(userId: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('wishlist')
      .select('*, products(*, product_images(*))')
      .eq('user_id', userId)
    if (error) throw error
    return data
  }

  async toggle(userId: string, productId: string) {
    const supabase = await this.getClient()
    
    // Check if exists
    const { data: existing } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single()

    if (existing) {
      // Remove
      const { error } = await supabase.from('wishlist').delete().eq('id', existing.id)
      if (error) throw error
      return { action: 'removed' }
    } else {
      // Add
      const { error } = await supabase.from('wishlist').insert({ user_id: userId, product_id: productId })
      if (error) throw error
      return { action: 'added' }
    }
  }
}
