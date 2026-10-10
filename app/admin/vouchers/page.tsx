import { getAdminVouchersAction } from '@/actions/voucher';
import { getCategoriesAction, getBrandsAction } from '@/actions/catalog';
import { getCurrentAdminPermissions, requireModulePermission } from '@/lib/auth/permissions';
import { VoucherManager } from '@/features/admin/VoucherManager';
import { redirect } from 'next/navigation';

export default async function AdminVouchersPage() {
  try {
    await requireModulePermission('vouchers');
  } catch {
    redirect('/admin?error=forbidden');
  }

  const [vouchers, perms, categories, brands] = await Promise.all([
    getAdminVouchersAction(),
    getCurrentAdminPermissions(),
    getCategoriesAction(),
    getBrandsAction(),
  ]);

  return (
    <VoucherManager
      vouchers={vouchers}
      canManage={perms.isAdmin}
      categories={categories ?? []}
      brands={brands ?? []}
    />
  );
}

