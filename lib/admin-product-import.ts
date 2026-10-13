import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { normalizeLaptopSpecKey } from '@/lib/product-specifications'

export type ImportedVariant = { sku: string; color: string; ram: string; storage: string; price: number | null; discount_price: number | null; stock: number }
export type PriceCandidate = { column: string; raw: string; amount: number | null }
export const MAX_IMPORT_PRICE = 9999999999.99
export type ImportedProduct = {
  name: string; sku: string; description: string; price: number; discount_price: number | null; stock: number
  category: string; brand: string; status: 'published' | 'draft' | 'archived'; is_best_seller: boolean; is_new_arrival: boolean
  image_url: string; specifications: { key: string; value: string; display_order: number }[]; variants: ImportedVariant[]
  sourceRow?: number; warnings?: string[]; errors?: string[]; priceCandidates?: PriceCandidate[]; discountCandidates?: PriceCandidate[]
  priceConfirmed?: boolean; discountPriceConfirmed?: boolean; selectedPriceColumn?: string; selectedDiscountColumn?: string | 'none'
  importAction?: 'create' | 'update' | 'skip'; targetProductId?: string; duplicateInFile?: boolean; duplicateInDatabase?: boolean
}

const headers = ['product_name','sku','description','price','discount_price','stock','category','brand','status','is_best_seller','is_new_arrival','image_url','specifications','color','ram','storage','variant_sku','variant_price','variant_discount_price','variant_stock'] as const
const aliases: Record<string, string> = {
  product_name:'product_name', name:'product_name', nama:'product_name', nama_produk:'product_name', produk:'product_name',
  model:'product_name', model_name:'product_name', tipe:'product_name', nama_tipe:'product_name',
  sku:'sku', product_sku:'sku', parent_sku:'sku', sku_induk:'sku', parent_product_sku:'sku', parent_code:'sku', kode_induk:'sku',
  description:'description', deskripsi:'description',
  price:'price', harga:'price', discount_price:'promo_price', harga_diskon:'promo_price',
  stock:'stock', stok:'stock', category:'category', kategori:'category', brand:'brand', merek:'brand', merk:'brand',
  status:'status', is_best_seller:'is_best_seller', best_seller:'is_best_seller', is_new_arrival:'is_new_arrival', new_arrival:'is_new_arrival',
  image_url:'image_url', foto:'image_url', url_foto:'image_url', specifications:'specifications', specification:'specifications', spesifikasi:'specifications', deskripsi_spesifikasi:'specifications',
  color:'color', warna:'color', colour:'color', color_variant:'color', warna_varian:'color',
  ram:'ram', ram_varian:'ram', ram_variant:'ram', memory:'ram', memory_size:'ram', ram_size:'ram',
  storage:'storage', penyimpanan:'storage', storage_variant:'storage', storage_varian:'storage', rom:'storage', rom_varian:'storage',
  variant_sku:'variant_sku', sku_varian:'variant_sku', mtm_varian:'variant_sku', part_number_variant:'variant_sku', pn_variant:'variant_sku',
  variant_price:'variant_price', harga_varian:'variant_price', variant_discount_price:'variant_discount_price', harga_diskon_varian:'variant_discount_price',
  variant_stock:'variant_stock', stok_varian:'variant_stock', type:'product_name', mtm:'sku', keterangan:'remarks',
  part_number:'sku', part_no:'sku', p_n:'sku', kode_produk:'sku', kode_barang:'sku',
  old_price:'ignored_price', old_price_user:'ignored_price', old_price_dealer:'ignored_price', harga_lama:'ignored_price', old_user_price:'ignored_price',
  new_price_user:'new_price_user', new_user_price:'new_price_user', user_price:'user_price', srp:'srp', harga_user:'user_price', user_srp:'srp', new_price_user_srp:'new_price_user', srp_user:'new_price_user',
  new_price:'unclassified_price', harga_jual:'promo_price',
  processor:'processor', prosesor:'processor', cpu:'processor', processor_type:'processor', cpu_model:'processor', graphics:'graphics', graphics_card:'graphics', gpu:'graphics', gpu_model:'graphics', vga:'graphics', memory_type:'ram', display:'display', display_size:'display', screen_size:'display', layar:'display', os:'os', operating_system:'os', warranty:'warranty', warranty_period:'warranty', garansi:'warranty', storage_type:'storage', storage_capacity:'storage',
}
export const cleanImportHeader = (v: string) => v.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const text = (v: unknown) => String(v ?? '').trim()

export const KNOWN_COLORS = [
  'luna grey', 'cloud grey', 'arctic grey', 'storm grey', 'slate grey', 'platinum grey', 'mineral grey', 'iron grey',
  'luna gray', 'cloud gray', 'arctic gray', 'storm gray', 'slate gray', 'platinum gray', 'mineral gray', 'iron gray',
  'abyss blue', 'ponder blue', 'quiet blue', 'mist blue', 'denim blue', 'navy blue', 'bleu', 'royal blue',
  'shadow black', 'phantom black', 'onyx black', 'obsidian black', 'jet black', 'nightfall black', 'graphite black', 'indie black', 'off black',
  'pure white', 'glacier white', 'ceramic white', 'pearl white', 'moonlight white',
  'terra cotta', 'terracotta', 'rose gold', 'sunset pink', 'almond', 'natural silver', 'transparent silver',
  'mecha gray', 'mecha grey', 'eclipse gray', 'eclipse grey', 'jaeger gray', 'jaeger grey', 'mica silver', 'dark teal', 'pine green', 'forest green',
  'grey', 'gray', 'black', 'white', 'silver', 'blue', 'red', 'gold', 'green', 'pink', 'teal',
  'abu-abu', 'abu abu', 'hitam', 'putih', 'perak', 'biru', 'emas', 'merah', 'hijau', 'cokelat'
]

