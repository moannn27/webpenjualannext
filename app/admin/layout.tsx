import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdminPermissions } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/layouts/AdminShell";
import { AdminHeader } from "@/components/layouts/AdminHeader";

export const metadata: Metadata = {
  title: "Admin Dashboard | Next Solution",
  description: "Store management and dashboard.",
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const perms = await getCurrentAdminPermissions();
  if (!perms.user) redirect("/login?redirect=/admin");
  if (!perms.isAdmin) redirect("/");

  return (
    <AdminShell
      isSuperAdmin={perms.isSuperAdmin}
      permissions={perms.permissions}
    >
      <AdminHeader adminName={perms.adminName || "Admin"} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </AdminShell>
  );
}
