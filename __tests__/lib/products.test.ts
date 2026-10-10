import { describe, expect, it } from 'vitest'
import { toStorefrontProduct } from '@/lib/products'

describe('storefront product pricing', () => {
  it('keeps price as the regular SRP and maps discount_price separately as the customer payable promo', () => {
    const product = toStorefrontProduct({ id: 'p1', name: 'Laptop', price: 15000000, discount_price: 12900000, stock: 2 })
    expect(product.price).toBe(15000000)
    expect(product.discountPrice).toBe(12900000)
    expect(product.originalPrice).toBe(15000000)
  })

  it('does not invent a discount when discount_price is null', () => {
    const product = toStorefrontProduct({ id: 'p2', name: 'Laptop', price: '12000000', discount_price: null, stock: 1 })
    expect(product.price).toBe(12000000)
    expect(product.discountPrice).toBeNull()
  })
})
