import { ReviewRepository } from '@/repositories/review.repository'

export class ReviewService {
  private repo = new ReviewRepository()

  async getReviews(productId: string) {
    return await this.repo.getByProduct(productId)
  }

  async getRatingSummaries(productIds: string[]) {
    return await this.repo.getRatingSummaries(productIds)
  }

  async getUserReviews(userId: string) {
    return await this.repo.getUserReviews(userId)
  }

  async createReview(userId: string, productId: string, orderId: string, rating: number, comment?: string) {
    await this.repo.create({
      user_id: userId,
      product_id: productId,
      order_id: orderId,
      rating,
      comment,
    })
  }
}
