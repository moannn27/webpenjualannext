import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findPage: vi.fn(),
  getRatingSummaries: vi.fn(),
}))

vi.mock('@/repositories/product.repository', () => ({
  ProductRepository: class {
    findPage = mocks.findPage
  },
}))

vi.mock('@/services/review.service', () => ({
  ReviewService: class {
    getRatingSummaries = mocks.getRatingSummaries
  },
}))

import { ProductService } from '@/services/product.service'

describe('ProductService review summaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('attaches aggregate stats to listed products and leaves unreviewed products unrated', async () => {
    const firstProduct = { id: 'product-1', name: 'Laptop Lama' }
    const secondProduct = { id: 'product-2', name: 'Laptop Baru' }
    mocks.findPage.mockResolvedValue({
      rows: [firstProduct, secondProduct],
      total: 2,
      page: 1,
      pageSize: 24,
    })
    mocks.getRatingSummaries.mockResolvedValue(new Map([
      [firstProduct.id, { rating: 4.875, count: 8 }],
    ]))

    const result = await new ProductService().getProductsPage({ page: 1, pageSize: 24 })

    expect(mocks.getRatingSummaries).toHaveBeenCalledWith([firstProduct.id, secondProduct.id])
    expect(result.rows).toEqual([
      { ...firstProduct, rating: 4.875, reviews: 8 },
      { ...secondProduct, rating: undefined, reviews: 0 },
    ])
    expect(result.total).toBe(2)
    expect(result.page).toBe(1)
  })
})
