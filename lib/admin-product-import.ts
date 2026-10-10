import type ExcelJS from 'exceljs'
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
  sku:'sku', product_sku:'sku', description:'description', deskripsi:'description',
  price:'price', harga:'price', discount_price:'promo_price', harga_diskon:'promo_price',
  stock:'stock', stok:'stock', category:'category', kategori:'category', brand:'brand', merek:'brand', merk:'brand',
  status:'status', is_best_seller:'is_best_seller', best_seller:'is_best_seller', is_new_arrival:'is_new_arrival', new_arrival:'is_new_arrival',
  image_url:'image_url', foto:'image_url', url_foto:'image_url', specifications:'specifications', specification:'specifications', spesifikasi:'specifications', deskripsi_spesifikasi:'specifications',
  color:'color', warna:'color', ram:'ram', storage:'storage', penyimpanan:'storage', variant_sku:'variant_sku', sku_varian:'variant_sku',
  variant_price:'variant_price', harga_varian:'variant_price', variant_discount_price:'variant_discount_price', harga_diskon_varian:'variant_discount_price',
  variant_stock:'variant_stock', stok_varian:'variant_stock', type:'product_name', mtm:'sku', keterangan:'remarks',
  old_price:'ignored_price', old_price_user:'ignored_price', old_price_dealer:'ignored_price', harga_lama:'ignored_price',
  new_price_user:'new_price_user', new_user_price:'new_price_user', user_price:'user_price', srp:'srp', harga_user:'user_price', user_srp:'srp',
  new_price:'unclassified_price', harga_jual:'promo_price',
  processor:'processor', prosesor:'processor', cpu:'processor', processor_type:'processor', cpu_model:'processor', graphics:'graphics', graphics_card:'graphics', gpu:'graphics', gpu_model:'graphics', vga:'graphics', memory:'ram', memory_size:'ram', ram_size:'ram', display:'display', display_size:'display', screen_size:'display', layar:'display', os:'os', operating_system:'os', warranty:'warranty', warranty_period:'warranty', garansi:'warranty', storage_type:'storage', storage_capacity:'storage',
}
export const cleanImportHeader = (v: string) => v.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const text = (v: unknown) => String(v ?? '').trim()

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

