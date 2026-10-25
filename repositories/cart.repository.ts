import { BaseRepository } from './base'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export class CartRepository extends BaseRepository {
  async getOrCreateCart(userId: string): Promise<string> {
    const supabase = await this.getClient()
    const query = supabase
      .from('cart')
      .select('id')
      .eq('user_id', userId)

    const { data: existing, error } = typeof query.maybeSingle === 'function' ? await query.maybeSingle() : await query.single()

    if (error && error.code !== 'PGRST116') throw error
    if (existing?.id) return existing.id

    const { data: created, error: insertError } = await supabase
      .from('cart')
      .insert({ user_id: userId })
      .select('id')
      .single()

    if (insertError) {
      const refetchQuery = supabase
        .from('cart')
        .select('id')
        .eq('user_id', userId)

      const { data: refetched } = typeof refetchQuery.maybeSingle === 'function' ? await refetchQuery.maybeSingle() : await refetchQuery.single()
      if (refetched?.id) return refetched.id
      throw insertError
    }
    return created.id
  }

  async getCartSummary(userId: string) {
    const supabase = await this.getClient()
    const query = supabase
      .from('cart')
      .select('id, cart_items(product_id, variant_id, quantity)')
      .eq('user_id', userId)

    const { data, error } = typeof query.maybeSingle === 'function' ? await query.maybeSingle() : await query.single()

    if (error && error.code !== 'PGRST116') throw error
    if (data) return data

    const cartId = await this.getOrCreateCart(userId)
    return { id: cartId, cart_items: [] }
  }

  async getProductCartQuantities(userId: string, productId: string) {
    const supabase = await this.getClient()
    const query = supabase
      .from('cart')
      .select('cart_items(product_id, variant_id, quantity)')
      .eq('user_id', userId)

    const { data, error } = typeof query.maybeSingle === 'function' ? await query.maybeSingle() : await query.single()
    if (error && error.code !== 'PGRST116') throw error
    return (data?.cart_items ?? []).filter((item: { product_id: string }) => item.product_id === productId)
  }

  async getCart(userId: string) {
    const supabase = await this.getClient()
    const query = supabase
      .from('cart')
      .select('*, cart_items(*, products(*, product_images(*), product_specifications(*), categories(id, name), brands(id, name)), product_variants(*, product_variant_images(id, url, display_order)))')
      .eq('user_id', userId)

    const { data, error } = typeof query.maybeSingle === 'function' ? await query.maybeSingle() : await query.single()
    
    if (error && error.code !== 'PGRST116') throw error
    if (data) return data

    const cartId = await this.getOrCreateCart(userId)
    return {
      id: cartId,
      user_id: userId,
      cart_items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  async addItem(cartId: string, productId: string, quantity: number, variantId: string | null) {
    const supabase = await this.getClient()
    
    let lookup = supabase.from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
    lookup = variantId ? lookup.eq('variant_id', variantId) : lookup.is('variant_id', null)
    const { data: existing, error: lookupError } = await lookup.maybeSingle()

    if (lookupError && lookupError.code !== 'PGRST116') throw lookupError

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

  async getItemById(itemId: string) {
    if (!isUuid(itemId)) return null
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('cart_items')
      .select('id, cart_id, product_id, variant_id, quantity')
      .eq('id', itemId)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async updateItem(itemId: string, quantity: number) {
    if (!isUuid(itemId)) return
    const supabase = await this.getClient()
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId)
    if (error) throw error
  }

  async removeItem(itemId: string) {
    if (!isUuid(itemId)) return
    const supabase = await this.getClient()
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
    if (error) throw error
  }

  async syncCartItems(
    userId: string,
    items: { productId: string; variantId: string | null; quantity: number }[]
  ) {
    const cartId = await this.getOrCreateCart(userId)
    const supabase = await this.getClient()

    for (const item of items) {
      if (!item.productId || item.quantity <= 0) continue

      let lookup = supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('product_id', item.productId)
      
      lookup = item.variantId ? lookup.eq('variant_id', item.variantId) : lookup.is('variant_id', null)
      const { data: existing, error: lError } = await lookup.maybeSingle()
      if (lError && lError.code !== 'PGRST116') throw lError

      if (existing) {
        const { error: uErr } = await supabase
          .from('cart_items')
          .update({ quantity: item.quantity })
          .eq('id', existing.id)
        if (uErr) throw uErr
      } else {
        const { error: iErr } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cartId,
            product_id: item.productId,
            variant_id: item.variantId || null,
            quantity: item.quantity,
          })
        if (iErr) throw iErr
      }
    }

    return await this.getCart(userId)
  }
}
