import { BaseRepository } from './base'

export class CartRepository extends BaseRepository {
  async getCart(userId: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('cart')
      .select('*, cart_items(*, products(*, product_images(*)))')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async addItem(cartId: string, productId: string, quantity: number) {
    const supabase = await this.getClient()
    
    const { data: existing } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ cart_id: cartId, product_id: productId, quantity })
      if (error) throw error
    }
  }

  async updateItem(itemId: string, quantity: number) {
    const supabase = await this.getClient()
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId)
    if (error) throw error
  }

  async removeItem(itemId: string) {
    const supabase = await this.getClient()
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
    if (error) throw error
  }
}
