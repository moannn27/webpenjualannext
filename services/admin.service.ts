import { BaseRepository } from '@/repositories/base'

export class AdminService extends BaseRepository {
  async getDashboardStats() {
    const supabase = await this.getClient()
    
    const [ordersCount, usersCount, productsCount, publishedProductsCount, categoriesCount, lowStockCount, recentOrders, salesChart] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).lte('stock', 5),
      supabase.from('orders').select('id, order_number, status, grand_total, created_at, users(full_name)').order('created_at', { ascending: false }).limit(5),
      supabase.rpc('get_admin_sales_chart', { p_days: 30 }),
    ])

    const queryErrors = [ordersCount.error, usersCount.error, productsCount.error, publishedProductsCount.error, categoriesCount.error, lowStockCount.error, recentOrders.error]
    const queryError = queryErrors.find(Boolean)
    if (queryError) throw queryError

    const salesAnalyticsAvailable = !salesChart.error
    const revenue = salesAnalyticsAvailable ? Number(salesChart.data?.[0]?.lifetime_revenue ?? 0) : 0

    return {
      totalOrders: ordersCount.count || 0,
      totalUsers: usersCount.count || 0,
      totalProducts: productsCount.count || 0,
      publishedProducts: publishedProductsCount.count || 0,
      totalCategories: categoriesCount.count || 0,
      lowStockProducts: lowStockCount.count || 0,
      revenue,
      salesAnalyticsAvailable,
      salesChart: (salesChart.data ?? []).map((row: { day: string; orders_count: number; revenue: number | string; lifetime_revenue: number | string }) => ({ day: row.day, orders: Number(row.orders_count), revenue: Number(row.revenue) })),
      recentOrders: recentOrders.data ?? [],
    }
  }
}
