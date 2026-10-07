import { BaseRepository } from '@/repositories/base'

export class AdminService extends BaseRepository {
  async getDashboardStats() {
    const supabase = await this.getClient()
    
    const [ordersCount, usersCount, productsCount, lowStockCount, totalRevenue, recentOrders] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).lte('stock', 5),
      supabase.from('orders').select('grand_total').eq('status', 'delivered'),
      supabase.from('orders').select('id, order_number, status, grand_total, created_at, users(full_name)').order('created_at', { ascending: false }).limit(5),
    ])

    const queryErrors = [ordersCount.error, usersCount.error, productsCount.error, lowStockCount.error, totalRevenue.error, recentOrders.error]
    const queryError = queryErrors.find(Boolean)
    if (queryError) throw queryError

    const revenue = totalRevenue.data?.reduce((acc, order) => acc + order.grand_total, 0) || 0

    return {
      totalOrders: ordersCount.count || 0,
      totalUsers: usersCount.count || 0,
      totalProducts: productsCount.count || 0,
      lowStockProducts: lowStockCount.count || 0,
      revenue,
      recentOrders: recentOrders.data ?? [],
    }
  }
}
