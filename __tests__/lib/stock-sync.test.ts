import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  calculateStockPreview,
  extractSkuFromTipe,
  generateStockSyncTemplate,
  isLikelySku,
  normalizeSkuForCompare,
  parseStockExcelBuffer,
  type DatabaseProductForSync,
  type DatabaseVariantForSync,
  type ActiveWebOrderForSync,
  type OfflineStockSourceRow,
} from '@/lib/stock-sync'

describe('Offline Stock Synchronization Test Suite', () => {
  describe('1. SKU / MTM Extraction & Validation', () => {
    it('accurately identifies valid SKUs and rejects generic labels', () => {
      expect(isLikelySku('UD.BPDSD.006')).toBe(true)
      expect(isLikelySku('82X6006FID')).toBe(true)
      expect(isLikelySku('90NB13U1-M00N30')).toBe(true)
      expect(isLikelySku('MHFF4ID/A')).toBe(true)
      expect(isLikelySku('463C7PA#AR6')).toBe(true)
      expect(isLikelySku('NBAX23SC04GNB1U3')).toBe(true)
      expect(isLikelySku('9S7-15Q342-050')).toBe(true)

      // Generic exclusions
      expect(isLikelySku('CORE ULTRA 5')).toBe(false)
      expect(isLikelySku('RYZEN 7')).toBe(false)
      expect(isLikelySku('IdeaPad Slim 5a')).toBe(false)
      expect(isLikelySku('8.8", 3')).toBe(false)
      expect(isLikelySku('SNAPDRAGON 8')).toBe(false)
    })

    it('normalizes SKU strings correctly for comparison', () => {
      expect(normalizeSkuForCompare(' 82x6006fid ')).toBe('82X6006FID')
      expect(normalizeSkuForCompare('ud.bpdsd.006')).toBe('UD.BPDSD.006')
      expect(normalizeSkuForCompare(null)).toBe('')
      expect(normalizeSkuForCompare(undefined)).toBe('')
    })

    it('extracts SKUs from various vendor formats in source Tipe string', () => {
      // Acer
      expect(extractSkuFromTipe('AIO ACX22 (UD.BPDSD.006) Intel i3-1315U/8GB/512GB SSD/Win11+OH2024 <M>')).toBe('UD.BPDSD.006')
      expect(extractSkuFromTipe('14 AG14-72P-38GD (NX.JSBSN.001) Intel i3-1315U/8GB/512GB SSD/Win11+OHS2024/Pure Silver <T>')).toBe('NX.JSBSN.001')
      expect(extractSkuFromTipe('AIO Aspire C24 A (DQ.BRNSN.001) Intel 5-120U/8GB/512GB SSD/Win11 <G>')).toBe('DQ.BRNSN.001')

      // Asus
      expect(extractSkuFromTipe('AIO V440VAK-W315WOM (90PT03XA-M099S0) Intel 3 100U/16GB/512GB PCIe/Win11+OH2024+M365/White <A>')).toBe('90PT03XA-M099S0')
      expect(extractSkuFromTipe('A1404VA-VIPS3851M (90NB10I1-M01720) Intel i3-1315U/8GB/512GB PCIe/Win11+OH2024+M365/Quiet Blue <E>')).toBe('90NB10I1-M01720')
      // Asus with missing open parenthesis
      expect(extractSkuFromTipe('A1404VAP-VIPS3851M 90NB13U1-M00N30) Intel Core 3 100U/8GB/512GB PCIe/Win11+OH2024+M365/Quiet Blue <DS>')).toBe('90NB13U1-M00N30')

      // Lenovo
      expect(extractSkuFromTipe('A100 (F0JN0012ID) Intel i3-N305/8GB/512GB SSD/Win11/Cloud Grey <D>')).toBe('F0JN0012ID')
      expect(extractSkuFromTipe('IC AIO 24IRH9 (F0HN00Q3ID) Intel i3-1315U/8GB/512GB SSD/Win11+OH2024+M365/Luna Grey <D>')).toBe('F0HN00Q3ID')
      expect(extractSkuFromTipe('IdeaPad Slim 3 14IRU8 (82X6006FID) Intel i3-1315U/8GB/512GB SSD/Win11+OH2024+M365/Arctic Grey <ATK>')).toBe('82X6006FID')
      expect(extractSkuFromTipe('IdeaPad Slim 3 14APR10 (83K600AUID) AMD Ryzen 7 170/16GB/512GB SSD/WIn11+OH2024+M365/Cosmic Blue <M>')).toBe('83K600AUID')
      expect(extractSkuFromTipe('Maintstream L27-4C (67DEKAC1WW) <M>')).toBe('67DEKAC1WW')
      expect(extractSkuFromTipe('ThinkCentre Neo 50T Gen 5 (12UDS05W00) Intel i3-14100/8GB/512GB SSD/Win11+OH2024/Black <ATK>')).toBe('12UDS05W00')

      // Apple, HP, Axioo, MSI, Advan
      expect(extractSkuFromTipe('MacBook Neo A18 Pro (MHFF4ID/A) 6-core/8GB/256GB/Indigo <M>')).toBe('MHFF4ID/A')
      expect(extractSkuFromTipe('14s-fq1036AU (463C7PA#AR6) AMD Ryzen 7-5700U/8GB/512GB SSD/Win11+OHS2021/Silver <E>')).toBe('463C7PA#AR6')
      expect(extractSkuFromTipe('Hype 1 (NBAX23SC04GNB1U3) Intel N4020/8GB/128GB+512GB/1/Win11/Blue <TD>')).toBe('NBAX23SC04GNB1U3')
      expect(extractSkuFromTipe('CYBORG 15 B2RWFKG-050 (9S7-15Q342-050) Intel 7-240H/16GB/512GB SSD/Win11+OH2024/Translucent Black <M>')).toBe('9S7-15Q342-050')
      expect(extractSkuFromTipe('360 Go (L26A-R33S1) AMD Ryzen 3-3200U/8GB/256GB SSD/Win11/Grey <BTI>')).toBe('L26A-R33S1')
    })

    it('returns null when no SKU pattern exists', () => {
      expect(extractSkuFromTipe('Aksesoris Tanpa Kode SKU')).toBeNull()
      expect(extractSkuFromTipe('')).toBeNull()
    })
  })

  describe('2. Excel Buffer Parsing', () => {
    it('parses legacy office stock format (IdBarang, Kategori, Merk, Tipe, Stok, GudangLuar, TglBeli)', async () => {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Stock')
      ws.addRow(['IdBarang', 'Kategori', 'Merk', 'Tipe', 'Stok', 'GudangLuar', 'TglBeli'])
      ws.addRow(['9321', 'CPU', 'Acer', 'AIO ACX22 (UD.BPDSD.006) Intel i3', 7, 10, '2026-05-04'])
      ws.addRow(['9468', 'Notebook', 'Lenovo', 'IdeaPad Slim 3 (82X6006FID)', 5, 0, '2026-07-31'])

      const buf = await wb.xlsx.writeBuffer()
      const rows = await parseStockExcelBuffer(Buffer.from(buf), 'test.xlsx')

      expect(rows).toHaveLength(2)
      expect(rows[0].idBarang).toBe('9321')
      expect(rows[0].extractedSku).toBe('UD.BPDSD.006')
      expect(rows[0].stok).toBe(7)
      expect(rows[0].gudangLuar).toBe(10)

      expect(rows[1].idBarang).toBe('9468')
      expect(rows[1].extractedSku).toBe('82X6006FID')
      expect(rows[1].stok).toBe(5)
    })

    it('parses official stock template format with explicit SKU/MTM column', async () => {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Stok Toko')
      ws.addRow(['SKU/MTM', 'Nama Produk', 'Kategori', 'Merk', 'Stok', 'GudangLuar', 'Catatan'])
      ws.addRow(['82X6006FID', 'Lenovo IdeaPad Slim 3', 'Notebook', 'Lenovo', 15, 2, 'Stok Baru'])

      const buf = await wb.xlsx.writeBuffer()
      const rows = await parseStockExcelBuffer(Buffer.from(buf), 'template.xlsx')

      expect(rows).toHaveLength(1)
      expect(rows[0].extractedSku).toBe('82X6006FID')
      expect(rows[0].rawSkuColumn).toBe('82X6006FID')
      expect(rows[0].stok).toBe(15)
      expect(rows[0].gudangLuar).toBe(2)
    })
  })

  describe('3. Duplicate Conflict Detection & Resolution', () => {
    const mockProducts: DatabaseProductForSync[] = [
      { id: 'p-1', name: 'IdeaPad Slim 3', sku: '82X6-PARENT', stock: 10, status: 'published' },
    ]
    const mockVariants: DatabaseVariantForSync[] = [
      {
        id: 'v-1',
        product_id: 'p-1',
        sku: '82X6006FID',
        color: 'Arctic Grey',
        ram: '8GB',
        storage: '512GB',
        stock: 10,
        product: { id: 'p-1', name: 'IdeaPad Slim 3', sku: '82X6-PARENT', status: 'published' },
      },
    ]

    const duplicateRows: OfflineStockSourceRow[] = [
      {
        rowNumber: 2,
        idBarang: '9468',
        kategori: 'Notebook',
        merk: 'Lenovo',
        tipe: 'IdeaPad Slim 3 (82X6006FID) <ATK>',
        stok: 5,
        gudangLuar: 0,
        tglBeli: '2026-07-31',
        extractedSku: '82X6006FID',
        rawSkuColumn: null,
      },
      {
        rowNumber: 3,
        idBarang: '9462',
        kategori: 'Notebook',
        merk: 'Lenovo',
        tipe: 'IdeaPad Slim 3 (82X6006FID) <VI>',
        stok: 7,
        gudangLuar: 0,
        tglBeli: '2026-07-29',
        extractedSku: '82X6006FID',
        rawSkuColumn: null,
      },
    ]

    it('marks duplicate SKU (82X6006FID with stok 5 and 7) as duplicate_conflict and requires action', () => {
      const preview = calculateStockPreview({
        rows: duplicateRows,
        databaseProducts: mockProducts,
        databaseVariants: mockVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
      })

      expect(preview.items).toHaveLength(1)
      const item = preview.items[0]
      expect(item.status).toBe('duplicate_conflict')
      expect(item.conflictDetails?.hasConflict).toBe(true)
      expect(item.conflictDetails?.options).toHaveLength(5)
    })

    it('resolves duplicate conflict using sum option (5 + 7 = 12)', () => {
      const preview = calculateStockPreview({
        rows: duplicateRows,
        databaseProducts: mockProducts,
        databaseVariants: mockVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
        duplicateResolutions: {
          '82X6006FID': { resolution: 'sum' },
        },
      })

      const item = preview.items[0]
      expect(item.status).toBe('match')
      expect(item.finalStock).toBe(12)
      expect(item.diff).toBe(2) // 12 - 10
    })

    it('resolves duplicate conflict using max option (max(5, 7) = 7)', () => {
      const preview = calculateStockPreview({
        rows: duplicateRows,
        databaseProducts: mockProducts,
        databaseVariants: mockVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
        duplicateResolutions: {
          '82X6006FID': { resolution: 'max' },
        },
      })

      const item = preview.items[0]
      expect(item.finalStock).toBe(7)
    })

    it('resolves duplicate conflict using skip option (keeps web stock unchanged)', () => {
      const preview = calculateStockPreview({
        rows: duplicateRows,
        databaseProducts: mockProducts,
        databaseVariants: mockVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
        duplicateResolutions: {
          '82X6006FID': { resolution: 'skip' },
        },
      })

      const item = preview.items[0]
      expect(item.finalStock).toBe(10)
      expect(item.diff).toBe(0)
    })
  })

  describe('4. External Warehouse (GudangLuar) Toggle', () => {
    const singleRow: OfflineStockSourceRow[] = [
      {
        rowNumber: 2,
        idBarang: '9321',
        kategori: 'CPU',
        merk: 'Acer',
        tipe: 'AIO ACX22 (UD.BPDSD.006)',
        stok: 7,
        gudangLuar: 10,
        tglBeli: '2026-05-04',
        extractedSku: 'UD.BPDSD.006',
        rawSkuColumn: null,
      },
    ]

    const mockProducts: DatabaseProductForSync[] = [
      { id: 'p-acer', name: 'Acer AIO ACX22', sku: 'UD.BPDSD.006', stock: 5, status: 'published' },
    ]

    it('does NOT include GudangLuar automatically by default', () => {
      const preview = calculateStockPreview({
        rows: singleRow,
        databaseProducts: mockProducts,
        databaseVariants: [],
        activeWebOrders: [],
        includeExternalWarehouse: false,
        onlineOrdersAccounted: true,
      })

      const item = preview.items[0]
      expect(item.excelStock).toBe(7)
      expect(item.externalWarehouseStock).toBe(10)
      expect(item.finalStock).toBe(7)
      expect(item.diff).toBe(2) // 7 - 5
    })

    it('includes GudangLuar when explicitly toggled by admin (7 + 10 = 17)', () => {
      const preview = calculateStockPreview({
        rows: singleRow,
        databaseProducts: mockProducts,
        databaseVariants: [],
        activeWebOrders: [],
        includeExternalWarehouse: true,
        onlineOrdersAccounted: true,
      })

      const item = preview.items[0]
      expect(item.finalStock).toBe(17)
      expect(item.diff).toBe(12) // 17 - 5
    })
  })

  describe('5. Online Transaction Protection & Web Reconciliation', () => {
    const mockVariants: DatabaseVariantForSync[] = [
      {
        id: 'var-101',
        product_id: 'prod-101',
        sku: 'F0HN00Q3ID',
        color: 'Luna Grey',
        ram: '8GB',
        storage: '512GB',
        stock: 4,
        product: { id: 'prod-101', name: 'Lenovo AIO 24', sku: 'F0HN-PARENT', status: 'published' },
      },
    ]

    const row: OfflineStockSourceRow[] = [
      {
        rowNumber: 2,
        idBarang: '8630',
        kategori: 'CPU',
        merk: 'Lenovo',
        tipe: 'IC AIO 24IRH9 (F0HN00Q3ID)',
        stok: 6,
        gudangLuar: 0,
        tglBeli: '2026-08-07',
        extractedSku: 'F0HN00Q3ID',
        rawSkuColumn: null,
      },
    ]

    const activeOrders: ActiveWebOrderForSync[] = [
      {
        order_id: 'ord-1',
        order_number: 'ORD-PENDING-1',
        order_status: 'pending',
        order_created_at: '2026-10-18T10:00:00Z',
        product_id: 'prod-101',
        variant_id: 'var-101',
        quantity: 2,
      },
      {
        order_id: 'ord-2',
        order_number: 'ORD-SHIPPED-2',
        order_status: 'shipped',
        order_created_at: '2026-10-18T12:00:00Z',
        product_id: 'prod-101',
        variant_id: 'var-101',
        quantity: 1,
      },
    ]

    it('does NOT deduct web orders when file already accounts for online transactions', () => {
      const preview = calculateStockPreview({
        rows: row,
        databaseProducts: [],
        databaseVariants: mockVariants,
        activeWebOrders: activeOrders,
        onlineOrdersAccounted: true,
      })

      const item = preview.items[0]
      expect(item.finalStock).toBe(6)
      expect(item.status).toBe('match')
    })

    it('deducts active unreconciled web orders (6 - 3 = 3) when file does NOT account for online sales', () => {
      const preview = calculateStockPreview({
        rows: row,
        databaseProducts: [],
        databaseVariants: mockVariants,
        activeWebOrders: activeOrders,
        onlineOrdersAccounted: false,
      })

      const item = preview.items[0]
      expect(item.unreconciledWebQuantity).toBe(3) // 2 + 1
      expect(item.finalStock).toBe(3) // 6 - 3
      expect(item.status).toBe('match')
      expect(item.activeWebOrders).toHaveLength(2)
    })

    it('prevents oversell by marking needs_review if offline stock is less than web active commitments', () => {
      const smallStockRow: OfflineStockSourceRow[] = [
        {
          ...row[0],
          stok: 2, // only 2 in offline file, but active web orders require 3!
        },
      ]

      const preview = calculateStockPreview({
        rows: smallStockRow,
        databaseProducts: [],
        databaseVariants: mockVariants,
        activeWebOrders: activeOrders,
        onlineOrdersAccounted: false,
      })

      const item = preview.items[0]
      expect(item.finalStock).toBe(-1) // 2 - 3
      expect(item.status).toBe('needs_review')
      expect(item.statusMessage).toContain('Berpotensi oversell')
    })
  })

  describe('6. Database Product vs Variant Matching Safety', () => {
    it('marks not_found if SKU is not in database and does NOT create new product', () => {
      const unknownRow: OfflineStockSourceRow[] = [
        {
          rowNumber: 2,
          idBarang: '9999',
          kategori: 'Notebook',
          merk: 'BrandX',
          tipe: 'Laptop Unknown (UNKN-0001X)',
          stok: 10,
          gudangLuar: 0,
          tglBeli: null,
          extractedSku: 'UNKN-0001X',
          rawSkuColumn: null,
        },
      ]

      const preview = calculateStockPreview({
        rows: unknownRow,
        databaseProducts: [],
        databaseVariants: [],
        activeWebOrders: [],
      })

      expect(preview.items[0].status).toBe('not_found')
      expect(preview.items[0].targetId).toBeNull()
    })

    it('marks ambiguous if parent SKU matched but parent has multiple variants in store', () => {
      const parentRow: OfflineStockSourceRow[] = [
        {
          rowNumber: 2,
          idBarang: '5555',
          kategori: 'Notebook',
          merk: 'Lenovo',
          tipe: 'IdeaPad (82X6-PARENT)',
          stok: 20,
          gudangLuar: 0,
          tglBeli: null,
          extractedSku: '82X6-PARENT',
          rawSkuColumn: null,
        },
      ]

      const mockProducts: DatabaseProductForSync[] = [
        { id: 'p-multi', name: 'IdeaPad Slim 3', sku: '82X6-PARENT', stock: 20, status: 'published' },
      ]
      const mockVariants: DatabaseVariantForSync[] = [
        { id: 'v-1', product_id: 'p-multi', sku: '82X6-V1', color: 'Grey', ram: '8GB', storage: '256GB', stock: 10 },
        { id: 'v-2', product_id: 'p-multi', sku: '82X6-V2', color: 'Blue', ram: '8GB', storage: '512GB', stock: 10 },
      ]

      const preview = calculateStockPreview({
        rows: parentRow,
        databaseProducts: mockProducts,
        databaseVariants: mockVariants,
        activeWebOrders: [],
      })

      expect(preview.items[0].status).toBe('ambiguous')
      expect(preview.items[0].statusMessage).toContain('memiliki varian di database')
    })
  })

  describe('7. Template Generation', () => {
    it('generates empty template XLSX workbook without real data', async () => {
      const buffer = await generateStockSyncTemplate(false)
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(1000)

      const wb = new ExcelJS.Workbook()
      // @ts-expect-error ExcelJS supports Buffer
      await wb.xlsx.load(buffer)
      const ws = wb.worksheets[0]
      expect(ws.rowCount).toBe(1) // only header row
      expect(ws.getRow(1).getCell(1).value).toBe('SKU/MTM')
      expect(ws.getRow(1).getCell(5).value).toBe('Stok')
    })

    it('generates dummy template XLSX workbook with fictional demo rows', async () => {
      const buffer = await generateStockSyncTemplate(true)
      const wb = new ExcelJS.Workbook()
      // @ts-expect-error ExcelJS supports Buffer
      await wb.xlsx.load(buffer)
      const ws = wb.worksheets[0]
      expect(ws.rowCount).toBe(6) // 1 header + 5 dummy rows
      expect(ws.getRow(2).getCell(1).value).toBe('DEMO-LP-001')
      expect(ws.getRow(2).getCell(4).value).toBe('DemoBrand')
    })
  })

  describe('8. Edge Cases: Invalid Files & Non-numeric Stock', () => {
    it('throws descriptive error if file does not have Stok column', async () => {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Sheet1')
      ws.addRow(['Nama Barang', 'Harga', 'Kategori'])
      ws.addRow(['Barang A', 100000, 'Laptop'])

      const buf = await wb.xlsx.writeBuffer()
      await expect(parseStockExcelBuffer(Buffer.from(buf), 'bad.xlsx')).rejects.toThrow(
        /tidak memiliki kolom Stok/i
      )
    })

    it('safely parses text or negative numbers in stock column as non-negative integer', async () => {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Sheet1')
      ws.addRow(['Tipe', 'Stok', 'GudangLuar'])
      ws.addRow(['Laptop (SKU-TEST-1)', '15 pcs', '-5'])

      const buf = await wb.xlsx.writeBuffer()
      const rows = await parseStockExcelBuffer(Buffer.from(buf), 'test.xlsx')
      expect(rows).toHaveLength(1)
      expect(rows[0].stok).toBe(15)
      expect(rows[0].gudangLuar).toBe(0) // negative converted to 0
    })
  })

  describe('9. Order Status Handling: Cancelled vs Active Orders', () => {
    const mockProduct: DatabaseProductForSync[] = [
      { id: 'p-1', name: 'Laptop A', sku: 'SKU-A', stock: 10, status: 'published' },
    ]

    it('ignores cancelled orders and only deducts active unfulfilled orders', () => {
      const row: OfflineStockSourceRow[] = [
        {
          rowNumber: 2,
          idBarang: '100',
          kategori: 'Laptop',
          merk: 'BrandA',
          tipe: 'Laptop (SKU-A)',
          stok: 10,
          gudangLuar: 0,
          tglBeli: null,
          extractedSku: 'SKU-A',
          rawSkuColumn: null,
        },
      ]

      const activeOrders: ActiveWebOrderForSync[] = [
        {
          order_id: 'ord-active',
          order_number: 'ORD-1',
          order_status: 'processing',
          order_created_at: '2026-10-18T10:00:00Z',
          product_id: 'p-1',
          variant_id: null,
          quantity: 3,
        },
      ]

      const preview = calculateStockPreview({
        rows: row,
        databaseProducts: mockProduct,
        databaseVariants: [],
        activeWebOrders: activeOrders,
        onlineOrdersAccounted: false,
      })

      // 10 offline stock - 3 active order = 7 final stock
      expect(preview.items[0].unreconciledWebQuantity).toBe(3)
      expect(preview.items[0].finalStock).toBe(7)
      expect(preview.items[0].status).toBe('match')
    })
  })

  describe('10. Re-import Idempotency & Safety', () => {
    it('produces identical preview calculation when the same file is processed consecutively', () => {
      const rows: OfflineStockSourceRow[] = [
        {
          rowNumber: 2,
          idBarang: '200',
          kategori: 'CPU',
          merk: 'Acer',
          tipe: 'AIO (UD.BPDSD.006)',
          stok: 8,
          gudangLuar: 2,
          tglBeli: null,
          extractedSku: 'UD.BPDSD.006',
          rawSkuColumn: null,
        },
      ]

      const mockProducts: DatabaseProductForSync[] = [
        { id: 'p-acer', name: 'Acer AIO', sku: 'UD.BPDSD.006', stock: 8, status: 'published' },
      ]

      const preview1 = calculateStockPreview({
        rows,
        databaseProducts: mockProducts,
        databaseVariants: [],
        activeWebOrders: [],
        includeExternalWarehouse: false,
        onlineOrdersAccounted: true,
      })

      const preview2 = calculateStockPreview({
        rows,
        databaseProducts: mockProducts,
        databaseVariants: [],
        activeWebOrders: [],
        includeExternalWarehouse: false,
        onlineOrdersAccounted: true,
      })

      expect(preview1.summary).toEqual(preview2.summary)
      expect(preview1.items[0].finalStock).toBe(preview2.items[0].finalStock)
      expect(preview1.items[0].diff).toBe(0) // No diff since web is already 8
    })
  })

  describe('11. Real Office Datasets: CPU & Notebook Stock Verification with 82X6006FID Conflict', () => {
    // Exact sample rows from cpu stock all and notebook stock all
    const cpuRows: OfflineStockSourceRow[] = [
      { rowNumber: 2, idBarang: '9321', kategori: 'CPU', merk: 'Acer', tipe: 'AIO ACX22 (UD.BPDSD.006) Intel i3-1315U/8GB/512GB SSD/Win11+OH2024 <M>', stok: 7, gudangLuar: 10, tglBeli: '2026-05-04', extractedSku: 'UD.BPDSD.006', rawSkuColumn: null },
      { rowNumber: 3, idBarang: '9484', kategori: 'CPU', merk: 'Acer', tipe: 'AIO Aspire C24 A (DQ.BRNSN.001) Intel 5-120U/8GB/512GB SSD/Win11 <G>', stok: 2, gudangLuar: 0, tglBeli: '2026-08-11', extractedSku: 'DQ.BRNSN.001', rawSkuColumn: null },
      { rowNumber: 4, idBarang: '8630', kategori: 'CPU', merk: 'Lenovo', tipe: 'IC AIO 24IRH9 (F0HN00Q3ID) Intel i3-1315U/8GB/512GB SSD/Win11+OH2024+M365/Luna Grey <D>', stok: 6, gudangLuar: 0, tglBeli: '2026-08-07', extractedSku: 'F0HN00Q3ID', rawSkuColumn: null },
      { rowNumber: 5, idBarang: '9480', kategori: 'CPU', merk: 'Lenovo', tipe: 'IC Tower 08IAS10 (91CF001VID) Intel Ultra 3 205/8GB/512GB SSD/Win11+OH2024+M365/Cloud Grey <I>', stok: 15, gudangLuar: 0, tglBeli: '2026-08-07', extractedSku: '91CF001VID', rawSkuColumn: null },
    ]

    const notebookRows: OfflineStockSourceRow[] = [
      { rowNumber: 2, idBarang: '8982', kategori: 'Notebook', merk: 'Acer', tipe: '14 AG14-72P-38GD (NX.JSBSN.001) Intel i3-1315U/8GB/512GB SSD/Win11+OHS2024/Pure Silver <T>', stok: 1, gudangLuar: 0, tglBeli: '2025-12-13', extractedSku: 'NX.JSBSN.001', rawSkuColumn: null },
      { rowNumber: 3, idBarang: '9384', kategori: 'Notebook', merk: 'Apple', tipe: 'MacBook Neo A18 Pro (MHFF4ID/A) 6-core/8GB/256GB/Indigo <M>', stok: 2, gudangLuar: 0, tglBeli: '2026-05-29', extractedSku: 'MHFF4ID/A', rawSkuColumn: null },
      { rowNumber: 4, idBarang: '9495', kategori: 'Notebook', merk: 'Asus', tipe: 'A1404VAP-VIPS3851M 90NB13U1-M00N30) Intel Core 3 100U/8GB/512GB PCIe/Win11+OH2024+M365/Quiet Blue <DS>', stok: 11, gudangLuar: 0, tglBeli: '2026-08-13', extractedSku: '90NB13U1-M00N30', rawSkuColumn: null },
      // Duplicate 82X6006FID rows from notebook stock all:
      { rowNumber: 74, idBarang: '9468', kategori: 'Notebook', merk: 'Lenovo', tipe: 'IdeaPad Slim 3 14IRU8 (82X6006FID) Intel i3-1315U/8GB/512GB SSD/Win11+OH2024+M365/Arctic Grey <ATK>', stok: 5, gudangLuar: 0, tglBeli: '2026-07-31', extractedSku: '82X6006FID', rawSkuColumn: null },
      { rowNumber: 75, idBarang: '9462', kategori: 'Notebook', merk: 'Lenovo', tipe: 'IdeaPad Slim 3 14IRU8 (82X6006FID) Intel i3-1315U/8GB/512GB SSD/Win11+OH2024+M365/Arctic Grey <VI>', stok: 7, gudangLuar: 0, tglBeli: '2026-07-29', extractedSku: '82X6006FID', rawSkuColumn: null },
    ]

    const mockVariants: DatabaseVariantForSync[] = [
      { id: 'v-ideapad-fid', product_id: 'p-ideapad', sku: '82X6006FID', color: 'Arctic Grey', ram: '8GB', storage: '512GB', stock: 10, product: { id: 'p-ideapad', name: 'IdeaPad Slim 3 14IRU8', sku: '82X6-PARENT', status: 'published' } },
      { id: 'v-acer-aio', product_id: 'p-acx22', sku: 'UD.BPDSD.006', color: 'Silver', ram: '8GB', storage: '512GB', stock: 5, product: { id: 'p-acx22', name: 'Acer AIO ACX22', sku: 'ACX22-PARENT', status: 'published' } },
      { id: 'v-asus-a1404', product_id: 'p-asus', sku: '90NB13U1-M00N30', color: 'Quiet Blue', ram: '8GB', storage: '512GB', stock: 8, product: { id: 'p-asus', name: 'Asus Vivobook A1404VAP', sku: 'A1404-PARENT', status: 'published' } },
    ]

    it('detects duplicate 82X6006FID in real notebook dataset and refuses silent summation', () => {
      const combinedRows = [...cpuRows, ...notebookRows]

      const preview = calculateStockPreview({
        rows: combinedRows,
        databaseProducts: [],
        databaseVariants: mockVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
      })

      const fidItem = preview.items.find((i) => i.sku === '82X6006FID')
      expect(fidItem).toBeDefined()
      expect(fidItem!.status).toBe('duplicate_conflict')
      expect(fidItem!.sourceRows).toHaveLength(2)
      expect(fidItem!.sourceRows.map((r) => r.idBarang)).toEqual(['9468', '9462'])
      expect(fidItem!.sourceRows.map((r) => r.stok)).toEqual([5, 7])
      // Refuses silent sum by default: keeps status as duplicate_conflict
      expect(preview.summary.conflicts).toBeGreaterThanOrEqual(1)
    })

    it('allows admin to choose resolution for 82X6006FID', () => {
      const combinedRows = [...cpuRows, ...notebookRows]

      // Resolution 1: sum (5 + 7 = 12)
      const previewSum = calculateStockPreview({
        rows: combinedRows,
        databaseProducts: [],
        databaseVariants: mockVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
        duplicateResolutions: { '82X6006FID': { resolution: 'sum' } },
      })
      const fidSum = previewSum.items.find((i) => i.sku === '82X6006FID')!
      expect(fidSum.status).toBe('match')
      expect(fidSum.finalStock).toBe(12)

      // Resolution 2: max (7)
      const previewMax = calculateStockPreview({
        rows: combinedRows,
        databaseProducts: [],
        databaseVariants: mockVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
        duplicateResolutions: { '82X6006FID': { resolution: 'max' } },
      })
      const fidMax = previewMax.items.find((i) => i.sku === '82X6006FID')!
      expect(fidMax.finalStock).toBe(7)

      // Resolution 3: min (5)
      const previewMin = calculateStockPreview({
        rows: combinedRows,
        databaseProducts: [],
        databaseVariants: mockVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
        duplicateResolutions: { '82X6006FID': { resolution: 'min' } },
      })
      const fidMin = previewMin.items.find((i) => i.sku === '82X6006FID')!
      expect(fidMin.finalStock).toBe(5)

      // Resolution 4: skip (stock remains at current web stock 10)
      const previewSkip = calculateStockPreview({
        rows: combinedRows,
        databaseProducts: [],
        databaseVariants: mockVariants,
        activeWebOrders: [],
        onlineOrdersAccounted: true,
        duplicateResolutions: { '82X6006FID': { resolution: 'skip' } },
      })
      const fidSkip = previewSkip.items.find((i) => i.sku === '82X6006FID')!
      expect(fidSkip.finalStock).toBe(10)
      expect(fidSkip.diff).toBe(0)
    })
  })

  describe('12. Full Multi-Status Web Order Reconciliation (pending, processing, ready_for_pickup, shipped, cancelled, delivered)', () => {
    const mockVariants: DatabaseVariantForSync[] = [
      { id: 'v-test', product_id: 'p-test', sku: 'TEST-SKU-1', color: 'Black', ram: '16GB', storage: '1TB', stock: 15, product: { id: 'p-test', name: 'Test Laptop', sku: 'P-TEST', status: 'published' } },
    ]

    const sourceRow: OfflineStockSourceRow[] = [
      { rowNumber: 2, idBarang: '1', kategori: 'Laptop', merk: 'Test', tipe: 'Test Laptop (TEST-SKU-1)', stok: 20, gudangLuar: 5, tglBeli: null, extractedSku: 'TEST-SKU-1', rawSkuColumn: null },
    ]

    it('accurately reconciles active orders (pending, processing, ready_for_pickup, shipped) and strictly excludes cancelled and delivered orders', () => {
      const orders: ActiveWebOrderForSync[] = [
        { order_id: 'o-pending', order_number: 'ORD-PENDING', order_status: 'pending', order_created_at: '2026-10-19T01:00:00Z', product_id: 'p-test', variant_id: 'v-test', quantity: 2 },
        { order_id: 'o-processing', order_number: 'ORD-PROC', order_status: 'processing', order_created_at: '2026-10-19T02:00:00Z', product_id: 'p-test', variant_id: 'v-test', quantity: 3 },
        { order_id: 'o-pickup', order_number: 'ORD-PICKUP', order_status: 'ready_for_pickup', order_created_at: '2026-10-19T03:00:00Z', product_id: 'p-test', variant_id: 'v-test', quantity: 1 },
        { order_id: 'o-shipped', order_number: 'ORD-SHIP', order_status: 'shipped', order_created_at: '2026-10-19T04:00:00Z', product_id: 'p-test', variant_id: 'v-test', quantity: 4 },
        // Cancelled orders MUST be excluded (stock was already restored by trigger)
        { order_id: 'o-cancelled', order_number: 'ORD-CANCEL', order_status: 'cancelled', order_created_at: '2026-10-19T05:00:00Z', product_id: 'p-test', variant_id: 'v-test', quantity: 99 },
        // Delivered orders MUST be excluded (items already physically handed over, not part of offline warehouse stock)
        { order_id: 'o-delivered', order_number: 'ORD-DELIVER', order_status: 'delivered', order_created_at: '2026-10-19T06:00:00Z', product_id: 'p-test', variant_id: 'v-test', quantity: 50 },
      ]

      const preview = calculateStockPreview({
        rows: sourceRow,
        databaseProducts: [],
        databaseVariants: mockVariants,
        activeWebOrders: orders,
        includeExternalWarehouse: false,
        onlineOrdersAccounted: false, // Reconcile online orders!
      })

      const item = preview.items[0]
      // Expected active deduction: pending(2) + processing(3) + ready_for_pickup(1) + shipped(4) = 10 units
      expect(item.unreconciledWebQuantity).toBe(10)
      // Cancelled (99) and Delivered (50) must NOT be deducted!
      expect(item.activeWebOrders).toHaveLength(4)
      expect(item.activeWebOrders.map((o) => o.status)).toEqual(['pending', 'processing', 'ready_for_pickup', 'shipped'])

      // Base stock: 20 (without GudangLuar)
      // Final stock: 20 - 10 = 10
      expect(item.finalStock).toBe(10)
      expect(item.status).toBe('match')
      expect(preview.activeWebOrdersCount).toBe(4)
    })

    it('calculates final stock with GudangLuar included (20 + 5 - 10 = 15)', () => {
      const orders: ActiveWebOrderForSync[] = [
        { order_id: 'o-1', order_number: 'ORD-1', order_status: 'pending', order_created_at: '2026-10-19T01:00:00Z', product_id: 'p-test', variant_id: 'v-test', quantity: 4 },
        { order_id: 'o-2', order_number: 'ORD-2', order_status: 'shipped', order_created_at: '2026-10-19T02:00:00Z', product_id: 'p-test', variant_id: 'v-test', quantity: 6 },
      ]

      const preview = calculateStockPreview({
        rows: sourceRow,
        databaseProducts: [],
        databaseVariants: mockVariants,
        activeWebOrders: orders,
        includeExternalWarehouse: true,
        onlineOrdersAccounted: false,
      })

      const item = preview.items[0]
      expect(item.excelStock).toBe(20)
      expect(item.externalWarehouseStock).toBe(5)
      expect(item.unreconciledWebQuantity).toBe(10) // 4 + 6
      expect(item.finalStock).toBe(15) // (20 + 5) - 10 = 15
      expect(item.status).toBe('match')
    })

    it('strictly prevents negative stock / oversell by flagging needs_review when active commitments exceed offline stock', () => {
      const smallOfflineRow: OfflineStockSourceRow[] = [
        { rowNumber: 2, idBarang: '2', kategori: 'Laptop', merk: 'Test', tipe: 'Test Laptop (TEST-SKU-1)', stok: 3, gudangLuar: 0, tglBeli: null, extractedSku: 'TEST-SKU-1', rawSkuColumn: null },
      ]

      const heavyOrders: ActiveWebOrderForSync[] = [
        { order_id: 'o-big', order_number: 'ORD-BIG', order_status: 'processing', order_created_at: '2026-10-19T01:00:00Z', product_id: 'p-test', variant_id: 'v-test', quantity: 5 },
      ]

      const preview = calculateStockPreview({
        rows: smallOfflineRow,
        databaseProducts: [],
        databaseVariants: mockVariants,
        activeWebOrders: heavyOrders,
        includeExternalWarehouse: false,
        onlineOrdersAccounted: false,
      })

      const item = preview.items[0]
      // Offline stock: 3, Web active: 5 -> Final stock: 3 - 5 = -2!
      expect(item.finalStock).toBe(-2)
      expect(item.status).toBe('needs_review')
      expect(item.statusMessage).toContain('Berpotensi oversell')
      expect(preview.summary.matched).toBe(0)
      expect(preview.summary.needsReview).toBe(1)
    })
  })
})

