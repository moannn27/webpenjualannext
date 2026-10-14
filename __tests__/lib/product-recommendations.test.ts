import { describe, it, expect } from 'vitest'
import {
  detectProductSegment,
  extractGpuInfo,
  extractProcessorTier,
  calculateProductSimilarity,
  rankRelatedProducts,
  getRecommendationSubtitle,
  type ProductCandidate,
} from '@/lib/product-recommendations'

describe('Product Recommendations & Similarity Engine', () => {
  const loqGaming: ProductCandidate = {
    id: 'loq-1',
    name: 'Lenovo LOQ 15IRX9 (Core i7)',
    price: 24999000,
    stock: 5,
    categories: { name: 'Gaming Laptops' },
    brands: { name: 'Lenovo' },
    product_specifications: [
      { key: 'Processor', value: 'Intel Core i7-13650HX' },
      { key: 'GPU', value: 'NVIDIA GeForce RTX 4060 8GB GDDR6' },
      { key: 'RAM', value: '16GB DDR5' },
    ],
  }

  const rogZephyrus: ProductCandidate = {
    id: 'rog-1',
    name: 'ASUS ROG Zephyrus G14',
    price: 27999000,
    stock: 3,
    categories: { name: 'Laptops' },
    brands: { name: 'Asus' },
    product_specifications: [
      { key: 'Processor', value: 'AMD Ryzen 7 7940HS' },
      { key: 'GPU', value: 'NVIDIA GeForce RTX 4060' },
    ],
  }

  const loqRyzen: ProductCandidate = {
    id: 'loq-ryzen',
    name: 'LOQ 15AHP11 (Ryzen 7)',
    price: 22999000,
    stock: 4,
    categories: { name: 'Gaming Laptops' },
    brands: { name: 'Lenovo' },
    product_specifications: [
      { key: 'Processor', value: 'AMD Ryzen 7 8845HS' },
      { key: 'GPU', value: 'NVIDIA GeForce RTX 4050' },
    ],
  }

  const ideapadSlim: ProductCandidate = {
    id: 'ideapad-1',
    name: 'IdeaPad Slim 3 14IRH10 (Core i5)',
    price: 11500000,
    stock: 8,
    categories: { name: 'Laptops' },
    brands: { name: 'Lenovo' },
    product_specifications: [
      { key: 'Processor', value: 'Intel Core i5-13420H' },
      { key: 'GPU', value: 'Integrated Intel UHD Graphics' },
    ],
  }

  const aioLenovo: ProductCandidate = {
    id: 'aio-1',
    name: 'AIO 24IRH9 (Core i5)',
    price: 14599000,
    stock: 2,
    categories: { name: 'All-in-One PCs' },
    brands: { name: 'Lenovo' },
    product_specifications: [
      { key: 'Processor', value: 'Intel Core i5-13420H' },
      { key: 'GPU', value: 'Integrated Intel Graphics' },
    ],
  }

  const samsungPhone: ProductCandidate = {
    id: 'phone-1',
    name: 'Samsung Galaxy S24 Ultra',
    price: 21999000,
    stock: 10,
    categories: { name: 'Smartphone' },
    brands: { name: 'Samsung' },
    product_specifications: [],
  }

  describe('detectProductSegment', () => {
    it('detects gaming laptops from name or GPU specs', () => {
      expect(detectProductSegment(loqGaming)).toBe('gaming')
      expect(detectProductSegment(rogZephyrus)).toBe('gaming')
      expect(detectProductSegment(loqRyzen)).toBe('gaming')
    })

    it('detects slim/ultrabook laptops', () => {
      expect(detectProductSegment(ideapadSlim)).toBe('slim_ultrabook')
    })

    it('detects AIO desktops', () => {
      expect(detectProductSegment(aioLenovo)).toBe('aio_desktop')
    })

    it('detects smartphones', () => {
      expect(detectProductSegment(samsungPhone)).toBe('smartphone')
    })
  })

  describe('extractGpuInfo', () => {
    it('identifies dedicated RTX cards and series', () => {
      const gpu = extractGpuInfo(loqGaming)
      expect(gpu.isDedicated).toBe(true)
      expect(gpu.gpuFamily).toBe('rtx40')
    })

    it('identifies integrated graphics', () => {
      const gpu = extractGpuInfo(ideapadSlim)
      expect(gpu.isDedicated).toBe(false)
      expect(gpu.gpuFamily).toBe('integrated')
    })
  })

  describe('extractProcessorTier', () => {
    it('identifies processor tier correctly', () => {
      expect(extractProcessorTier(loqGaming)).toBe('high')
      expect(extractProcessorTier(ideapadSlim)).toBe('mid')
    })
  })

  describe('calculateProductSimilarity', () => {
    it('scores another gaming laptop with RTX higher than an office slim laptop or phone', () => {
      const scoreLoqRyzen = calculateProductSimilarity(loqGaming, loqRyzen)
      const scoreRog = calculateProductSimilarity(loqGaming, rogZephyrus)
      const scoreSlim = calculateProductSimilarity(loqGaming, ideapadSlim)
      const scorePhone = calculateProductSimilarity(loqGaming, samsungPhone)

      expect(scoreLoqRyzen).toBeGreaterThan(scoreSlim)
      expect(scoreRog).toBeGreaterThan(scoreSlim)
      expect(scoreSlim).toBeGreaterThan(scorePhone)
    })

    it('penalizes completely different device categories like laptop vs phone or AIO', () => {
      const scorePhone = calculateProductSimilarity(loqGaming, samsungPhone)
      expect(scorePhone).toBeLessThan(0)
    })
  })

  describe('rankRelatedProducts', () => {
    it('ranks relevant gaming laptops first when LOQ Gaming is viewed', () => {
      const candidates = [samsungPhone, ideapadSlim, aioLenovo, rogZephyrus, loqRyzen]
      const results = rankRelatedProducts(loqGaming, candidates, 4)

      expect(results.length).toBeGreaterThan(0)
      // Top 2 should be the gaming laptops (loqRyzen and rogZephyrus)
      const topIds = results.slice(0, 2).map((r) => r.id)
      expect(topIds).toContain('loq-ryzen')
      expect(topIds).toContain('rog-1')
      // Target itself must not be in the results
      expect(results.map((r) => r.id)).not.toContain(loqGaming.id)
    })

    it('ranks office slim laptops higher when IdeaPad Slim is viewed', () => {
      const ideapadSlim5: ProductCandidate = {
        id: 'ideapad-5',
        name: 'IdeaPad Slim 5 14AKP10 (Ryzen AI)',
        price: 15499000,
        stock: 6,
        categories: { name: 'Laptops' },
        brands: { name: 'Lenovo' },
        product_specifications: [
          { key: 'Processor', value: 'AMD Ryzen 7' },
          { key: 'GPU', value: 'Integrated AMD Radeon Graphics' },
        ],
      }

      const candidates = [samsungPhone, aioLenovo, loqGaming, ideapadSlim5]
      const results = rankRelatedProducts(ideapadSlim, candidates, 3)

      expect(results[0].id).toBe('ideapad-5')
    })
  })

  describe('getRecommendationSubtitle', () => {
    it('returns contextual subtitle for gaming laptops', () => {
      const subtitle = getRecommendationSubtitle(loqGaming)
      expect(subtitle).toContain('laptop gaming')
      expect(subtitle).toContain('grafis')
    })

    it('returns contextual subtitle for slim laptops', () => {
      const subtitle = getRecommendationSubtitle(ideapadSlim)
      expect(subtitle).toContain('laptop tipis')
    })

    it('returns contextual subtitle for AIO desktops', () => {
      const subtitle = getRecommendationSubtitle(aioLenovo)
      expect(subtitle).toContain('All-in-One PC')
    })
  })
})

