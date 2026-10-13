import { NextResponse } from 'next/server'
import { getAdminAccess } from '@/lib/auth/admin'
import { generateProductImportExcelTemplate, productImportHeaders } from '@/lib/admin-product-import'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { user, isAdmin } = await getAdminAccess()
    if (!user || !isAdmin) {
      return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')?.toLowerCase()

    if (format === 'csv') {
      const csvContent = `\uFEFF${productImportHeaders.join(',')}\r\n`
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="template-produk-next-solution.csv"',
        },
      })
    }

    // Default to XLSX template
    const buffer = await generateProductImportExcelTemplate()
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template-produk-next-solution.xlsx"',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal membuat template.' },
      { status: 500 }
    )
  }
}

