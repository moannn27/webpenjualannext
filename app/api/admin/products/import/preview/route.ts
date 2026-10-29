import { NextResponse } from 'next/server'
import mammoth from 'mammoth'
import * as cheerio from 'cheerio'
import { PDFParse } from 'pdf-parse'
import { getAdminAccess } from '@/lib/auth/admin'
import {
  analyzeAndNormalizeImportTables,
  applyStockPolicyToProduct,
  importTablesFromWorkbook,
  loadExcelWorkbook,
  markImportSkuConflicts,
  type ImportTable,
} from '@/lib/admin-product-import'
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
      const workbook = await loadExcelWorkbook(buffer)
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
    const { products, sheetSummary } = analyzeAndNormalizeImportTables(tables)
    const supabase = await createClient()
    const existingBySku = new Map<string, string>()
    const skuList = [...new Set(products.flatMap((product) => [product.sku, ...product.variants.map((variant) => variant.sku)]).filter(Boolean))]

    if (skuList.length) {
      const [prodsRes, varsRes] = await Promise.all([
        supabase.from('products').select('id, sku, name, stock').in('sku', skuList),
        supabase.from('product_variants').select('id, product_id, sku, color, ram, storage, stock').in('sku', skuList),
      ])

      if (prodsRes.error) throw new Error(`SKU database tidak dapat diverifikasi: ${prodsRes.error.message}`)
      if (varsRes.error) throw new Error(`SKU varian database tidak dapat diverifikasi: ${varsRes.error.message}`)

      const prodsData = prodsRes.data ?? []
      const varsData = varsRes.data ?? []

      // Also gather any products referenced by varsData that were not in prodsData
      const varProductIds = [...new Set(varsData.map((v) => v.product_id))]
      const missingProdIds = varProductIds.filter((id) => !prodsData.some((p) => p.id === id))
      if (missingProdIds.length > 0) {
        const { data: extraProds } = await supabase
          .from('products')
          .select('id, sku, name, stock')
          .in('id', missingProdIds)
        if (extraProds) prodsData.push(...extraProds)
      }

      const matchedProdIds = prodsData.map((p) => p.id)
      const { data: targetVariants } = matchedProdIds.length > 0
        ? await supabase.from('product_variants').select('id, product_id, sku, color, ram, storage, stock').in('product_id', matchedProdIds)
        : { data: [] }

      const prodsMap = new Map<string, { id: string; sku: string; name: string; stock: number }>()
      const prodsMapById = new Map<string, { id: string; sku: string; name: string; stock: number }>()
      for (const p of prodsData) {
        if (p.sku) prodsMap.set(p.sku.trim().toLowerCase(), p)
        prodsMapById.set(p.id, p)
        existingBySku.set(p.sku.trim().toLowerCase(), p.id)
      }

      const varsMap = new Map<string, { id: string; product_id: string; sku: string; color: string; ram: string; storage: string; stock: number }>()
      for (const v of varsData) {
        if (v.sku) varsMap.set(v.sku.trim().toLowerCase(), v)
      }

      const prodVariantsMap = new Map<string, typeof targetVariants>()
      for (const tv of (targetVariants ?? [])) {
        prodVariantsMap.set(tv.product_id, [...(prodVariantsMap.get(tv.product_id) ?? []), tv])
      }

      // Mark file-level SKU collisions first
      markImportSkuConflicts(products, existingBySku)

      for (const product of products) {
        const prodSkuKey = product.sku.trim().toLowerCase()
        let targetProduct = prodsMap.get(prodSkuKey)

        // If parent SKU didn't match directly, check if variants belong to an existing DB product
        if (!targetProduct && product.variants.length > 0) {
          const matchedVariantOwnerIds = new Set<string>()
          for (const v of product.variants) {
            const vSku = v.sku.trim().toLowerCase()
            const dbVar = vSku ? varsMap.get(vSku) : null
            if (dbVar) {
              matchedVariantOwnerIds.add(dbVar.product_id)
            }
          }
          if (matchedVariantOwnerIds.size === 1) {
            const ownerId = [...matchedVariantOwnerIds][0]
            targetProduct = prodsMapById.get(ownerId)
          } else if (matchedVariantOwnerIds.size > 1) {
            // Variants belong to multiple separate DB products -> Auto-suggest consolidation!
            const separateMatchedProducts = [...matchedVariantOwnerIds]
              .map((id) => prodsMapById.get(id))
              .filter(Boolean) as { id: string; sku: string; name: string; stock: number }[]

            if (separateMatchedProducts.length > 0) {
              product.consolidationTargetIds = separateMatchedProducts.map((p) => p.id)
              product.consolidationInfo = {
                separateProductCount: separateMatchedProducts.length,
                matchedProducts: separateMatchedProducts,
              }
              product.importAction = 'consolidate'
              product.currentStock = separateMatchedProducts.reduce((sum, p) => sum + (p.stock || 0), 0)
              product.warnings = [
                ...(product.warnings ?? []),
                `Terdeteksi ${separateMatchedProducts.length} produk lama tersimpan terpisah di database (SKU: ${separateMatchedProducts.map((p) => p.sku).join(', ')}). Opsi konsolidasi varian tersedia.`,
              ]

              for (const v of product.variants) {
                const vSku = v.sku.trim().toLowerCase()
                const matchedVar = varsMap.get(vSku)
                if (matchedVar) {
                  v.id = matchedVar.id
                  v.currentStock = matchedVar.stock
                  v.isNewVariant = false
                } else {
                  v.isNewVariant = true
                  v.currentStock = null
                }
              }

              continue
            }
          }
        }

        // 1. Re-import / Update: Parent SKU matches an existing product in DB (or matched via variants)
        if (targetProduct) {
          product.targetProductId = targetProduct.id
          product.duplicateInDatabase = true
          product.currentStock = targetProduct.stock
          product.importAction = 'update'
          product.warnings = [
            ...(product.warnings ?? []),
            `Produk terdeteksi di database (stok saat ini: ${targetProduct.stock}). Tindakan: Update dengan mempertahankan stok.`,
          ]

          const existingVariants = prodVariantsMap.get(targetProduct.id) ?? []
          for (const v of product.variants) {
            const vSku = v.sku.trim().toLowerCase()
            const matchedVar = existingVariants.find((ev) =>
              (vSku && ev.sku && ev.sku.trim().toLowerCase() === vSku) ||
              (ev.color.trim().toLowerCase() === v.color.trim().toLowerCase() &&
               ev.ram.trim().toLowerCase() === v.ram.trim().toLowerCase() &&
               ev.storage.trim().toLowerCase() === v.storage.trim().toLowerCase())
            )
            if (matchedVar) {
              v.id = matchedVar.id
              v.currentStock = matchedVar.stock
              v.isNewVariant = false
            } else {
              v.isNewVariant = true
              v.currentStock = null
              if (v.fileStock === null || v.fileStock === undefined) {
                v.warnings = [...(v.warnings ?? []), 'Varian baru tanpa stok dalam file; default 0.']
              }
            }
          }

          continue
        }

        // 2. Consolidation: Multiple variants match separate products in DB
        const separateMatchedProducts: { id: string; sku: string; name: string; stock: number }[] = []
        for (const v of product.variants) {
          const vSku = v.sku.trim().toLowerCase()
          const sepProd = prodsMap.get(vSku)
          if (sepProd && !separateMatchedProducts.some((p) => p.id === sepProd.id)) {
            separateMatchedProducts.push(sepProd)
          }
        }

        if (separateMatchedProducts.length > 0) {
          product.consolidationTargetIds = separateMatchedProducts.map((p) => p.id)
          product.consolidationInfo = {
            separateProductCount: separateMatchedProducts.length,
            matchedProducts: separateMatchedProducts,
          }
          product.importAction = 'consolidate'
          product.currentStock = separateMatchedProducts.reduce((sum, p) => sum + (p.stock || 0), 0)
          product.warnings = [
            ...(product.warnings ?? []),
            `Terdeteksi ${separateMatchedProducts.length} produk lama tersimpan terpisah di database (SKU: ${separateMatchedProducts.map((p) => p.sku).join(', ')}). Opsi konsolidasi tersedia.`,
          ]

          for (const v of product.variants) {
            const vSku = v.sku.trim().toLowerCase()
            const sepProd = prodsMap.get(vSku)
            if (sepProd) {
              v.currentStock = sepProd.stock
              v.isNewVariant = false
            } else {
              v.isNewVariant = true
              v.currentStock = null
            }
          }

          continue
        }

        // 3. Check for SKU clashes that are NOT consolidation
        if (varsMap.has(prodSkuKey)) {
          product.errors = [...(product.errors ?? []), 'SKU/MTM ini sudah dipakai sebagai SKU varian di database.']
          product.importAction = 'skip'
        }

        const targetId = product.targetProductId
        const variantConflict = product.variants.some((variant) => {
          const vSku = variant.sku.trim().toLowerCase()
          const vVar = varsMap.get(vSku)
          return Boolean(vVar && (!targetId || vVar.product_id !== targetId))
        })

        if (variantConflict) {
          product.errors = [...(product.errors ?? []), 'Salah satu SKU varian sudah digunakan oleh produk lain di database.']
          product.importAction = 'skip'
        }

        if (!product.importAction) {
          product.importAction = 'create'
        }
      }
    }

    const processedProducts = products.map((product) => {
      if (!product.importAction) {
        product.importAction = 'create'
      }
      return applyStockPolicyToProduct(product, 'keep_existing')
    })

    return NextResponse.json({
      products: processedProducts,
      summary: {
        productCount: processedProducts.length,
        variantCount: processedProducts.reduce((count, product) => count + product.variants.length, 0),
        sheetSummary,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'File tidak dapat dibaca. Pastikan dokumen memiliki tabel dengan teks yang dapat diekstrak.' }, { status: 400 })
  }
}
