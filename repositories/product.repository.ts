import { BaseRepository } from './base'
import type { CatalogFilterParams } from '@/lib/catalog-filters'

export class ProductRepository extends BaseRepository {
  async findPage(options: { page: number; pageSize: number; categoryId?: string; brandId?: string; search?: string; promoOnly?: boolean; sort?: string; filters?: CatalogFilterParams }) {
    const supabase = await this.getClient()
    const term = (options.search ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().slice(0, 80)
    const size = Math.min(200, Math.max(1, Math.trunc(options.pageSize)))
    const page = Math.max(1, Math.trunc(options.page))
    const filters = options.filters
    const { data, error } = await supabase.rpc('search_catalog_products', {
      p_page: page, p_page_size: size, p_category_id: options.categoryId ?? null, p_brand_id: options.brandId ?? null,
      p_search: term || null, p_promo_only: Boolean(options.promoOnly), p_sort: options.sort ?? 'newest',
      p_price_min: filters?.priceMin ?? null, p_price_max: filters?.priceMax ?? null,
      p_processor: filters?.processor ?? null, p_ram: filters?.ram ?? null, p_storage: filters?.storage ?? null,
      p_gpu: filters?.gpu ?? null, p_display: filters?.display ?? null, p_in_stock: filters?.inStock ?? null,
    })
    if (error) {
      const isMissingRpc = error.code === 'PGRST202' || error.code === '42883' || error.message?.includes('search_catalog_products')
      if (isMissingRpc) {
        let query = supabase.from('products').select('*, product_images(*), categories(*), brands(*)', { count: 'exact' }).eq('status', 'published')
        if (options.categoryId) query = query.eq('category_id', options.categoryId)
        if (options.brandId) query = query.eq('brand_id', options.brandId)
        if (options.promoOnly) query = query.not('discount_price', 'is', null)
        if (term) query = query.ilike('name', `%${term}%`)

        if (options.sort === 'price_asc') query = query.order('price', { ascending: true })
        else if (options.sort === 'price_desc') query = query.order('price', { ascending: false })
        else if (options.sort === 'popular' || options.sort === 'bestseller') query = query.order('is_best_seller', { ascending: false }).order('created_at', { ascending: false })
        else query = query.order('created_at', { ascending: false })

        const from = (page - 1) * size
        const to = from + size - 1
        query = query.range(from, to)
        const { data: fallbackRows, count, error: fallbackError } = await query
        if (fallbackError) throw fallbackError
        return { rows: fallbackRows ?? [], total: Number(count ?? 0), page, pageSize: size }
      }
      throw error
    }
    const result = data as { rows?: unknown[]; total?: number } | null
    return { rows: result?.rows ?? [], total: Number(result?.total ?? 0), page, pageSize: size }
  }

  async findByIds(ids: string[]) {
    if (!ids.length) return []
    const supabase = await this.getClient()
    const { data, error } = await supabase.from('products').select('*, product_images(*), categories(*), brands(*)').eq('status', 'published').in('id', ids.slice(0, 24))
    if (error) throw error
    return data ?? []
  }

  async findPromos(limit = 8) {
    const supabase = await this.getClient()
    const { data, error } = await supabase.from('products').select('*, product_images(*), categories(*), brands(*)').eq('status', 'published').not('discount_price', 'is', null).order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return data ?? []
  }

  async findAll(options?: { categoryId?: string, brandId?: string, isFeatured?: boolean, isBestSeller?: boolean, isNewArrival?: boolean, limit?: number }) {
    const supabase = await this.getClient()
    let query = supabase.from('products').select('*, product_images(*), categories(*), brands(*)').eq('status', 'published')
    
    if (options?.categoryId) query = query.eq('category_id', options.categoryId)
    if (options?.brandId) query = query.eq('brand_id', options.brandId)
    if (options?.isFeatured) query = query.eq('is_featured', true)
    if (options?.isBestSeller) query = query.eq('is_best_seller', true)
    if (options?.isNewArrival) query = query.eq('is_new_arrival', true)

    query = query.order('created_at', { ascending: false })
    if (options?.limit) query = query.limit(options.limit)
    const { data, error } = await query
    if (error) throw error
    return data
  }

  async findBySlug(slug: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), product_specifications(*), product_variants(*), categories(*), brands(*)')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
    if (error) throw error
    return data
  }

  async findById(id: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), product_specifications(*), product_variants(*), categories(*), brands(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  async findStockById(id: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, stock, status, product_variants(id, stock)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }
  
  async search(queryStr: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), categories(*), brands(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    if (error) throw error
    const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('id-ID')
    const terms = normalize(queryStr).trim().split(/\s+/).filter(Boolean)
    return (data ?? []).filter((product) => {
      const searchable = normalize([product.name, product.sku, product.description, product.brands?.name, product.categories?.name].join(' '))
      return terms.every((term) => searchable.includes(term))
    })
  }
}
