import ExcelJS from 'exceljs'

export type OfflineStockSourceRow = {
  rowNumber: number
  idBarang: string | null
  kategori: string
  merk: string
  tipe: string
  stok: number
  gudangLuar: number
  tglBeli: string | null
  extractedSku: string | null
  rawSkuColumn: string | null
}

export type StockSyncItemStatus =
  | 'match'
  | 'duplicate_conflict'
  | 'not_found'
  | 'ambiguous'
  | 'needs_review'
  | 'invalid'

export type DuplicateConflictResolution =
  | 'sum'
  | 'keep_last'
  | 'max'
  | 'min'
  | 'skip'
  | 'manual'

export type ActiveWebOrderItemRef = {
  orderId: string
  orderNumber: string
  quantity: number
  status: string
  createdAt: string
}

export type StockSyncPreviewItem = {
  id: string
  sku: string
  sourceTitle: string
  sourceBrand: string
  sourceCategory: string
  sourceRows: OfflineStockSourceRow[]
  excelStock: number
  externalWarehouseStock: number
  currentWebStock: number
  unreconciledWebQuantity: number
  activeWebOrders: ActiveWebOrderItemRef[]
  finalStock: number
  diff: number
  status: StockSyncItemStatus
  statusMessage: string
  targetType: 'variant' | 'product' | null
  targetId: string | null
  parentProductId?: string | null
  matchedName: string | null
  conflictDetails?: {
    hasConflict: boolean
    options: { label: string; value: DuplicateConflictResolution; stock: number }[]
    selectedResolution: DuplicateConflictResolution
    customStock?: number
  }
}

export type StockSyncPreviewResult = {
  fileNames: string[]
  totalRows: number
  items: StockSyncPreviewItem[]
  summary: {
    totalProcessed: number
    matched: number
    notFound: number
    conflicts: number
    needsReview: number
    totalCurrentStock: number
    totalFinalStock: number
    totalDiff: number
  }
  activeWebOrdersCount: number
  reconciliationMode: 'already_accounted' | 'not_accounted'
  includeExternalWarehouse: boolean
  stockSourceMode?: 'main_only' | 'combined' | 'external_only'
  isDuplicateFile: boolean
  lastSync: { lastSyncAt: string | null; adminName: string | null } | null
}

export type DatabaseProductForSync = {
  id: string
  name: string
  sku: string | null
  stock: number
  status: string
}

export type DatabaseVariantForSync = {
  id: string
  product_id: string
  sku: string | null
  color: string
  ram: string
  storage: string
  stock: number
  product?: {
    id: string
    name: string
    sku: string | null
    status: string
  } | null
}

export type ActiveWebOrderForSync = {
  order_id: string
  order_number: string
  order_status: string
  order_created_at: string
  product_id: string | null
  variant_id: string | null
  quantity: number
}

/**
 * Checks if a candidate string inside parentheses or token looks like a product SKU/MTM/PN
 */
