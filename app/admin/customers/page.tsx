import { getAdminAccess } from "@/lib/auth/admin";
import { getAdminCustomersAction } from "@/actions/admin";
import { CustomerAccountsManager } from "@/features/admin/CustomerAccountsManager";
import { createClient } from "@/lib/supabase/server";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { requireModulePermission, getCurrentAdminPermissions } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export default async function AdminCustomersPage() {
  try {
    await requireModulePermission("customers");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const [customers, access, supabase, currentPerms] = await Promise.all([
    getAdminCustomersAction(),
    getAdminAccess(),
    createClient(),
    getCurrentAdminPermissions(),
  ]);

  const { data: sfData } = await supabase
    .from("storefront_settings")
    .select("settings")
    .eq("id", "main")
    .maybeSingle();

  const settings = normalizeStorefrontSettings(sfData?.settings ?? {});
  const adminPermissions = settings.admin_permissions ?? {};

  const isSuperAdmin = access.role === "super_admin";
  const canManageAccounts = isSuperAdmin || currentPerms.permissions.includes("customers");

  return (
    <CustomerAccountsManager
      customers={customers}
      canManageAccounts={canManageAccounts}
      isSuperAdmin={isSuperAdmin}
      currentUserId={access.user?.id}
      adminPermissions={adminPermissions}
    />
  );
}
