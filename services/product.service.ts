import { ProductRepository } from '@/repositories/product.repository'
import type { CatalogFilterParams } from '@/lib/catalog-filters'

export class ProductService {
  private repo = new ProductRepository()

  async getProducts(options?: { categoryId?: string, brandId?: string }) {
    return await this.repo.findAll(options)
  }

  async getProductsPage(options: { page: number; pageSize: number; categoryId?: string; brandId?: string; search?: string; promoOnly?: boolean; sort?: string; filters?: CatalogFilterParams }) {
    return await this.repo.findPage(options)
  }

  async getProductsByIds(ids: string[]) { return await this.repo.findByIds(ids) }
  async getPromoProducts(limit = 8) { return await this.repo.findPromos(limit) }

  async getProductBySlug(slug: string) {
    return await this.repo.findBySlug(slug)
  }

  async getProductById(id: string) {
    return await this.repo.findById(id)
  }

  async searchProducts(query: string) {
    return await this.repo.search(query)
  }

  async getFeaturedProducts() {
    return await this.repo.findAll({ isFeatured: true, limit: 8 })
  }

  async getBestSeller() {
    return await this.repo.findAll({ isBestSeller: true, limit: 8 })
  }

  async getNewArrival() {
    return await this.repo.findAll({ isNewArrival: true, limit: 8 })
  }
}
