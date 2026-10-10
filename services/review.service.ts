import { ReviewRepository } from '@/repositories/review.repository'

export class ReviewService {
  private repo = new ReviewRepository()

  async getReviews(productId: string) {
    return await this.repo.getByProduct(productId)
  }

  async getUserReviews(userId: string) {
    return await this.repo.getUserReviews(userId)
  }

  async createReview(userId: string, productId: string, rating: number, comment?: string) {
    await this.repo.create({ user_id: userId, product_id: productId, rating, comment })
  }
}
