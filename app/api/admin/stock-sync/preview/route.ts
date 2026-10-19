import { NextResponse } from 'next/server'
import { getAdminAccess } from '@/lib/auth/admin'
import {
  parseStockExcelBuffer,
  calculateStockPreview,
  type OfflineStockSourceRow,
  type DuplicateConflictResolution,
} from '@/lib/stock-sync'
import { getStockSyncDataAction } from '@/actions/stock-sync'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { user, isAdmin } = await getAdminAccess()
    if (!user || !isAdmin) {
      return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const singleFile = formData.get('file') as File | null

    const allFiles: File[] = []
    if (files && files.length > 0) {
      allFiles.push(...files)
    } else if (singleFile) {
      allFiles.push(singleFile)
    }

    if (allFiles.length === 0) {
      return NextResponse.json({ error: 'Harap unggah minimal satu file Excel stok (.xlsx).' }, { status: 400 })
    }

    const stockSourceMode = (formData.get('stockSourceMode') as 'main_only' | 'combined' | 'external_only') ||
      (formData.get('includeExternalWarehouse') === 'true' ? 'combined' : 'main_only')
    const includeExternalWarehouse = stockSourceMode === 'combined'
    const onlineOrdersAccounted = formData.get('onlineOrdersAccounted') === 'true'
    const rawResolutions = formData.get('duplicateResolutions') as string | null

    let duplicateResolutions: Record<string, { resolution: DuplicateConflictResolution; customStock?: number }> = {}
    if (rawResolutions) {
      try {
        duplicateResolutions = JSON.parse(rawResolutions)
      } catch {
        // Ignore invalid json
      }
    }

    // Parse all files
    const allRows: OfflineStockSourceRow[] = []
    const fileNames: string[] = []

    for (const file of allFiles) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        return NextResponse.json(
          { error: `File "${file.name}" bukan format spreadsheet Excel (.xlsx / .xls) yang didukung.` },
          { status: 400 }
        )
      }

      fileNames.push(file.name)
      const buffer = await file.arrayBuffer()
      const rows = await parseStockExcelBuffer(Buffer.from(buffer), file.name)
      allRows.push(...rows)
    }

    // Fetch database state & active web orders
    const { products, variants, activeWebOrders, lastSync } = await getStockSyncDataAction()

    // Calculate preview with web transaction reconciliation
    const preview = calculateStockPreview({
      rows: allRows,
      databaseProducts: products,
      databaseVariants: variants,
      activeWebOrders,
      includeExternalWarehouse,
      stockSourceMode,
      onlineOrdersAccounted,
      duplicateResolutions,
      fileNames,
      lastSync,
    })

    return NextResponse.json({
      success: true,
      data: preview,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal memproses preview sinkronisasi stok.' },
      { status: 500 }
    )
  }
}

