import { getAdminAuditLogsAction } from '@/actions/admin-permissions';
import { getCurrentAdminPermissions } from '@/lib/auth/permissions';
import { AdminAuditLogsManager } from '@/features/admin/AdminAuditLogsManager';
import { redirect } from 'next/navigation';

export default async function AdminAuditLogsPage() {
  const perms = await getCurrentAdminPermissions();
  if (!perms.isSuperAdmin) {
    redirect('/admin?error=forbidden');
  }

  const logs = await getAdminAuditLogsAction();
  return <AdminAuditLogsManager logs={logs} isSuperAdmin={perms.isSuperAdmin} />;
}

