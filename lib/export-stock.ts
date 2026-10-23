import ExcelJS from 'exceljs'

export type StockExportFormat = 'xlsx' | 'pdf' | 'doc' | 'csv'

export type StockExportItem = {
  id: string
  name: string
  sku: string
  brand: string
  category: string
  itemType: 'Produk Tunggal' | 'Varian'
  variantDetails: string
  stock: number
  stockStatus: 'Tersedia' | 'Menipis' | 'Habis'
  price: number
  discountPrice?: number | null
  effectivePrice: number
  totalAssetValue: number
  publishStatus: string
  tags: string
}

export type AdminProductForStock = {
  id: string
  name: string
  sku: string | null
  price: number
  discount_price: number | null
  stock: number
  status: string
  is_best_seller?: boolean
  is_new_arrival?: boolean
  categories?: { name: string } | null
  brands?: { name: string } | null
  product_variants?: {
    id?: string
    sku?: string | null
    color?: string
    ram?: string
    storage?: string
    price?: number | null
    discount_price?: number | null
    stock?: number
  }[]
}

function csvCell(value: unknown): string {
  const raw = String(value ?? '')
  const safe = /^[=+@-]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function formatMoney(amount: number): string {
  return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Meratakan produk dan varian menjadi baris individual untuk rekap stok akurat
 */
export function flattenProductsForStockExport(products: AdminProductForStock[]): StockExportItem[] {
  const items: StockExportItem[] = []

  for (const product of products) {
    const brandName = product.brands?.name || '—'
    const categoryName = product.categories?.name || '—'
    const tagsList: string[] = []
    if (product.is_best_seller) tagsList.push('Terlaris')
    if (product.is_new_arrival) tagsList.push('Terbaru')
    const tagsStr = tagsList.join(', ') || '—'
    const pubStatus = product.status === 'published' ? 'Terbit' : product.status === 'draft' ? 'Draft' : 'Arsip'

    const variants = product.product_variants || []

    if (variants.length > 0) {
      for (const v of variants) {
        const vStock = Number(v.stock ?? 0)
        const vPrice = Number(v.price ?? product.price ?? 0)
        const vDiscount = v.discount_price != null ? Number(v.discount_price) : product.discount_price != null ? Number(product.discount_price) : null
        const effectivePrice = vDiscount != null && vDiscount > 0 ? vDiscount : vPrice
        const totalAsset = vStock * effectivePrice
        const stockStatus: 'Tersedia' | 'Menipis' | 'Habis' = vStock <= 0 ? 'Habis' : vStock <= 5 ? 'Menipis' : 'Tersedia'

        const vDetails = [v.ram ? `RAM: ${v.ram}` : '', v.storage ? `Storage: ${v.storage}` : '', v.color ? `Warna: ${v.color}` : '']
          .filter(Boolean)
          .join(' / ') || 'Varian Standar'

        items.push({
          id: v.id || `${product.id}-var`,
          name: product.name,
          sku: v.sku || product.sku || '—',
          brand: brandName,
          category: categoryName,
          itemType: 'Varian',
          variantDetails: vDetails,
          stock: vStock,
          stockStatus,
          price: vPrice,
          discountPrice: vDiscount,
          effectivePrice,
          totalAssetValue: totalAsset,
          publishStatus: pubStatus,
          tags: tagsStr,
        })
      }
    } else {
      const pStock = Number(product.stock ?? 0)
      const pPrice = Number(product.price ?? 0)
      const pDiscount = product.discount_price != null ? Number(product.discount_price) : null
      const effectivePrice = pDiscount != null && pDiscount > 0 ? pDiscount : pPrice
      const totalAsset = pStock * effectivePrice
      const stockStatus: 'Tersedia' | 'Menipis' | 'Habis' = pStock <= 0 ? 'Habis' : pStock <= 5 ? 'Menipis' : 'Tersedia'

      items.push({
        id: product.id,
        name: product.name,
        sku: product.sku || '—',
        brand: brandName,
        category: categoryName,
        itemType: 'Produk Tunggal',
        variantDetails: '—',
        stock: pStock,
        stockStatus,
        price: pPrice,
        discountPrice: pDiscount,
        effectivePrice,
        totalAssetValue: totalAsset,
        publishStatus: pubStatus,
        tags: tagsStr,
      })
    }
  }

  return items
}

/**
 * Menghasilkan file Excel (.xlsx) dengan styling rapi, formula summary, dan format rupiah
 */
export async function generateStockXlsx(
  items: StockExportItem[],
  title = 'Semua Stok Produk'
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Next Solution Store'
  workbook.lastModifiedBy = 'Admin Next Solution'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Rekap Stok', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 9 }],
  })

  // 1. Judul Dokumen
  worksheet.mergeCells('A2:M2')
  const titleCell = worksheet.getCell('A2')
  titleCell.value = `REKAP STOK & INVENTARIS PRODUK - ${title.toUpperCase()}`
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF4338CA' } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }

  // 2. Info Toko & Tanggal
  worksheet.mergeCells('A3:M3')
  const metaCell = worksheet.getCell('A3')
  metaCell.value = `Next Solution Store · Dicetak pada: ${new Date().toLocaleDateString('id-ID', {
    dateStyle: 'full',
  })} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB · Total: ${items.length} item baris`
  metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } }
  metaCell.alignment = { vertical: 'middle', horizontal: 'left' }

  // 3. Ringkasan Singkat (Statistik Inventaris)
  const totalUnits = items.reduce((acc, i) => acc + (i.stock || 0), 0)
  const totalAsset = items.reduce((acc, i) => acc + (i.totalAssetValue || 0), 0)
  const outOfStockCount = items.filter((i) => i.stock <= 0).length
  const lowStockCount = items.filter((i) => i.stock > 0 && i.stock <= 5).length
  const inStockCount = items.filter((i) => i.stock > 5).length

  worksheet.getCell('A5').value = 'Total Unit Stok:'
  worksheet.getCell('B5').value = totalUnits
  worksheet.getCell('A5').font = { bold: true, size: 10 }
  worksheet.getCell('B5').font = { bold: true, size: 10 }

  worksheet.getCell('D5').value = 'Stok Tersedia (> 5):'
  worksheet.getCell('E5').value = inStockCount
  worksheet.getCell('D5').font = { bold: true, size: 10, color: { argb: 'FF16A34A' } }
  worksheet.getCell('E5').font = { bold: true, size: 10, color: { argb: 'FF16A34A' } }

  worksheet.getCell('A6').value = 'Estimasi Nilai Aset Stok:'
  worksheet.getCell('B6').value = totalAsset
  worksheet.getCell('B6').numFmt = '"Rp" #,##0'
  worksheet.getCell('A6').font = { bold: true, size: 10, color: { argb: 'FF4338CA' } }
  worksheet.getCell('B6').font = { bold: true, size: 10, color: { argb: 'FF4338CA' } }

  worksheet.getCell('D6').value = 'Stok Menipis (1-5):'
  worksheet.getCell('E6').value = lowStockCount
  worksheet.getCell('D6').font = { bold: true, size: 10, color: { argb: 'FFD97706' } }
  worksheet.getCell('E6').font = { bold: true, size: 10, color: { argb: 'FFD97706' } }

  worksheet.getCell('D7').value = 'Stok Kosong (0):'
  worksheet.getCell('E7').value = outOfStockCount
  worksheet.getCell('D7').font = { bold: true, size: 10, color: { argb: 'FFDC2626' } }
  worksheet.getCell('E7').font = { bold: true, size: 10, color: { argb: 'FFDC2626' } }

  // 4. Header Tabel
  const headerRowNumber = 9
  const headers = [
    'No',
    'SKU / MTM',
    'Nama Produk',
    'Brand',
    'Kategori',
    'Tipe Item',
    'Detail Varian',
    'Stok',
    'Status Stok',
    'Harga Normal (Rp)',
    'Harga Jual (Rp)',
    'Nilai Aset (Rp)',
    'Status',
    'Label / Tag',
  ]

  const headerRow = worksheet.getRow(headerRowNumber)
  headerRow.values = headers
  headerRow.height = 24

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4338CA' }, // Indigo-700
    }
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF312E81' } },
      bottom: { style: 'medium', color: { argb: 'FF1E1B4B' } },
      left: { style: 'thin', color: { argb: 'FF312E81' } },
      right: { style: 'thin', color: { argb: 'FF312E81' } },
    }
  })

  // 5. Isi Data
  let currentRow = 10
  items.forEach((item, index) => {
    const row = worksheet.getRow(currentRow)
    row.values = [
      index + 1,
      item.sku,
      item.name,
      item.brand,
      item.category,
      item.itemType,
      item.variantDetails,
      item.stock,
      item.stockStatus,
      item.price,
      item.effectivePrice,
      item.totalAssetValue,
      item.publishStatus,
      item.tags,
    ]

    const isEven = index % 2 === 0
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC'

    row.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
      cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF0F172A' } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }

      // No & SKU
      if (colNumber === 1 || colNumber === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
      // SKU font bold
      if (colNumber === 2) {
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E293B' } }
      }
      // Nama, Brand, Kategori, Varian
      if ([3, 4, 5, 7].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      }
      // Tipe, Status Stok, Status Publikasi, Tag
      if ([6, 9, 13, 14].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
      // Stock Status color
      if (colNumber === 9) {
        if (item.stockStatus === 'Habis') {
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFDC2626' } }
        } else if (item.stockStatus === 'Menipis') {
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFD97706' } }
        } else {
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF16A34A' } }
        }
      }
      // Stok
      if (colNumber === 8) {
        cell.numFmt = '#,##0'
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } }
      }
      // Price columns
      if (colNumber === 10 || colNumber === 11 || colNumber === 12) {
        cell.numFmt = '"Rp" #,##0'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
      }
      if (colNumber === 12) {
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF4338CA' } }
      }
    })

    row.height = 20
    currentRow++
  })

  // 6. Baris Total / Summary di Bawah
  const totalRow = worksheet.getRow(currentRow)
  totalRow.getCell(1).value = ''
  totalRow.getCell(2).value = ''
  totalRow.getCell(3).value = 'TOTAL KESELURUHAN'
  totalRow.getCell(8).value = { formula: `SUM(H10:H${currentRow - 1})` }
  totalRow.getCell(8).numFmt = '#,##0'
  totalRow.getCell(12).value = { formula: `SUM(L10:L${currentRow - 1})` }
  totalRow.getCell(12).numFmt = '"Rp" #,##0'

  totalRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } } // Indigo-100
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E1B4B' } }
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF4338CA' } },
      bottom: { style: 'double', color: { argb: 'FF4338CA' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
  })
  totalRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' }
  totalRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' }
  totalRow.getCell(12).alignment = { vertical: 'middle', horizontal: 'right' }
  totalRow.height = 24

  // 7. Pengaturan Lebar Kolom
  const columnWidths = [
    6,  // No
    18, // SKU
    34, // Nama
    14, // Brand
    16, // Kategori
    14, // Tipe Item
    24, // Detail Varian
    10, // Stok
    14, // Status Stok
    18, // Harga Normal
    18, // Harga Jual
    20, // Nilai Aset
    12, // Status
    14, // Tag
  ]

  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Menghasilkan file CSV dari rekap stok
 */
