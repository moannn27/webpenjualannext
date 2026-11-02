import { ProductRepository } from '@/repositories/product.repository'
import { ReviewService } from '@/services/review.service'
import type { CatalogFilterParams } from '@/lib/catalog-filters'

export class ProductService {
  private repo = new ProductRepository()
  private reviews = new ReviewService()

  async attachReviewSummaries<T extends { id: string }>(products: T[]) {
    const summaries = await this.reviews.getRatingSummaries(products.map((product) => product.id))
    return products.map((product) => {
      const summary = summaries.get(product.id)
      return {
        ...product,
        rating: summary?.rating,
        reviews: summary?.count ?? 0,
      }
    })
  }

  async getProducts(options?: { categoryId?: string; brandId?: string; isFeatured?: boolean; isBestSeller?: boolean; isNewArrival?: boolean; limit?: number }) {
    return (await this.repo.findAll(options)) ?? []
  }

  async getProductsPage(options: { page: number; pageSize: number; categoryId?: string; brandId?: string; search?: string; promoOnly?: boolean; promoProductIds?: string[]; sort?: string; filters?: CatalogFilterParams }) {
    const result = await this.repo.findPage(options)
    return {
      ...result,
      rows: await this.attachReviewSummaries(result.rows as { id: string }[]),
    }
  }

  async getProductsByIds(ids: string[]) {
    return this.attachReviewSummaries(await this.repo.findByIds(ids))
  }

  async getPromoProducts(limit = 8) {
    return this.attachReviewSummaries(await this.repo.findPromos(limit))
  }

  async getProductBySlug(slug: string) {
    const product = await this.repo.findBySlug(slug)
    if (!product) return product
    const [enrichedProduct] = await this.attachReviewSummaries([product])
    return enrichedProduct
  }

  async getProductById(id: string) {
    const product = await this.repo.findById(id)
    if (!product) return product
    const [enrichedProduct] = await this.attachReviewSummaries([product])
    return enrichedProduct
  }

  async searchProducts(query: string) {
    return this.attachReviewSummaries(await this.repo.search(query))
  }

  async getFeaturedProducts() {
    return this.attachReviewSummaries((await this.repo.findAll({ isFeatured: true, limit: 8 })) ?? [])
  }

  async getBestSeller() {
    return this.attachReviewSummaries((await this.repo.findAll({ isBestSeller: true, limit: 8 })) ?? [])
  }

  async getNewArrival() {
    return this.attachReviewSummaries((await this.repo.findAll({ isNewArrival: true, limit: 8 })) ?? [])
  }

  async getRelatedProducts(productId: string, limit = 8, preloadedProduct?: unknown) {
    return this.attachReviewSummaries(
      await this.repo.findRelated(productId, limit, preloadedProduct)
    )
  }
}
