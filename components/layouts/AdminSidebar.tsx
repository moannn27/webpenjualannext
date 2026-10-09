"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getAdminOrderNotificationsAction } from "@/actions/admin";
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
  PanelLeftClose,
  PanelLeftOpen,
  ChartNoAxesCombined,
} from "lucide-react";

export function AdminSidebar({ isSuperAdmin = false, collapsed = false, onToggleCollapse }: { isSuperAdmin?: boolean; collapsed?: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [newOrderNotice, setNewOrderNotice] = useState("");
  const latestOrderId = useRef<string | null>(null);
  const hasLoadedOrders = useRef(false);
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    let active = true;
    const pollOrders = async () => {
      try {
        const result = await getAdminOrderNotificationsAction();
        if (!active) return;
        if (hasLoadedOrders.current && result.latestId && result.latestId !== latestOrderId.current) {
          setNewOrderNotice(`Pesanan baru masuk${result.latestOrderNumber ? `: ${result.latestOrderNumber}` : ""}`);
          if ("Notification" in window && Notification.permission === "granted") new Notification("Pesanan baru", { body: result.latestOrderNumber ?? "Ada pesanan baru yang menunggu konfirmasi." });
          try {
            const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
            void audio.play();
          } catch { /* ignore */ }
          window.setTimeout(() => setNewOrderNotice(""), 8000);
        }
        latestOrderId.current = result.latestId;
        hasLoadedOrders.current = true;
        setPendingOrders(result.count);
      } catch { /* Keep the admin panel usable if polling is temporarily unavailable. */ }
    };
    void pollOrders();
    const interval = window.setInterval(() => void pollOrders(), 20000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);
  const groups = [
    { title: "Ringkasan", links: [{ name: "Dashboard", href: "/admin", icon: LayoutDashboard }, { name: "Analitik & laporan", href: "/admin/reports", icon: ChartNoAxesCombined }] },
    { title: "Operasional toko", links: [{ name: "Produk", href: "/admin/products", icon: Package }, { name: "Kategori", href: "/admin/categories", icon: Tags }, ...(isSuperAdmin ? [{ name: "Brand", href: "/admin/brands", icon: Store }] : []), { name: "Pesanan", href: "/admin/orders", icon: ShoppingCart }, { name: "Pelanggan", href: "/admin/customers", icon: Users }] },
    ...(isSuperAdmin ? [{ title: "Konten toko", links: [{ name: "Landing page", href: "/admin/content", icon: Images }] }] : []),
  ];
  const renderLinks = () => groups.map((group) => <section key={group.title} className="space-y-1 border-t border-border/60 pt-3 first:border-0 first:pt-0">
    <h2 className={cn("mb-2 px-3 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70", collapsed && "lg:hidden")}>{group.title}</h2>
    {group.links.map((link) => {
    const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
    const Icon = link.icon;
    return <Link key={link.name} href={link.href} title={collapsed ? `${link.name}${link.href === "/admin/orders" && pendingOrders ? ` · ${pendingOrders} menunggu` : ""}` : undefined} aria-label={link.href === "/admin/orders" && pendingOrders ? `${link.name}, ${pendingOrders} menunggu` : link.name} onClick={() => setMobileOpen(false)} className={cn("relative flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all", collapsed ? "justify-center px-2 lg:px-2" : "justify-between px-3", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><span className="flex min-w-0 items-center gap-3"><Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} /><span className={collapsed ? "lg:hidden" : "truncate"}>{link.name}</span></span>{link.href === "/admin/orders" && pendingOrders > 0 && <span aria-hidden="true" className="grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">{pendingOrders > 99 ? "99+" : pendingOrders}</span>}</Link>;
    })}
  </section>);

  return (
    <>
    <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Tutup menu" : "Buka menu admin"} aria-expanded={mobileOpen} className="fixed left-3 top-3 z-[60] grid size-10 place-items-center rounded-lg border bg-card shadow-sm lg:hidden">{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
    {mobileOpen && <button aria-label="Tutup menu admin" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-all duration-200", collapsed ? "lg:w-[76px]" : "lg:w-64", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
      <div className={cn("flex h-16 items-center border-b", collapsed ? "justify-between px-6 lg:justify-center lg:px-2" : "justify-between px-6")}>
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">N</span>
          </div>
          <span className={cn("text-xl font-bold tracking-tight text-primary", collapsed && "lg:hidden")}>
            Admin
          </span>
        </Link>
        {!collapsed && <button type="button" onClick={onToggleCollapse} aria-label="Ciutkan navigasi" title="Ciutkan navigasi" className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted lg:grid"><PanelLeftClose className="size-4" /></button>}
        {collapsed && <button type="button" onClick={onToggleCollapse} aria-label="Buka navigasi penuh" title="Buka navigasi penuh" className="absolute -right-3 top-[4.5rem] hidden size-7 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground lg:grid"><PanelLeftOpen className="size-4" /></button>}
      </div>
      
      <nav aria-label="Navigasi admin" className="flex-1 overflow-y-auto px-3 py-4">
        {newOrderNotice && <Link href="/admin/orders" role="status" onClick={() => setNewOrderNotice("")} className="mb-3 block rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm font-medium text-primary">{newOrderNotice}<span className="mt-1 block text-xs font-normal">Buka untuk periksa pesanan dan pembayaran.</span></Link>}
        <div className="space-y-3">{renderLinks()}</div>
      </nav>

      <div className={cn("border-t", collapsed ? "p-2" : "p-4")}>
        <Link
          href="/"
          title={collapsed ? "Back to Store" : undefined}
          className={cn("flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground", collapsed ? "justify-center px-2" : "px-3")}
        >
          <LogOut className="h-4 w-4" />
          <span className={collapsed ? "lg:hidden" : undefined}>Back to Store</span>
        </Link>
      </div>
    </aside>
    </>
  );
}
