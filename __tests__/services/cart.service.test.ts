import { describe, it, expect, vi } from 'vitest'
import { CartService } from '@/services/cart.service'

describe('CartService', () => {
  it('should instantiate without crashing', () => {
    const service = new CartService()
    expect(service).toBeDefined()
  })

  // We mocked Supabase in setup.ts, so we can test the service methods
  it('should call getCart without errors based on mock', async () => {
    const service = new CartService()
    const cart = await service.getCart('test-user-id')
    expect(cart).toBeDefined()
  })

  it('stores the selected variant and returns that variant price, SKU, and gallery image', async () => {
    const cartService = new CartService()
    const service = cartService as unknown as {
      repo: {
        getCartSummary: ReturnType<typeof vi.fn>
        getOrCreateCart: ReturnType<typeof vi.fn>
        addItem: ReturnType<typeof vi.fn>
        getCart: ReturnType<typeof vi.fn>
      }
      productRepo: { findStockById: ReturnType<typeof vi.fn> }
    }
    const selectedVariant = {
      id: 'variant-blue', sku: 'MODEL-BLUE-16', color: 'Blue', ram: '16GB', storage: '1TB',
      price: 1400, discount_price: 1300, stock: 2, image_url: 'https://cdn.example.com/blue.webp',
    }
    service.productRepo = {
      findStockById: vi.fn().mockResolvedValue({
        id: 'product-1', status: 'published', stock: 3,
        product_variants: [selectedVariant, { ...selectedVariant, id: 'variant-grey', sku: 'MODEL-GREY-8', color: 'Grey', stock: 4 }],
      }),
    }
    service.repo = {
      getCartSummary: vi.fn().mockResolvedValue({ id: 'cart-1', cart_items: [] }),
      getOrCreateCart: vi.fn(),
      addItem: vi.fn().mockResolvedValue(undefined),
      getCart: vi.fn().mockResolvedValue({ cart_items: [{
        id: 'cart-item-1', product_id: 'product-1', variant_id: 'variant-blue', quantity: 1,
        products: { id: 'product-1', name: 'Laptop', price: 1000, stock: 7 },
        product_variants: { ...selectedVariant, product_variant_images: [{ id: 'blue-main', url: 'https://cdn.example.com/blue.webp', display_order: 0 }] },
      }] }),
    }

    const result = await cartService.addItem('user-1', 'product-1', 1, 'variant-blue')

    expect(service.repo.addItem).toHaveBeenCalledWith('cart-1', 'product-1', 1, 'variant-blue')
    expect(result.cartItem).toMatchObject({
      variantId: 'variant-blue', variantSku: 'MODEL-BLUE-16', variantLabel: 'Blue · 16GB · 1TB',
      price: 1300, stock: 2, image: 'https://cdn.example.com/blue.webp',
    })
  })
})
