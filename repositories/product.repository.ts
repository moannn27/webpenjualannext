import { BaseRepository } from './base'
import type { CatalogFilterParams } from '@/lib/catalog-filters'
import { normalizeLaptopSpecKey } from '@/lib/product-specifications'

export function matchesProductSearch(
  product: {
    name?: string | null
    sku?: string | null
    description?: string | null
    brands?: { name?: string | null } | null
    categories?: { name?: string | null } | null
    product_specifications?: { key?: string; value?: string }[] | null
  },
  query: string
): boolean {
  const normalize = (val: unknown) =>
    String(val ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('id-ID')
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  if (!tokens.length) return true

  const brandName = product.brands?.name ?? ''
  const catName = product.categories?.name ?? ''
  const specsText = (product.product_specifications ?? [])
    .map((s) => `${s.key ?? ''} ${s.value ?? ''}`)
    .join(' ')

  const searchable = normalize(
    [product.name, product.sku, product.description, brandName, catName, specsText].join(' ')
  )

  return tokens.every((token) => searchable.includes(token))
}

export class ProductRepository extends BaseRepository {
  async findPage(options: {
    page: number
    pageSize: number
    categoryId?: string
    brandId?: string
    search?: string
    promoOnly?: boolean
    sort?: string
    filters?: CatalogFilterParams
  }) {
    const supabase = await this.getClient()
    const term = (options.search ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .slice(0, 80)
    const size = Math.min(200, Math.max(1, Math.trunc(options.pageSize)))
    const page = Math.max(1, Math.trunc(options.page))
    const filters = options.filters

    // Attempt RPC if available
    let rpcSuccess = false
    let rpcResult: { rows?: unknown[]; total?: number } | null = null
    try {
      const { data, error } = await supabase.rpc('search_catalog_products', {
        p_page: page,
        p_page_size: size,
        p_category_id: options.categoryId ?? null,
        p_brand_id: options.brandId ?? null,
        p_search: term || null,
        p_promo_only: Boolean(options.promoOnly),
        p_sort: options.sort ?? 'newest',
        p_price_min: filters?.priceMin ?? null,
        p_price_max: filters?.priceMax ?? null,
        p_processor: filters?.processor ?? null,
        p_ram: filters?.ram ?? null,
        p_storage: filters?.storage ?? null,
        p_gpu: filters?.gpu ?? null,
        p_display: filters?.display ?? null,
        p_in_stock: filters?.inStock ?? null,
      })
      if (!error && data && typeof data === 'object') {
        rpcResult = data as { rows?: unknown[]; total?: number }
        if (!term || Number(rpcResult.total ?? 0) > 0) {
          rpcSuccess = true
        }
      }
    } catch {
      rpcSuccess = false
    }

    if (rpcSuccess && rpcResult) {
      return {
        rows: rpcResult.rows ?? [],
        total: Number(rpcResult.total ?? 0),
        page,
        pageSize: size,
      }
    }

    // Direct / Fallback Query:
    let query = supabase
      .from('products')
      .select('*, product_images(*), product_specifications(*), categories(*), brands(*)')
      .eq('status', 'published')

    if (options.categoryId) query = query.eq('category_id', options.categoryId)
    if (options.brandId) query = query.eq('brand_id', options.brandId)
    if (options.promoOnly) query = query.not('discount_price', 'is', null)
    if (filters?.inStock === true) query = query.gt('stock', 0)
    if (filters?.inStock === false) query = query.lte('stock', 0)

    const { data: rawRows, error: fetchError } = await query
    if (fetchError) throw fetchError

    let rows = (rawRows ?? []) as any[]

    // 1. Text Search matching across name, sku, description, brand, category, specs
    if (term) {
      rows = rows.filter((product) => matchesProductSearch(product, term))
    }

    // 2. Price filter (payable price: discount_price ?? price)
    if (filters?.priceMin !== null && filters?.priceMin !== undefined) {
      rows = rows.filter((p) => {
        const payable = Number(p.discount_price ?? p.price ?? 0)
        return payable >= filters.priceMin!
      })
    }
    if (filters?.priceMax !== null && filters?.priceMax !== undefined) {
      rows = rows.filter((p) => {
        const payable = Number(p.discount_price ?? p.price ?? 0)
        return payable <= filters.priceMax!
      })
    }

    // 3. Technical specification filters
    if (filters?.processor || filters?.ram || filters?.storage || filters?.gpu || filters?.display) {
      const norm = (v: string) => v.toLowerCase().trim()
      rows = rows.filter((p) => {
        const specs = (p.product_specifications ?? []) as { key: string; value: string }[]
        if (filters.processor) {
          const has = specs.some(
            (s) =>
              normalizeLaptopSpecKey(s.key) === 'Processor' &&
              norm(s.value).includes(norm(filters.processor!))
          )
          if (!has) return false
        }
        if (filters.ram) {
          const has = specs.some(
            (s) =>
              normalizeLaptopSpecKey(s.key) === 'RAM' &&
              norm(s.value).includes(norm(filters.ram!))
          )
          if (!has) return false
        }
        if (filters.storage) {
          const has = specs.some(
            (s) =>
              normalizeLaptopSpecKey(s.key) === 'Storage' &&
              norm(s.value).includes(norm(filters.storage!))
          )
          if (!has) return false
        }
        if (filters.gpu) {
          const has = specs.some(
            (s) =>
              normalizeLaptopSpecKey(s.key) === 'GPU' &&
              norm(s.value).includes(norm(filters.gpu!))
          )
          if (!has) return false
        }
        if (filters.display) {
          const has = specs.some(
            (s) =>
              normalizeLaptopSpecKey(s.key) === 'Display' &&
              norm(s.value).includes(norm(filters.display!))
          )
          if (!has) return false
        }
        return true
      })
    }

    // 4. Sorting
    const sort = options.sort ?? 'newest'
    rows.sort((a, b) => {
      const payableA = Number(a.discount_price ?? a.price ?? 0)
      const payableB = Number(b.discount_price ?? b.price ?? 0)

      if (sort === 'price-low' || sort === 'price_asc') {
        return payableA - payableB
      }
      if (sort === 'price-high' || sort === 'price_desc') {
        return payableB - payableA
      }
      if (sort === 'popular' || sort === 'bestseller') {
        if (a.is_best_seller !== b.is_best_seller) {
          return a.is_best_seller ? -1 : 1
        }
      }
      // default: newest created_at DESC
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // 5. Pagination
    const total = rows.length
    const from = (page - 1) * size
    const paginatedRows = rows.slice(from, from + size)

    return {
      rows: paginatedRows,
      total,
      page,
      pageSize: size,
    }
  }

  async findByIds(ids: string[]) {
    if (!ids.length) return []
    const supabase = await this.getClient()
    const { data, error } = await supabase.from('products').select('*, product_images(*), product_specifications(*), categories(*), brands(*)').eq('status', 'published').in('id', ids.slice(0, 24))
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
      .select('*, product_images(*), product_specifications(*), categories(*), brands(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).filter((product) => matchesProductSearch(product, queryStr))
  }
}
