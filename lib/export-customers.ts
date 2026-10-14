import ExcelJS from 'exceljs'

export type ExportCustomerRow = {
  id: string
  fullName: string
  email: string
  phone: string
  role: string
  createdAt: string
  totalOrders?: number
  completedOrders?: number
  completedSpend?: number
  lastOrderAt?: string | null
}

export type ExportScope = 'customers_only' | 'customers_with_orders'
export type ExportFormat = 'xlsx' | 'csv' | 'doc'

function csvCell(value: unknown): string {
  const raw = String(value ?? '')
  const safe = /^[=+@-]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}

export function generateCustomersCsv(
  rows: ExportCustomerRow[],
  scope: ExportScope
): Blob {
  const isPurchases = scope === 'customers_with_orders'
  const headers = isPurchases
    ? [
        'No',
        'ID Pengguna',
        'Nama Lengkap',
        'Email',
        'Nomor Telepon',
        'Role Akun',
        'Total Pesanan',
        'Pesanan Selesai',
        'Total Belanja (Rp)',
        'Pesanan Terakhir',
        'Tanggal Bergabung',
      ]
    : [
        'No',
        'ID Pengguna',
        'Nama Lengkap',
        'Email',
        'Nomor Telepon',
        'Role Akun',
        'Tanggal Bergabung',
      ]

  const lines = [headers.map(csvCell).join(',')]

  rows.forEach((row, index) => {
    const roleLabel =
      row.role === 'super_admin' ? 'Super Admin' : row.role === 'admin' ? 'Admin' : 'Pelanggan'
    const formattedDate = row.createdAt ? new Date(row.createdAt).toLocaleDateString('id-ID') : '-'
    const lastOrderDate = row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleDateString('id-ID') : '-'

    const values = isPurchases
      ? [
          index + 1,
          row.id,
          row.fullName || 'Belum mengisi nama',
          row.email || '-',
          row.phone || '-',
          roleLabel,
          row.totalOrders ?? 0,
          row.completedOrders ?? 0,
          row.completedSpend ?? 0,
          lastOrderDate,
          formattedDate,
        ]
      : [
          index + 1,
          row.id,
          row.fullName || 'Belum mengisi nama',
          row.email || '-',
          row.phone || '-',
          roleLabel,
          formattedDate,
        ]

    lines.push(values.map(csvCell).join(','))
  })

  return new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
}

