import { redirect } from 'next/navigation'
import { requireModulePermission } from '@/lib/auth/permissions'
import { getStockSyncHistoryAction } from '@/actions/stock-sync'
import { StockSyncManager } from '@/features/admin/StockSyncManager'

export const metadata = {
  title: 'Sinkronisasi Stok Offline | Admin Next Solution Store',
  description: 'Sinkronisasi dan rekonsiliasi stok offline Excel dengan database katalog toko.',
}

export default async function AdminStockSyncPage() {
  try {
    await requireModulePermission('products')
  } catch {
    redirect('/admin?error=forbidden')
  }

  const history = await getStockSyncHistoryAction()

  return (
    <div className="space-y-6">
      <StockSyncManager initialHistory={history} />
    </div>
  )
}

