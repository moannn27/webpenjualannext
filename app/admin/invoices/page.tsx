import { getCurrentAdminPermissions, requireModulePermission } from "@/lib/auth/permissions";
import { ManualInvoiceManager } from "@/features/admin/ManualInvoiceManager";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Faktur Manual | Admin Panel Next Solution",
  description: "Buat, kustomisasi, dan cetak faktur invoice pesanan toko secara manual.",
};

export default async function AdminInvoicesPage() {
  try {
    await requireModulePermission("invoices");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const { isSuperAdmin, permissions, settings } = await getCurrentAdminPermissions();

  return (
    <div className="space-y-6 pb-12">
      <ManualInvoiceManager
        storeSettings={settings}
        isSuperAdmin={isSuperAdmin}
        permissions={permissions}
      />
    </div>
  );
}
