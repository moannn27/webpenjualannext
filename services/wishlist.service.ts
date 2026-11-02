import { WishlistRepository } from '@/repositories/wishlist.repository'
import { ProductService } from '@/services/product.service'

export class WishlistService {
  private repo = new WishlistRepository()
  private products = new ProductService()

  async getWishlist(userId: string) {
    const wishlist = await this.repo.getUserWishlist(userId)
    const products = wishlist.flatMap((item) => item.products ? [item.products] : [])
    const enrichedProducts = await this.products.attachReviewSummaries(products)
    const productsById = new Map(enrichedProducts.map((product) => [product.id, product]))

    return wishlist.map((item) => ({
      ...item,
      products: item.products ? productsById.get(item.products.id) ?? item.products : item.products,
    }))
  }

  async toggleWishlist(userId: string, productId: string) {
    return await this.repo.toggle(userId, productId)
  }
}