export async function generateCustomersExcel(
  rows: ExportCustomerRow[],
  scope: ExportScope
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Next Solution Store'

  const sheetName = scope === 'customers_with_orders' ? 'Pelanggan & Pembelian' : 'Data Pengguna'
  const worksheet = workbook.addWorksheet(sheetName)

  const isPurchases = scope === 'customers_with_orders'
  const titleText = isPurchases
    ? 'LAPORAN DATA PELANGGAN & HISTORI PEMBELIAN - NEXT SOLUTION STORE'
    : 'LAPORAN DATA AKUN PELANGGAN & STAF - NEXT SOLUTION STORE'

  // Header banner
  worksheet.addRow([titleText])
  worksheet.addRow([
    `Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', {
      dateStyle: 'full',
      timeZone: 'Asia/Jakarta',
    })} · Total: ${rows.length} akun pengguna`,
  ])
  worksheet.addRow([])

  const titleRow = worksheet.getRow(1)
  titleRow.font = { bold: true, size: 13, color: { argb: 'FF0A4EA3' } }

  const subRow = worksheet.getRow(2)
  subRow.font = { italic: true, size: 10, color: { argb: 'FF64748B' } }

  const headers = isPurchases
    ? [
        'No',
        'ID Pengguna',
        'Nama Lengkap',
        'Email',
        'Nomor Telepon',
        'Role Akun',
        'Total Pesanan',
        'Pesanan Selesai',
        'Total Belanja (Rp)',
        'Pesanan Terakhir',
        'Tanggal Terdaftar',
      ]
    : [
        'No',
        'ID Pengguna',
        'Nama Lengkap',
        'Email',
        'Nomor Telepon',
        'Role Akun',
        'Tanggal Terdaftar',
      ]

  const headerRow = worksheet.addRow(headers)
  headerRow.height = 26
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0A4EA3' },
    }
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 10,
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
  })

  rows.forEach((row, index) => {
    const roleLabel =
      row.role === 'super_admin' ? 'Super Admin' : row.role === 'admin' ? 'Admin' : 'Pelanggan'
    const formattedDate = row.createdAt ? new Date(row.createdAt).toLocaleDateString('id-ID') : '-'
    const lastOrderDate = row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleDateString('id-ID') : '-'

    const values = isPurchases
      ? [
          index + 1,
          row.id,
          row.fullName || 'Belum mengisi nama',
          row.email || '-',
          row.phone || '-',
          roleLabel,
          row.totalOrders ?? 0,
          row.completedOrders ?? 0,
          row.completedSpend ?? 0,
          lastOrderDate,
          formattedDate,
        ]
      : [
          index + 1,
          row.id,
          row.fullName || 'Belum mengisi nama',
          row.email || '-',
          row.phone || '-',
          roleLabel,
          formattedDate,
        ]

    const dataRow = worksheet.addRow(values)
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

      // Format mata uang untuk kolom total belanja
      if (isPurchases && colNumber === 9) {
        cell.numFmt = '"Rp" #,##0'
        cell.alignment = { horizontal: 'right' }
      } else if (isPurchases && (colNumber === 7 || colNumber === 8)) {
        cell.alignment = { horizontal: 'center' }
      } else if (colNumber === 1) {
        cell.alignment = { horizontal: 'center' }
      }
    })
  })

  worksheet.columns = isPurchases
    ? [
        { width: 6 },
        { width: 38 },
        { width: 26 },
        { width: 30 },
        { width: 18 },
        { width: 15 },
        { width: 14 },
        { width: 16 },
        { width: 22 },
        { width: 18 },
        { width: 16 },
      ]
    : [
        { width: 6 },
        { width: 38 },
        { width: 26 },
        { width: 30 },
        { width: 18 },
        { width: 15 },
        { width: 16 },
      ]

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function generateCustomersWord(
  rows: ExportCustomerRow[],
  scope: ExportScope
): Blob {
  const isPurchases = scope === 'customers_with_orders'
  const title = isPurchases
    ? 'Laporan Data Pelanggan & Histori Pembelian'
    : 'Laporan Data Akun Pelanggan & Staf'

  const headers = isPurchases
    ? ['No', 'Nama Lengkap', 'Email', 'Telepon', 'Role', 'Total Pesanan', 'Selesai', 'Total Belanja (Rp)', 'Pesanan Terakhir', 'Terdaftar']
    : ['No', 'Nama Lengkap', 'Email', 'Telepon', 'Role', 'Tanggal Terdaftar']

  const esc = (val: unknown) =>
    String(val ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')

  const tableHeader = headers.map((h) => `<th>${esc(h)}</th>`).join('')

  const tableRows = rows
    .map((row, index) => {
      const roleLabel =
        row.role === 'super_admin' ? 'Super Admin' : row.role === 'admin' ? 'Admin' : 'Pelanggan'
      const formattedDate = row.createdAt ? new Date(row.createdAt).toLocaleDateString('id-ID') : '-'
      const lastOrderDate = row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleDateString('id-ID') : '-'
      const money = (num: number) => `Rp ${Number(num).toLocaleString('id-ID')}`

      const cells = isPurchases
        ? [
            index + 1,
            row.fullName || 'Belum mengisi nama',
            row.email || '-',
            row.phone || '-',
            roleLabel,
            row.totalOrders ?? 0,
            row.completedOrders ?? 0,
            money(row.completedSpend ?? 0),
            lastOrderDate,
            formattedDate,
          ]
        : [
            index + 1,
            row.fullName || 'Belum mengisi nama',
            row.email || '-',
            row.phone || '-',
            roleLabel,
            formattedDate,
          ]

      return `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`
    })
    .join('')

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #1E293B; margin: 24px; }
    h1 { color: #0A4EA3; font-size: 16pt; margin-bottom: 4px; }
    p.meta { color: #64748B; font-size: 9pt; margin-top: 0; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }
    th { background-color: #0A4EA3; color: #FFFFFF; font-weight: bold; border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; }
    td { border: 1px solid #E2E8F0; padding: 5px 8px; }
    tr:nth-child(even) { background-color: #F8FAFC; }
    .footer { margin-top: 24px; font-size: 8pt; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <p class="meta">Next Solution Store · Dicetak pada: ${new Date().toLocaleDateString('id-ID', {
    dateStyle: 'full',
  })} · Total: ${rows.length} data pengguna</p>
  <table>
    <thead><tr>${tableHeader}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">Laporan dibuat secara otomatis oleh Sistem Administrasi Next Solution Store.</div>
</body>
</html>`

  return new Blob([`\uFEFF${html}`], { type: 'application/msword;charset=utf-8' })
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

