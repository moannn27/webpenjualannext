import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import mammoth from 'mammoth'
import * as cheerio from 'cheerio'
import { PDFParse } from 'pdf-parse'
import { getAdminAccess } from '@/lib/auth/admin'
import { importTablesFromWorkbook, markImportSkuConflicts, normalizeImportTables, type ImportTable } from '@/lib/admin-product-import'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_ROWS = 2000

function parseCsv(source: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) { if (char === '"' && source[i + 1] === '"') { field += '"'; i++ } else if (char === '"') quoted = false; else field += char }
    else if (char === '"') quoted = true
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n' || char === '\r') { if (char === '\r' && source[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = '' }
    else field += char
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  if (quoted) throw new Error('CSV gagal dibaca: tanda kutip tidak berpasangan.')
  return rows
}
export async function POST(request: Request) {
  try {
    const { user, isAdmin } = await getAdminAccess()
    if (!user || !isAdmin) return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 })
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Pilih file yang ingin dipreview.' }, { status: 400 })
    if (file.size < 1 || file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'Ukuran file harus maksimal 10 MB.' }, { status: 413 })
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'csv', 'docx', 'pdf'].includes(extension ?? '')) return NextResponse.json({ error: 'Format yang didukung: XLSX, CSV, DOCX, dan PDF.' }, { status: 415 })
    const buffer = Buffer.from(await file.arrayBuffer())
    let tables: ImportTable[] = []
    if (extension === 'csv') tables = [{ rows: parseCsv(new TextDecoder('utf-8', { fatal: true }).decode(buffer)), source: 'CSV' }]
    else if (extension === 'xlsx') {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer as never)
      tables = importTablesFromWorkbook(workbook)
    } else if (extension === 'docx') {
      const { value } = await mammoth.convertToHtml({ buffer })
      const $ = cheerio.load(value)
      tables = $('table').toArray().map((table, tableIndex) => ({
        source: `DOCX/table ${tableIndex + 1}`,
        rows: $(table).find('tr').toArray().map((tr) => $(tr).find('th,td').toArray().map((cell) => $(cell).text().trim())),
      }))
    } else {
      const parser = new PDFParse({ data: new Uint8Array(buffer) })
      try {
        const result = await parser.getTable()
        tables = result.pages.flatMap((page) => page.tables.map((rows, index) => ({ rows, source: `PDF/halaman ${page.num}/tabel ${index + 1}` })))
      } finally { await parser.destroy() }
    }
    const rowCount = tables.reduce((sum, table) => sum + table.rows.length, 0)
    if (rowCount > MAX_ROWS + 1) return NextResponse.json({ error: `Maksimal ${MAX_ROWS} baris data per file.` }, { status: 413 })
    const products = normalizeImportTables(tables)
    const supabase = await createClient()
    const existingBySku = new Map<string, string>()
    const skuList = [...new Set(products.flatMap((product) => [product.sku, ...product.variants.map((variant) => variant.sku)]).filter(Boolean))]
    if (skuList.length) {
      let lookupData: { sku: string; product_id: string; match_type: string }[] = []
      const { data, error } = await supabase.rpc('lookup_admin_import_skus', { p_skus: skuList })
      if (!error && Array.isArray(data)) {
        lookupData = data
      } else {
        const isMissingRpc = error?.code === 'PGRST202' || error?.code === '42883' || error?.message?.includes('lookup_admin_import_skus')
        if (isMissingRpc) {
          const [prods, vars] = await Promise.all([
            supabase.from('products').select('id, sku').in('sku', skuList),
            supabase.from('product_variants').select('product_id, sku').in('sku', skuList),
          ])
          const fromProds = (prods.data ?? []).map((p) => ({ sku: p.sku, product_id: p.id, match_type: 'product' }))
          const fromVars = (vars.data ?? []).map((v) => ({ sku: v.sku, product_id: v.product_id, match_type: 'variant' }))
          lookupData = [...fromProds, ...fromVars]
        } else if (error) {
          throw new Error(`SKU database tidak dapat diverifikasi: ${error.message}`)
        }
      }
      const matches = new Map<string, { productId: string; type: string }[]>()
      for (const item of lookupData) if (item.sku) {
        const key = item.sku.trim().toLowerCase()
        matches.set(key, [...(matches.get(key) ?? []), { productId: item.product_id, type: item.match_type }])
        if (item.match_type === 'product') existingBySku.set(key, item.product_id)
      }
      for (const product of products) {
        const ownSkuMatches = matches.get(product.sku.trim().toLowerCase()) ?? []
        if (!existingBySku.has(product.sku.trim().toLowerCase()) && ownSkuMatches.length) {
          product.errors = [...(product.errors ?? []), 'SKU/MTM ini sudah dipakai sebagai SKU varian di database.']
          product.importAction = 'skip'
        }
        const variantConflict = product.variants.some((variant) => (matches.get(variant.sku.trim().toLowerCase()) ?? []).length > 0)
        if (variantConflict) {
          product.errors = [...(product.errors ?? []), 'Salah satu SKU varian sudah digunakan di database.']
          product.importAction = 'skip'
        }
      }
    }
    markImportSkuConflicts(products, existingBySku)
    return NextResponse.json({ products, summary: { productCount: products.length, variantCount: products.reduce((count, product) => count + product.variants.length, 0) } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'File tidak dapat dibaca. Pastikan dokumen memiliki tabel dengan teks yang dapat diekstrak.' }, { status: 400 })
  }
}
