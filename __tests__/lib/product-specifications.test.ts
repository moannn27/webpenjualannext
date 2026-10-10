import { describe, expect, it } from 'vitest'
import { collectLaptopSpecifications, compareValuesDiffer, normalizeLaptopSpecKey } from '@/lib/product-specifications'
import { normalizeCompareIds, toggleCompareId } from '@/lib/product-compare'

describe('laptop specifications and comparison', () => {
  it('normalizes alternate vendor labels and reports missing specs instead of inventing values', () => {
    expect(normalizeLaptopSpecKey('CPU Model')).toBe('Processor')
    expect(normalizeLaptopSpecKey('Graphic Card')).toBe('GPU')
    expect(collectLaptopSpecifications([{ key: 'Processor', value: 'Core Ultra 7' }, { key: 'GPU', value: 'RTX 4060' }])).toEqual({
      Processor: 'Core Ultra 7', RAM: null, Storage: null, GPU: 'RTX 4060', Display: null, OS: null, Warranty: null,
    })
    expect(collectLaptopSpecifications([]).Processor).toBeNull()
  })

  it('flags differing and missing comparison values', () => {
    expect(compareValuesDiffer(['16 GB', '32 GB'])).toBe(true)
    expect(compareValuesDiffer(['16 GB', '16 gb'])).toBe(false)
    expect(compareValuesDiffer(['16 GB', null])).toBe(true)
  })

  it('compares exact product IDs and caps the compare list at three', () => {
    expect(normalizeCompareIds('11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222,33333333-3333-4333-8333-333333333333,44444444-4444-4444-8444-444444444444')).toHaveLength(3)
    expect(normalizeCompareIds('11111111-1111-4111-8111-111111111111,11111111-1111-4111-8111-111111111111,ThinkPad-E14')).toEqual(['11111111-1111-4111-8111-111111111111'])
    expect(toggleCompareId(['a', 'b', 'c'], 'd')).toEqual(['a', 'b', 'c'])
    expect(toggleCompareId(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })
})
