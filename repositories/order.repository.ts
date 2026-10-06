import { BaseRepository } from './base'

export class OrderRepository extends BaseRepository {
  async create(orderData: Record<string, unknown>, items: Record<string, unknown>[]) {
    const supabase = await this.getClient()
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) throw orderError

    const itemsData = items.map((item) => ({
      ...item,
      order_id: order.id
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsData)

    if (itemsError) throw itemsError

    return order
  }

  async getUserOrders(userId: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async getOrderById(orderId: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(slug, product_images(*))), payments(*)')
      .eq('id', orderId)
      .single()
    if (error) throw error
    return data
  }

  async updateStatus(orderId: string, status: string) {
    const supabase = await this.getClient()
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
    if (error) throw error
  }
}
