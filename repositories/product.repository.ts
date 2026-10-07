import { BaseRepository } from './base'

export class ProductRepository extends BaseRepository {
  async findAll(options?: { categoryId?: string, brandId?: string, isFeatured?: boolean, isBestSeller?: boolean, isNewArrival?: boolean }) {
    const supabase = await this.getClient()
    let query = supabase.from('products').select('*, product_images(*), categories(*), brands(*)').eq('status', 'published')
    
    if (options?.categoryId) query = query.eq('category_id', options.categoryId)
    if (options?.brandId) query = query.eq('brand_id', options.brandId)
    if (options?.isFeatured) query = query.eq('is_featured', true)
    if (options?.isBestSeller) query = query.eq('is_best_seller', true)
    if (options?.isNewArrival) query = query.eq('is_new_arrival', true)

    const { data, error } = await query
    if (error) throw error
    return data
  }

  async findBySlug(slug: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*), product_specifications(*), categories(*), brands(*)')
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
      .select('*, product_images(*), product_specifications(*), categories(*), brands(*)')
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
    if (error) throw error
    const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('id-ID')
    const terms = normalize(queryStr).trim().split(/\s+/).filter(Boolean)
    return (data ?? []).filter((product) => {
      const searchable = normalize([product.name, product.sku, product.description, product.brands?.name, product.categories?.name].join(' '))
      return terms.every((term) => searchable.includes(term))
    })
  }
}
