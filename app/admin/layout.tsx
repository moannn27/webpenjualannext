import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/auth/admin";
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
  const { user, isAdmin, role } = await getAdminAccess();
  if (!user) redirect("/login?redirect=/admin");
  if (!isAdmin) redirect("/");

  return <AdminShell isSuperAdmin={role === "super_admin"}><AdminHeader adminName={user.user_metadata?.full_name || user.email || "Admin"} /><main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main></AdminShell>;
}
