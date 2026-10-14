import ExcelJS from 'exceljs'
import type { AdminSaleItemDetail } from '@/actions/admin'

export type SalesExportFormat = 'xlsx' | 'csv' | 'doc' | 'pdf'

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
 * Menghasilkan file CSV dari daftar transaksi penjualan
 */
export function generateSalesCsv(
  title: string,
  details: AdminSaleItemDetail[]
): Blob {
  const headers = [
    'No',
    'No Pesanan',
    'Tanggal',
    'Jam',
    'Nama Pelanggan',
    'No Telepon',
    'Nama Produk',
    'Varian',
    'Brand',
    'Kategori',
    'Jumlah Unit',
    'Harga Satuan (Rp)',
    'Subtotal (Rp)',
    'Total Pesanan (Rp)',
    'Status Pesanan',
  ]

  const lines = [headers.map(csvCell).join(',')]

  details.forEach((item, index) => {
    const row = [
      index + 1,
      item.orderNumber,
      item.day,
      item.time || '-',
      item.customerName || 'Pelanggan Toko',
      item.customerPhone || '-',
      item.productName,
      item.variantDetails || '-',
      item.brandName || '-',
      item.categoryName || '-',
      item.quantity,
      item.price,
      item.subtotal,
      item.grandTotal,
      item.orderStatus === 'completed' ? 'Selesai' : item.orderStatus,
    ]
    lines.push(row.map(csvCell).join(','))
  })

  return new Blob([`\uFEFF${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8',
  })
}

/**
 * Menghasilkan file Excel (.xlsx) rapi dengan styling dan pemformatan mata uang
 */
export async function generateSalesExcel(
  title: string,
  details: AdminSaleItemDetail[]
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Next Solution Store'

  const worksheet = workbook.addWorksheet('Rincian Penjualan')

  // 1. Judul Dokumen
  worksheet.mergeCells('A2:O2')
  const titleCell = worksheet.getCell('A2')
  titleCell.value = `LAPORAN PENJUALAN - ${title.toUpperCase()}`
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0A4EA3' } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }

  // 2. Info Toko & Tanggal
  worksheet.mergeCells('A3:O3')
  const metaCell = worksheet.getCell('A3')
  metaCell.value = `Next Solution Store · Dicetak pada: ${new Date().toLocaleDateString('id-ID', {
    dateStyle: 'full',
  })} · Total: ${details.length} item transaksi`
  metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } }
  metaCell.alignment = { vertical: 'middle', horizontal: 'left' }

  // 3. Ringkasan Singkat (Statistik)
  const totalOmset = details.reduce((acc, d) => acc + (d.subtotal || 0), 0)
  const totalQty = details.reduce((acc, d) => acc + (d.quantity || 0), 0)
  const uniqueOrders = new Set(details.map((d) => d.orderId)).size

  worksheet.getCell('A5').value = 'Total Transaksi Selesai:'
  worksheet.getCell('B5').value = uniqueOrders
  worksheet.getCell('A5').font = { bold: true, size: 10 }
  worksheet.getCell('B5').font = { bold: true, size: 10 }

  worksheet.getCell('A6').value = 'Total Unit Terjual:'
  worksheet.getCell('B6').value = totalQty
  worksheet.getCell('A6').font = { bold: true, size: 10 }
  worksheet.getCell('B6').font = { bold: true, size: 10 }

  worksheet.getCell('A7').value = 'Total Pendapatan (Omset):'
  worksheet.getCell('B7').value = totalOmset
  worksheet.getCell('B7').numFmt = '"Rp" #,##0'
  worksheet.getCell('A7').font = { bold: true, size: 10, color: { argb: 'FF0A4EA3' } }
  worksheet.getCell('B7').font = { bold: true, size: 10, color: { argb: 'FF0A4EA3' } }

  // 4. Header Tabel
  const headerRowNumber = 9
  const headers = [
    'No',
    'No Pesanan',
    'Tanggal',
    'Jam',
    'Nama Pelanggan',
    'No Telepon',
    'Nama Produk',
    'Varian',
    'Brand',
    'Kategori',
    'Unit',
    'Harga Satuan (Rp)',
    'Subtotal (Rp)',
    'Total Pesanan (Rp)',
    'Status',
  ]

  const headerRow = worksheet.getRow(headerRowNumber)
  headerRow.values = headers
  headerRow.height = 24

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0A4EA3' },
    }
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF073B7A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF073B7A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
  })

  // 5. Isi Baris Data
  details.forEach((item, index) => {
    const rowNum = headerRowNumber + 1 + index
    const dataRow = worksheet.getRow(rowNum)
    dataRow.values = [
      index + 1,
      item.orderNumber,
      item.day,
      item.time || '-',
      item.customerName || 'Pelanggan Toko',
      item.customerPhone || '-',
      item.productName,
      item.variantDetails || '-',
      item.brandName || '-',
      item.categoryName || '-',
      item.quantity,
      item.price,
      item.subtotal,
      item.grandTotal,
      item.orderStatus === 'completed' ? 'Selesai' : item.orderStatus,
    ]
    dataRow.height = 20

    dataRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }

      if (index % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        }
      }

      // Format mata uang untuk kolom harga, subtotal, grandTotal
      if (colNumber === 12 || colNumber === 13 || colNumber === 14) {
        cell.numFmt = '"Rp" #,##0'
        cell.alignment = { horizontal: 'right', vertical: 'middle' }
      } else if (colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 11 || colNumber === 15) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      }
    })
  })

  // 6. Lebar Kolom
  worksheet.columns = [
    { width: 6 },   // No
    { width: 22 },  // No Pesanan
    { width: 14 },  // Tanggal
    { width: 10 },  // Jam
    { width: 24 },  // Nama Pelanggan
    { width: 16 },  // No Telepon
    { width: 34 },  // Nama Produk
    { width: 22 },  // Varian
    { width: 16 },  // Brand
    { width: 16 },  // Kategori
    { width: 8 },   // Unit
    { width: 18 },  // Harga Satuan
    { width: 18 },  // Subtotal
    { width: 18 },  // Total Pesanan
    { width: 14 },  // Status
  ]

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Menghasilkan file Word (.doc) yang dapat langsung dibuka di Microsoft Word / WPS
 */
export function generateSalesWord(
  title: string,
  details: AdminSaleItemDetail[]
): Blob {
  const totalOmset = details.reduce((acc, d) => acc + (d.subtotal || 0), 0)
  const totalQty = details.reduce((acc, d) => acc + (d.quantity || 0), 0)
  const uniqueOrders = new Set(details.map((d) => d.orderId)).size

  const headers = [
    'No',
    'No Pesanan',
    'Waktu',
    'Pelanggan',
    'No Telp',
    'Produk & Varian',
    'Qty',
    'Harga Satuan',
    'Subtotal',
    'Total Trx',
    'Status',
  ]

  const tableHeader = headers.map((h) => `<th>${esc(h)}</th>`).join('')

  const tableRows = details
    .map((item, index) => {
      const prodDesc = item.variantDetails
        ? `${item.productName} (${item.variantDetails})`
        : item.productName
      const brandCat = [item.brandName, item.categoryName].filter(Boolean).join(' • ')
      const fullProd = brandCat ? `${prodDesc}<br><small style="color:#64748B;">${brandCat}</small>` : prodDesc

      const cells = [
        index + 1,
        item.orderNumber,
        `${item.day} ${item.time || ''}`.trim(),
        item.customerName || 'Pelanggan Toko',
        item.customerPhone || '-',
        fullProd,
        item.quantity,
        formatMoney(item.price),
        formatMoney(item.subtotal),
        formatMoney(item.grandTotal),
        item.orderStatus === 'completed' ? 'Selesai' : item.orderStatus,
      ]

      return `<tr>${cells
        .map((c, cIdx) => {
          const isRight = cIdx >= 7 && cIdx <= 9
          const isCenter = cIdx === 0 || cIdx === 2 || cIdx === 4 || cIdx === 6 || cIdx === 10
          const align = isRight ? 'right' : isCenter ? 'center' : 'left'
          return `<td align="${align}">${typeof c === 'number' ? c : esc(c).replace(/&lt;br&gt;/g, '<br>').replace(/&lt;small style=&quot;color:#64748B;&quot;&gt;/g, '<small style="color:#64748B;">').replace(/&lt;\/small&gt;/g, '</small>')}</td>`
        })
        .join('')}</tr>`
    })
    .join('')

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Laporan Penjualan - ${esc(title)}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #1E293B; margin: 24px; }
    h1 { color: #0A4EA3; font-size: 16pt; margin-bottom: 4px; }
    p.meta { color: #64748B; font-size: 9pt; margin-top: 0; margin-bottom: 16px; }
    .summary-box { background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; padding: 12px; margin-bottom: 18px; }
    .summary-title { font-weight: bold; color: #0F172A; margin-bottom: 6px; font-size: 11pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }
    th { background-color: #0A4EA3; color: #FFFFFF; font-weight: bold; border: 1px solid #CBD5E1; padding: 6px 8px; }
    td { border: 1px solid #E2E8F0; padding: 5px 8px; vertical-align: top; }
    tr:nth-child(even) { background-color: #F8FAFC; }
    .footer { margin-top: 24px; font-size: 8pt; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>LAPORAN PENJUALAN - ${esc(title.toUpperCase())}</h1>
  <p class="meta">Next Solution Store · Dicetak pada: ${new Date().toLocaleDateString('id-ID', {
    dateStyle: 'full',
  })} · Total: ${details.length} item transaksi</p>

  <div class="summary-box">
    <div class="summary-title">Ringkasan Penjualan:</div>
    <div>Total Transaksi: <b>${uniqueOrders} Pesanan Selesai</b></div>
    <div>Total Unit Produk Terjual: <b>${totalQty} Unit</b></div>
    <div>Total Pendapatan (Omset): <b style="color: #0A4EA3;">${formatMoney(totalOmset)}</b></div>
  </div>

  <table>
    <thead><tr>${tableHeader}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="footer">Laporan dibuat secara otomatis oleh Sistem Administrasi Next Solution Store.</div>
</body>
</html>`

  return new Blob([`\uFEFF${html}`], { type: 'application/msword;charset=utf-8' })
}

/**
 * Menghasilkan HTML siap cetak/simpan PDF dengan styling A4 profesional
 */
export function generateSalesPdfHtml(
  title: string,
  details: AdminSaleItemDetail[]
): string {
  const totalOmset = details.reduce((acc, d) => acc + (d.subtotal || 0), 0)
  const totalQty = details.reduce((acc, d) => acc + (d.quantity || 0), 0)
  const uniqueOrders = new Set(details.map((d) => d.orderId)).size
  const avgOrder = uniqueOrders > 0 ? Math.round(totalOmset / uniqueOrders) : 0

  const rowsHtml = details
    .map((item, idx) => {
      const prodInfo = item.variantDetails
        ? `<b>${esc(item.productName)}</b> <span class="tag">${esc(item.variantDetails)}</span>`
        : `<b>${esc(item.productName)}</b>`
      const brandCat = [item.brandName, item.categoryName].filter(Boolean).join(' • ')

      return `<tr>
        <td class="text-center">${idx + 1}</td>
        <td class="font-mono text-center font-bold text-primary">${esc(item.orderNumber)}</td>
        <td class="text-center">${esc(item.day)}<br><small class="text-muted">${esc(item.time || '')}</small></td>
        <td>
          <div class="font-bold">${esc(item.customerName || 'Pelanggan Toko')}</div>
          <small class="text-muted">${esc(item.customerPhone || '-')}</small>
        </td>
        <td>
          <div>${prodInfo}</div>
          ${brandCat ? `<small class="text-muted">${esc(brandCat)}</small>` : ''}
        </td>
        <td class="text-center font-bold">${item.quantity}</td>
        <td class="text-right font-mono">${formatMoney(item.price)}</td>
        <td class="text-right font-mono font-bold">${formatMoney(item.subtotal)}</td>
        <td class="text-center"><span class="badge-success">Selesai</span></td>
      </tr>`
    })
    .join('')

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Laporan Penjualan - ${esc(title)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 20px;
      font-size: 11px;
    }
    .page-container {
      max-width: 1100px;
      margin: 0 auto;
      background: #ffffff;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0a4ea3;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #0a4ea3;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0 0;
    }
    .report-title-box {
      text-align: right;
    }
    .report-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      margin-bottom: 4px;
    }
    .report-date {
      font-size: 11px;
      color: #475569;
      font-weight: 500;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 18px;
    }
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .summary-card.highlight {
      background: #eff6ff;
      border-color: #bfdbfe;
    }
    .summary-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-val {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
      font-family: monospace;
    }
    .summary-val.primary {
      color: #0a4ea3;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 10.5px;
    }
    th {
      background-color: #0a4ea3;
      color: #ffffff;
      font-weight: 700;
      padding: 8px 10px;
      text-align: left;
      border: 1px solid #073b7a;
    }
    td {
      border: 1px solid #e2e8f0;
      padding: 6px 10px;
      vertical-align: middle;
    }
    tr:nth-child(even) { background-color: #f8fafc; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #0a4ea3; }
    .text-muted { color: #64748b; }
    .tag {
      display: inline-block;
      background: #f1f5f9;
      color: #475569;
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
    .badge-success {
      background: #dcfce7;
      color: #15803d;
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }
    .table-footer {
      background: #f1f5f9;
      font-weight: 800;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10px;
      color: #64748b;
    }
    .no-print-toolbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 6px 16px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover { background: #1d4ed8; }
    .btn-secondary {
      background: #475569;
    }
    .btn-secondary:hover { background: #334155; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .page-container { box-shadow: none; border: none; padding: 0; width: 100%; max-width: 100%; }
      .no-print-toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div>
      <strong>Pratinjau Cetak / PDF Laporan Penjualan</strong>
      <span style="opacity: 0.7; font-size: 11px; margin-left: 8px;">(Pilih 'Simpan sebagai PDF' di jendela cetak)</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn" onclick="window.print()">
        🖨️ Cetak / Simpan PDF
      </button>
      <button class="btn btn-secondary" onclick="window.close()">
        ✕ Tutup
      </button>
    </div>
  </div>

  <div class="page-container">
    <div class="header-bar">
      <div>
        <h1 class="brand-title">NEXT SOLUTION STORE</h1>
        <p class="brand-subtitle">Pusat Penjualan Komputer, Laptop & Perangkat Elektronik Resmi</p>
      </div>
      <div class="report-title-box">
        <span class="report-badge">LAPORAN PENJUALAN</span>
        <div class="report-date">Periode: <strong>${esc(title)}</strong></div>
        <small class="text-muted">Dicetak pada: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' })}</small>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card highlight">
        <div class="summary-label">Total Omset Selesai</div>
        <div class="summary-val primary">${formatMoney(totalOmset)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Volume Transaksi</div>
        <div class="summary-val">${uniqueOrders} <span style="font-size: 11px; font-weight: normal; color: #64748b;">pesanan</span></div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Produk Terjual</div>
        <div class="summary-val">${totalQty} <span style="font-size: 11px; font-weight: normal; color: #64748b;">unit</span></div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Rata-rata Nilai Pesanan (AOV)</div>
        <div class="summary-val">${formatMoney(avgOrder)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 35px;" class="text-center">No</th>
          <th style="width: 140px;" class="text-center">No Pesanan</th>
          <th style="width: 100px;" class="text-center">Tanggal & Jam</th>
          <th style="width: 160px;">Pelanggan</th>
          <th>Produk & Varian Terjual</th>
          <th style="width: 50px;" class="text-center">Qty</th>
          <th style="width: 110px;" class="text-right">Harga Satuan</th>
          <th style="width: 120px;" class="text-right">Subtotal</th>
          <th style="width: 70px;" class="text-center">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="table-footer">
          <td colspan="5" style="text-align: right; padding-right: 14px;">TOTAL KESELURUHAN:</td>
          <td class="text-center font-bold font-mono">${totalQty}</td>
          <td></td>
          <td class="text-right font-bold font-mono text-primary">${formatMoney(totalOmset)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div class="signature-area">
      <div>
        Next Solution Store Management System · Dokumen Resmi Penjualan
      </div>
      <div>
        Petugas Administrasi: ________________________
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Membuka jendela pop-up siap cetak dan otomatis memicu window.print() untuk simpan ke PDF
 */
export function openSalesPrintPdf(
  title: string,
  details: AdminSaleItemDetail[]
): void {
  if (typeof window === 'undefined') return
  const html = generateSalesPdfHtml(title, details)
  const printWindow = window.open('', '_blank', 'width=1000,height=800')
  if (!printWindow) {
    alert('Popup terblokir oleh browser. Harap izinkan popup di browser Anda untuk mencetak atau menyimpan PDF.')
    return
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 400)
}