export function normalizeImportTables(tables: ImportTable[]): ImportedProduct[] {
  const totalRows = tables.reduce((sum, table) => sum + table.rows.length, 0)
  if (totalRows > 2001) throw new Error('File terlalu banyak baris. Maksimal 2.000 baris data.')
  const result = new Map<string, ImportedProduct>()
  let productRows = 0
  for (const table of tables) {
    const header = detectHeader(table.rows)
    if (!header) continue
    if (header.vendor === 'legacy') {
      const legacyProducts = normalizeProductRows(table.rows)
      productRows += table.rows.slice(header.index + 1).filter((row) => row.some((cell) => text(cell))).length
      for (const product of legacyProducts) {
        const key = product.sku ? product.sku.toLowerCase() : `${product.name.toLowerCase()}|${product.brand.toLowerCase()}`
        if (result.has(key)) {
          const existing = result.get(key)!
          existing.duplicateInFile = true
          existing.warnings = [...(existing.warnings ?? []), `SKU produk muncul pada beberapa tabel (${table.source}); baris tambahan dilewati.`]
        } else result.set(key, product)
      }
      continue
    }
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
      const description = isLenovo ? [sourceDescription, r.type && r.type !== name ? `TYPE: ${r.type}` : ''].filter(Boolean).join('\n') : sourceDescription
      const rowNumber = index + 1
      const warnings: string[] = []
      const errors: string[] = []
      if (!name) errors.push('Nama produk / TYPE belum terisi.')
      if (!sku) errors.push('SKU / MTM belum terisi.')
      if (!description) warnings.push('Deskripsi sumber kosong.')
      if (!candidates.length) errors.push(isLenovo ? 'Harga utama USER/SRP tidak ditemukan; OLD PRICE dan NEW PRICE tanpa label USER diabaikan.' : 'Tidak ada harga sumber yang terbaca.')
      if (chosen?.amount !== null && chosen?.amount !== undefined && chosen.amount <= 0) errors.push('Harga utama harus lebih besar dari nol.')
      if (chosen?.amount != null && chosen.amount > MAX_IMPORT_PRICE) errors.push('Harga utama melebihi batas field price di database.')
      if (r.unclassified_price) warnings.push('Kolom NEW PRICE tanpa label USER tidak digunakan sebagai harga utama.')
      if (candidates.some((candidate) => candidate.amount === null)) warnings.push('Harga utama tidak terbaca; periksa nilai sumber.')
      if (discountCandidates.some((candidate) => candidate.amount === null || candidate.amount <= 0 || (chosen?.amount != null && candidate.amount >= chosen.amount))) warnings.push('Harga promo harus valid, lebih besar dari nol, dan di bawah harga utama; perbaiki atau pilih tanpa promo.')
      if (specs.length === 0) warnings.push('Spesifikasi belum terbaca sebagai pasangan key-value.')
      const key = sku ? sku.toLowerCase() : `row:${table.source}:${rowNumber}`
      const existing = result.get(key)
      if (existing) {
        if (isLenovo && existing.brand === 'Lenovo') {
          existing.specifications.push(...specs.map((spec) => ({ ...spec, display_order: existing.specifications.length })))
          if (sourceDescription && !existing.description.includes(sourceDescription)) existing.description += `\n${sourceDescription}`
          existing.warnings = [...new Set([...(existing.warnings ?? []), ...warnings, 'MTM muncul pada beberapa baris/tabel; spesifikasi digabung.'])]
          continue
        }
        existing.duplicateInFile = true
        existing.warnings = [...(existing.warnings ?? []), `SKU duplikat ditemukan dalam file (${table.source}, baris ${rowNumber}).`]
        continue
      }
      const price = chosen?.amount ?? 0
      const product: ImportedProduct = {
        name: name || sku, sku, description: description || name || sku, price, discount_price: null,
        stock: integer(r.stock ?? '0', 'Stok', rowNumber) ?? 0, category: r.category ?? '', brand: r.brand || (isLenovo ? 'Lenovo' : ''),
        status: (r.status || 'draft').toLowerCase() as ImportedProduct['status'], is_best_seller: bool(r.is_best_seller ?? ''), is_new_arrival: bool(r.is_new_arrival ?? ''),
        image_url: r.image_url ?? '', specifications: specs, variants: [], sourceRow: rowNumber, warnings, errors, priceCandidates: candidates, discountCandidates,
        priceConfirmed: false, discountPriceConfirmed: false,
        importAction: 'create',
      }
      result.set(key, product)
    }
  }
  if (!productRows || !result.size) throw new Error('Header produk tidak ditemukan. Gunakan template lama, atau tabel Lenovo dengan TYPE, MTM, dan kolom harga.')
  if (productRows > 2000) throw new Error('Maksimal 2.000 baris data per file.')
  if (result.size > 500) throw new Error('Maksimal 500 produk per impor.')
  return [...result.values()]
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
    if (!name || !brand || !category || !description) throw new Error(`Baris ${row}: nama, deskripsi, kategori, dan brand wajib diisi.`)
    const price = money(record.price ?? '', 'Harga', row)!
    const discount = money(record.promo_price ?? '', 'Harga promo', row, true)
    if (discount !== null && (discount <= 0 || discount >= price)) throw new Error(`Baris ${row}: harga promo harus lebih besar dari nol dan lebih rendah dari harga utama.`)
    const imageUrl = record.image_url ?? ''
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) throw new Error(`Baris ${row}: URL foto harus menggunakan HTTPS.`)
    const key = sku ? `sku:${sku.toLowerCase()}` : `name:${name.toLowerCase()}|${brand.toLowerCase()}`
    const status = (record.status || 'published').toLowerCase() as ImportedProduct['status']
    if (!['published','draft','archived'].includes(status)) throw new Error(`Baris ${row}: status harus published, draft, atau archived.`)
    const found = products.get(key)
    const legacySpecs = (record.specifications ?? '').split(/[;\n]/).map((part) => { const [key, ...value] = part.split(':'); return { key: text(key), value: text(value.join(':')), display_order: 0 } }).filter((spec) => spec.key && spec.value)
    const product = found ?? { name, sku, description, price, discount_price: discount, stock: 0, category, brand, status, is_best_seller: bool(record.is_best_seller ?? ''), is_new_arrival: bool(record.is_new_arrival ?? ''), image_url: imageUrl, specifications: legacySpecs, variants: [], priceCandidates: [{ column: 'price', raw: record.price ?? '', amount: price }], discountCandidates: record.promo_price ? [{ column: 'discount_price', raw: record.promo_price, amount: discount }] : [], priceConfirmed: false, discountPriceConfirmed: false, importAction: 'create' as const }
    if (found && (product.name !== name || product.brand.toLowerCase() !== brand.toLowerCase() || product.category.toLowerCase() !== category.toLowerCase() || product.price !== price)) throw new Error(`Baris ${row}: data produk harus konsisten di semua baris varian.`)
    const color = record.color ?? '', ram = record.ram ?? '', storage = record.storage ?? ''
    if (color || ram || storage || record.variant_stock) {
      if (!color && !ram && !storage) throw new Error(`Baris ${row}: varian harus memiliki warna, RAM, atau storage.`)
      if (product.variants.some((variant) => variant.color.toLowerCase() === color.toLowerCase() && variant.ram.toLowerCase() === ram.toLowerCase() && variant.storage.toLowerCase() === storage.toLowerCase())) throw new Error(`Baris ${row}: kombinasi varian produk ganda.`)
      product.variants.push({ sku: record.variant_sku ?? '', color, ram, storage, price: money(record.variant_price ?? '', 'Harga varian', row, true), discount_price: money(record.variant_discount_price ?? '', 'Harga diskon varian', row, true), stock: integer(record.variant_stock ?? '', 'Stok varian', row)! })
    } else product.stock = integer(record.stock ?? '', 'Stok', row)!
    if (!found) products.set(key, product)
  }
  if (products.size > 500) throw new Error('Maksimal 500 produk per impor.')
  for (const product of products.values()) if (product.variants.length > 50) throw new Error(`Produk ${product.name} memiliki lebih dari 50 varian.`)
  return [...products.values()]
}
export const productImportHeaders = [...headers]
