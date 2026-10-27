"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getAdminOrderNotificationsAction,
  getAdminLockedAccountsNotificationAction,
} from "@/actions/admin";
import { type AdminModuleKey } from "@/types/admin-permissions";
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
  History,
  TicketPercent,
  SlidersHorizontal,
  ChevronRight,
  Plus,
  RefreshCw,
  Info,
  FileText,
} from "lucide-react";

export function AdminSidebar({
  isSuperAdmin = false,
  permissions = [],
  collapsed = false,
  onToggleCollapse,
}: {
  isSuperAdmin?: boolean;
  permissions?: AdminModuleKey[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [lockedAccountsCount, setLockedAccountsCount] = useState(0);
  const [newOrderNotice, setNewOrderNotice] = useState("");
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  const latestOrderId = useRef<string | null>(null);
  const hasLoadedOrders = useRef(false);

  useEffect(() => {
    const readTabFromUrl = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        setCurrentTab(params.get("tab"));
      }
    };
    readTabFromUrl();

    const handleSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setCurrentTab(customEvent.detail === "all" ? null : customEvent.detail);
      }
    };

    window.addEventListener("popstate", readTabFromUrl);
    window.addEventListener("admin-switch-tab", handleSwitchTab);
    return () => {
      window.removeEventListener("popstate", readTabFromUrl);
      window.removeEventListener("admin-switch-tab", handleSwitchTab);
    };
  }, [pathname]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    let active = true;
    const pollNotifications = async () => {
      try {
        const [orderResult, lockedResult] = await Promise.all([
          getAdminOrderNotificationsAction().catch(() => null),
          getAdminLockedAccountsNotificationAction().catch(() => null),
        ]);
        if (!active) return;
        if (orderResult) {
          if (hasLoadedOrders.current && orderResult.latestId && orderResult.latestId !== latestOrderId.current) {
            setNewOrderNotice(`Pesanan baru masuk${orderResult.latestOrderNumber ? `: ${orderResult.latestOrderNumber}` : ""}`);
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Pesanan baru", {
                body: orderResult.latestOrderNumber ?? "Ada pesanan baru yang menunggu konfirmasi.",
              });
            }
            try {
              const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
              void audio.play();
            } catch { /* ignore */ }
            window.setTimeout(() => setNewOrderNotice(""), 8000);
          }
          latestOrderId.current = orderResult.latestId;
          hasLoadedOrders.current = true;
          setPendingOrders(orderResult.count);
        }
        if (lockedResult) {
          setLockedAccountsCount(lockedResult.count);
        }
      } catch { /* Keep the admin panel usable if polling is temporarily unavailable. */ }
    };
    void pollNotifications();
    const interval = window.setInterval(() => void pollNotifications(), 20000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const canAccess = (permKey?: AdminModuleKey) => {
    if (isSuperAdmin) return true;
    if (!permKey) return true;
    return permissions.includes(permKey);
  };

  const rawGroups = [
    {
      title: "Ringkasan",
      links: [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Analitik & laporan", href: "/admin/reports", icon: ChartNoAxesCombined, permission: "reports" as AdminModuleKey },
        ...(isSuperAdmin ? [{ name: "Log Aktivitas", href: "/admin/logs", icon: History }] : []),
      ],
    },
    {
      title: "Operasional toko",
      links: [
        { name: "Produk", href: "/admin/products", icon: Package, permission: "products" as AdminModuleKey },
        { name: "Sinkronisasi Stok", href: "/admin/stock-sync", icon: RefreshCw, permission: "products" as AdminModuleKey },
        { name: "Kategori", href: "/admin/categories", icon: Tags, permission: "categories" as AdminModuleKey },
        { name: "Brand", href: "/admin/brands", icon: Store, permission: "brands" as AdminModuleKey },
        { name: "Pesanan", href: "/admin/orders", icon: ShoppingCart, permission: "orders" as AdminModuleKey },
        { name: "Faktur Manual", href: "/admin/invoices", icon: FileText, permission: "invoices" as AdminModuleKey },
        { name: "Voucher", href: "/admin/vouchers", icon: TicketPercent, permission: "vouchers" as AdminModuleKey },
        { name: "Pelanggan & Staf", href: "/admin/customers", icon: Users, permission: "customers" as AdminModuleKey },
      ],
    },
    {
      title: "Konten & Pengaturan",
      links: [
        { name: "Landing page", href: "/admin/content", icon: Images, permission: "content" as AdminModuleKey },
        { name: "Tentang Kami (About)", href: "/admin/about", icon: Info, permission: "content" as AdminModuleKey },
        { name: "Fitur & Pengaturan", href: "/admin/content?tab=features", icon: SlidersHorizontal, permission: "content" as AdminModuleKey },
      ],
    },
  ];

  const groups = rawGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => canAccess(link.permission)),
    }))
    .filter((group) => group.links.length > 0);

  const renderLinks = () =>
    groups.map((group) => (
      <section key={group.title} className="space-y-1 border-t border-border/60 pt-3 first:border-0 first:pt-0">
        <h2 className={cn("mb-2 px-3 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70", collapsed && "lg:hidden")}>
          {group.title}
        </h2>
        {group.links.map((link) => {
          const isFeaturesLink = link.href.includes("tab=features");
          const isLandingPageLink = link.href === "/admin/content";

          let isActive = false;
          if (isFeaturesLink) {
            isActive = pathname === "/admin/content" && currentTab === "features";
          } else if (isLandingPageLink) {
            isActive = pathname === "/admin/content" && currentTab !== "features";
          } else {
            isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
          }

          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              title={collapsed ? `${link.name}${link.href === "/admin/orders" && pendingOrders ? ` · ${pendingOrders} menunggu` : ""}` : undefined}
              aria-label={link.href === "/admin/orders" && pendingOrders ? `${link.name}, ${pendingOrders} menunggu` : link.name}
              onClick={() => {
                setMobileOpen(false);
                if (isFeaturesLink) {
                  setCurrentTab("features");
                  window.dispatchEvent(new CustomEvent("admin-switch-tab", { detail: "features" }));
                  if (pathname === "/admin/content") {
                    const el = document.getElementById("storefront-features-section") || document.getElementById("storefront-settings-tabs");
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                } else if (isLandingPageLink) {
                  setCurrentTab(null);
                  window.dispatchEvent(new CustomEvent("admin-switch-tab", { detail: "all" }));
                  if (pathname === "/admin/content") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }
              }}
              className={cn(
                "relative flex items-center gap-3 rounded-2xl py-2.5 text-sm font-semibold transition-all",
                collapsed ? "justify-center px-2 lg:px-2" : "justify-between px-3.5",
                isActive
                  ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-blue-50/70 dark:hover:bg-blue-950/20 hover:text-[#2563EB] dark:hover:text-[#60A5FA]"
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-[#2563EB]")} />
                <span className={collapsed ? "lg:hidden" : "truncate"}>{link.name}</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {link.href === "/admin/orders" && pendingOrders > 0 && (
                  <span aria-hidden="true" className="grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                    {pendingOrders > 99 ? "99+" : pendingOrders}
                  </span>
                )}
                {link.href === "/admin/customers" && lockedAccountsCount > 0 && (
                  <span
                    aria-hidden="true"
                    title={`${lockedAccountsCount} akun pelanggan terkunci & butuh reset password`}
                    className="grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white animate-pulse"
                  >
                    {lockedAccountsCount > 99 ? "99+" : lockedAccountsCount}
                  </span>
                )}
                {isActive && !collapsed && (
                  <ChevronRight className="size-4 shrink-0 text-white/90 hidden lg:block" />
                )}
              </div>
            </Link>
          );
        })}
      </section>
    ));

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Tutup menu" : "Buka menu admin"}
        aria-expanded={mobileOpen}
        className="fixed left-3 top-3 z-[60] grid size-10 place-items-center rounded-lg border bg-card shadow-sm lg:hidden"
      >
        {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {mobileOpen && (
        <button
          aria-label="Tutup menu admin"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#23252C] shadow-xs transition-all duration-200",
          collapsed ? "lg:w-[76px]" : "lg:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className={cn("flex h-18 items-center border-b border-slate-100 dark:border-white/5", collapsed ? "justify-between px-4 lg:justify-center lg:px-2" : "justify-between px-5")}>
          <Link href="/admin" className="flex items-center gap-2.5">
            {/* Finly brand 3 rising bars icon */}
            <div className="flex items-end gap-1 h-6 shrink-0">
              <span className="w-1.5 h-3 bg-gradient-to-t from-[#2563EB] to-[#3B82F6] rounded-full" />
              <span className="w-1.5 h-4.5 bg-gradient-to-t from-[#2563EB] to-[#3B82F6] rounded-full" />
              <span className="w-1.5 h-6 bg-gradient-to-t from-[#2563EB] to-[#3B82F6] rounded-full" />
            </div>
            <div className={cn("flex flex-col", collapsed && "lg:hidden")}>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">
                Next Solution
              </span>
              <span className="text-[10px] font-semibold text-[#2563EB] tracking-wider uppercase mt-1">
                Admin Panel
              </span>
            </div>
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Ciutkan navigasi"
              title="Ciutkan navigasi"
              className="hidden rounded-xl p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 lg:grid transition-colors"
            >
              <PanelLeftClose className="size-4" />
            </button>
          )}
          {collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Buka navigasi penuh"
              title="Buka navigasi penuh"
              className="absolute -right-3.5 top-6 hidden size-7 place-items-center rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-[#23252C] text-slate-500 shadow-sm hover:text-slate-900 dark:hover:text-white lg:grid"
            >
              <PanelLeftOpen className="size-3.5" />
            </button>
          )}
        </div>

        {/* Quick Action Pills like Finly '+ Add income' & '+ Add expense' */}
        {!collapsed && (
          <div className="px-4 pt-3.5 pb-1 flex flex-col gap-2">
            <Link
              href="/admin/products?action=new"
              className="w-full rounded-full border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#1E2028] hover:border-[#2563EB] dark:hover:border-[#2563EB] text-slate-700 dark:text-slate-200 hover:text-[#2563EB] font-semibold text-xs py-2 px-3 flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            >
              <Plus className="size-3.5 text-[#2563EB]" />
              <span>Tambah Produk</span>
            </Link>
            <Link
              href="/admin/products?tab=import"
              className="w-full rounded-full border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#1E2028] hover:border-[#FFB020] dark:hover:border-[#FFB020] text-slate-700 dark:text-slate-200 hover:text-[#FFB020] font-semibold text-xs py-2 px-3 flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            >
              <Plus className="size-3.5 text-[#FFB020]" />
              <span>Upload Massal</span>
            </Link>
          </div>
        )}
        
        <nav aria-label="Navigasi admin" className="flex-1 overflow-y-auto px-3 py-3">
          {newOrderNotice && (
            <Link
              href="/admin/orders"
              role="status"
              onClick={() => setNewOrderNotice("")}
              className="mb-3 block rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-800/40 dark:bg-blue-950/30 p-3 text-sm font-semibold text-[#2563EB] dark:text-blue-300 shadow-2xs"
            >
              {newOrderNotice}
              <span className="mt-1 block text-xs font-normal opacity-85">Buka untuk periksa pesanan dan pembayaran.</span>
            </Link>
          )}
          <div className="space-y-2">{renderLinks()}</div>
        </nav>

        <div className={cn("border-t border-slate-100 dark:border-white/5", collapsed ? "p-2" : "p-3")}>
          <Link
            href="/"
            title={collapsed ? "Kembali ke Toko" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-2xl py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all hover:bg-blue-50/70 dark:hover:bg-blue-950/20 hover:text-[#2563EB] dark:hover:text-[#60A5FA]",
              collapsed ? "justify-center px-2" : "px-3"
            )}
          >
            <div className="grid size-7 place-items-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
              <LogOut className="h-3.5 w-3.5" />
            </div>
            <span className={collapsed ? "lg:hidden" : undefined}>Kembali ke Toko</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
