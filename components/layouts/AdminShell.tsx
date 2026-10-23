"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/layouts/AdminSidebar";
import { type AdminModuleKey } from "@/types/admin-permissions";

export function AdminShell({
  children,
  isSuperAdmin,
  permissions = [],
}: {
  children: React.ReactNode;
  isSuperAdmin: boolean;
  permissions?: AdminModuleKey[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div
      data-admin-shell
      className="min-h-screen bg-[#F0F2F9] dark:bg-[#18191E] text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-[#7C5CFC] selection:text-white transition-colors duration-200"
    >
      <AdminSidebar
        isSuperAdmin={isSuperAdmin}
        permissions={permissions}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />
      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-200 ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-64"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
