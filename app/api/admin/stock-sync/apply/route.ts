import { NextResponse } from 'next/server'
import { getAdminAccess } from '@/lib/auth/admin'
import { requireModulePermission } from '@/lib/auth/permissions'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { applyStockSyncAction, type ApplyStockSyncPayload } from '@/actions/stock-sync'

export const runtime = 'nodejs'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    // 1. Authentication Check
    const { user, isAdmin } = await getAdminAccess()
    if (!user || !isAdmin) {
      return NextResponse.json(
        { error: 'Sesi admin tidak valid atau Anda belum login. Silakan login kembali.' },
        { status: 401 }
      )
    }

    // 2. Authorization Check (Module Permission)
    try {
      await requireModulePermission('products')
    } catch (permErr) {
      return NextResponse.json(
        { error: permErr instanceof Error ? permErr.message : 'Akses ditolak: Anda tidak memiliki izin untuk mengelola stok produk.' },
        { status: 403 }
      )
    }

    // 3. Security Rate Limiting (Prevent abuse / DoS)
    const clientIp = getClientIp(request)
    const rateLimit = await checkRateLimit(
      `stock_sync_apply:${user.id}:${clientIp}`,
      30, // 30 requests per window
      300 // 5 minutes window
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan sinkronisasi stok. Harap tunggu ${rateLimit.resetSeconds} detik sebelum mencoba lagi.`,
        },
        { status: 429 }
      )
    }

    // 4. Strict Payload Validation & Input Sanitization
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Format data JSON tidak valid.' }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Struktur payload sinkronisasi tidak valid.' }, { status: 400 })
    }

    const payload = body as Partial<ApplyStockSyncPayload>

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada item stok yang dipilih untuk diterapkan. Centang minimal satu barang.' },
        { status: 400 }
      )
    }

    if (payload.items.length > 2000) {
      return NextResponse.json(
        { error: 'Batas maksimum sinkronisasi per batch adalah 2.000 barang.' },
        { status: 400 }
      )
    }

    // Validate individual items
    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i]
      if (!item || typeof item !== 'object') {
        return NextResponse.json({ error: `Item ke-${i + 1} tidak valid.` }, { status: 400 })
      }

      if (!item.targetId || typeof item.targetId !== 'string' || !UUID_REGEX.test(item.targetId.trim())) {
        return NextResponse.json(
          { error: `ID target tidak valid atau bukan UUID yang sah pada baris ${i + 1} (SKU: ${item.sku || 'tanpa SKU'}).` },
          { status: 400 }
        )
      }

      if (item.targetType !== 'variant' && item.targetType !== 'product') {
        return NextResponse.json(
          { error: `Tipe target tidak valid (${item.targetType}) pada baris ${i + 1}. Harus 'variant' atau 'product'.` },
          { status: 400 }
        )
      }

      if (item.parentProductId && (typeof item.parentProductId !== 'string' || !UUID_REGEX.test(item.parentProductId.trim()))) {
        return NextResponse.json(
          { error: `ID produk induk tidak valid pada baris ${i + 1}.` },
          { status: 400 }
        )
      }

      const stockNum = Number(item.finalStock)
      if (!Number.isFinite(stockNum) || stockNum < 0 || stockNum > 10_000_000) {
        return NextResponse.json(
          { error: `Jumlah stok akhir (${item.finalStock}) pada baris ${i + 1} tidak valid. Harus angka antara 0 dan 10.000.000.` },
          { status: 400 }
        )
      }

      // Sanitize fields
      item.targetId = item.targetId.trim()
      item.finalStock = Math.floor(stockNum)
      item.sku = String(item.sku || '').slice(0, 100).trim()
      item.name = String(item.name || '').slice(0, 255).trim()
    }

    // 5. Execute Protected Stock Update
    const result = await applyStockSyncAction(payload as ApplyStockSyncPayload)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Gagal menerapkan pembaruan stok.' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Terjadi kesalahan tidak terduga pada server saat sinkronisasi stok.' },
      { status: 500 }
    )
  }
}
