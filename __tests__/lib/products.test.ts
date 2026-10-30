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

  it('correctly maps is_best_seller and is_new_arrival with appropriate badges', () => {
    const product = toStorefrontProduct({
      id: 'p3',
      name: 'Best Laptop',
      price: 20000000,
      discount_price: 18000000,
      stock: 5,
      is_best_seller: true,
      is_new_arrival: true,
    })
    expect(product.isBestSeller).toBe(true)
    expect(product.isNewArrival).toBe(true)
    expect(product.badges).toContain('Best Seller')
    expect(product.badges).toContain('Baru')
    expect(product.badges).toContain('Sale')
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

  it('matches promo products when searching for "promo" keyword or using is_featured', async () => {
    const { matchesProductSearch } = await import('@/repositories/product.repository')
    const promoProduct = { ...sampleProduct, is_featured: true }
    expect(matchesProductSearch(promoProduct, 'promo')).toBe(true)
    expect(matchesProductSearch(promoProduct, 'diskon')).toBe(true)
    expect(matchesProductSearch(sampleProduct, 'promo')).toBe(false)
    expect(matchesProductSearch({ ...sampleProduct, id: 'pinned-1' }, 'promo', ['pinned-1'])).toBe(true)
  })

  it('matches badge keywords like baru/new and bestseller/terlaris', async () => {
    const { matchesProductSearch } = await import('@/repositories/product.repository')
    const newProduct = { ...sampleProduct, is_new_arrival: true }
    expect(matchesProductSearch(newProduct, 'baru')).toBe(true)
    expect(matchesProductSearch(newProduct, 'new')).toBe(true)

    const bestProduct = { ...sampleProduct, is_best_seller: true }
    expect(matchesProductSearch(bestProduct, 'bestseller')).toBe(true)
    expect(matchesProductSearch(bestProduct, 'terlaris')).toBe(true)
  })
})
