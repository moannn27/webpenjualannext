import { describe, expect, it } from 'vitest'
import { normalizeProductRows, productImportHeaders } from '@/lib/admin-product-import'

const baseRow = [
  'Laptop Contoh', 'LP-01', 'Deskripsi contoh produk', '10.000.000', '', '0',
  'Laptops', 'Lenovo', 'published', 'false', 'true', 'https://example.com/laptop.jpg',
  'Prosesor: Intel; Layar: 14 inci', 'Abu-abu', '16 GB', '512 GB', 'LP-01-GR', '10.000.000', '', '3',
]

describe('normalizeProductRows', () => {
  it('groups repeated product rows into variant stock and preserves specifications', () => {
    const second = [...baseRow]
    second[13] = 'Hitam'
    second[15] = '1 TB'
    second[16] = 'LP-01-BK'
    second[19] = '2'

    const [product] = normalizeProductRows([productImportHeaders, baseRow, second])
    expect(product).toMatchObject({ name: 'Laptop Contoh', stock: 0, variants: [{ color: 'Abu-abu', stock: 3 }, { color: 'Hitam', stock: 2 }] })
    expect(product.specifications).toEqual([{ key: 'Prosesor', value: 'Intel', display_order: 0 }, { key: 'Layar', value: '14 inci', display_order: 0 }])
  })

  it('rejects duplicate option combinations before import', () => {
    expect(() => normalizeProductRows([productImportHeaders, baseRow, baseRow])).toThrow(/kombinasi varian.*ganda/i)
  })

  it('rejects discount prices that are not below the regular price', () => {
    const row = [...baseRow]
    row[4] = '10.000.000'
    expect(() => normalizeProductRows([productImportHeaders, row])).toThrow(/harga diskon.*lebih rendah/i)
  })
})