export function extractColorAndBaseModel(rawName: string): { baseModel: string; color: string } {
  let cleaned = rawName.trim()
  cleaned = cleaned.replace(/\s*\([A-Za-z0-9_-]+\)\s*$/, '').trim()

  const sepMatch = cleaned.match(/\s*[-–—/]\s*([^–—/-]+)$/)
  if (sepMatch) {
    const candidate = sepMatch[1].trim()
    const candidateLower = candidate.toLowerCase()
    if (KNOWN_COLORS.some((c) => candidateLower === c || candidateLower.startsWith(c) || candidateLower.endsWith(c))) {
      const baseModel = cleaned.slice(0, sepMatch.index).trim()
      if (baseModel.length >= 3) {
        return { baseModel, color: candidate }
      }
    }
  }

  const parenMatch = rawName.match(/\s*\(([^)]+)\)\s*$/)
  if (parenMatch) {
    const candidate = parenMatch[1].trim()
    const candidateLower = candidate.toLowerCase()
    if (KNOWN_COLORS.some((c) => candidateLower === c || candidateLower.startsWith(c) || candidateLower.endsWith(c))) {
      const baseModel = rawName.slice(0, parenMatch.index).trim()
      if (baseModel.length >= 3) {
        return { baseModel, color: candidate }
      }
    }
  }

  return { baseModel: cleaned, color: '' }
}

export function findColorInDescription(desc: string): string {
  if (!desc) return ''
  for (const part of desc.split(/[/|;\n]+/)) {
    const trimmed = part.trim()
    const lower = trimmed.toLowerCase()
    if (KNOWN_COLORS.some((c) => lower === c)) {
      return trimmed
    }
  }
  return ''
}

export function findCommonPrefix(strs: string[]): string {
  if (!strs.length) return ''
  let prefix = strs[0]
  for (let i = 1; i < strs.length; i++) {
    while (!strs[i].startsWith(prefix)) {
      prefix = prefix.slice(0, prefix.length - 1)
      if (!prefix) return ''
    }
  }
  return prefix
}

/** Parses Indonesian and international number formatting without guessing decimal meaning. */
export function parseImportMoney(value: string): number | null {
  const raw = value.trim().replace(/^(rp|idr)\s*/i, '').replace(/\s/g, '')
  if (!raw) return null
  if (!/^[+-]?[\d.,]+$/.test(raw)) return null
  let normalized = raw
  if (raw.includes('.') && raw.includes(',')) normalized = raw.lastIndexOf(',') > raw.lastIndexOf('.') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '')
  else if (raw.includes(',') || raw.includes('.')) {
    const separator = raw.includes(',') ? ',' : '.'
    const parts = raw.split(separator)
    normalized = parts.slice(1).every((part) => part.length === 3) ? parts.join('') : (parts.length === 2 ? `${parts[0]}.${parts[1]}` : parts.join(''))
  }
  const n = Number(normalized)
  return Number.isFinite(n) && n >= 0 ? n : null
}
export function isValidImportPrices(price: number, discountPrice: number | null): boolean {
  return Number.isFinite(price) && price > 0 && price <= MAX_IMPORT_PRICE && (discountPrice === null || (Number.isFinite(discountPrice) && discountPrice > 0 && discountPrice <= MAX_IMPORT_PRICE && discountPrice < price))
}
export function hasConfirmedImportPriceMapping(product: Pick<ImportedProduct, 'price' | 'discount_price' | 'priceCandidates' | 'discountCandidates' | 'priceConfirmed' | 'discountPriceConfirmed' | 'selectedPriceColumn' | 'selectedDiscountColumn'>): boolean {
  const mainConfirmed = product.priceConfirmed === true && Boolean(product.selectedPriceColumn) && product.priceCandidates?.some((candidate) => candidate.column === product.selectedPriceColumn && candidate.amount === product.price)
  const promoConfirmed = product.discountPriceConfirmed === true && (product.selectedDiscountColumn === 'none'
    ? product.discount_price === null
    : Boolean(product.selectedDiscountColumn) && product.discountCandidates?.some((candidate) => candidate.column === product.selectedDiscountColumn && candidate.amount === product.discount_price))
  return Boolean(mainConfirmed && promoConfirmed)
}
function money(value: string, label: string, row: number, optional = false): number | null {
  if (!value && optional) return null
  const n = parseImportMoney(value)
  if (n === null) throw new Error(`Baris ${row}: ${label} tidak terbaca sebagai harga.`)
  return n
}
function integer(value: string, label: string, row: number, optional = false): number | null {
  if (!value && optional) return null
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) throw new Error(`Baris ${row}: ${label} harus bilangan bulat nol atau lebih.`)
  return n
}
const bool = (v: string) => ['true','1','yes','ya','iya','on'].includes(v.trim().toLowerCase())

export type ImportTable = { rows: string[][]; source: string }
export function importTablesFromWorkbook(workbook: ExcelJS.Workbook): ImportTable[] {
  return workbook.worksheets.map((sheet) => {
    const rows: string[][] = []
    sheet.eachRow({ includeEmpty: false }, (row) => rows.push(Array.from({ length: row.cellCount }, (_, index) => row.getCell(index + 1).text)))
    return { rows, source: `XLSX/${sheet.name}` }
  })
}

/**
 * Safely loads an XLSX buffer into an ExcelJS.Workbook, handling:
 * - Empty or truncated files
 * - SpreadsheetML XML namespace prefixes (e.g. <x:workbook>, <x:sheets>, <x:sheet>)
 * - Absolute worksheet relationship targets (e.g. Target="/xl/tables/table1.xml")
 */
