import { BaseRepository } from './base'

export class CartRepository extends BaseRepository {
  async getCartSummary(userId: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('cart')
      .select('id, cart_items(product_id, variant_id, quantity)')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async getProductCartQuantities(userId: string, productId: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('cart')
      .select('cart_items(product_id, variant_id, quantity)')
      .eq('user_id', userId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return (data?.cart_items ?? []).filter((item) => item.product_id === productId)
  }

  async getCart(userId: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('cart')
      .select('*, cart_items(*, products(*, product_images(*), product_specifications(*), categories(id, name), brands(id, name)), product_variants(*))')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async addItem(cartId: string, productId: string, quantity: number, variantId: string | null) {
    const supabase = await this.getClient()
    
    let lookup = supabase.from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
    lookup = variantId ? lookup.eq('variant_id', variantId) : lookup.is('variant_id', null)
    const { data: existing, error: lookupError } = await lookup.maybeSingle()

    if (lookupError) throw lookupError

    if (existing) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ cart_id: cartId, product_id: productId, variant_id: variantId, quantity })
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
