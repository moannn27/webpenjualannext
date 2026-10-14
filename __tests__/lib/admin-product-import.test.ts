import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import {
  analyzeAndNormalizeImportTables,
  generateProductImportExcelTemplate,
  hasConfirmedImportPriceMapping,
  importTablesFromWorkbook,
  isValidImportPrices,
  loadExcelWorkbook,
  markImportSkuConflicts,
  normalizeImportTables,
  normalizeProductRows,
  parseImportMoney,
  productImportHeaders,
} from '@/lib/admin-product-import'

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
    expect(product).toMatchObject({ name: 'Laptop Contoh', stock: 5, variants: [{ color: 'Abu-abu', stock: 3 }, { color: 'Hitam', stock: 2 }] })
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

describe('loadExcelWorkbook & Excel XML namespace compatibility', () => {
  it('loads normal ExcelJS workbooks without errors', async () => {
    const wb = new ExcelJS.Workbook()
    const sheet = wb.addWorksheet('Produk')
    sheet.addRow([...productImportHeaders])
    sheet.addRow(baseRow)
    const buf = Buffer.from(await wb.xlsx.writeBuffer())
    const loaded = await loadExcelWorkbook(buf)
    expect(loaded.worksheets).toHaveLength(1)
    expect(loaded.worksheets[0].name).toBe('Produk')
  })

  it('normalizes workbooks with <x: namespace prefixes that crash default ExcelJS parser', async () => {
    const wb = new ExcelJS.Workbook()
    const sheet = wb.addWorksheet('Data')
    sheet.addRow([...productImportHeaders])
    sheet.addRow(baseRow)
    const originalBuf = Buffer.from(await wb.xlsx.writeBuffer())

    const zip = await JSZip.loadAsync(originalBuf)
    const wbXml = await zip.file('xl/workbook.xml')?.async('string')
    if (wbXml) {
      const prefixed = wbXml
        .replace(/<workbook/g, '<x:workbook')
        .replace(/<\/workbook>/g, '</x:workbook>')
        .replace(/<sheets>/g, '<x:sheets>')
        .replace(/<\/sheets>/g, '</x:sheets>')
        .replace(/<sheet /g, '<x:sheet ')
      zip.file('xl/workbook.xml', prefixed)
    }
    const modifiedBuf = await zip.generateAsync({ type: 'nodebuffer' })

    const plainWb = new ExcelJS.Workbook()
    await expect(plainWb.xlsx.load(modifiedBuf as never)).rejects.toThrow()

    const loaded = await loadExcelWorkbook(modifiedBuf)
    expect(loaded.worksheets).toHaveLength(1)
    expect(loaded.worksheets[0].name).toBe('Data')
  })

  it('rejects empty or corrupt buffers with clear Indonesian error messages', async () => {
    await expect(loadExcelWorkbook(Buffer.alloc(0))).rejects.toThrow(/file excel kosong/i)
    await expect(loadExcelWorkbook(Buffer.from('bukan file zip atau excel'))).rejects.toThrow(/rusak atau tidak valid/i)
  })

  it('rejects workbooks with zero worksheets', async () => {
    const wb = new ExcelJS.Workbook()
    const buf = Buffer.from(await wb.xlsx.writeBuffer())
    await expect(loadExcelWorkbook(buf)).rejects.toThrow(/tidak memiliki worksheet/i)
  })
})

