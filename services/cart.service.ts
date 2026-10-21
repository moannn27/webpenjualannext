import { CartRepository } from '@/repositories/cart.repository'
import { ProductRepository } from '@/repositories/product.repository'
import { formatCartItemToStored } from '@/lib/cart-utils'

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
    
    let targetVariantId = variantId
    let selectedVariant = null
    if (variants.length > 0) {
      if (!targetVariantId) {
        selectedVariant = variants.find((v) => v.stock > 0) ?? variants[0]
        targetVariantId = selectedVariant?.id ?? null
      } else {
        selectedVariant = variants.find((v) => v.id === targetVariantId)
        if (!selectedVariant) throw new Error("Varian produk tidak ditemukan")
      }
    } else if (targetVariantId) {
      throw new Error("Varian produk tidak valid")
    }

    const availableStock = selectedVariant?.stock ?? product.stock
    if (availableStock < quantity) throw new Error("Stok varian tidak mencukupi")

    const cart = await this.repo.getCartSummary(userId)
    const cartId = cart?.id || (await this.repo.getOrCreateCart(userId))
    
    // Check if adding this exceeds stock for existing item
    const existingItem = cart?.cart_items?.find(
      (item) => item.product_id === productId && (item.variant_id ?? null) === (targetVariantId ?? null)
    )
    if (existingItem && (existingItem.quantity + quantity > availableStock)) {
      throw new Error("Jumlah melebihi stok varian yang tersedia")
    }

    await this.repo.addItem(cartId, productId, quantity, targetVariantId)
    const updatedCart = await this.repo.getCart(userId)
    const updatedItems = updatedCart?.cart_items ?? []
    const updatedItem = updatedItems.find(
      (item: { product_id: string; variant_id?: string | null }) =>
        item.product_id === productId && (item.variant_id ?? null) === (targetVariantId ?? null)
    )
    return {
      cartCount: updatedItems.reduce((total: number, item: { quantity: number }) => total + item.quantity, 0),
      itemQuantity: updatedItem?.quantity ?? quantity,
      cartItem: updatedItem ? formatCartItemToStored(updatedItem) : null,
    }
  }

  async syncCart(
    userId: string,
    items: { productId: string; variantId: string | null; quantity: number }[]
  ) {
    const validatedItems: { productId: string; variantId: string | null; quantity: number }[] = []

    for (const item of items) {
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity < 1) continue
      const product = await this.productRepo.findStockById(item.productId)
      if (!product || product.status !== 'published') continue

      const variants = product.product_variants ?? []
      if (variants.length && !item.variantId) continue

      const selectedVariant = item.variantId ? variants.find((v) => v.id === item.variantId) : null
      if (item.variantId && !selectedVariant) continue

      const availableStock = selectedVariant?.stock ?? product.stock
      if (availableStock <= 0) continue

      const finalQuantity = Math.min(item.quantity, availableStock)
      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: finalQuantity,
      })
    }

    if (validatedItems.length === 0) {
      return await this.repo.getCart(userId)
    }

    return await this.repo.syncCartItems(userId, validatedItems)
  }

  async updateQuantity(itemId: string, quantity: number, productId: string, variantId: string | null) {
    if (quantity <= 0) {
      await this.repo.removeItem(itemId)
      return
    }

    const existingItem = await this.repo.getItemById(itemId)
    if (!existingItem) {
      // Non-UUID or not found in DB yet; client store maintains local quantity and will sync before checkout
      return
    }

    const verifiedProductId = existingItem.product_id || productId
    const verifiedVariantId = existingItem.variant_id ?? variantId

    const product = await this.productRepo.findStockById(verifiedProductId)
    if (!product || product.status !== 'published') throw new Error("Produk tidak tersedia")
    if ((product.product_variants?.length ?? 0) > 0 && !verifiedVariantId) throw new Error("Pilih varian produk terlebih dahulu")
    const selectedVariant = verifiedVariantId ? product.product_variants?.find((variant) => variant.id === verifiedVariantId) : null
    const stock = selectedVariant?.stock ?? (verifiedVariantId ? -1 : product.stock)
    if (stock < quantity) {
       throw new Error("Stok varian tidak mencukupi")
    }

    await this.repo.updateItem(itemId, quantity)
  }

  async removeItem(itemId: string) {
    await this.repo.removeItem(itemId)
  }
}
