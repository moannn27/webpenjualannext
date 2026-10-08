import { getAdminAccess } from "@/lib/auth/admin";
import { getAdminCustomersAction } from "@/actions/admin";
import { CustomerAccountsManager } from "@/features/admin/CustomerAccountsManager";

export default async function AdminCustomersPage() {
  const [customers, access] = await Promise.all([getAdminCustomersAction(), getAdminAccess()]);
  return <CustomerAccountsManager customers={customers} canManageAccounts={access.role === "super_admin"} />;
}
