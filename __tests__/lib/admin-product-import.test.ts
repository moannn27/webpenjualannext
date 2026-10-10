import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { hasConfirmedImportPriceMapping, importTablesFromWorkbook, isValidImportPrices, markImportSkuConflicts, normalizeImportTables, normalizeProductRows, parseImportMoney, productImportHeaders } from '@/lib/admin-product-import'

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
    expect(() => normalizeProductRows([productImportHeaders, row])).toThrow(/harga promo.*lebih rendah/i)
  })
})

describe('multi-vendor product import', () => {
  it('uses only NEW PRICE USER/SRP for main price, ignores old prices, and requires HARGA JUAL promo confirmation', () => {
    const products = normalizeImportTables([{ source: 'Lenovo', rows: [
      ['TYPE', 'MTM', 'Processor', 'Graphics', 'RAM', 'Storage', 'Display', 'OS', 'Warranty', 'OLD PRICE DEALER', 'OLD PRICE USER', 'NEW PRICE USER', 'SRP', 'HARGA JUAL', 'KETERANGAN'],
      ['ThinkPad E14', '21M7001XID', 'Core i5-1335U', 'Iris Xe', '16 GB', '512 GB SSD', '14 inch', 'Windows 11', '3 tahun', 'Rp 20.000.000', 'Rp 19.000.000', 'Rp 15.500.000', 'Rp 16.000.000', 'Rp 14.900.000', 'Ready stock'],
    ] }])
    expect(products[0]).toMatchObject({ name: 'ThinkPad E14', sku: '21M7001XID', brand: 'Lenovo', price: 15500000, discount_price: null, priceConfirmed: false })
    expect(products[0].priceCandidates?.map((candidate) => candidate.column)).toEqual(['NEW PRICE USER', 'SRP'])
    expect(products[0].discountCandidates).toEqual([{ column: 'HARGA JUAL (konfirmasi sebagai promo)', raw: 'Rp 14.900.000', amount: 14900000 }])
    expect(JSON.stringify(products[0])).not.toContain('20.000.000')
    expect(JSON.stringify(products[0])).not.toContain('19.000.000')
    expect(products[0].specifications.map(({ key }) => key)).toEqual(['Processor', 'GPU', 'RAM', 'Storage', 'Display', 'OS', 'Warranty'])
  })

  it('supports data from multiple XLSX sheets and extracted PDF table groups', () => {
    const header = [...productImportHeaders]
    const first = [...baseRow]; first[1] = 'SHEET-1'
    const second = [...baseRow]; second[1] = 'PDF-2'
    expect(normalizeImportTables([{ source: 'Sheet 1', rows: [header, first] }, { source: 'Sheet 2', rows: [header, second] }]).map((p) => p.sku)).toEqual(['SHEET-1', 'PDF-2'])
    expect(normalizeImportTables([{ source: 'page 1/table 1', rows: [['TYPE','MTM','OLD PRICE','NEW PRICE USER'], ['ThinkBook','21ABC','1000000','950000']] }, { source: 'page 2/table 1', rows: [['TYPE','MTM','HARGA JUAL'], ['ThinkBook','21ABC','900000']] }])).toHaveLength(1)
  })

  it('reads every worksheet in an XLSX workbook', async () => {
    const workbook = new ExcelJS.Workbook()
    for (const [sheetName, sku] of [['Lenovo', 'XLSX-1'], ['Acer', 'XLSX-2']]) {
      const sheet = workbook.addWorksheet(sheetName)
      sheet.addRow([...productImportHeaders])
      sheet.addRow(baseRow.map((cell, index) => index === 1 ? sku : cell))
    }
    const buffer = await workbook.xlsx.writeBuffer()
    const parsed = new ExcelJS.Workbook()
    await parsed.xlsx.load(buffer as never)
    expect(normalizeImportTables(importTablesFromWorkbook(parsed)).map((product) => product.sku)).toEqual(['XLSX-1', 'XLSX-2'])
  })

  it('parses Rupiah-formatted values and surfaces unparseable specifications', () => {
    expect(parseImportMoney('Rp 12.500.000')).toBe(12500000)
    expect(parseImportMoney('12.500,50')).toBe(12500.5)
    const [product] = normalizeImportTables([{ source: 'Lenovo', rows: [['TYPE','MTM','NEW PRICE USER','HARGA JUAL'], ['V14','ABC-1','1.000.000','1.200.000']] }])
    expect(product.specifications).toEqual([])
    expect(product.warnings).toContain('Spesifikasi belum terbaca sebagai pasangan key-value.')
    expect(product.warnings).toContain('Harga promo harus valid, lebih besar dari nol, dan di bawah harga utama; perbaiki atau pilih tanpa promo.')
  })

  it('validates positive user price and optional promo discount rules', () => {
    expect(isValidImportPrices(1000000, null)).toBe(true)
    expect(isValidImportPrices(1000000, 750000)).toBe(true)
    expect(isValidImportPrices(0, null)).toBe(false)
    expect(isValidImportPrices(1000000, 0)).toBe(false)
    expect(isValidImportPrices(1000000, 1000000)).toBe(false)
    expect(isValidImportPrices(1000000, 1200000)).toBe(false)
  })

  it('requires the confirmed main and promo/no-promo choices to match source candidates', () => {
    const source = {
      price: 1000000, discount_price: null,
      priceCandidates: [{ column: 'SRP', raw: '1000000', amount: 1000000 }],
      discountCandidates: [{ column: 'HARGA JUAL (konfirmasi sebagai promo)', raw: '900000', amount: 900000 }],
      priceConfirmed: true, discountPriceConfirmed: true, selectedPriceColumn: 'SRP', selectedDiscountColumn: 'none' as const,
    }
    expect(hasConfirmedImportPriceMapping(source)).toBe(true)
    expect(hasConfirmedImportPriceMapping({ ...source, price: 1200000 })).toBe(false)
    expect(hasConfirmedImportPriceMapping({ ...source, selectedDiscountColumn: undefined })).toBe(false)
    expect(hasConfirmedImportPriceMapping({ ...source, discount_price: 900000, selectedDiscountColumn: 'HARGA JUAL (konfirmasi sebagai promo)' })).toBe(true)
  })

  it('marks file and database SKU conflicts for explicit skip or update', () => {
    const products = normalizeImportTables([{ source: 'file', rows: [['TYPE','MTM','HARGA JUAL'], ['V14','ABC-1','1000000'], ['V15','ABC-2','1100000']] }])
    markImportSkuConflicts(products, new Map([['abc-1', 'product-id-1']]))
    expect(products[0]).toMatchObject({ duplicateInDatabase: true, targetProductId: 'product-id-1', importAction: 'skip' })
    products[1].sku = 'ABC-1'
    markImportSkuConflicts(products, new Map())
    expect(products[1].duplicateInFile).toBe(true)
    const parentVariantConflict = normalizeImportTables([{ source: 'file', rows: [['TYPE','MTM','NEW PRICE USER'], ['V14','ABC-3','1200000']] }])
    parentVariantConflict[0].variants.push({ sku: 'ABC-3', color: '', ram: '16 GB', storage: '', price: null, discount_price: null, stock: 1 })
    markImportSkuConflicts(parentVariantConflict, new Map())
    expect(parentVariantConflict[0].duplicateInFile).toBe(true)
  })
})