export async function loadExcelWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  if (!buffer || buffer.length === 0) {
    throw new Error('File Excel kosong atau tidak memiliki data.')
  }

  // Attempt standard ExcelJS load first
  try {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer as never)
    if (wb.worksheets.length > 0) {
      return wb
    }
  } catch {
    // If standard load fails, proceed to OpenXML namespace / path normalization
  }

  // Preprocess and normalize OpenXML zip package
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    throw new Error('File Excel (XLSX) rusak atau tidak valid.')
  }

  const entries = Object.keys(zip.files)
  if (!entries.some((name) => name.includes('xl/'))) {
    throw new Error('File bukan merupakan dokumen Excel XLSX yang valid.')
  }

  let modified = false
  for (const [filename, file] of Object.entries(zip.files)) {
    if (filename.endsWith('.xml') || filename.endsWith('.rels')) {
      const xml = await file.async('string')
      let cleaned = xml

      // 1. Strip XML namespace prefixes for spreadsheetml (e.g. <x: or </x:)
      if (cleaned.includes('<x:') || cleaned.includes('</x:')) {
        cleaned = cleaned.replace(/<x:/g, '<').replace(/<\/x:/g, '</')
        modified = true
      }

      // 2. In worksheet rels, table targets must be relative (e.g. Target="../tables/table1.xml")
      if (filename.includes('worksheets/_rels/')) {
        if (cleaned.includes('Target="/xl/tables/')) {
          cleaned = cleaned.replace(/Target="\/xl\/tables\//g, 'Target="../tables/')
          modified = true
        }
      }

      // 3. In workbook.xml.rels, ensure targets are clean relative to xl/
      if (filename.includes('workbook.xml.rels')) {
        if (cleaned.includes('Target="/xl/')) {
          cleaned = cleaned.replace(/Target="\/xl\//g, 'Target="')
          modified = true
        }
      }

      if (cleaned !== xml) {
        zip.file(filename, cleaned)
      }
    }
  }

  const cleanBuf = modified ? await zip.generateAsync({ type: 'nodebuffer' }) : buffer
  const normalizedWb = new ExcelJS.Workbook()
  try {
    await normalizedWb.xlsx.load(cleanBuf as never)
  } catch (err) {
    throw new Error(
      `File Excel gagal dibaca: ${err instanceof Error ? err.message : 'Struktur workbook tidak didukung.'}`
    )
  }

  if (normalizedWb.worksheets.length === 0) {
    throw new Error('File Excel tidak memiliki worksheet yang berisi data.')
  }

  return normalizedWb
}

export async function generateProductImportExcelTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Next Solution Store'
  const sheet = workbook.addWorksheet('Data Produk', {
    views: [{ state: 'frozen', ySplit: 1 }]
  })

  sheet.columns = [
    { header: 'product_name', key: 'product_name', width: 32 },
    { header: 'sku', key: 'sku', width: 20 },
    { header: 'description', key: 'description', width: 45 },
    { header: 'price', key: 'price', width: 16, style: { numFmt: '#,##0' } },
    { header: 'discount_price', key: 'discount_price', width: 16, style: { numFmt: '#,##0' } },
    { header: 'stock', key: 'stock', width: 12, style: { numFmt: '0' } },
    { header: 'category', key: 'category', width: 18 },
    { header: 'brand', key: 'brand', width: 18 },
    { header: 'status', key: 'status', width: 14 },
    { header: 'is_best_seller', key: 'is_best_seller', width: 14 },
    { header: 'is_new_arrival', key: 'is_new_arrival', width: 14 },
    { header: 'image_url', key: 'image_url', width: 35 },
    { header: 'specifications', key: 'specifications', width: 50 },
    { header: 'color', key: 'color', width: 15 },
    { header: 'ram', key: 'ram', width: 15 },
    { header: 'storage', key: 'storage', width: 18 },
    { header: 'variant_sku', key: 'variant_sku', width: 20 },
    { header: 'variant_price', key: 'variant_price', width: 16, style: { numFmt: '#,##0' } },
    { header: 'variant_discount_price', key: 'variant_discount_price', width: 16, style: { numFmt: '#,##0' } },
    { header: 'variant_stock', key: 'variant_stock', width: 14, style: { numFmt: '0' } },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  }
  headerRow.height = 24
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

  const rawBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer)
}

export function markImportSkuConflicts(products: ImportedProduct[], existingBySku: Map<string, string>): ImportedProduct[] {
  const first = new Set<string>()
  const fileSkuOccurrences = new Map<string, ImportedProduct[]>()
  for (const product of products) {
    const key = product.sku.trim().toLowerCase()
    for (const importedSku of [product.sku, ...product.variants.map((variant) => variant.sku)]) {
      const normalized = importedSku.trim().toLowerCase()
      if (normalized) fileSkuOccurrences.set(normalized, [...(fileSkuOccurrences.get(normalized) ?? []), product])
    }
    if (existingBySku.has(key)) { product.duplicateInDatabase = true; product.targetProductId = existingBySku.get(key); product.importAction = 'skip'; product.warnings = [...(product.warnings ?? []), 'SKU sudah ada di database; pilih update atau skip secara eksplisit.'] }
    for (const variant of product.variants) {
      const varKey = variant.sku.trim().toLowerCase()
      if (varKey && existingBySku.has(varKey)) {
        const ownerId = existingBySku.get(varKey)
        if (!product.targetProductId || ownerId !== product.targetProductId) {
          product.duplicateInDatabase = true
          product.importAction = 'skip'
          product.warnings = [...(product.warnings ?? []), `SKU varian ${variant.sku} sudah ada di database.`]
        }
      }
    }
    if (key && first.has(key)) { product.duplicateInFile = true; product.importAction = 'skip'; product.warnings = [...(product.warnings ?? []), 'SKU duplikat di dalam file; baris ini perlu ditinjau.'] }
    else if (key) first.add(key)
  }
  for (const [sku, owners] of fileSkuOccurrences) if (owners.length > 1) {
    for (const product of new Set(owners)) {
      product.duplicateInFile = true
      product.importAction = 'skip'
      product.warnings = [...(product.warnings ?? []), `SKU ${sku} dipakai lebih dari sekali dalam produk/varian file.`]
    }
  }
  return products
}
const normalizeSpecKey = (key: string) => normalizeLaptopSpecKey(key) ?? text(key)
function extractSpecs(source: string): { key: string; value: string; display_order: number }[] {
  const result: { key: string; value: string; display_order: number }[] = []
  for (const part of source.split(/[;\n|]+/)) {
    const match = part.match(/^\s*([^:=]{2,40})\s*[:=]\s*(.+?)\s*$/)
    if (match) result.push({ key: normalizeSpecKey(match[1]), value: match[2], display_order: result.length })
  }
  return result
}

