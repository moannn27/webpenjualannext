import { OrderRepository } from '@/repositories/order.repository'

export class OrderService {
  private repo = new OrderRepository()

  async getOrders(userId: string) {
    return await this.repo.getUserOrders(userId)
  }

  async getOrder(orderId: string) {
    return await this.repo.getOrderById(orderId)
  }
  
  async createOrder(userId: string, orderData: Record<string, unknown>, items: Record<string, unknown>[]) {
    return await this.repo.create({ ...orderData, user_id: userId }, items)
  }
}
