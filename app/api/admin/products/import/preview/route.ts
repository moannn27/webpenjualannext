import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import mammoth from 'mammoth'
import * as cheerio from 'cheerio'
import { PDFParse } from 'pdf-parse'
import { getAdminAccess } from '@/lib/auth/admin'
import { normalizeProductRows } from '@/lib/admin-product-import'

export const runtime = 'nodejs'
export const maxDuration = 30

function parseCsv(source: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i++ }
      else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n' || char === '\r') { if (char === '\r' && source[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = '' }
    else field += char
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

function excelRows(workbook: ExcelJS.Workbook): string[][] {
  const sheet = workbook.worksheets[0]
  if (!sheet) return []
  const rows: string[][] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    rows.push(Array.from({ length: row.cellCount }, (_, index) => row.getCell(index + 1).text))
  })
  return rows
}

export async function POST(request: Request) {
  try {
    const { user, isAdmin } = await getAdminAccess()
    if (!user || !isAdmin) return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 })
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Pilih file yang ingin dipreview.' }, { status: 400 })
    if (file.size < 1 || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Ukuran file harus kurang dari 10 MB.' }, { status: 413 })
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'csv', 'docx', 'pdf'].includes(extension ?? '')) return NextResponse.json({ error: 'Format yang didukung: XLSX, CSV, DOCX, dan PDF.' }, { status: 415 })
    const buffer = Buffer.from(await file.arrayBuffer())
    let rows: string[][] = []
    if (extension === 'csv') rows = parseCsv(new TextDecoder('utf-8').decode(buffer))
    else if (extension === 'xlsx') {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer as never)
      rows = excelRows(workbook)
    } else if (extension === 'docx') {
      const { value } = await mammoth.convertToHtml({ buffer })
      const $ = cheerio.load(value)
      const table = $('table').toArray().find((element) => $(element).find('tr').length > 1)
      if (table) rows = $(table).find('tr').toArray().map((tr) => $(tr).find('th,td').toArray().map((cell) => $(cell).text().trim()))
    } else {
      const parser = new PDFParse({ data: new Uint8Array(buffer) })
      try {
        const result = await parser.getTable()
        const table = result.mergedTables.find((candidate) => candidate.length > 1)
        if (table) rows = table
      } finally { await parser.destroy() }
    }
    if (rows.length > 2001) return NextResponse.json({ error: 'File terlalu banyak baris. Maksimal 2.000 baris data.' }, { status: 413 })
    const products = normalizeProductRows(rows)
    return NextResponse.json({ products, summary: { productCount: products.length, variantCount: products.reduce((count, product) => count + product.variants.length, 0) } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'File tidak dapat dibaca.' }, { status: 400 })
  }
}
