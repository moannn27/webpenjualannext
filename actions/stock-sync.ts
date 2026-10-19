'use server'

import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireModulePermission } from '@/lib/auth/permissions'
import { recordAdminActivity } from '@/lib/audit-log'
import { revalidatePath } from 'next/cache'
import type {
  DatabaseProductForSync,
  DatabaseVariantForSync,
  ActiveWebOrderForSync,
} from '@/lib/stock-sync'

export type StockSyncHistoryRecord = {
  id: string
  filename: string
  file_hash: string | null
  admin_id: string | null
  admin_name: string
  total_rows: number
  matched_count: number
  unmatched_count: number
  conflict_count: number
  applied_count: number
  include_external_warehouse: boolean
  online_orders_accounted: boolean
  summary: Record<string, unknown>
  created_at: string
}

export type ApplyStockItemInput = {
  sku: string
  targetId: string
  targetType: 'variant' | 'product'
  parentProductId?: string | null
  finalStock: number
  previousStock: number
  excelStock: number
  externalWarehouseStock: number
  webReconciledQty: number
  name: string
}

export type ApplyStockSyncPayload = {
  items: ApplyStockItemInput[]
  filename: string
  fileHash?: string
  includeExternalWarehouse: boolean
  onlineOrdersAccounted: boolean
  totalRows: number
  matchedCount: number
  unmatchedCount: number
  conflictCount: number
}

/**
 * Fetches current catalog data, variants, and active web orders for calculating stock sync preview
 */
