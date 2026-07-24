import { BaseRepository } from '@/repositories/base'
import { createClient } from '@/lib/supabase/server'

export class AdminService extends BaseRepository {
  async getDashboardStats() {
    const supabase = await this.getClient()
    
    const [ordersCount, usersCount, productsCount, totalRevenue] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('grand_total').eq('status', 'delivered')
    ])

    const revenue = totalRevenue.data?.reduce((acc, order) => acc + order.grand_total, 0) || 0

    return {
      totalOrders: ordersCount.count || 0,
      totalUsers: usersCount.count || 0,
      totalProducts: productsCount.count || 0,
      revenue
    }
  }
}
