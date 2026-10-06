import { CartRepository } from '@/repositories/cart.repository'
import { ProductRepository } from '@/repositories/product.repository'
import { type CartItem } from '@/types/cart'

export class CartService {
  private repo = new CartRepository()
  private productRepo = new ProductRepository()

  async getCart(userId: string) {
    return await this.repo.getCart(userId)
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await this.productRepo.findById(productId)
    if (!product) throw new Error("Product not found")
    if (product.stock < quantity) throw new Error("Not enough stock available")

    const cart = await this.repo.getCart(userId)
    if (!cart) throw new Error("Cart not found")
    
    // Check if adding this exceeds stock for existing item
    const existingItem = cart.cart_items.find((item: CartItem) => item.product_id === productId)
    if (existingItem && (existingItem.quantity + quantity > product.stock)) {
      throw new Error("Cannot add more of this item, stock limit reached")
    }

    await this.repo.addItem(cart.id, productId, quantity)
  }

  async updateQuantity(itemId: string, quantity: number, productId: string) {
    if (quantity <= 0) {
      await this.repo.removeItem(itemId)
      return
    }

    const product = await this.productRepo.findById(productId)
    if (product && product.stock < quantity) {
       throw new Error("Not enough stock available")
    }

    await this.repo.updateItem(itemId, quantity)
  }

  async removeItem(itemId: string) {
    await this.repo.removeItem(itemId)
  }
}
