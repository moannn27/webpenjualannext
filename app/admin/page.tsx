import Link from "next/link";
import {
  DollarSign,
  Users,
  CreditCard,
  Package,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ShieldAlert,
  History,
  Bell,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { getDashboardStatsAction, getAdminAllNotificationsAction } from "@/actions/admin";
import { getAdminAccess } from "@/lib/auth/admin";
import { getAdminAuditLogsAction } from "@/actions/admin-permissions";
import type { AdminAuditLog } from "@/lib/storefront-settings";
import { SalesChart } from "@/features/admin/SalesChart";
import { CleanupStorageButton } from "@/features/admin/CleanupStorageButton";
import { createClient } from "@/lib/supabase/server";

const DONUT_COLORS = [
  "#7C5CFC", // Finly Violet
  "#FFB020", // Finly Amber
  "#22C55E", // Finly Green
  "#3B82F6", // Finly Blue
  "#EC4899", // Finly Pink
  "#8B5CF6", // Secondary Purple
  "#64748B", // Slate
];

const ORDER_AVATAR_STYLES = [
  { bg: "bg-[#ECE8FF] text-[#7C5CFC] dark:bg-[#7C5CFC]/20 dark:text-[#A78BFA]" },
  { bg: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
  { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  { bg: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  { bg: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400" },
];

export default async function AdminOverview(props: {
  searchParams?: Promise<{ threshold?: string; error?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const parsedThreshold = Number(searchParams?.threshold);
  const threshold = [3, 5, 10, 15, 20].includes(parsedThreshold) ? parsedThreshold : 5;
  const isForbidden = searchParams?.error === "forbidden";

  const supabase = await createClient();

  const [stats, adminAccess, notifData, categoryRes] = await Promise.all([
    getDashboardStatsAction(threshold),
    getAdminAccess(),
    getAdminAllNotificationsAction().catch(() => ({
      notifications: [],
      counts: { total: 0, orders: 0, stock: 0, security: 0 },
    })),
    supabase.from("categories").select("id, name, products(count)").order("name"),
  ]);

  const isSuperAdmin = adminAccess.role === "super_admin";
  let recentLogs: AdminAuditLog[] = [];
  try {
    const allLogs = await getAdminAuditLogsAction();
    recentLogs = allLogs.slice(0, 8);
  } catch {
    recentLogs = [];
  }

  // Calculate real category distribution for the Finly Donut Chart
  const categoryBreakdown = (categoryRes.data ?? [])
    .map((c) => {
      const pList = Array.isArray(c.products) ? c.products : [];
      const count = pList.reduce(
        (acc: number, curr: { count?: number }) => acc + (Number(curr?.count) || 0),
        0
      );
      return { id: c.id, name: c.name, count };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const totalCatProducts = categoryBreakdown.reduce((sum, c) => sum + c.count, 0) || stats.totalProducts || 1;

  // Donut SVG constants
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const donutSegments = categoryBreakdown.slice(0, 5).reduce<
    Array<{
      id: string;
      dashLength: number;
      strokeOffset: number;
      color: string;
    }>
  >((acc, cat, idx) => {
    const pct = cat.count / totalCatProducts;
    const dashLength = pct * circumference;
    const strokeOffset = acc.reduce((sum, item) => sum + item.dashLength, 0);
    acc.push({
      id: cat.id,
      dashLength,
      strokeOffset,
      color: DONUT_COLORS[idx % DONUT_COLORS.length],
    });
    return acc;
  }, []);

  // 4 Top Metric Cards (Finly Style)
  const metricCards = [
    {
      title: "Pendapatan Selesai",
      value: stats.salesAnalyticsAvailable ? `Rp ${stats.revenue.toLocaleString("id-ID")}` : "—",
      subtext: stats.salesAnalyticsAvailable ? "Lihat laporan performa" : "Perlu migrasi analitik",
      href: "/admin/reports",
      icon: DollarSign,
      cardBg: "bg-[#F5F3FF] dark:bg-purple-950/25 border-purple-100 dark:border-purple-900/30",
      textClass: "text-purple-700 dark:text-purple-300",
      badgeClass: "bg-white/80 dark:bg-white/10 text-purple-600 dark:text-purple-300",
      badge: "+12.5%",
    },
    {
      title: "Total Pesanan",
      value: `${stats.totalOrders.toLocaleString("id-ID")} Pesanan`,
      subtext: "Kelola riwayat pesanan",
      href: "/admin/orders",
      icon: CreditCard,
      cardBg: "bg-[#FFFBEB] dark:bg-amber-950/25 border-amber-100 dark:border-amber-900/30",
      textClass: "text-amber-700 dark:text-amber-300",
      badgeClass: "bg-white/80 dark:bg-white/10 text-amber-600 dark:text-amber-300",
      badge: "+8.2%",
    },
    {
      title: "Katalog Produk",
      value: `${stats.totalProducts.toLocaleString("id-ID")} Produk`,
      subtext: `${stats.publishedProducts.toLocaleString("id-ID")} produk tayang`,
      href: "/admin/products",
      icon: Package,
      cardBg: "bg-[#ECFDF5] dark:bg-emerald-950/25 border-emerald-100 dark:border-emerald-900/30",
      textClass: "text-emerald-700 dark:text-emerald-300",
      badgeClass: "bg-white/80 dark:bg-white/10 text-emerald-600 dark:text-emerald-300",
      badge: `${categoryBreakdown.length} Kategori`,
    },
    {
      title: "Total Pelanggan",
      value: `${stats.totalUsers.toLocaleString("id-ID")} Akun`,
      subtext: "Daftar pelanggan terdaftar",
      href: "/admin/customers",
      icon: Users,
      cardBg: "bg-[#EFF6FF] dark:bg-blue-950/25 border-blue-100 dark:border-blue-900/30",
      textClass: "text-blue-700 dark:text-blue-300",
      badgeClass: "bg-white/80 dark:bg-white/10 text-blue-600 dark:text-blue-300",
      badge: "Aktif",
    },
  ];

  // Goals calculations
  const publishedPct = Math.min(100, Math.round((stats.publishedProducts / (stats.totalProducts || 1)) * 100));
  const safeStockCount = Math.max(0, stats.totalProducts - stats.lowStockProducts);
  const safeStockPct = Math.min(100, Math.round((safeStockCount / (stats.totalProducts || 1)) * 100));

  return (
    <div className="space-y-6 pb-12">
      {/* Alert Akses Ditolak jika staf diarahkan kembali */}
      {isForbidden && (
        <div className="flex items-center gap-3 rounded-[20px] border border-destructive/40 bg-destructive/10 p-4 text-destructive animate-in fade-in">
          <ShieldAlert className="size-5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Akses Terbatas / Ditolak</p>
            <p className="text-xs opacity-90">
              Anda tidak memiliki izin untuk mengakses halaman tersebut. Hubungi Super Admin jika memerlukan wewenang tambahan.
            </p>
          </div>
        </div>
      )}

      {/* Pusat Notifikasi Kejadian Toko (Jika ada notif aktif) */}
      {notifData.counts.total > 0 && (
        <div className="rounded-[24px] bg-white dark:bg-[#23252C] p-4 sm:p-5 border border-slate-100 dark:border-white/5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-[#ECE8FF] dark:bg-[#7C5CFC]/20 text-[#7C5CFC] dark:text-[#A78BFA] flex items-center justify-center">
                <Bell className="size-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pusat Kejadian &amp; Peringatan Toko</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ada {notifData.counts.total} kejadian aktif menunggu perhatian Anda.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#7C5CFC]/10 text-[#7C5CFC] dark:text-[#A78BFA] text-xs font-bold">
              {notifData.counts.total} Menunggu Respon
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 pt-1">
            <Link
              href="/admin/customers"
              className={`group flex items-center justify-between gap-3 rounded-2xl p-3.5 transition-all ${
                notifData.counts.security > 0
                  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100"
                  : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldAlert className="size-4.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Akun Terkunci</p>
                  <p className="text-[11px] opacity-80 truncate">
                    {notifData.counts.security > 0 ? `${notifData.counts.security} akun salah 3x PIN` : "Semua akun normal"}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/admin/orders"
              className={`group flex items-center justify-between gap-3 rounded-2xl p-3.5 transition-all ${
                notifData.counts.orders > 0
                  ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100"
                  : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Package className="size-4.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Pesanan Baru</p>
                  <p className="text-[11px] opacity-80 truncate">
                    {notifData.counts.orders > 0 ? `${notifData.counts.orders} pesanan perlu diproses` : "Tidak ada antrean"}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <a
              href="#stok-menipis"
              className={`group flex items-center justify-between gap-3 rounded-2xl p-3.5 transition-all ${
                notifData.counts.stock > 0
                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100"
                  : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="size-4.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Stok Menipis</p>
                  <p className="text-[11px] opacity-80 truncate">
                    {notifData.counts.stock > 0 ? `${notifData.counts.stock} produk segera habis` : "Stok aman"}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      )}

      {/* 1. ROW 1: 4 TOP METRIC CARDS (Pastel Tint Cards from Reference Screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {metricCards.map(({ title, value, subtext, href, cardBg, textClass, badgeClass, badge }) => (
          <div
            key={title}
            className={`rounded-2xl border p-5 shadow-2xs relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${cardBg}`}
          >
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className={textClass}>
                {title}
              </span>
              <div className="flex items-center gap-1.5">
                {badge && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 shadow-2xs ${badgeClass}`}>
                    <TrendingUp className="size-2.5" /> {badge}
                  </span>
                )}
                <Link
                  href={href}
                  aria-label={`Buka ${title}`}
                  className="size-7 rounded-full bg-white/70 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-105 transition duration-200 shadow-2xs"
                >
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {value}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <span className="opacity-80 font-medium text-[11px]">{subtext}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. ROW 2: MAIN FINLY DASHBOARD GRID (12 Columns) */}
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT COLUMN: ~68% (xl:col-span-8) */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          {/* Main Chart Card (Income vs. Expenses equivalent) */}
          <div className="finly-card bg-white dark:bg-[#23252C] rounded-[26px] p-6 border border-slate-100 dark:border-white/5 shadow-xs">
            {stats.salesAnalyticsAvailable ? (
              <SalesChart points={stats.salesChart} />
            ) : (
              <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                Analitik belum aktif. Terapkan migrasi database grafik untuk membaca penjualan secara akurat.
              </div>
            )}
          </div>

          {/* Bottom 2 Sub-Cards Row (Your Cards & Goals equivalent) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card A: "Your cards" equivalent -> Status Inventaris & Pantauan Stok */}
            <div
              id="stok-menipis"
              className="finly-card bg-white dark:bg-[#23252C] rounded-[26px] p-6 border border-slate-100 dark:border-white/5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Katalog &amp; Inventaris
                  </h3>
                  <Link
                    href="/admin/products"
                    className="text-xs font-semibold text-[#7C5CFC] hover:underline"
                  >
                    Semua Produk
                  </Link>
                </div>

                {/* Sleek Gradient Inventory Card Preview */}
                <div className="bg-gradient-to-tr from-[#7C5CFC] via-[#8565FD] to-[#A78BFA] p-5 rounded-2xl text-white shadow-md relative overflow-hidden select-none">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-wider opacity-85 uppercase">
                      Next Solution Inventory
                    </span>
                    <Sparkles className="size-4 opacity-80" />
                  </div>
                  <div className="mt-4">
                    <p className="text-[11px] opacity-75">STATUS STOK AMAN</p>
                    <p className="text-xl font-black tracking-tight mt-0.5">
                      {safeStockCount} / {stats.totalProducts} Unit Siap Jual
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[11px] opacity-90 pt-1 border-t border-white/15">
                    <span>{stats.lowStockProducts} item perlu restock</span>
                    <span className="font-mono font-bold">Thres: ≤{threshold}</span>
                  </div>
                </div>

                {/* Threshold Filter Selector */}
                <div className="mt-4 flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Batas stok:
                  </span>
                  <div className="flex items-center gap-1">
                    {[3, 5, 10, 15, 20].map((val) => (
                      <Link
                        key={val}
                        href={`/admin?threshold=${val}#stok-menipis`}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-all ${
                          threshold === val
                            ? "bg-[#7C5CFC] text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                        }`}
                      >
                        ≤{val}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Low Stock Items List */}
                <div className="mt-4 space-y-2 max-h-[170px] overflow-y-auto pr-1">
                  {stats.lowStockItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/admin/products?search=${encodeURIComponent(item.sku !== "-" ? item.sku : item.name)}`}
                      className="group flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 hover:border-[#7C5CFC]/40 hover:bg-slate-50 dark:hover:bg-white/5 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-[#7C5CFC] transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          SKU: {item.sku} • {item.brand}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold shrink-0 ${
                          item.stock === 0
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                        }`}
                      >
                        {item.stock} unit
                      </span>
                    </Link>
                  ))}
                  {!stats.lowStockItems.length && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Semua stok aman! Tidak ada produk ≤ {threshold} unit.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card B: "Goals" equivalent -> Target & Performa Toko */}
            <div className="finly-card bg-white dark:bg-[#23252C] rounded-[26px] p-6 border border-slate-100 dark:border-white/5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Target &amp; Performa
                  </h3>
                  <span className="text-xs font-bold text-[#7C5CFC] bg-[#ECE8FF] dark:bg-[#7C5CFC]/20 px-2.5 py-0.5 rounded-full">
                    Oktober 2026
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Goal 1: Produk Siap Tayang */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Kesiapan Produk Tayang
                      </span>
                      <span className="font-mono font-bold text-[#7C5CFC]">{publishedPct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#7C5CFC] h-full rounded-full transition-all duration-500"
                        style={{ width: `${publishedPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {stats.publishedProducts} dari {stats.totalProducts} produk aktif di etalase toko
                    </p>
                  </div>

                  {/* Goal 2: Pesanan Masuk */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Volume Pesanan
                      </span>
                      <span className="font-mono font-bold text-[#FFB020]">
                        {stats.totalOrders} Pesanan
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#FFB020] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (stats.totalOrders / 50) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Seluruh transaksi diproses dan tercatat di sistem
                    </p>
                  </div>

                  {/* Goal 3: Kesiapan Stok Aman */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Kesehatan Inventaris
                      </span>
                      <span className="font-mono font-bold text-[#22C55E]">{safeStockPct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#22C55E] h-full rounded-full transition-all duration-500"
                        style={{ width: `${safeStockPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {safeStockCount} produk berada di atas batas minimum stok
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>Rasio Kesiapan: Optimal</span>
                <Link
                  href="/admin/categories"
                  className="font-bold text-[#7C5CFC] hover:underline"
                >
                  Kelola Kategori &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ~32% (xl:col-span-4) */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          {/* Top Card: "Recent Transaction" */}
          <div className="finly-card bg-white dark:bg-[#23252C] rounded-[26px] p-6 border border-slate-100 dark:border-white/5 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Transaction
              </h3>
              <Link
                href="/admin/orders"
                className="text-xs font-semibold text-[#7C5CFC] hover:underline"
              >
                See all
              </Link>
            </div>

            <div className="space-y-3.5">
              {stats.recentOrders.map((order, idx) => {
                const avatarStyle = ORDER_AVATAR_STYLES[idx % ORDER_AVATAR_STYLES.length];
                const custName = order.users?.[0]?.full_name || "Pelanggan";
                const initial = custName.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`size-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarStyle.bg}`}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {custName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {order.order_number}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                        Rp {Number(order.grand_total).toLocaleString("id-ID")}
                      </p>
                      <span
                        className={`inline-block px-2 py-0.2 text-[9px] font-bold rounded-full mt-0.5 ${
                          order.status === "delivered"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : order.status === "cancelled"
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                            : "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                );
              })}

              {!stats.recentOrders.length && (
                <div className="py-12 text-center text-xs text-slate-400">
                  Belum ada pesanan terbaru.
                </div>
              )}
            </div>
          </div>

          {/* Bottom Card: "Expense categories" / Distribusi Kategori Produk */}
          <div className="finly-card bg-white dark:bg-[#23252C] rounded-[26px] p-6 border border-slate-100 dark:border-white/5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Kategori Produk
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ChevronLeft className="size-3.5 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200" />
                <span className="font-semibold text-slate-600 dark:text-slate-300">Oktober 2026</span>
                <ChevronRight className="size-3.5 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200" />
              </div>
            </div>

            {/* Central SVG Donut Chart */}
            <div className="relative size-44 sm:size-48 mx-auto my-3 flex items-center justify-center">
              <svg viewBox="0 0 160 160" className="size-full -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="18"
                  className="text-slate-100 dark:text-white/5"
                />

                {/* Segments */}
                {donutSegments.map((segment) => (
                  <circle
                    key={segment.id}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="18"
                    strokeDasharray={`${segment.dashLength} ${circumference}`}
                    strokeDashoffset={-segment.strokeOffset}
                    className="transition-all duration-500"
                  />
                ))}
              </svg>

              {/* Center Total Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {stats.totalProducts}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Produk
                </span>
              </div>
            </div>

            {/* Category Breakdown Legend */}
            <div className="mt-5 space-y-2.5">
              {categoryBreakdown.slice(0, 5).map((cat, idx) => {
                const color = DONUT_COLORS[idx % DONUT_COLORS.length];
                const pct = Math.round((cat.count / totalCatProducts) * 100);

                return (
                  <div key={cat.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-900 dark:text-white shrink-0">
                      <span>{cat.count}</span>
                      <span className="text-slate-400 font-normal text-[11px] w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. ROW 3: AUDIT LOG (Log Kejadian & Aktivitas Toko) */}
      <div className="finly-card bg-white dark:bg-[#23252C] rounded-[26px] p-6 border border-slate-100 dark:border-white/5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="size-4 text-[#7C5CFC]" />
              Log Kejadian &amp; Aktivitas Toko (Audit Trail)
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Catatan otomatis dari seluruh aksi staf admin, status pesanan, dan inventaris.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Multi-format export pills */}
            <div className="flex items-center gap-1 rounded-full bg-slate-50 dark:bg-white/5 p-1 border border-slate-200/60 dark:border-white/10 text-xs">
              <a
                href="/api/admin/reports/logs?format=csv"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition shadow-2xs"
                title="Unduh log ke Excel (CSV)"
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                CSV
              </a>
              <a
                href="/api/admin/reports/logs?format=doc"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition shadow-2xs"
                title="Unduh log ke Word (.doc)"
              >
                <FileText className="size-3.5 text-blue-600" />
                Word
              </a>
              <a
                href="/api/admin/reports/logs?format=html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition shadow-2xs"
                title="Cetak / PDF"
              >
                <Printer className="size-3.5 text-purple-600" />
                PDF
              </a>
            </div>

            {isSuperAdmin && (
              <Link
                href="/admin/logs"
                className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#7C5CFC] bg-[#ECE8FF] dark:bg-[#7C5CFC]/20 hover:opacity-90 transition"
              >
                Semua Log &rarr;
              </Link>
            )}

            <CleanupStorageButton />
          </div>
        </div>

        {recentLogs.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      log.action === "create"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : log.action === "update"
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                        : log.action === "status_change"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                    }`}
                  >
                    {log.action}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      <span className="text-[#7C5CFC] font-bold">{log.admin_name}</span>{" "}
                      <span className="text-slate-400">({log.admin_role})</span> — {log.details}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Target: {log.entity_name} ({log.entity_type})
                    </p>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 font-mono">
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date(log.created_at))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            Belum ada catatan aktivitas admin terbaru.
          </div>
        )}
      </div>
    </div>
  );
}
