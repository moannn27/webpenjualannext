import type { Metadata } from "next";
import { AdminSidebar } from "@/components/layouts/AdminSidebar";
import { AdminHeader } from "@/components/layouts/AdminHeader";
import { AdminGuard } from "@/components/providers/AdminGuard";

export const metadata: Metadata = {
  title: "Admin Dashboard | Next Solution",
  description: "Store management and dashboard.",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-muted/30">
        <AdminSidebar />
        <div className="pl-64 flex flex-col min-h-screen">
          <AdminHeader />
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