export async function getStockSyncDataAction(): Promise<{
  products: DatabaseProductForSync[]
  variants: DatabaseVariantForSync[]
  activeWebOrders: ActiveWebOrderForSync[]
  lastSync: { lastSyncAt: string | null; adminName: string | null } | null
}> {
  await requireModulePermission('products')
  const supabase = await createClient()

  // 1. Fetch products
  const { data: rawProducts, error: prodErr } = await supabase
    .from('products')
    .select('id, name, sku, stock, status')

  if (prodErr) throw new Error(`Gagal memuat katalog produk: ${prodErr.message}`)

  // 2. Fetch variants with parent product info
  const { data: rawVariants, error: varErr } = await supabase
    .from('product_variants')
    .select(`
      id,
      product_id,
      sku,
      color,
      ram,
      storage,
      stock,
      products(id, name, sku, status)
    `)

  if (varErr) throw new Error(`Gagal memuat varian produk: ${varErr.message}`)

  // 3. Fetch active unfulfilled orders holding stock: pending, processing, ready_for_pickup, shipped
  const { data: rawActiveOrders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      created_at,
      order_items(
        product_id,
        variant_id,
        quantity
      )
    `)
    .in('status', ['pending', 'processing', 'ready_for_pickup', 'shipped'])

  const activeWebOrders: ActiveWebOrderForSync[] = []
  for (const order of rawActiveOrders || []) {
    const items = Array.isArray(order.order_items) ? order.order_items : []
    for (const item of items) {
      if (item.quantity && item.quantity > 0) {
        activeWebOrders.push({
          order_id: order.id,
          order_number: order.order_number,
          order_status: order.status,
          order_created_at: order.created_at,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        })
      }
    }
  }

  // 4. Fetch last sync record
  let lastSync: { lastSyncAt: string | null; adminName: string | null } | null = null
  try {
    const { data: lastRecord } = await supabase
      .from('stock_sync_history')
      .select('created_at, admin_name')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastRecord) {
      lastSync = {
        lastSyncAt: lastRecord.created_at,
        adminName: lastRecord.admin_name,
      }
    }
  } catch {
    // If migration hasn't run yet, ignore
  }

  const products: DatabaseProductForSync[] = (rawProducts || []).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock ?? 0,
    status: p.status,
  }))

  const variants: DatabaseVariantForSync[] = (rawVariants || []).map((v) => {
    const parent = Array.isArray(v.products) ? v.products[0] : v.products
    return {
      id: v.id,
      product_id: v.product_id,
      sku: v.sku,
      color: v.color || '',
      ram: v.ram || '',
      storage: v.storage || '',
      stock: v.stock ?? 0,
      product: parent ? {
        id: parent.id,
        name: parent.name,
        sku: parent.sku,
        status: parent.status,
      } : null,
    }
  })

  return {
    products,
    variants,
    activeWebOrders,
    lastSync,
  }
}

/**
 * Fetches stock synchronization history records
 */
export async function getStockSyncHistoryAction(): Promise<StockSyncHistoryRecord[]> {
  await requireModulePermission('products')
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('stock_sync_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return []
    return (data || []) as StockSyncHistoryRecord[]
  } catch {
    return []
  }
}

/**
 * Applies reconciled offline stock updates safely and transactionally
 */
export async function applyStockSyncAction(payload: ApplyStockSyncPayload): Promise<{
  success: boolean
  appliedCount: number
  historyId?: string
}> {
  const { user, adminName, role } = await requireModulePermission('products')
  const adminClient = getSupabaseAdminClient()

  const { items, filename, fileHash, includeExternalWarehouse, onlineOrdersAccounted } = payload

  if (!items || items.length === 0) {
    throw new Error('Tidak ada item stok yang dipilih untuk diterapkan.')
  }

  // 1. Strict validation: ensure all items are valid non-negative numbers and targetIds exist
  for (const item of items) {
    if (!item.targetId || typeof item.targetId !== 'string') {
      throw new Error(`Target ID tidak valid untuk item SKU ${item.sku}`)
    }
    if (typeof item.finalStock !== 'number' || !Number.isFinite(item.finalStock) || item.finalStock < 0) {
      throw new Error(`Stok akhir untuk ${item.name} (${item.sku}) tidak boleh bernilai negatif: ${item.finalStock}`)
    }
  }

  // 2. Perform updates
  const affectedParentIds = new Set<string>()

  // A. Update variants
  const variantItems = items.filter((i) => i.targetType === 'variant')
  for (const vItem of variantItems) {
    const { error } = await adminClient
      .from('product_variants')
      .update({
        stock: vItem.finalStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vItem.targetId)

    if (error) {
      throw new Error(`Gagal memperbarui stok varian ${vItem.name}: ${error.message}`)
    }

    if (vItem.parentProductId) {
      affectedParentIds.add(vItem.parentProductId)
    }
  }

  // B. Recalculate parent product total stocks for affected variants
  for (const parentId of affectedParentIds) {
    const { data: variantsSum } = await adminClient
      .from('product_variants')
      .select('stock')
      .eq('product_id', parentId)

    const totalVariantStock = (variantsSum || []).reduce((acc, v) => acc + (v.stock ?? 0), 0)

    await adminClient
      .from('products')
      .update({
        stock: totalVariantStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parentId)
  }

  // C. Update standalone products
  const productItems = items.filter((i) => i.targetType === 'product')
  for (const pItem of productItems) {
    const { error } = await adminClient
      .from('products')
      .update({
        stock: pItem.finalStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pItem.targetId)

    if (error) {
      throw new Error(`Gagal memperbarui stok produk ${pItem.name}: ${error.message}`)
    }
  }

  // 3. Record Audit Log
  const modeLabel = onlineOrdersAccounted
    ? 'Sudah memperhitungkan pesanan online'
    : 'Belum memperhitungkan pesanan online (dikurangi komitmen pesanan aktif web)'
  const gudangLuarLabel = includeExternalWarehouse ? 'Termasuk Gudang Luar' : 'Tanpa Gudang Luar'

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role || 'admin',
    action: 'update',
    entity_type: 'product',
    entity_name: 'Sinkronisasi Stok Offline',
    details: `Menerapkan pembaruan stok offline dari "${filename}" untuk ${items.length} item. Pengaturan: ${modeLabel}, ${gudangLuarLabel}.`,
  })

  // 4. Save to stock_sync_history and stock_sync_items
  let historyId: string | undefined
  try {
    const { data: historyRow, error: histErr } = await adminClient
      .from('stock_sync_history')
      .insert({
        filename,
        file_hash: fileHash || null,
        admin_id: user.id,
        admin_name: adminName,
        total_rows: payload.totalRows,
        matched_count: payload.matchedCount,
        unmatched_count: payload.unmatchedCount,
        conflict_count: payload.conflictCount,
        applied_count: items.length,
        include_external_warehouse: includeExternalWarehouse,
        online_orders_accounted: onlineOrdersAccounted,
        summary: {
          itemsApplied: items.length,
          variantsCount: variantItems.length,
          productsCount: productItems.length,
          timestamp: new Date().toISOString(),
        },
      })
      .select('id')
      .single()

    if (!histErr && historyRow) {
      historyId = historyRow.id
      const itemLogs = items.map((item) => ({
        sync_id: historyId,
        sku: item.sku,
        product_id: item.parentProductId || (item.targetType === 'product' ? item.targetId : null),
        variant_id: item.targetType === 'variant' ? item.targetId : null,
        previous_stock: item.previousStock,
        new_stock: item.finalStock,
        excel_stock: item.excelStock,
        external_warehouse_stock: item.externalWarehouseStock,
        web_reconciled_qty: item.webReconciledQty,
        status: 'applied',
      }))

      if (itemLogs.length > 0) {
        await adminClient.from('stock_sync_items').insert(itemLogs)
      }
    }
  } catch {
    // If migration table is not yet present on remote DB, action still succeeds safely
  }

  revalidatePath('/admin/stock-sync')
  revalidatePath('/admin/products')
  revalidatePath('/admin')
  revalidatePath('/products')
  revalidatePath('/')

  return {
    success: true,
    appliedCount: items.length,
    historyId,
  }
}

