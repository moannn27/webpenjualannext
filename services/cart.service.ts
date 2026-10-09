import { CartRepository } from '@/repositories/cart.repository'
import { ProductRepository } from '@/repositories/product.repository'

export class CartService {
  private repo = new CartRepository()
  private productRepo = new ProductRepository()

  async getCart(userId: string) {
    return await this.repo.getCart(userId)
  }

  async getProductCartQuantities(userId: string, productId: string) {
    return await this.repo.getProductCartQuantities(userId, productId)
  }

  async addItem(userId: string, productId: string, quantity: number, variantId: string | null) {
    const product = await this.productRepo.findStockById(productId)
    if (!product || product.status !== 'published') throw new Error("Produk tidak tersedia")
    const variants = product.product_variants ?? []
    if (variants.length && !variantId) throw new Error("Pilih warna dan spesifikasi produk terlebih dahulu")
    if (!variants.length && variantId) throw new Error("Varian produk tidak valid")
    const selectedVariant = variantId ? variants.find((variant) => variant.id === variantId) : null
    if (variantId && !selectedVariant) throw new Error("Varian produk tidak ditemukan")
    const availableStock = selectedVariant?.stock ?? product.stock
    if (availableStock < quantity) throw new Error("Stok varian tidak mencukupi")

    const cart = await this.repo.getCartSummary(userId)
    if (!cart) throw new Error("Cart not found")
    
    // Check if adding this exceeds stock for existing item
    const existingItem = cart.cart_items.find((item) => item.product_id === productId && item.variant_id === variantId)
    if (existingItem && (existingItem.quantity + quantity > availableStock)) {
      throw new Error("Jumlah melebihi stok varian yang tersedia")
    }

    await this.repo.addItem(cart.id, productId, quantity, variantId)
    const updatedCart = await this.repo.getCartSummary(userId)
    const updatedItems = updatedCart?.cart_items ?? []
    const updatedItem = updatedItems.find((item) => item.product_id === productId && item.variant_id === variantId)
    return {
      cartCount: updatedItems.reduce((total, item) => total + item.quantity, 0),
      itemQuantity: updatedItem?.quantity ?? quantity,
    }
  }

  async updateQuantity(itemId: string, quantity: number, productId: string, variantId: string | null) {
    if (quantity <= 0) {
      await this.repo.removeItem(itemId)
      return
    }

    const product = await this.productRepo.findStockById(productId)
    if (!product || product.status !== 'published') throw new Error("Produk tidak tersedia")
    if ((product.product_variants?.length ?? 0) > 0 && !variantId) throw new Error("Pilih varian produk terlebih dahulu")
    const selectedVariant = variantId ? product.product_variants?.find((variant) => variant.id === variantId) : null
    const stock = selectedVariant?.stock ?? (variantId ? -1 : product.stock)
    if (stock < quantity) {
       throw new Error("Stok varian tidak mencukupi")
    }

    await this.repo.updateItem(itemId, quantity)
  }

  async removeItem(itemId: string) {
    await this.repo.removeItem(itemId)
  }
}
