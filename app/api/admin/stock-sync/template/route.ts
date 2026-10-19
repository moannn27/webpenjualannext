import { NextResponse } from 'next/server'
import { getAdminAccess } from '@/lib/auth/admin'
import { generateStockSyncTemplate } from '@/lib/stock-sync'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { user, isAdmin } = await getAdminAccess()
    if (!user || !isAdmin) {
      return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')?.toLowerCase()
    const isDummy = type === 'dummy'

    const buffer = await generateStockSyncTemplate(isDummy)
    const filename = isDummy
      ? 'contoh-sinkronisasi-stok-dummy.xlsx'
      : 'template-sinkronisasi-stok-kosong.xlsx'

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal membuat template stok.' },
      { status: 500 }
    )
  }
}