describe('generateProductImportExcelTemplate', () => {
  it('generates a valid, readable .xlsx template with official headers and frozen header row', async () => {
    const buffer = await generateProductImportExcelTemplate()
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(1000)

    const wb = await loadExcelWorkbook(buffer)
    expect(wb.worksheets).toHaveLength(1)
    const sheet = wb.worksheets[0]
    expect(sheet.name).toBe('Data Produk')

    const firstRowValues = (sheet.getRow(1).values as string[]).slice(1)
    expect(firstRowValues).toEqual(productImportHeaders)
    expect(sheet.views?.[0]?.state).toBe('frozen')
    expect((sheet.views?.[0] as { ySplit?: number })?.ySplit).toBe(1)
    expect(sheet.getColumn(4).numFmt).toBe('#,##0')
    expect(sheet.rowCount).toBe(1)
  })

  it('allows filling the official template and importing it cleanly without errors', async () => {
    const buffer = await generateProductImportExcelTemplate()
    const wb = await loadExcelWorkbook(buffer)
    const sheet = wb.worksheets[0]
    sheet.addRow([
      'Lenovo ThinkBook 14 Gen 6', '21KG000FID', 'Laptop bisnis Intel Core i5', 12500000, 11900000, 10,
      'Laptop', 'Lenovo', 'published', true, false, 'https://example.com/tb14.jpg',
      'Processor: Intel Core i5-1335U; RAM: 16GB', 'Arctic Grey', '16GB', '512GB SSD', '21KG000FID-GRY', 12500000, null, 10,
    ])
    const filledBuffer = Buffer.from(await wb.xlsx.writeBuffer())

    const reloadedWb = await loadExcelWorkbook(filledBuffer)
    const tables = importTablesFromWorkbook(reloadedWb)
    const { products, sheetSummary } = analyzeAndNormalizeImportTables(tables)

    expect(products).toHaveLength(1)
    expect(products[0].name).toBe('Lenovo ThinkBook 14 Gen 6')
    expect(products[0].sku).toBe('21KG000FID')
    expect(products[0].price).toBe(12500000)
    expect(products[0].discount_price).toBe(11900000)
    expect(products[0].category).toBe('Laptop')
    expect(products[0].brand).toBe('Lenovo')
    expect(sheetSummary.detectedSheets[0].name).toBe('Data Produk')
  })
})

