import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/layouts/AdminSidebar";
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
  const { user, isAdmin } = await getAdminAccess();
  if (!user) redirect("/login?redirect=/admin");
  if (!isAdmin) redirect("/");

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminSidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <AdminHeader />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
