import { BaseRepository } from '@/repositories/base'

export class AdminService extends BaseRepository {
  async getDashboardStats(lowStockThreshold: number = 5) {
    const supabase = await this.getClient()
    const threshold = Math.max(1, Math.min(100, Number(lowStockThreshold) || 5))
    
    const [ordersCount, usersCount, productsCount, publishedProductsCount, categoriesCount, lowStockCount, lowStockList, recentOrders, salesChart] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).lte('stock', threshold),
      supabase.from('products')
        .select('id, name, sku, stock, price, brands(name), categories(name)')
        .lte('stock', threshold)
        .order('stock', { ascending: true })
        .limit(10),
      supabase.from('orders').select('id, order_number, status, grand_total, created_at, users(full_name)').order('created_at', { ascending: false }).limit(5),
      supabase.rpc('get_admin_sales_chart', { p_days: 30 }),
    ])

    const queryErrors = [ordersCount.error, usersCount.error, productsCount.error, publishedProductsCount.error, categoriesCount.error, lowStockCount.error, lowStockList.error, recentOrders.error]
    const queryError = queryErrors.find(Boolean)
    if (queryError) throw queryError

    const salesAnalyticsAvailable = !salesChart.error
    const revenue = salesAnalyticsAvailable ? Number(salesChart.data?.[0]?.lifetime_revenue ?? 0) : 0

    const lowStockItems = (lowStockList.data ?? []).map((p: any) => {
      const brandObj = Array.isArray(p.brands) ? p.brands[0] : p.brands
      const catObj = Array.isArray(p.categories) ? p.categories[0] : p.categories
      return {
        id: String(p.id),
        name: String(p.name || 'Produk tanpa nama'),
        sku: String(p.sku || '-'),
        stock: Number(p.stock ?? 0),
        price: Number(p.price ?? 0),
        brand: String(brandObj?.name || '-'),
        category: String(catObj?.name || '-'),
      }
    })

    return {
      totalOrders: ordersCount.count || 0,
      totalUsers: usersCount.count || 0,
      totalProducts: productsCount.count || 0,
      publishedProducts: publishedProductsCount.count || 0,
      totalCategories: categoriesCount.count || 0,
      lowStockProducts: lowStockCount.count || 0,
      lowStockThreshold: threshold,
      lowStockItems,
      revenue,
      salesAnalyticsAvailable,
      salesChart: (salesChart.data ?? []).map((row: { day: string; orders_count: number; revenue: number | string; lifetime_revenue: number | string }) => ({ day: row.day, orders: Number(row.orders_count), revenue: Number(row.revenue) })),
      recentOrders: recentOrders.data ?? [],
    }
  }
}
