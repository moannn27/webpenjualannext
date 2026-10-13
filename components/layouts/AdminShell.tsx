"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/layouts/AdminSidebar";
import { type AdminModuleKey } from "@/types/admin-permissions";
import type { StorefrontSettings } from "@/lib/storefront-settings";

export function AdminShell({
  children,
  isSuperAdmin,
  permissions = [],
  storeSettings,
}: {
  children: React.ReactNode;
  isSuperAdmin: boolean;
  permissions?: AdminModuleKey[];
  storeSettings?: StorefrontSettings;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div data-admin-shell className="min-h-screen bg-muted/30">
      <AdminSidebar
        isSuperAdmin={isSuperAdmin}
        permissions={permissions}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        storeSettings={storeSettings}
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