function detectHeader(rows: string[][]): { index: number; columns: string[]; vendor: 'lenovo' | 'legacy' } | null {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const columns = rows[i].map((cell) => aliases[cleanImportHeader(cell)] ?? '')
    const keys = new Set(columns)
    if ((keys.has('sku') && (keys.has('price') || keys.has('new_price_user') || keys.has('user_price') || keys.has('srp') || keys.has('promo_price') || keys.has('unclassified_price'))) && (keys.has('product_name') || keys.has('description'))) {
      const rawHeaders = rows[i].map(cleanImportHeader)
      const isLenovo = (rawHeaders.includes('type') && rawHeaders.includes('mtm')) || keys.has('new_price_user') || keys.has('user_price') || keys.has('srp') || keys.has('unclassified_price')
      return { index: i, columns, vendor: isLenovo ? 'lenovo' : 'legacy' }
    }
  }
  return null
}

export type ImportSheetSummary = {
  totalTables: number
  detectedSheets: { name: string; productCount: number; vendor: 'lenovo' | 'legacy' }[]
  skippedSheets: { name: string; reason: string }[]
}

export type ImportNormalizationResult = {
  products: ImportedProduct[]
  sheetSummary: ImportSheetSummary
}

export function analyzeAndNormalizeImportTables(tables: ImportTable[]): ImportNormalizationResult {
  const totalRows = tables.reduce((sum, table) => sum + table.rows.length, 0)
  if (totalRows > 2001) throw new Error('File terlalu banyak baris. Maksimal 2.000 baris data.')
  const result = new Map<string, ImportedProduct>()
  let productRows = 0
  const detectedSheets: { name: string; productCount: number; vendor: 'lenovo' | 'legacy' }[] = []
  const skippedSheets: { name: string; reason: string }[] = []

  for (const table of tables) {
    const rawSheetName = table.source.replace(/^XLSX\//, '').replace(/^DOCX\//, '').replace(/^PDF\//, '')
    if (table.rows.length === 0) {
      skippedSheets.push({ name: rawSheetName, reason: 'Worksheet kosong tanpa data baris.' })
      continue
    }

    const header = detectHeader(table.rows)
    if (!header) {
      const lower = rawSheetName.toLowerCase()
      let reason = 'Header produk tidak ditemukan (kolom SKU/MTM, harga, atau nama produk tidak teridentifikasi).'
      if (lower.includes('petunjuk') || lower.includes('panduan')) {
        reason = 'Worksheet petunjuk atau panduan penggunaan (bukan data produk).'
      } else if (lower.includes('audit') || lower.includes('sumber')) {
        reason = 'Worksheet audit sumber atau log data (bukan format produk yang dapat diimpor).'
      } else if (lower.includes('review') || lower.includes('perlu')) {
        reason = 'Worksheet daftar produk yang perlu ditinjau (kolom review internal, bukan format impor produk).'
      }
      skippedSheets.push({ name: rawSheetName, reason })
      continue
    }

    const initialCount = result.size
    if (header.vendor === 'legacy') {
      const legacyProducts = normalizeProductRows(table.rows)
      productRows += table.rows.slice(header.index + 1).filter((row) => row.some((cell) => text(cell))).length
      for (const product of legacyProducts) {
        let key = product.sku ? product.sku.toLowerCase() : `${product.name.toLowerCase()}|${product.brand.toLowerCase()}`
        if (result.has(key) && product.variants.length > 0) {
          const varSku = product.variants[0]?.sku || ''
          product.sku = `${product.sku}-${varSku.slice(-4).toUpperCase()}`
          key = product.sku.toLowerCase()
        }
        if (result.has(key)) {
          const existing = result.get(key)!
          existing.duplicateInFile = true
          existing.warnings = [...(existing.warnings ?? []), `SKU produk muncul pada beberapa tabel (${table.source}); baris tambahan dilewati.`]
        } else result.set(key, product)
      }
      const added = result.size - initialCount
      detectedSheets.push({ name: rawSheetName, productCount: added, vendor: 'legacy' })
      continue
    }

    type RawVendorRow = {
      rowNumber: number
      rawName: string
      baseModel: string
      sku: string
      brand: string
      category: string
      status: ImportedProduct['status']
      isBestSeller: boolean
      isNewArrival: boolean
      imageUrl: string
      sourceDescription: string
      specs: { key: string; value: string; display_order: number }[]
      color: string
      ram: string
      storage: string
      processor: string
      display: string
      os: string
      price: number
      discountPrice: number | null
      stock: number
      candidates: PriceCandidate[]
      discountCandidates: PriceCandidate[]
      warnings: string[]
      errors: string[]
    }

    const rawRows: RawVendorRow[] = []
    // temporary debug


    for (let index = header.index + 1; index < table.rows.length; index++) {
      const values = table.rows[index]
      const r: Record<string, string> = {}
      header.columns.forEach((column, i) => { if (column && r[column] === undefined) r[column] = text(values[i]) })
      if (!Object.values(r).some(Boolean)) continue
      productRows++
      const sku = r.sku ?? ''
      const name = r.product_name ?? ''
      const isLenovo = header.vendor === 'lenovo'
      const mainFields = isLenovo ? ['new_price_user', 'user_price', 'srp'] : ['price']
      const candidates = mainFields.filter((field) => r[field]).map((field) => ({ column: field === 'price' ? 'price' : field === 'srp' ? 'SRP' : field === 'user_price' ? 'Harga User' : 'NEW PRICE USER', raw: r[field], amount: parseImportMoney(r[field]) }))
      const discountColumnIndex = header.columns.findIndex((field) => field === 'promo_price')
      const discountHeader = discountColumnIndex >= 0 ? cleanImportHeader(table.rows[header.index][discountColumnIndex]) : ''
      const discountLabel = discountHeader === 'harga_jual' ? 'HARGA JUAL (konfirmasi sebagai promo)' : 'Harga Promo/Discount'
      const discountCandidates = ['promo_price'].filter((field) => r[field]).map(() => ({ column: discountLabel, raw: r.promo_price, amount: parseImportMoney(r.promo_price) }))
      const chosen = candidates[0]
      const sourceDescription = [r.description, r.specifications, r.remarks].filter(Boolean).join('\n')
      const specs = extractSpecs([r.description, r.specifications].filter(Boolean).join('\n'))
      if (isLenovo) header.columns.forEach((column, col) => {
        const value = text(values[col])
        if (value && ['processor', 'graphics', 'ram', 'display', 'os', 'warranty', 'storage'].includes(column)) specs.push({ key: normalizeSpecKey(column), value, display_order: specs.length })
      })
      const rowNumber = index + 1
      const warnings: string[] = []
      const errors: string[] = []
      if (!name) errors.push('Nama produk / TYPE belum terisi.')
      if (!sku) errors.push('SKU / MTM belum terisi.')
      if (!sourceDescription) warnings.push('Deskripsi sumber kosong.')
      if (!candidates.length) errors.push(isLenovo ? 'Harga utama USER/SRP tidak ditemukan; OLD PRICE dan NEW PRICE tanpa label USER diabaikan.' : 'Tidak ada harga sumber yang terbaca.')
      if (chosen?.amount !== null && chosen?.amount !== undefined && chosen.amount <= 0) errors.push('Harga utama harus lebih besar dari nol.')
      if (chosen?.amount != null && chosen.amount > MAX_IMPORT_PRICE) errors.push('Harga utama melebihi batas field price di database.')
      if (r.unclassified_price) warnings.push('Kolom NEW PRICE tanpa label USER tidak digunakan sebagai harga utama.')
      if (candidates.some((candidate) => candidate.amount === null)) warnings.push('Harga utama tidak terbaca; periksa nilai sumber.')
      if (discountCandidates.some((candidate) => candidate.amount === null || candidate.amount <= 0 || (chosen?.amount != null && candidate.amount >= chosen.amount))) warnings.push('Harga promo harus valid, lebih besar dari nol, dan di bawah harga utama; perbaiki atau pilih tanpa promo.')
      if (specs.length === 0) warnings.push('Spesifikasi belum terbaca sebagai pasangan key-value.')

      const { baseModel, color: nameColor } = extractColorAndBaseModel(name)
      const color = nameColor || findColorInDescription(sourceDescription) || (r.remarks && findColorInDescription(r.remarks)) || ''
      const specRam = specs.find((s) => s.key.toLowerCase().includes('ram') || s.key.toLowerCase().includes('memory'))?.value || ''
      const specStorage = specs.find((s) => s.key.toLowerCase().includes('storage') || s.key.toLowerCase().includes('penyimpanan'))?.value || ''
      const specProc = specs.find((s) => s.key.toLowerCase().includes('processor') || s.key.toLowerCase().includes('cpu'))?.value || ''
      const specDisp = specs.find((s) => s.key.toLowerCase().includes('display') || s.key.toLowerCase().includes('layar'))?.value || ''
      const specOs = specs.find((s) => s.key.toLowerCase().includes('os'))?.value || ''

      rawRows.push({
        rowNumber,
        rawName: name,
        baseModel: baseModel || name,
        sku,
        brand: r.brand || (isLenovo ? 'Lenovo' : ''),
        category: r.category ?? '',
        status: (r.status || 'draft').toLowerCase() as ImportedProduct['status'],
        isBestSeller: bool(r.is_best_seller ?? ''),
        isNewArrival: bool(r.is_new_arrival ?? ''),
        imageUrl: r.image_url ?? '',
        sourceDescription,
        specs,
        color,
        ram: specRam,
        storage: specStorage,
        processor: specProc,
        display: specDisp,
        os: specOs,
        price: chosen?.amount ?? 0,
        discountPrice: discountCandidates[0]?.amount && chosen?.amount && discountCandidates[0].amount < chosen.amount ? discountCandidates[0].amount : null,
        stock: integer(r.stock ?? '0', 'Stok', rowNumber) ?? 0,
        candidates,
        discountCandidates,
        warnings,
        errors,
      })
    }

    // Group raw rows by Brand, Category, BaseModel, Processor family, and Display size
    const rowGroups = new Map<string, RawVendorRow[]>()
    for (const item of rawRows) {
      const procMatch = item.processor.match(/\b(core\s+(?:ultra\s+)?\w+|i[3579]-?\w+|ryzen\s+\w+|snapdragon\s+\w+|celeron\s+\w+|pentium\s+\w+|athlon\s+\w+|n\d+)\b/i)
      const procKey = procMatch ? procMatch[1].toLowerCase().replace(/\s+/g, '') : item.processor.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)
      const dispMatch = item.display.match(/\b(\d+(?:\.\d+)?)\s*(?:["']|inch|inci)?/i)
      const dispKey = dispMatch ? dispMatch[1] : ''
      const groupKey = `${item.brand.toLowerCase()}|${item.category.toLowerCase()}|${item.baseModel.toLowerCase()}|${procKey}|${dispKey}`
      rowGroups.set(groupKey, [...(rowGroups.get(groupKey) ?? []), item])
    }

    let vendorSheetAdded = 0
    for (const group of rowGroups.values()) {
      if (group.length === 1) {
        // Standalone product
        const item = group[0]
        const key = item.sku ? item.sku.toLowerCase() : `row:${table.source}:${item.rowNumber}`
        const existing = result.get(key)
        if (existing) {
          existing.duplicateInFile = true
          existing.warnings = [...(existing.warnings ?? []), `SKU duplikat ditemukan dalam file (${table.source}, baris ${item.rowNumber}).`]
          continue
        }
        result.set(key, {
          name: item.rawName || item.sku,
          sku: item.sku,
          description: item.sourceDescription || item.rawName || item.sku,
          price: item.price,
          discount_price: null,
          stock: item.stock,
          category: item.category,
          brand: item.brand,
          status: item.status,
          is_best_seller: item.isBestSeller,
          is_new_arrival: item.isNewArrival,
          image_url: item.imageUrl,
          specifications: item.specs,
          variants: [],
          sourceRow: item.rowNumber,
          warnings: item.warnings,
          errors: item.errors,
          priceCandidates: item.candidates,
          discountCandidates: item.discountCandidates,
          priceConfirmed: false,
          discountPriceConfirmed: false,
          importAction: 'create',
        })
        vendorSheetAdded++
      } else {
        // Multi-variant parent product
        const first = group[0]
        const allSkus = group.map((g) => g.sku).filter(Boolean)
        const commonPrefix = findCommonPrefix(allSkus)
        const cleanSlug = first.baseModel.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')
        const procMatch = first.processor.match(/\b(core\s+(?:ultra\s+)?\w+|i[3579]-?\w+|ryzen\s+\w+|snapdragon\s+\w+|celeron\s+\w+|pentium\s+\w+|athlon\s+\w+|n\d+)\b/i)
        const procSuffix = procMatch ? `-${procMatch[1].toUpperCase().replace(/[^A-Z0-9]+/g, '')}` : ''
        let parentSku = commonPrefix.length >= 3
          ? `${commonPrefix.slice(0, 4)}-${cleanSlug}${procSuffix}`
          : `${(first.brand || 'PRD').toUpperCase().replace(/[^A-Z0-9]+/g, '')}-${cleanSlug}${procSuffix}`

        let key = parentSku.toLowerCase()
        if (result.has(key)) {
          parentSku = `${parentSku}-${first.sku.slice(-4).toUpperCase()}`
          key = parentSku.toLowerCase()
        }

        const procTag = procMatch && !first.baseModel.toLowerCase().includes(procMatch[1].toLowerCase())
          ? ` (${procMatch[1].toUpperCase()})`
          : ''
        const parentName = `${first.baseModel || first.rawName}${procTag}`

        const minPrice = Math.min(...group.map((g) => g.price))
        const totalStock = group.reduce((sum, g) => sum + g.stock, 0)

        const variants: ImportedVariant[] = []
        const usedOptions = new Set<string>()
        const usedVariantSkus = new Set<string>()
        let hasDuplicateSkuInGroup = false
        const groupWarnings: string[] = [...first.warnings]
        const groupErrors: string[] = [...first.errors]

        for (let vIdx = 0; vIdx < group.length; vIdx++) {
          const g = group[vIdx]
          if (g.sku) {
            const lowerSku = g.sku.toLowerCase()
            if (usedVariantSkus.has(lowerSku)) {
              hasDuplicateSkuInGroup = true
              groupWarnings.push(`SKU duplikat ditemukan dalam file (${g.sku}).`)
            }
            usedVariantSkus.add(lowerSku)
          }
          let color = g.color || 'Standar'
          const ram = g.ram
          const storage = g.storage
          const optKey = `${color.toLowerCase()}|${ram.toLowerCase()}|${storage.toLowerCase()}`

          if (usedOptions.has(optKey)) {
            const disambiguator = g.os ? g.os.replace(/[^A-Za-z0-9]/g, '') : `V${vIdx + 1}`
            color = `${color} (${disambiguator})`
            groupWarnings.push(`Varian ${g.sku} memiliki kombinasi warna & spesifikasi identik; label warna disesuaikan menjadi "${color}" agar tidak bentrok di database. Periksa sebelum import.`)
          }
          usedOptions.add(`${color.toLowerCase()}|${ram.toLowerCase()}|${storage.toLowerCase()}`)

          variants.push({
            sku: g.sku,
            color,
            ram,
            storage,
            price: g.price,
            discount_price: g.discountPrice,
            stock: g.stock,
          })
        }

        groupWarnings.push(`Digabungkan menjadi 1 produk induk dengan ${variants.length} varian konfigurasi/warna.`)

        const existing = result.get(key)
        if (existing) {
          existing.duplicateInFile = true
          existing.warnings = [...(existing.warnings ?? []), `SKU induk ${parentSku} duplikat dalam file; baris perlu ditinjau.`]
          continue
        }

        result.set(key, {
          name: parentName,
          sku: parentSku,
          description: first.sourceDescription || first.baseModel,
          price: minPrice,
          discount_price: null,
          stock: totalStock,
          category: first.category,
          brand: first.brand,
          status: first.status,
          is_best_seller: group.some((g) => g.isBestSeller),
          is_new_arrival: group.some((g) => g.isNewArrival),
          image_url: first.imageUrl,
          specifications: first.specs,
          variants,
          sourceRow: first.rowNumber,
          warnings: [...new Set(groupWarnings)],
          errors: [...new Set(groupErrors)],
          priceCandidates: first.candidates,
          discountCandidates: first.discountCandidates,
          priceConfirmed: false,
          discountPriceConfirmed: false,
          duplicateInFile: hasDuplicateSkuInGroup || undefined,
          importAction: 'create',
        })
        vendorSheetAdded++
      }
    }
    detectedSheets.push({ name: rawSheetName, productCount: vendorSheetAdded, vendor: 'lenovo' })
  }

  if (!productRows || !result.size) throw new Error('Header produk tidak ditemukan. Gunakan template resmi (.xlsx/.csv), atau tabel Lenovo dengan TYPE, MTM, dan kolom harga.')
  if (productRows > 2000) throw new Error('Maksimal 2.000 baris data per file.')
  if (result.size > 500) throw new Error('Maksimal 500 produk per impor.')

  return {
    products: consolidateVariantProducts([...result.values()]),
    sheetSummary: {
      totalTables: tables.length,
      detectedSheets,
      skippedSheets,
    },
  }
}

export function consolidateVariantProducts(products: ImportedProduct[]): ImportedProduct[] {
  const result: ImportedProduct[] = []
  const autoGroups = new Map<string, ImportedProduct[]>()

  for (const product of products) {
    if (product.variants.length > 0) {
      result.push(product)
      continue
    }

    const { baseModel, color: extractedColor } = extractColorAndBaseModel(product.name)
    const color = extractedColor || findColorInDescription(product.description)
    const procSpec = product.specifications.find((s) => s.key.toLowerCase().includes('processor') || s.key.toLowerCase().includes('cpu'))?.value || ''
    const dispSpec = product.specifications.find((s) => s.key.toLowerCase().includes('display') || s.key.toLowerCase().includes('layar'))?.value || ''
    const ramSpec = product.specifications.find((s) => s.key.toLowerCase().includes('ram') || s.key.toLowerCase().includes('memory'))?.value || ''
    const storageSpec = product.specifications.find((s) => s.key.toLowerCase().includes('storage') || s.key.toLowerCase().includes('penyimpanan'))?.value || ''

    if (!color && !ramSpec && !storageSpec && baseModel.toLowerCase() === product.name.trim().toLowerCase()) {
      result.push(product)
      continue
    }

    const procMatch = procSpec.match(/\b(core\s+(?:ultra\s+)?\w+|i[3579]-?\w+|ryzen\s+\w+|snapdragon\s+\w+|celeron\s+\w+|pentium\s+\w+|athlon\s+\w+|n\d+)\b/i)
    const procKey = procMatch ? procMatch[1].toLowerCase().replace(/\s+/g, '') : procSpec.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)
    const dispMatch = dispSpec.match(/\b(\d+(?:\.\d+)?)\s*(?:["']|inch|inci)?/i)
    const dispKey = dispMatch ? dispMatch[1] : ''

    const groupKey = `${(product.brand || '').toLowerCase()}|${(product.category || '').toLowerCase()}|${baseModel.toLowerCase()}|${procKey}|${dispKey}`
    autoGroups.set(groupKey, [...(autoGroups.get(groupKey) ?? []), product])
  }

  for (const group of autoGroups.values()) {
    if (group.length === 1) {
      result.push(group[0])
      continue
    }

    const first = group[0]
    const { baseModel } = extractColorAndBaseModel(first.name)
    const allSkus = group.map((p) => p.sku).filter(Boolean)
    const commonPrefix = findCommonPrefix(allSkus)
    const cleanSlug = baseModel.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')
    const procSpec = first.specifications.find((s) => s.key.toLowerCase().includes('processor') || s.key.toLowerCase().includes('cpu'))?.value || ''
    const procMatch = procSpec.match(/\b(core\s+(?:ultra\s+)?\w+|i[3579]-?\w+|ryzen\s+\w+|snapdragon\s+\w+|celeron\s+\w+|pentium\s+\w+|athlon\s+\w+|n\d+)\b/i)
    const procSuffix = procMatch ? `-${procMatch[1].toUpperCase().replace(/[^A-Z0-9]+/g, '')}` : ''
    let parentSku = commonPrefix.length >= 3
      ? `${commonPrefix.slice(0, 4)}-${cleanSlug}${procSuffix}`
      : `${(first.brand || 'PRD').toUpperCase().replace(/[^A-Z0-9]+/g, '')}-${cleanSlug}${procSuffix}`

    if (result.some((p) => p.sku.toLowerCase() === parentSku.toLowerCase())) {
      parentSku = `${parentSku}-${first.sku.slice(-4).toUpperCase()}`
    }

    const procTag = procMatch && !baseModel.toLowerCase().includes(procMatch[1].toLowerCase())
      ? ` (${procMatch[1].toUpperCase()})`
      : ''
    const parentName = `${baseModel || first.name}${procTag}`

    const minPrice = Math.min(...group.map((p) => p.price))
    const totalStock = group.reduce((sum, p) => sum + p.stock, 0)
    const variants: ImportedVariant[] = []
    const usedOptions = new Set<string>()
    const usedVariantSkus = new Set<string>()
    let hasDuplicateSkuInGroup = false
    const groupWarnings = [...(first.warnings ?? [])]

    for (let vIdx = 0; vIdx < group.length; vIdx++) {
      const p = group[vIdx]
      if (p.sku) {
        const lowerSku = p.sku.toLowerCase()
        if (usedVariantSkus.has(lowerSku)) {
          hasDuplicateSkuInGroup = true
          groupWarnings.push(`SKU duplikat ditemukan dalam file (${p.sku}).`)
        }
        usedVariantSkus.add(lowerSku)
      }
      const { color: extractedColor } = extractColorAndBaseModel(p.name)
      let color = extractedColor || findColorInDescription(p.description) || 'Standar'
      const ram = p.specifications.find((s) => s.key.toLowerCase().includes('ram') || s.key.toLowerCase().includes('memory'))?.value || ''
      const storage = p.specifications.find((s) => s.key.toLowerCase().includes('storage') || s.key.toLowerCase().includes('penyimpanan'))?.value || ''
      const optKey = `${color.toLowerCase()}|${ram.toLowerCase()}|${storage.toLowerCase()}`

      if (usedOptions.has(optKey)) {
        const osSpec = p.specifications.find((s) => s.key.toLowerCase().includes('os'))?.value || ''
        const disambiguator = osSpec ? osSpec.replace(/[^A-Za-z0-9]/g, '') : `V${vIdx + 1}`
        color = `${color} (${disambiguator})`
        groupWarnings.push(`Varian ${p.sku} memiliki kombinasi warna & spesifikasi identik; label warna disesuaikan menjadi "${color}" agar tidak bentrok di database. Periksa sebelum import.`)
      }
      usedOptions.add(`${color.toLowerCase()}|${ram.toLowerCase()}|${storage.toLowerCase()}`)

      variants.push({
        sku: p.sku,
        color,
        ram,
        storage,
        price: p.price,
        discount_price: p.discount_price,
        stock: p.stock,
      })
    }

    groupWarnings.push(`Digabungkan menjadi 1 produk induk dengan ${variants.length} varian konfigurasi/warna.`)

    result.push({
      ...first,
      name: parentName,
      sku: parentSku,
      price: minPrice,
      discount_price: group.some((p) => p.discount_price !== null) ? Math.min(...group.map((p) => p.discount_price ?? p.price)) : null,
      stock: totalStock,
      variants,
      warnings: [...new Set(groupWarnings)],
      duplicateInFile: hasDuplicateSkuInGroup || first.duplicateInFile,
    })
  }

  return result
}

export function normalizeImportTables(tables: ImportTable[]): ImportedProduct[] {
  return analyzeAndNormalizeImportTables(tables).products
}

/** Backward-compatible entry point for callers and tests using the original flat template. */
export function normalizeProductRows(rows: string[][]): ImportedProduct[] {
  const header = detectHeader(rows)
  if (!header || header.vendor !== 'legacy') return normalizeImportTables([{ rows, source: 'CSV' }])
  const products = new Map<string, ImportedProduct>()
  if (rows.length > 2001) throw new Error('File terlalu banyak baris. Maksimal 2.000 baris data.')
  for (let index = header.index + 1; index < rows.length; index++) {
    const record: Record<string, string> = {}
    header.columns.forEach((key, col) => { if (key) record[key] = text(rows[index][col]) })
    if (!Object.values(record).some(Boolean)) continue
    const row = index + 1
    const name = record.product_name ?? '', sku = record.sku ?? '', brand = record.brand ?? '', category = record.category ?? '', description = record.description ?? ''
    const key = sku ? `sku:${sku.toLowerCase()}` : `name:${name.toLowerCase()}|${brand.toLowerCase()}`
    const found = products.get(key)
    if (!name || !brand || !category || (!description && !found)) throw new Error(`Baris ${row}: nama, deskripsi, kategori, dan brand wajib diisi.`)
    const price = money(record.price ?? '', 'Harga', row, Boolean(found)) ?? found?.price ?? 0
    const discount = money(record.promo_price ?? '', 'Harga promo', row, true)
    if (discount !== null && (discount <= 0 || (price > 0 && discount >= price))) throw new Error(`Baris ${row}: harga promo harus lebih besar dari nol dan lebih rendah dari harga utama.`)
    const imageUrl = record.image_url ?? found?.image_url ?? ''
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) throw new Error(`Baris ${row}: URL foto harus menggunakan HTTPS.`)
    const status = (record.status || found?.status || 'published').toLowerCase() as ImportedProduct['status']
    if (!['published','draft','archived'].includes(status)) throw new Error(`Baris ${row}: status harus published, draft, atau archived.`)
    const legacySpecs = (record.specifications ?? '').split(/[;\n]/).map((part) => { const [k, ...v] = part.split(':'); return { key: text(k), value: text(v.join(':')), display_order: 0 } }).filter((spec) => spec.key && spec.value)
    const product = found ?? { name, sku, description: description || name, price, discount_price: discount, stock: 0, category, brand, status, is_best_seller: bool(record.is_best_seller ?? ''), is_new_arrival: bool(record.is_new_arrival ?? ''), image_url: imageUrl, specifications: legacySpecs, variants: [], priceCandidates: [{ column: 'price', raw: record.price ?? '', amount: price }], discountCandidates: record.promo_price ? [{ column: 'discount_price', raw: record.promo_price, amount: discount }] : [], priceConfirmed: false, discountPriceConfirmed: false, importAction: 'create' as const }
    if (found && (product.name !== name || product.brand.toLowerCase() !== brand.toLowerCase() || product.category.toLowerCase() !== category.toLowerCase())) throw new Error(`Baris ${row}: data produk harus konsisten di semua baris varian.`)
    const color = record.color ?? '', ram = record.ram ?? '', storage = record.storage ?? ''
    if (color || ram || storage || record.variant_stock || record.variant_sku) {
      if (!color && !ram && !storage) throw new Error(`Baris ${row}: varian harus memiliki warna, RAM, atau storage.`)
      if (product.variants.some((variant) => variant.color.toLowerCase() === color.toLowerCase() && variant.ram.toLowerCase() === ram.toLowerCase() && variant.storage.toLowerCase() === storage.toLowerCase())) throw new Error(`Baris ${row}: kombinasi varian produk ganda.`)
      const varPrice = money(record.variant_price ?? '', 'Harga varian', row, true) ?? (price > 0 ? price : null)
      const varDiscount = money(record.variant_discount_price ?? '', 'Harga diskon varian', row, true) ?? discount
      product.variants.push({
        sku: record.variant_sku ?? '',
        color,
        ram,
        storage,
        price: varPrice,
        discount_price: varDiscount,
        stock: integer(record.variant_stock ?? record.stock ?? '0', 'Stok varian', row)!
      })
      if (varPrice !== null && varPrice > 0) product.price = Math.min(product.price, varPrice)
    } else {
      product.stock = integer(record.stock ?? '0', 'Stok', row)!
    }
    if (!found) products.set(key, product)
  }
  const consolidated = consolidateVariantProducts([...products.values()])
  if (consolidated.length > 500) throw new Error('Maksimal 500 produk per impor.')
  for (const product of consolidated) if (product.variants.length > 50) throw new Error(`Produk ${product.name} memiliki lebih dari 50 varian.`)
  return consolidated
}
export const productImportHeaders = [...headers]
