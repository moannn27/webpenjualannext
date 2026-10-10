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

describe('product search matching (matchesProductSearch)', () => {
  const sampleProduct = {
    name: 'Ideapad slim 3',
    sku: 'LNV-IP3',
    description: 'Laptop ringan untuk komputasi harian dan kerja',
    brands: { name: 'Lenovo' },
    categories: { name: 'Laptops' },
    product_specifications: [
      { key: 'Processor', value: 'Intel Core i3-1215U' },
      { key: 'RAM', value: '8GB DDR4' },
      { key: 'Storage', value: '512GB NVMe SSD' },
    ],
  }

  it('matches product by brand name when brand is not in product name (e.g. searching "lenovo")', async () => {
    const { matchesProductSearch } = await import('@/repositories/product.repository')
    expect(matchesProductSearch(sampleProduct, 'lenovo')).toBe(true)
    expect(matchesProductSearch(sampleProduct, 'LENOVO')).toBe(true)
  })

  it('matches product by name, SKU, category, or specifications', async () => {
    const { matchesProductSearch } = await import('@/repositories/product.repository')
    expect(matchesProductSearch(sampleProduct, 'ideapad')).toBe(true)
    expect(matchesProductSearch(sampleProduct, 'LNV-IP3')).toBe(true)
    expect(matchesProductSearch(sampleProduct, 'laptop')).toBe(true)
    expect(matchesProductSearch(sampleProduct, 'Core i3')).toBe(true)
    expect(matchesProductSearch(sampleProduct, '512GB')).toBe(true)
  })

  it('matches multi-word queries combining brand and model across attributes', async () => {
    const { matchesProductSearch } = await import('@/repositories/product.repository')
    expect(matchesProductSearch(sampleProduct, 'lenovo ideapad')).toBe(true)
    expect(matchesProductSearch(sampleProduct, 'ideapad lenovo')).toBe(true)
    expect(matchesProductSearch(sampleProduct, 'laptop lenovo ideapad')).toBe(true)
  })

  it('returns false when any required token is missing', async () => {
    const { matchesProductSearch } = await import('@/repositories/product.repository')
    expect(matchesProductSearch(sampleProduct, 'asus')).toBe(false)
    expect(matchesProductSearch(sampleProduct, 'lenovo macbook')).toBe(false)
  })
})
