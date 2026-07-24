import { WishlistRepository } from '@/repositories/wishlist.repository'

export class WishlistService {
  private repo = new WishlistRepository()

  async getWishlist(userId: string) {
    return await this.repo.getUserWishlist(userId)
  }

  async toggleWishlist(userId: string, productId: string) {
    return await this.repo.toggle(userId, productId)
  }
}