describe('analyzeAndNormalizeImportTables and multi-sheet handling', () => {
  it('correctly categorizes product sheets and skips informational sheets with clear reasons', () => {
    const tables = [
      {
        source: 'XLSX/Import',
        rows: [
          ['TYPE', 'MTM', 'NEW PRICE USER/SRP', 'HARGA JUAL'],
          ['AIO 24IRH9', 'F0HN00Q3ID', '12.799.000', '10.800.000'],
        ],
      },
      {
        source: 'XLSX/Petunjuk',
        rows: [
          ['Panduan Penggunaan', 'Keterangan'],
          ['1. Silakan baca petunjuk', 'Harap perhatikan ketentuan'],
        ],
      },
      {
        source: 'XLSX/Audit Sumber',
        rows: [
          ['Tanggal Ekstrak', 'Operator', 'Status'],
          ['2026-10-10', 'Admin', 'Verified'],
        ],
      },
      {
        source: 'XLSX/Perlu Review',
        rows: [
          ['Catatan Internal', 'Tindakan'],
          ['Cek kembali stok', 'Menunggu konfirmasi distributor'],
        ],
      },
    ]

    const { products, sheetSummary } = analyzeAndNormalizeImportTables(tables)
    expect(products).toHaveLength(1)
    expect(products[0].sku).toBe('F0HN00Q3ID')
    expect(products[0].name).toBe('AIO 24IRH9')

    expect(sheetSummary.totalTables).toBe(4)
    expect(sheetSummary.detectedSheets).toHaveLength(1)
    expect(sheetSummary.detectedSheets[0]).toEqual({
      name: 'Import',
      productCount: 1,
      vendor: 'lenovo',
    })

    expect(sheetSummary.skippedSheets).toHaveLength(3)
    expect(sheetSummary.skippedSheets.map((s) => s.name)).toEqual(['Petunjuk', 'Audit Sumber', 'Perlu Review'])
    expect(sheetSummary.skippedSheets[0].reason).toContain('petunjuk atau panduan')
    expect(sheetSummary.skippedSheets[1].reason).toContain('audit sumber')
    expect(sheetSummary.skippedSheets[2].reason).toContain('perlu ditinjau')
  })

  it('correctly maps Lenovo header alias new_price_user_srp and srp_user to main price', () => {
    const tables = [
      {
        source: 'XLSX/LenovoPricelist',
        rows: [
          ['TYPE', 'MTM', 'NEW PRICE USER/SRP', 'KETERANGAN'],
          ['ThinkCentre Neo 50s', '11SX002XID', '11.500.000', 'Core i5-12400'],
        ],
      },
    ]

    const { products } = analyzeAndNormalizeImportTables(tables)
    expect(products).toHaveLength(1)
    expect(products[0].price).toBe(11500000)
    expect(products[0].priceCandidates?.[0].column).toBe('NEW PRICE USER')
  })

  it('runs against real Lenovo pricelist file if present on local machine', async () => {
    const fs = await import('fs')
    const filePath = 'C:/Users/Admin/Downloads/lenovo_pricelist_massupload_next_solution.xlsx'
    if (!fs.existsSync(filePath)) return

    const buf = fs.readFileSync(filePath)
    const wb = await loadExcelWorkbook(buf)
    expect(wb.worksheets.length).toBeGreaterThanOrEqual(1)

    const tables = importTablesFromWorkbook(wb)
    const importTable = tables.find(t => t.source === 'XLSX/Import')
    const nonEmptyRows = (importTable?.rows.slice(1) ?? []).filter(r => r.some(Boolean))
    const { products, sheetSummary } = analyzeAndNormalizeImportTables(tables)
    let varCount = 0
    let standaloneCount = 0
    for (const p of products) {
      if (p.variants.length > 0) {
        varCount += p.variants.length
        console.log('GROUP:', p.name, 'parent SKU:', p.sku, 'variants:', p.variants.length)
      } else {
        standaloneCount++
      }
    }
    const allOriginalSkus = nonEmptyRows.map(r => r[1]).filter(Boolean)
    const allParsedSkus = new Set(products.flatMap(p => [p.sku, ...p.variants.map(v => v.sku)]))
    const missingSkus = allOriginalSkus.filter(s => !allParsedSkus.has(s))
    expect(varCount).toBeGreaterThan(0)
    expect(standaloneCount).toBeGreaterThan(0)
    expect(missingSkus).toHaveLength(0)

    const aio = products.find((p) => p.name.includes('AIO 24IRH9') || p.variants.some((v) => v.sku === 'F0HN00Q3ID'))
    expect(aio).toBeDefined()
    expect(aio?.variants.length).toBeGreaterThanOrEqual(2)
    expect(aio?.variants.map((v) => v.sku)).toContain('F0HN00Q3ID')
    expect(aio?.variants.map((v) => v.sku)).toContain('F0HN00Q4ID')
    expect(aio?.variants.find((v) => v.sku === 'F0HN00Q3ID')?.color).toBe('Luna Grey')
    expect(aio?.variants.find((v) => v.sku === 'F0HN00Q4ID')?.color).toBe('Cloud Grey')
    expect(sheetSummary.detectedSheets[0].name).toBe('Import')
    expect(sheetSummary.skippedSheets.map((s) => s.name)).toEqual(['Perlu Review', 'Audit Sumber', 'Petunjuk'])
  })
})

