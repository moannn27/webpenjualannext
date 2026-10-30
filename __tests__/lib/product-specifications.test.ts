import { describe, expect, it } from 'vitest'
import {
  collectLaptopSpecifications,
  compareValuesDiffer,
  normalizeLaptopSpecKey,
  isBlacklistedSpecKey,
  parseSpecsFromRawString,
  getCleanProductSpecifications,
} from '@/lib/product-specifications'
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

  it('correctly filters out blacklisted distributor metadata keys', () => {
    expect(isBlacklistedSpecKey('Spesifikasi sumber pricelist')).toBe(true)
    expect(isBlacklistedSpecKey('Model Code/Type')).toBe(true)
    expect(isBlacklistedSpecKey('MTM/PN')).toBe(true)
    expect(isBlacklistedSpecKey('Warna')).toBe(true)
    expect(isBlacklistedSpecKey('Color')).toBe(true)
    expect(isBlacklistedSpecKey('SKU')).toBe(true)
    expect(isBlacklistedSpecKey('Processor')).toBe(false)
    expect(isBlacklistedSpecKey('RAM')).toBe(false)
  })

  it('parses raw slash-separated pricelist string into structured hardware specifications', () => {
    const raw = '15.6-inch FHD Touch screen / Intel Celeron N4500 / 8GB DDR4 SO-DIMM / 256GB M.2 NVMe PCIe 3.0 SSD / Windows 11 Home / 3Y OSS'
    const parsed = parseSpecsFromRawString(raw)

    expect(parsed.find((s) => s.key === 'Display')?.value).toBe('15.6-inch FHD Touch screen')
    expect(parsed.find((s) => s.key === 'Processor')?.value).toBe('Intel Celeron N4500')
    expect(parsed.find((s) => s.key === 'RAM')?.value).toBe('8GB DDR4 SO-DIMM')
    expect(parsed.find((s) => s.key === 'Storage')?.value).toBe('256GB M.2 NVMe PCIe 3.0 SSD')
    expect(parsed.find((s) => s.key === 'OS')?.value).toBe('Windows 11 Home')
    expect(parsed.find((s) => s.key === 'Warranty')?.value).toBe('3Y OSS')
  })

  it('produces clean, standardized specifications matching SS 2 without distributor trash', () => {
    const rawSpecs = [
      { key: 'Model Code/Type', value: 'E1600WKAT-BMR182W' },
      { key: 'MTM/PN', value: '90PT0391-M014A0' },
      { key: 'Warna', value: 'Black' },
      { key: 'Spesifikasi sumber pricelist', value: '15.6-inch FHD Touch screen / Intel Celeron N4500 / 8GB DDR4 SO-DIMM / 256GB M.2 NVMe PCIe 3.0 SSD / Windows 11 Home / 3Y OSS' },
    ]

    const clean = getCleanProductSpecifications(rawSpecs)
    // Must NOT contain blacklisted keys
    expect(clean.some((s) => s.key.toLowerCase().includes('pricelist'))).toBe(false)
    expect(clean.some((s) => s.key.toLowerCase().includes('model code'))).toBe(false)
    expect(clean.some((s) => s.key.toLowerCase().includes('mtm'))).toBe(false)
    expect(clean.some((s) => s.key.toLowerCase().includes('warna'))).toBe(false)

    // Must contain extracted clean specs in order
    expect(clean[0].key).toBe('Processor')
    expect(clean[0].value).toBe('Intel Celeron N4500')
    expect(clean[1].key).toBe('RAM')
    expect(clean[1].value).toBe('8GB DDR4 SO-DIMM')
    expect(clean[2].key).toBe('Storage')
    expect(clean[2].value).toBe('256GB M.2 NVMe PCIe 3.0 SSD')
    expect(clean[3].key).toBe('Display')
    expect(clean[3].value).toBe('15.6-inch FHD Touch screen')
    expect(clean[4].key).toBe('OS')
    expect(clean[4].value).toBe('Windows 11 Home')
    expect(clean[5].key).toBe('Warranty')
    expect(clean[5].value).toBe('3Y OSS')
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