export function generateStockCsv(items: StockExportItem[]): Blob {
  const headers = [
    'No',
    'SKU / MTM',
    'Nama Produk',
    'Brand',
    'Kategori',
    'Tipe Item',
    'Detail Varian',
    'Stok',
    'Status Stok',
    'Harga Normal (Rp)',
    'Harga Jual (Rp)',
    'Nilai Aset (Rp)',
    'Status Publikasi',
    'Label / Tag',
  ]

  const lines = [headers.map(csvCell).join(',')]

  items.forEach((item, index) => {
    const row = [
      index + 1,
      item.sku,
      item.name,
      item.brand,
      item.category,
      item.itemType,
      item.variantDetails,
      item.stock,
      item.stockStatus,
      item.price,
      item.effectivePrice,
      item.totalAssetValue,
      item.publishStatus,
      item.tags,
    ]
    lines.push(row.map(csvCell).join(','))
  })

  const csvContent = '\uFEFF' + lines.join('\r\n')
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
}

/**
 * Menghasilkan file Word / HTML document (.doc)
 */
export function generateStockDoc(items: StockExportItem[], title = 'Semua Stok Produk'): Blob {
  const totalUnits = items.reduce((acc, i) => acc + (i.stock || 0), 0)
  const totalAsset = items.reduce((acc, i) => acc + (i.totalAssetValue || 0), 0)
  const outOfStockCount = items.filter((i) => i.stock <= 0).length

  const rowsHtml = items
    .map(
      (item, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; font-family: monospace; font-weight: bold;">${esc(item.sku)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px;">${esc(item.name)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px;">${esc(item.brand)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px;">${esc(item.category)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px;">${esc(item.variantDetails)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold;">${item.stock}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; color: ${item.stock <= 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">${item.stockStatus}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">${formatMoney(item.effectivePrice)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold; color: #4338ca;">${formatMoney(item.totalAssetValue)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${esc(item.tags)}</td>
      </tr>`
    )
    .join('')

  const docHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Rekap Stok - Next Solution</title>
  <style>
    body { font-family: Calibri, sans-serif; font-size: 11pt; color: #0f172a; margin: 20px; }
    h1 { color: #4338ca; font-size: 16pt; margin-bottom: 4px; }
    p.meta { color: #64748b; font-size: 9pt; margin-top: 0; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 9.5pt; }
    th { background-color: #4338ca; color: #ffffff; padding: 8px 6px; border: 1px solid #312e81; font-weight: bold; }
    .summary-box { display: flex; gap: 20px; margin-bottom: 16px; }
    .stat-card { background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 14px; display: inline-block; margin-right: 12px; }
    .stat-val { font-size: 13pt; font-weight: bold; color: #1e293b; }
    .stat-lbl { font-size: 8.5pt; color: #64748b; }
  </style>
</head>
<body>
  <h1>REKAP STOK & INVENTARIS PRODUK - ${esc(title.toUpperCase())}</h1>
  <p class="meta">Next Solution Store · Dicetak pada: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })} · Total: ${items.length} item SKU</p>
  
  <div class="summary-box">
    <div class="stat-card">
      <div class="stat-lbl">TOTAL UNIT STOK</div>
      <div class="stat-val">${totalUnits.toLocaleString('id-ID')} unit</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">ESTIMASI NILAI ASET</div>
      <div class="stat-val" style="color: #4338ca;">${formatMoney(totalAsset)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">BARANG KOSONG</div>
      <div class="stat-val" style="color: #dc2626;">${outOfStockCount} item</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;">No</th>
        <th>SKU / MTM</th>
        <th>Nama Produk</th>
        <th>Brand</th>
        <th>Kategori</th>
        <th>Varian</th>
        <th>Stok</th>
        <th>Status</th>
        <th>Harga Jual</th>
        <th>Nilai Aset</th>
        <th>Tag</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr style="background-color: #e0e7ff; font-weight: bold;">
        <td colspan="6" style="border: 1px solid #cbd5e1; padding: 8px;">TOTAL KESELURUHAN</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${totalUnits.toLocaleString('id-ID')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px;"></td>
        <td style="border: 1px solid #cbd5e1; padding: 8px;"></td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; color: #4338ca;">${formatMoney(totalAsset)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px;"></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`

  return new Blob([docHtml], { type: 'application/msword;charset=utf-8' })
}

/**
 * Menghasilkan tampilan cetak / print-ready PDF HTML
 */
export function openStockPrintView(items: StockExportItem[], title = 'Semua Stok Produk'): void {
  const totalUnits = items.reduce((acc, i) => acc + (i.stock || 0), 0)
  const totalAsset = items.reduce((acc, i) => acc + (i.totalAssetValue || 0), 0)
  const outOfStockCount = items.filter((i) => i.stock <= 0).length
  const lowStockCount = items.filter((i) => i.stock > 0 && i.stock <= 5).length

  const rowsHtml = items
    .map(
      (item, idx) => `
      <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
        <td class="border p-2 text-center text-xs text-slate-500">${idx + 1}</td>
        <td class="border p-2 font-mono font-bold text-xs">${esc(item.sku)}</td>
        <td class="border p-2 text-xs font-semibold">${esc(item.name)}</td>
        <td class="border p-2 text-xs">${esc(item.brand)}</td>
        <td class="border p-2 text-xs">${esc(item.category)}</td>
        <td class="border p-2 text-xs text-slate-600">${esc(item.variantDetails)}</td>
        <td class="border p-2 text-center font-bold text-xs ${item.stock <= 0 ? 'text-red-600' : 'text-slate-900'}">${item.stock}</td>
        <td class="border p-2 text-center text-xs font-bold ${item.stock <= 0 ? 'text-red-600' : item.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}">${item.stockStatus}</td>
        <td class="border p-2 text-right text-xs">${formatMoney(item.effectivePrice)}</td>
        <td class="border p-2 text-right font-bold text-xs text-indigo-700">${formatMoney(item.totalAssetValue)}</td>
        <td class="border p-2 text-center text-xs">${esc(item.tags)}</td>
      </tr>`
    )
    .join('')

  const printHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${esc(title)} - Laporan Rekap Stok - Next Solution</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body class="p-8 bg-white text-slate-900">
  <div class="no-print mb-6 flex items-center justify-between bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
    <div>
      <h2 class="font-bold text-indigo-900">Siap Cetak / Simpan sebagai PDF</h2>
      <p class="text-xs text-indigo-700">Pilih "Save as PDF" di dialog cetak browser Anda untuk menyimpan laporan.</p>
    </div>
    <div class="flex items-center gap-2">
      <button onclick="window.close()" class="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50">Tutup</button>
      <button onclick="window.print()" class="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">Cetak / Simpan PDF</button>
    </div>
  </div>

  <div class="border-b pb-4 mb-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-indigo-700 tracking-tight">NEXT SOLUTION STORE</h1>
        <p class="text-xs text-slate-500">Laporan Rekap Stok Inventaris Produk</p>
      </div>
      <div class="text-right text-xs text-slate-500">
        <p><strong>Tanggal:</strong> ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
        <p><strong>Total Item:</strong> ${items.length} SKU</p>
      </div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="grid grid-cols-4 gap-4 mb-6">
    <div class="p-3 rounded-lg border border-slate-200 bg-slate-50">
      <span class="text-[11px] font-bold text-slate-500 uppercase">Total Unit Stok</span>
      <p class="text-xl font-black text-slate-900 mt-1">${totalUnits.toLocaleString('id-ID')}</p>
    </div>
    <div class="p-3 rounded-lg border border-indigo-200 bg-indigo-50">
      <span class="text-[11px] font-bold text-indigo-600 uppercase">Nilai Aset Stok</span>
      <p class="text-xl font-black text-indigo-700 mt-1">${formatMoney(totalAsset)}</p>
    </div>
    <div class="p-3 rounded-lg border border-amber-200 bg-amber-50">
      <span class="text-[11px] font-bold text-amber-600 uppercase">Stok Menipis (1-5)</span>
      <p class="text-xl font-black text-amber-700 mt-1">${lowStockCount}</p>
    </div>
    <div class="p-3 rounded-lg border border-rose-200 bg-rose-50">
      <span class="text-[11px] font-bold text-rose-600 uppercase">Stok Kosong (0)</span>
      <p class="text-xl font-black text-rose-700 mt-1">${outOfStockCount}</p>
    </div>
  </div>

  <table class="w-full text-left border-collapse border border-slate-200 text-xs">
    <thead>
      <tr class="bg-indigo-700 text-white">
        <th class="border p-2 text-center">No</th>
        <th class="border p-2">SKU / MTM</th>
        <th class="border p-2">Nama Produk</th>
        <th class="border p-2">Brand</th>
        <th class="border p-2">Kategori</th>
        <th class="border p-2">Varian</th>
        <th class="border p-2 text-center">Stok</th>
        <th class="border p-2 text-center">Status</th>
        <th class="border p-2 text-right">Harga Jual</th>
        <th class="border p-2 text-right">Nilai Aset</th>
        <th class="border p-2 text-center">Tag</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="bg-indigo-50 font-bold">
        <td colspan="6" class="border p-2 text-indigo-900">TOTAL KESELURUHAN</td>
        <td class="border p-2 text-center text-indigo-900">${totalUnits.toLocaleString('id-ID')}</td>
        <td class="border p-2"></td>
        <td class="border p-2"></td>
        <td class="border p-2 text-right text-indigo-900">${formatMoney(totalAsset)}</td>
        <td class="border p-2"></td>
      </tr>
    </tbody>
  </table>

  <div class="mt-8 pt-4 border-t text-slate-400 text-[11px] flex justify-between">
    <p>Laporan ini dihasilkan secara otomatis oleh sistem Next Solution Store.</p>
    <p>Halaman 1 dari 1</p>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(printHtml)
    printWindow.document.close()
  }
}