describe('variant grouping, duplicates, pricing, and legacy compatibility', () => {
  it('groups multiple color rows with different MTMs into 1 parent product with distinct variants', () => {
    const rows = [
      ['TYPE', 'MTM', 'Processor', 'RAM', 'Storage', 'NEW PRICE USER', 'STOK', 'KETERANGAN'],
      ['IdeaPad Slim 3 14IAH8 - Arctic Grey', '83EQ001AID', 'Core i3-1215U', '8GB', '512GB SSD', '6.999.000', '5', 'Arctic Grey'],
      ['IdeaPad Slim 3 14IAH8 - Abyss Blue', '83EQ002BID', 'Core i3-1215U', '8GB', '512GB SSD', '6.999.000', '3', 'Abyss Blue'],
    ]
    const products = normalizeImportTables([{ source: 'Lenovo', rows }])
    expect(products).toHaveLength(1)
    const parent = products[0]
    expect(parent.variants).toHaveLength(2)
    expect(parent.sku).toContain('83EQ-IDEAPAD-SLIM-3-14IAH8')
    expect(parent.stock).toBe(8)
    expect(parent.variants[0].sku).toBe('83EQ001AID')
    expect(parent.variants[0].color).toBe('Arctic Grey')
    expect(parent.variants[0].stock).toBe(5)
    expect(parent.variants[1].sku).toBe('83EQ002BID')
    expect(parent.variants[1].color).toBe('Abyss Blue')
    expect(parent.variants[1].stock).toBe(3)
  })

  it('detects duplicate SKUs within file and flags warnings properly', () => {
    const rows = [
      ['TYPE', 'MTM', 'NEW PRICE USER', 'STOK'],
      ['ThinkCentre Neo 50s', '11SX001XID', '10.000.000', '5'],
      ['ThinkCentre Neo 50s', '11SX001XID', '10.000.000', '3'],
    ]
    const products = normalizeImportTables([{ source: 'Lenovo', rows }])
    expect(products).toHaveLength(1)
    expect(products[0].duplicateInFile).toBe(true)
    expect(products[0].warnings?.some((w) => w.includes('duplikat'))).toBe(true)
  })

  it('aggregates variant prices and stock correctly (min price, sum stock)', () => {
    const rows = [
      ['TYPE', 'MTM', 'Processor', 'RAM', 'Storage', 'NEW PRICE USER', 'HARGA JUAL', 'STOK', 'KETERANGAN'],
      ['Yoga 7 14AHP9 - Tidal Teal', '83DK001AID', 'Ryzen 7 8845HS', '16GB', '512GB', '15.000.000', '14.000.000', '4', 'Tidal Teal'],
      ['Yoga 7 14AHP9 - Storm Grey', '83DK002BID', 'Ryzen 7 8845HS', '16GB', '1TB', '17.000.000', '16.500.000', '6', 'Storm Grey'],
    ]
    const products = normalizeImportTables([{ source: 'Lenovo', rows }])
    expect(products).toHaveLength(1)
    const parent = products[0]
    expect(parent.price).toBe(15000000)
    expect(parent.stock).toBe(10)
    expect(parent.variants[0].price).toBe(15000000)
    expect(parent.variants[0].stock).toBe(4)
    expect(parent.variants[1].price).toBe(17000000)
    expect(parent.variants[1].stock).toBe(6)
  })

  it('supports updating existing product with variants without creating duplicates', () => {
    const rows = [
      ['TYPE', 'MTM', 'Processor', 'RAM', 'Storage', 'NEW PRICE USER', 'STOK', 'KETERANGAN'],
      ['LOQ 15IAX9 - Luna Grey', '83GS001AID', 'Core i5-12450HX', '12GB', '512GB', '12.000.000', '7', 'Luna Grey'],
    ]
    const products = normalizeImportTables([{ source: 'Lenovo', rows }])
    expect(products).toHaveLength(1)
    const targetDbMap = new Map([['83gs001aid', 'existing-loq-uuid']])
    markImportSkuConflicts(products, targetDbMap)
    expect(products[0].targetProductId).toBe('existing-loq-uuid')
    expect(products[0].duplicateInDatabase).toBe(true)
    expect(products[0].importAction).toBe('skip')
    products[0].importAction = 'update'
    expect(products[0].importAction).toBe('update')
  })

  it('maintains full backwards compatibility with legacy flat import templates', () => {
    const legacyData = [
      ['product_name', 'sku', 'description', 'price', 'discount_price', 'stock', 'category', 'brand', 'status', 'is_best_seller', 'is_new_arrival', 'image_url', 'specifications'],
      ['Mouse Wireless Standar', 'MS-001', 'Mouse tanpa kabel ergonomis', '150.000', '120.000', '50', 'Aksesoris', 'Logitech', 'published', 'false', 'false', 'https://example.com/mouse.jpg', 'Koneksi: 2.4GHz; DPI: 1600'],
    ]
    const products = normalizeProductRows(legacyData)
    expect(products).toHaveLength(1)
    expect(products[0].name).toBe('Mouse Wireless Standar')
    expect(products[0].sku).toBe('MS-001')
    expect(products[0].price).toBe(150000)
    expect(products[0].discount_price).toBe(120000)
    expect(products[0].stock).toBe(50)
    expect(products[0].variants).toHaveLength(0)
    expect(products[0].specifications).toHaveLength(2)
  })
})
