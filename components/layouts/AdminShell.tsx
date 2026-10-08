"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/layouts/AdminSidebar";

export function AdminShell({ children, isSuperAdmin }: { children: React.ReactNode; isSuperAdmin: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  return <div data-admin-shell className="min-h-screen bg-muted/30">
    <AdminSidebar isSuperAdmin={isSuperAdmin} collapsed={collapsed} onToggleCollapse={() => setCollapsed((value) => !value)} />
    <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ${collapsed ? "lg:pl-[76px]" : "lg:pl-64"}`}>
      {children}
    </div>
  </div>;
}
