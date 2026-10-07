"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Images,
  Tags,
  LogOut,
  Menu,
  X,
  Store,
} from "lucide-react";

const sidebarLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Categories", href: "/admin/categories", icon: Tags },
  { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { name: "Customers", href: "/admin/customers", icon: Users },
];

export function AdminSidebar({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [...sidebarLinks, ...(isSuperAdmin ? [{ name: "Landing page", href: "/admin/content", icon: Images }, { name: "Brands", href: "/admin/brands", icon: Store }] : [])];
  const renderLinks = () => links.map((link) => {
    const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
    const Icon = link.icon;
    return <Link key={link.name} href={link.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />{link.name}</Link>;
  });

  return (
    <>
    <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Tutup menu" : "Buka menu admin"} aria-expanded={mobileOpen} className="fixed left-3 top-3 z-[60] grid size-10 place-items-center rounded-lg border bg-card shadow-sm lg:hidden">{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
    {mobileOpen && <button aria-label="Tutup menu admin" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}
    <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform duration-200", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">N</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">
            Admin
          </span>
        </Link>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <div className="mb-4 px-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main Menu</p>
        </div>
        {renderLinks()}
      </div>

      <div className="p-4 border-t">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <LogOut className="h-4 w-4" />
          Back to Store
        </Link>
      </div>
    </aside>
    </>
  );
}
