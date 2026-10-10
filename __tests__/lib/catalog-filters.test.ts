import { describe, expect, it } from 'vitest'
import { clampCatalogPage, normalizeCatalogSearchParams, parseCatalogFilters } from '@/lib/catalog-filters'

describe('catalog filters', () => {
  it('normalizes a combined laptop specification, price, and stock filter set', () => {
    expect(parseCatalogFilters({ price_min: '15000000', price_max: '25000000', processor: 'Core i7', ram: '32 GB', storage: '1 TB', gpu: 'RTX 4070', display: '16', stock: 'in' })).toEqual({
      priceMin: 15000000, priceMax: 25000000, processor: 'Core i7', ram: '32 GB', storage: '1 TB', gpu: 'RTX 4070', display: '16', inStock: true,
    })
  })

  it('swaps reversed price bounds and ignores invalid or empty filter values', () => {
    expect(parseCatalogFilters({ price_min: '300', price_max: '100', processor: '  ', ram: 'x'.repeat(100), stock: 'unknown' })).toMatchObject({ priceMin: 100, priceMax: 300, processor: null, ram: 'x'.repeat(80), inStock: null })
  })

  it('clamps pagination to a valid page and handles empty results', () => {
    expect(clampCatalogPage(8, 50, 10)).toEqual({ page: 5, pageCount: 5 })
    expect(clampCatalogPage(0, 0, 10)).toEqual({ page: 1, pageCount: 1 })
  })

  it('normalizes repeated or malformed URL values before passing them to the query', () => {
    expect(normalizeCatalogSearchParams({ processor: ['Core i5', 'Core i7'], category: 'invalid', sort: 'raw-sql', promo: 'false' })).toEqual({ processor: 'Core i5' })
  })
})