export function isLikelySku(candidate: string): boolean {
  const trimmed = candidate.trim()
  if (!trimmed || trimmed.length < 5 || trimmed.length > 35) return false

  // Blacklist generic hardware spec phrases or names
  const blacklistPattern = /^(core\s|intel\s|amd\s|ryzen\s|snapdragon\s|ultra\s|edition|ideapad|legion|yoga|thinkcentre|thinkpad|loq|aio\s|tab\s)/i
  if (blacklistPattern.test(trimmed)) return false

  // Blacklist spec numbers like screen dimensions: (8.8", 3) or resolutions
  if (/^[\d.",\s]+$/.test(trimmed)) return false
  if (/[,"]/.test(trimmed)) return false

  // Must contain both letters and digits or valid standard model separators (. / - #)
  const hasLetter = /[A-Za-z]/.test(trimmed)
  const hasDigit = /\d/.test(trimmed)

  if (!hasLetter || !hasDigit) return false

  return true
}

/**
 * Extracts product SKU/MTM from product title or type description.
 * Prioritizes content inside parentheses (e.g. `(UD.BPDSD.006)`, `(82X6006FID)`),
 * handles missing open parenthesis (e.g. `90NB13U1-M00N30)`),
 * and standard part number patterns.
 */
export function extractSkuFromTipe(tipe: string): string | null {
  if (!tipe || typeof tipe !== 'string') return null
  const clean = tipe.trim()

  // 1. Check all parentheses contents: (XYZ)
  const parenRegex = /\(([^)]+)\)/g
  let match: RegExpExecArray | null
  const candidates: string[] = []

  while ((match = parenRegex.exec(clean)) !== null) {
    const candidate = match[1].trim()
    if (isLikelySku(candidate)) {
      candidates.push(candidate)
    }
  }

  if (candidates.length > 0) {
    // Return the first valid candidate
    return candidates[0]
  }

  // 2. Check missing opening parenthesis, e.g.: "A1404VAP-VIPS3851M 90NB13U1-M00N30) Intel"
  const missingParenMatch = clean.match(/(?:^|\s)([0-9A-Za-z.\/#-]{7,30})\)/)
  if (missingParenMatch && isLikelySku(missingParenMatch[1])) {
    return missingParenMatch[1].trim()
  }

  // 3. Check well-known manufacturer SKU formats (e.g., Lenovo 10-char MTM or Asus PN)
  const standalonePatterns = [
    // Lenovo 10-char MTM: e.g. 82X6006FID, 83K600AUID, F0JN0012ID, 91CF001VID, 67DEKAC1WW
    /\b(8[0-9A-Za-z]{9}|9[0-9A-Za-z]{9}|F0[0-9A-Za-z]{8}|6[0-9A-Za-z]{9}|ZA[0-9A-Za-z]{8})\b/i,
    // Asus Part Number: e.g. 90NB10I1-M01720, 90PT03XA-M099S0, 90NX0871-M00H40
    /\b(90[0-9A-Za-z]{2}-[0-9A-Za-z]{6})\b/i,
    // Acer Part Number: e.g. NX.JSBSN.001, DQ.BRNSN.001, UD.BPDSD.006, NH.D5ASN.001
    /\b([A-Z]{2}\.[A-Z0-9]{5}\.[A-Z0-9]{3})\b/i,
    // MSI: e.g. 9S7-15Q342-050
    /\b(9S7-[0-9A-Za-z]{6}-[0-9A-Za-z]{3})\b/i,
    // HP: e.g. 463C7PA#AR6
    /\b([0-9A-Za-z]{7}#[0-9A-Za-z]{3})\b/i,
    // Axioo: e.g. NBAX23SC04GNB1U3
    /\b(NBAX[0-9A-Za-z]{10,20})\b/i,
  ]

  for (const regex of standalonePatterns) {
    const standaloneMatch = clean.match(regex)
    if (standaloneMatch && isLikelySku(standaloneMatch[1])) {
      return standaloneMatch[1].trim()
    }
  }

  return null
}

/**
 * Normalizes SKU string for comparison (removes whitespace, uppercase)
 */
export function normalizeSkuForCompare(sku: string | null | undefined): string {
  if (!sku) return ''
  return sku.trim().toUpperCase()
}

/**
 * Parses raw Excel file buffer into structured source rows.
 * Handles both the legacy office format and official template format.
 */
export async function parseStockExcelBuffer(
  buffer: ArrayBuffer | Buffer,
  filename = 'stock.xlsx'
): Promise<OfflineStockSourceRow[]> {
  const workbook = new ExcelJS.Workbook()
  // @ts-expect-error ExcelJS supports Buffer
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error(`File Excel ${filename} tidak memiliki worksheet yang valid.`)
  }

  // Find header row (usually row 1, but look up to row 5 if empty rows exist)
  let headerRowIndex = 1
  let headerMap: Record<string, number> = {}

  for (let r = 1; r <= 5; r++) {
    const row = worksheet.getRow(r)
    const map: Record<string, number> = {}
    row.eachCell((cell, colNumber) => {
      const val = String(cell.value ?? '').trim().toLowerCase()
      if (val) map[val] = colNumber
    })

    // Check if row has recognized headers
    const hasTipe = map['tipe'] || map['tipe barang'] || map['nama produk'] || map['nama barang'] || map['product name']
    const hasStok = map['stok'] || map['stock'] || map['qty'] || map['jumlah']
    const hasSku = map['sku'] || map['sku/mtm'] || map['kode barang'] || map['mtm'] || map['part number'] || map['pn']

    if ((hasTipe || hasSku) && hasStok) {
      headerRowIndex = r
      headerMap = map
      break
    }
  }

  const getCol = (names: string[]): number | undefined => {
    for (const name of names) {
      if (headerMap[name.toLowerCase()]) return headerMap[name.toLowerCase()]
    }
    return undefined
  }

  const idCol = getCol(['idbarang', 'id barang', 'id_barang', 'id'])
  const kategoriCol = getCol(['kategori', 'category'])
  const merkCol = getCol(['merk', 'brand'])
  const tipeCol = getCol(['tipe', 'tipe barang', 'nama produk', 'nama barang', 'product name'])
  const stokCol = getCol(['stok', 'stock', 'qty', 'jumlah'])
  const gudangLuarCol = getCol(['gudangluar', 'gudang luar', 'gudang_luar', 'external_warehouse'])
  const tglBeliCol = getCol(['tglbeli', 'tgl beli', 'tgl_beli', 'tanggal beli', 'purchase_date'])
  const explicitSkuCol = getCol(['sku', 'sku/mtm', 'kode barang', 'mtm', 'part number', 'pn'])

  if (!stokCol) {
    throw new Error(`Format file ${filename} tidak memiliki kolom Stok/Qty yang valid.`)
  }

  const rows: OfflineStockSourceRow[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return

    const getCellStr = (col?: number): string => {
      if (!col) return ''
      const cell = row.getCell(col)
      const val = cell.value
      if (val === null || val === undefined) return ''
      if (typeof val === 'object' && 'text' in val) return String(val.text ?? '').trim()
      return String(val).trim()
    }

    const getCellNum = (col?: number): number => {
      if (!col) return 0
      const cell = row.getCell(col)
      const val = cell.value
      if (typeof val === 'number') return Math.max(0, Math.floor(val))
      const parsed = Number.parseInt(String(val ?? '0').replace(/[^0-9-]/g, ''), 10)
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
    }

    const tipe = getCellStr(tipeCol)
    const rawSku = explicitSkuCol ? getCellStr(explicitSkuCol) : ''
    const idBarang = idCol ? getCellStr(idCol) || null : null
    const kategori = kategoriCol ? getCellStr(kategoriCol) : ''
    const merk = merkCol ? getCellStr(merkCol) : ''
    const stok = getCellNum(stokCol)
    const gudangLuar = gudangLuarCol ? getCellNum(gudangLuarCol) : 0
    const tglBeli = tglBeliCol ? getCellStr(tglBeliCol) || null : null

    // If whole row is empty, skip
    if (!tipe && !rawSku && stok === 0 && gudangLuar === 0) return

    // Extract SKU: prioritize explicit SKU column, fallback to extracting from Tipe
    let extractedSku: string | null = rawSku ? rawSku.trim() : null
    if (!extractedSku && tipe) {
      extractedSku = extractSkuFromTipe(tipe)
    }

    rows.push({
      rowNumber,
      idBarang,
      kategori,
      merk,
      tipe: tipe || rawSku || `Barang #${rowNumber}`,
      stok,
      gudangLuar,
      tglBeli,
      extractedSku,
      rawSkuColumn: rawSku || null,
    })
  })

  return rows
}

/**
 * Calculates stock synchronization preview including reconciliation with active web transactions.
 */
export function calculateStockPreview(params: {
  rows: OfflineStockSourceRow[]
  databaseProducts: DatabaseProductForSync[]
  databaseVariants: DatabaseVariantForSync[]
  activeWebOrders: ActiveWebOrderForSync[]
  includeExternalWarehouse?: boolean
  stockSourceMode?: 'main_only' | 'combined' | 'external_only'
  onlineOrdersAccounted?: boolean
  duplicateResolutions?: Record<string, { resolution: DuplicateConflictResolution; customStock?: number }>
  fileNames?: string[]
  isDuplicateFile?: boolean
  lastSync?: { lastSyncAt: string | null; adminName: string | null } | null
}): StockSyncPreviewResult {
  const {
    rows,
    databaseProducts,
    databaseVariants,
    activeWebOrders,
    includeExternalWarehouse = false,
    stockSourceMode,
    onlineOrdersAccounted = false,
    duplicateResolutions = {},
    fileNames = ['file.xlsx'],
    isDuplicateFile = false,
    lastSync = null,
  } = params

  // 1. Index database variants & products by normalized SKU
  const variantMap = new Map<string, DatabaseVariantForSync>()
  for (const variant of databaseVariants) {
    if (variant.sku) {
      variantMap.set(normalizeSkuForCompare(variant.sku), variant)
    }
  }

  const productMap = new Map<string, DatabaseProductForSync>()
  const parentVariantsCount = new Map<string, number>()
  for (const product of databaseProducts) {
    if (product.sku) {
      productMap.set(normalizeSkuForCompare(product.sku), product)
    }
  }
  for (const variant of databaseVariants) {
    parentVariantsCount.set(variant.product_id, (parentVariantsCount.get(variant.product_id) ?? 0) + 1)
  }

  // 2. Index active unreconciled web orders by variant_id and product_id
  // Only active unfulfilled orders hold inventory commitments: pending, processing, ready_for_pickup, shipped.
  // Cancelled orders had their stock restored to catalog and MUST NOT be deducted.
  // Delivered orders already physically departed the warehouse and are not active warehouse commitments.
  const ACTIVE_ORDER_STATUSES = new Set(['pending', 'processing', 'ready_for_pickup', 'shipped'])
  const variantActiveOrders = new Map<string, ActiveWebOrderItemRef[]>()
  const productActiveOrders = new Map<string, ActiveWebOrderItemRef[]>()

  for (const order of activeWebOrders) {
    const rawStatus = (order.order_status || '').trim().toLowerCase()
    if (!ACTIVE_ORDER_STATUSES.has(rawStatus)) {
      continue
    }
    if (!order.quantity || order.quantity <= 0) {
      continue
    }

    const itemRef: ActiveWebOrderItemRef = {
      orderId: order.order_id,
      orderNumber: order.order_number,
      quantity: order.quantity,
      status: order.order_status,
      createdAt: order.order_created_at,
    }

    if (order.variant_id) {
      const list = variantActiveOrders.get(order.variant_id) ?? []
      list.push(itemRef)
      variantActiveOrders.set(order.variant_id, list)
    } else if (order.product_id) {
      const list = productActiveOrders.get(order.product_id) ?? []
      list.push(itemRef)
      productActiveOrders.set(order.product_id, list)
    }
  }

  // 3. Group parsed rows by SKU
  const groupedBySku = new Map<string, OfflineStockSourceRow[]>()
  const rowsWithoutSku: OfflineStockSourceRow[] = []

  for (const row of rows) {
    if (!row.extractedSku) {
      rowsWithoutSku.push(row)
    } else {
      const norm = normalizeSkuForCompare(row.extractedSku)
      const list = groupedBySku.get(norm) ?? []
      list.push(row)
      groupedBySku.set(norm, list)
    }
  }

  const effectiveStockMode: 'main_only' | 'combined' | 'external_only' =
    stockSourceMode ?? (includeExternalWarehouse ? 'combined' : 'main_only')

  const previewItems: StockSyncPreviewItem[] = []
  let itemIndex = 0

  // 4. Process each grouped SKU
  for (const [normSku, skuRows] of groupedBySku.entries()) {
    itemIndex++
    const displaySku = skuRows[0].extractedSku || normSku
    const firstRow = skuRows[0]
    const hasConflict = skuRows.length > 1

    // Determine base stocks
    let excelStock = 0
    let externalWarehouseStock = 0
    let resolutionToUse: DuplicateConflictResolution = 'keep_last'
    let customStock: number | undefined

    if (hasConflict) {
      const savedRes = duplicateResolutions[normSku]
      resolutionToUse = savedRes?.resolution ?? 'sum' // Default resolution offered
      customStock = savedRes?.customStock

      switch (resolutionToUse) {
        case 'sum':
          excelStock = skuRows.reduce((acc, r) => acc + r.stok, 0)
          externalWarehouseStock = skuRows.reduce((acc, r) => acc + r.gudangLuar, 0)
          break
        case 'max':
          excelStock = Math.max(...skuRows.map((r) => r.stok))
          externalWarehouseStock = Math.max(...skuRows.map((r) => r.gudangLuar))
          break
        case 'min':
          excelStock = Math.min(...skuRows.map((r) => r.stok))
          externalWarehouseStock = Math.min(...skuRows.map((r) => r.gudangLuar))
          break
        case 'manual':
          excelStock = typeof customStock === 'number' && customStock >= 0 ? customStock : firstRow.stok
          externalWarehouseStock = firstRow.gudangLuar
          break
        case 'skip':
          excelStock = 0
          externalWarehouseStock = 0
          break
        case 'keep_last':
        default: {
          const lastRow = skuRows[skuRows.length - 1]
          excelStock = lastRow.stok
          externalWarehouseStock = lastRow.gudangLuar
          break
        }
      }
    } else {
      excelStock = firstRow.stok
      externalWarehouseStock = firstRow.gudangLuar
    }

    // Match with database: Variant first, then Product
    const matchedVariant = variantMap.get(normSku)
    const matchedProduct = !matchedVariant ? productMap.get(normSku) : null

    let targetType: 'variant' | 'product' | null = null
    let targetId: string | null = null
    let parentProductId: string | null = null
    let matchedName: string | null = null
    let currentWebStock = 0
    let activeOrdersForThisItem: ActiveWebOrderItemRef[] = []

    if (matchedVariant) {
      targetType = 'variant'
      targetId = matchedVariant.id
      parentProductId = matchedVariant.product_id
      const pName = matchedVariant.product?.name || 'Produk'
      const variantSpecs = [matchedVariant.color, matchedVariant.ram, matchedVariant.storage].filter(Boolean).join(' / ')
      matchedName = variantSpecs ? `${pName} (${variantSpecs})` : pName
      currentWebStock = matchedVariant.stock
      activeOrdersForThisItem = variantActiveOrders.get(matchedVariant.id) ?? []
    } else if (matchedProduct) {
      const vCount = parentVariantsCount.get(matchedProduct.id) ?? 0
      if (vCount > 0) {
        // Parent SKU matched, but it has variants! Ambiguous.
        targetType = null
        targetId = matchedProduct.id
        matchedName = `${matchedProduct.name} (${vCount} varian)`
        currentWebStock = matchedProduct.stock
      } else {
        targetType = 'product'
        targetId = matchedProduct.id
        matchedName = matchedProduct.name
        currentWebStock = matchedProduct.stock
        activeOrdersForThisItem = productActiveOrders.get(matchedProduct.id) ?? []
      }
    }

    const unreconciledWebQuantity = activeOrdersForThisItem.reduce((acc, o) => acc + o.quantity, 0)

    const baseSourceStock =
      effectiveStockMode === 'combined'
        ? excelStock + externalWarehouseStock
        : effectiveStockMode === 'external_only'
        ? externalWarehouseStock
        : excelStock

    let finalStock = baseSourceStock

    if (!onlineOrdersAccounted) {
      // Reconcile: deduct active unreconciled web orders
      finalStock = baseSourceStock - unreconciledWebQuantity
    }

    if (resolutionToUse === 'skip') {
      finalStock = currentWebStock
    }

    const diff = finalStock - currentWebStock

    // Determine item status & warnings
    let status: StockSyncItemStatus = 'match'
    let statusMessage = 'Data cocok, siap langsung di-update ke toko web.'

    if (!matchedVariant && !matchedProduct) {
      status = 'not_found'
      statusMessage = 'Kode barang (SKU/MTM) belum terdaftar di database produk maupun varian toko web.'
    } else if (!matchedVariant && matchedProduct && (parentVariantsCount.get(matchedProduct.id) ?? 0) > 0) {
      status = 'ambiguous'
      statusMessage = 'Produk memiliki varian di database. Harap gunakan kode varian spesifik agar pembaruan stok presisi.'
    } else if (hasConflict && !duplicateResolutions[normSku]) {
      status = 'duplicate_conflict'
      const stocksList = skuRows.map((r) => `${r.stok}${r.tglBeli ? ` (${r.tglBeli})` : ''}`).join(', ')
      statusMessage = `Ditemukan ${skuRows.length} baris di Excel untuk barang ini: [${stocksList}]. Pilih mau pakai angka stok yang mana.`
    } else if (finalStock < 0) {
      status = 'needs_review'
      statusMessage = `Stok offline (${baseSourceStock}) lebih kecil dari pesanan aktif web (${unreconciledWebQuantity}). Berpotensi oversell jika diterapkan.`
    }

    // Build conflict options
    let conflictDetails: StockSyncPreviewItem['conflictDetails'] = undefined
    if (hasConflict) {
      const sumStock = skuRows.reduce((acc, r) => acc + r.stok, 0)
      const maxStock = Math.max(...skuRows.map((r) => r.stok))
      const minStock = Math.min(...skuRows.map((r) => r.stok))
      const lastStock = skuRows[skuRows.length - 1].stok

      conflictDetails = {
        hasConflict: true,
        selectedResolution: resolutionToUse,
        customStock,
        options: [
          { label: `Total Semua Baris (Jumlahkan: ${sumStock} unit)`, value: 'sum', stock: sumStock },
          { label: `Pakai Baris Terakhir (${lastStock} unit)`, value: 'keep_last', stock: lastStock },
          { label: `Pakai Stok Terbanyak (${maxStock} unit)`, value: 'max', stock: maxStock },
          { label: `Pakai Stok Terendah (${minStock} unit)`, value: 'min', stock: minStock },
          { label: 'Lewati SKU ini (jangan ubah stok)', value: 'skip', stock: currentWebStock },
        ],
      }
    }

    previewItems.push({
      id: `item-${itemIndex}`,
      sku: displaySku,
      sourceTitle: firstRow.tipe,
      sourceBrand: firstRow.merk || '—',
      sourceCategory: firstRow.kategori || '—',
      sourceRows: skuRows,
      excelStock,
      externalWarehouseStock,
      currentWebStock,
      unreconciledWebQuantity,
      activeWebOrders: activeOrdersForThisItem,
      finalStock,
      diff,
      status,
      statusMessage,
      targetType,
      targetId,
      parentProductId,
      matchedName,
      conflictDetails,
    })
  }

  // 5. Process rows where no SKU could be extracted
  for (const row of rowsWithoutSku) {
    itemIndex++
    previewItems.push({
      id: `item-nosku-${itemIndex}`,
      sku: '—',
      sourceTitle: row.tipe,
      sourceBrand: row.merk || '—',
      sourceCategory: row.kategori || '—',
      sourceRows: [row],
      excelStock: row.stok,
      externalWarehouseStock: row.gudangLuar,
      currentWebStock: 0,
      unreconciledWebQuantity: 0,
      activeWebOrders: [],
      finalStock: 0,
      diff: 0,
      status: 'invalid',
      statusMessage: 'Tidak ditemukan pola SKU/MTM dalam tanda kurung pada nama tipe barang.',
      targetType: null,
      targetId: null,
      matchedName: null,
    })
  }

  // Summary counts
  const matched = previewItems.filter((i) => i.status === 'match').length
  const notFound = previewItems.filter((i) => i.status === 'not_found').length
  const conflicts = previewItems.filter((i) => i.status === 'duplicate_conflict').length
  const needsReview = previewItems.filter((i) => i.status === 'needs_review' || i.status === 'ambiguous' || i.status === 'invalid').length

  const totalCurrentStock = previewItems.filter((i) => i.targetId).reduce((acc, i) => acc + i.currentWebStock, 0)
  const totalFinalStock = previewItems.filter((i) => i.targetId && i.status === 'match').reduce((acc, i) => acc + i.finalStock, 0)
  const totalDiff = totalFinalStock - totalCurrentStock

  const activeOrderIds = new Set<string>()
  for (const list of variantActiveOrders.values()) {
    for (const item of list) activeOrderIds.add(item.orderId)
  }
  for (const list of productActiveOrders.values()) {
    for (const item of list) activeOrderIds.add(item.orderId)
  }
  const activeWebOrdersCount = activeOrderIds.size

  return {
    fileNames,
    totalRows: rows.length,
    items: previewItems,
    summary: {
      totalProcessed: previewItems.length,
      matched,
      notFound,
      conflicts,
      needsReview,
      totalCurrentStock,
      totalFinalStock,
      totalDiff,
    },
    activeWebOrdersCount,
    reconciliationMode: onlineOrdersAccounted ? 'already_accounted' : 'not_accounted',
    includeExternalWarehouse: effectiveStockMode === 'combined',
    stockSourceMode: effectiveStockMode,
    isDuplicateFile,
    lastSync,
  }
}

/**
 * Generates an official Excel template for stock synchronization.
 * If isDummy is true, populates fictional dummy rows (never real office data).
 */
export async function generateStockSyncTemplate(isDummy = false): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Next Solution Store'
  workbook.lastModifiedBy = 'Next Solution Store'
  workbook.created = new Date()
  workbook.modified = new Date()

  const worksheet = workbook.addWorksheet('Stok Toko', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  worksheet.columns = [
    { header: 'SKU/MTM', key: 'sku', width: 22 },
    { header: 'Nama Produk', key: 'name', width: 36 },
    { header: 'Kategori', key: 'category', width: 16 },
    { header: 'Merk', key: 'brand', width: 16 },
    { header: 'Stok', key: 'stock', width: 12 },
    { header: 'GudangLuar', key: 'external', width: 14 },
    { header: 'Catatan', key: 'notes', width: 30 },
  ]

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.height = 28
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7C5CFC' }, // Brand Violet
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'medium', color: { argb: 'FF4F46E5' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    }
  })

  if (isDummy) {
    const dummyRows = [
      {
        sku: 'DEMO-LP-001',
        name: 'Laptop Slim 14 Demo Intel i5/8GB/512GB (Grey)',
        category: 'Laptop',
        brand: 'DemoBrand',
        stock: 12,
        external: 0,
        notes: 'Stok toko reguler',
      },
      {
        sku: 'DEMO-LP-002',
        name: 'Laptop Slim 14 Demo Intel i7/16GB/1TB (Silver)',
        category: 'Laptop',
        brand: 'DemoBrand',
        stock: 5,
        external: 2,
        notes: 'Ada cadangan di gudang luar',
      },
      {
        sku: 'DEMO-PC-001',
        name: 'Desktop Tower Demo AMD Ryzen 5/16GB/512GB',
        category: 'Desktop',
        brand: 'DemoBrand',
        stock: 8,
        external: 0,
        notes: 'Unit display dan rak',
      },
      {
        sku: 'DEMO-AIO-001',
        name: 'All-in-One 24 Demo Intel i3/8GB/512GB',
        category: 'AIO',
        brand: 'DemoBrand',
        stock: 4,
        external: 0,
        notes: 'Stok siap jual',
      },
      {
        sku: 'DEMO-MN-001',
        name: 'Monitor 24 Demo IPS 100Hz Borderless',
        category: 'Monitor',
        brand: 'DemoBrand',
        stock: 20,
        external: 10,
        notes: 'Stok melimpah',
      },
    ]

    for (const d of dummyRows) {
      worksheet.addRow(d)
    }

    // Style data rows
    for (let i = 2; i <= dummyRows.length + 1; i++) {
      const row = worksheet.getRow(i)
      row.height = 20
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 9 }
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 1 || colNumber === 5 || colNumber === 6 ? 'center' : 'left',
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        }
      })
    }
  }

  const rawBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(rawBuffer)
}

