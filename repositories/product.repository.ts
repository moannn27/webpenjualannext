import { BaseRepository } from './base'

export class ProductRepository extends BaseRepository {
  async findPage(options: { page: number; pageSize: number; categoryId?: string; brandId?: string; search?: string; promoOnly?: boolean; sort?: string }) {
    const supabase = await this.getClient()
    let query = supabase.from('products').select('*, product_images(*), categories(*), brands(*)', { count: 'exact' }).eq('status', 'published')
    if (options.categoryId) query = query.eq('category_id', options.categoryId)
    if (options.brandId) query = query.eq('brand_id', options.brandId)
    if (options.promoOnly) query = query.not('discount_price', 'is', null)
    const term = (options.search ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().slice(0, 80)
    if (term) {
      const { data: brandData } = await supabase.from('brands').select('id').ilike('name', `%${term}%`)
      const brandIds = brandData?.map((b) => b.id).join(',')
      let orQuery = `name.ilike.%${term}%,sku.ilike.%${term}%,description.ilike.%${term}%`
      if (brandIds) orQuery += `,brand_id.in.(${brandIds})`
      query = query.or(orQuery)
    }
    if (options.sort === 'price-low') query = query.order('price', { ascending: true })
    else if (options.sort === 'price-high') query = query.order('price', { ascending: false })
    else if (options.sort === 'popular') query = query.order('is_best_seller', { ascending: false }).order('created_at', { ascending: false })
    else query = query.order('created_at', { ascending: false })
    const size = Math.min(200, Math.max(1, Math.trunc(options.pageSize)))
    const page = Math.max(1, Math.trunc(options.page))
    const { data, count, error } = await query.range((page - 1) * size, page * size - 1)
    if (error) throw error
    return { rows: data ?? [], total: count ?? 0, page, pageSize: size }
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
