import { ProductRepository } from '@/repositories/product.repository'

export class ProductService {
  private repo = new ProductRepository()

  async getProducts(options?: { categoryId?: string, brandId?: string }) {
    return await this.repo.findAll(options)
  }

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
    return await this.repo.findAll({ isFeatured: true })
  }

  async getBestSeller() {
    return await this.repo.findAll({ isBestSeller: true })
  }

  async getNewArrival() {
    return await this.repo.findAll({ isNewArrival: true })
  }
}
