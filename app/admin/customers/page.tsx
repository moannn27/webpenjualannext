import { getAdminAccess } from "@/lib/auth/admin";
import { getAdminCustomersAction } from "@/actions/admin";
import { CustomerAccountsManager } from "@/features/admin/CustomerAccountsManager";
import { createClient } from "@/lib/supabase/server";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { requireModulePermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export default async function AdminCustomersPage() {
  try {
    await requireModulePermission("customers");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const [customers, access, supabase] = await Promise.all([
    getAdminCustomersAction(),
    getAdminAccess(),
    createClient(),
  ]);

  const { data: sfData } = await supabase
    .from("storefront_settings")
    .select("settings")
    .eq("id", "main")
    .maybeSingle();

  const settings = normalizeStorefrontSettings(sfData?.settings ?? {});
  const adminPermissions = settings.admin_permissions ?? {};

  return (
    <CustomerAccountsManager
      customers={customers}
      canManageAccounts={access.role === "super_admin"}
      adminPermissions={adminPermissions}
    />
  );
}
