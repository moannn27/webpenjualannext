import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Users,
  CreditCard,
  Activity,
  Package,
  Tags,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  History,
  Bell,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardStatsAction, getAdminAllNotificationsAction } from "@/actions/admin";
import { getAdminAccess } from "@/lib/auth/admin";
import { getAdminAuditLogsAction } from "@/actions/admin-permissions";
import type { AdminAuditLog } from "@/lib/storefront-settings";
import { SalesChart } from "@/features/admin/SalesChart";
import { CleanupStorageButton } from "@/features/admin/CleanupStorageButton";

export default async function AdminOverview(props: {
  searchParams?: Promise<{ threshold?: string; error?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const parsedThreshold = Number(searchParams?.threshold);
  const threshold = [3, 5, 10, 15, 20].includes(parsedThreshold) ? parsedThreshold : 5;
  const isForbidden = searchParams?.error === "forbidden";

  const [stats, adminAccess, notifData] = await Promise.all([
    getDashboardStatsAction(threshold),
    getAdminAccess(),
    getAdminAllNotificationsAction().catch(() => ({
      notifications: [],
      counts: { total: 0, orders: 0, stock: 0, security: 0 },
    })),
  ]);

  const isSuperAdmin = adminAccess.role === "super_admin";
  let recentLogs: AdminAuditLog[] = [];
  try {
    const allLogs = await getAdminAuditLogsAction();
    recentLogs = allLogs.slice(0, 8);
  } catch {
    recentLogs = [];
  }

  const cards = [
    {
      title: "Pendapatan selesai",
      value: stats.salesAnalyticsAvailable ? `Rp ${stats.revenue.toLocaleString("id-ID")}` : "—",
      detail: stats.salesAnalyticsAvailable ? "Lihat laporan performa →" : "Perlu migrasi analitik",
      href: "/admin/reports",
      icon: DollarSign,
    },
    {
      title: "Total pesanan",
      value: stats.totalOrders.toLocaleString("id-ID"),
      detail: "Kelola daftar pesanan →",
      href: "/admin/orders",
      icon: CreditCard,
    },
    {
      title: "Katalog produk",
      value: stats.totalProducts.toLocaleString("id-ID"),
      detail: `${stats.publishedProducts.toLocaleString("id-ID")} tayang · Kelola →`,
      href: "/admin/products",
      icon: Activity,
    },
    {
      title: "Kategori",
      value: stats.totalCategories.toLocaleString("id-ID"),
      detail: "Kelola kategori →",
      href: "/admin/categories",
      icon: Tags,
    },
    {
      title: "Pelanggan",
      value: stats.totalUsers.toLocaleString("id-ID"),
      detail: "Daftar pelanggan →",
      href: "/admin/customers",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Ringkasan toko dan pantauan inventaris dari data terbaru.</p>
        </div>
        <CleanupStorageButton />
      </div>

      {/* Alert Akses Ditolak jika staf diarahkan kembali */}
      {isForbidden && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          <ShieldAlert className="size-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Akses Terbatas / Ditolak</p>
            <p className="text-xs opacity-90">
              Anda tidak memiliki izin untuk mengakses halaman atau fitur tersebut. Hubungi Super Admin jika memerlukan wewenang tambahan.
            </p>
          </div>
        </div>
      )}

      {/* Pusat Notifikasi Multi-Kategori (Keamanan, Pesanan, Stok) */}
      {notifData.counts.total > 0 && (
        <div className="rounded-2xl border bg-card p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Bell className="size-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Pusat Notifikasi & Kejadian Toko</h2>
                <p className="text-xs text-muted-foreground">
                  Ada {notifData.counts.total} kejadian aktif yang memerlukan pantauan atau tindak lanjut admin.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
                {notifData.counts.total} Kejadian Aktif
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* 1. Keamanan & Kunci Akun */}
            <Link
              href="/admin/customers"
              className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition-all hover:shadow-xs ${
                notifData.counts.security > 0
                  ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10 text-destructive"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldAlert className="size-4.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate group-hover:underline">Akun Terkunci / Reset</p>
                  <p className="text-[11px] opacity-85 truncate">
                    {notifData.counts.security > 0
                      ? `${notifData.counts.security} akun salah 3x sandi`
                      : "Semua akun normal"}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-3.5 shrink-0 opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* 2. Pesanan Baru / Menunggu Tindakan */}
            <Link
              href="/admin/orders"
              className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition-all hover:shadow-xs ${
                notifData.counts.orders > 0
                  ? "border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Package className="size-4.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate group-hover:underline">Pesanan Baru & Diproses</p>
                  <p className="text-[11px] opacity-85 truncate">
                    {notifData.counts.orders > 0
                      ? `${notifData.counts.orders} pesanan menunggu respon`
                      : "Tidak ada antrean"}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-3.5 shrink-0 opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* 3. Stok Menipis / Kosong */}
            <a
              href="#stok-menipis"
              className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition-all hover:shadow-xs ${
                notifData.counts.stock > 0
                  ? "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-800 dark:text-amber-400"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="size-4.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate group-hover:underline">Stok Menipis / Habis</p>
                  <p className="text-[11px] opacity-85 truncate">
                    {notifData.counts.stock > 0
                      ? `${notifData.counts.stock} produk perlu restock`
                      : "Stok inventaris aman"}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-3.5 shrink-0 opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      )}

      {/* 5 Kartu Navigasi Utama (Screenshot 1 - Clickable to respective pages) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ title, value, detail, href, icon: Icon }) => (
          <Link
            key={title}
            href={href}
            className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">
                  {title}
                </CardTitle>
                <div className="rounded-lg bg-muted p-1.5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {detail && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    <span>{detail}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Grafik Penjualan */}
      <Card>
        <CardHeader>
          <CardTitle>Grafik penjualan</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.salesAnalyticsAvailable ? (
            <SalesChart points={stats.salesChart} />
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Analitik belum aktif. Terapkan migrasi database grafik untuk membaca penjualan secara akurat.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pesanan Terbaru (lg:col-span-4) & Stok Menipis (lg:col-span-3) */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pesanan terbaru</CardTitle>
            <Link href="/admin/orders" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              Semua pesanan <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.users?.[0]?.full_name || "Pelanggan"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "delivered"
                              ? "default"
                              : order.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        Rp {Number(order.grand_total).toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!stats.recentOrders.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Belum ada pesanan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Card Stok Menipis dengan Detail Produk & Pengaturan Batas Stok (Screenshot 1) */}
        <Card id="stok-menipis" className="lg:col-span-3 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4 text-amber-600" />
                Stok Menipis
              </CardTitle>
              <Badge variant={stats.lowStockProducts > 0 ? "destructive" : "secondary"} className="tabular-nums font-mono">
                {stats.lowStockProducts} produk
              </Badge>
            </div>
            {/* Pengatur batas stok menipis */}
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted/50 p-2">
              <span className="text-xs text-muted-foreground">Batas stok:</span>
              <div className="flex items-center gap-1">
                {[3, 5, 10, 15, 20].map((val) => (
                  <Link
                    key={val}
                    href={`/admin?threshold=${val}#stok-menipis`}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                      threshold === val
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    ≤{val}
                  </Link>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-2.5">
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {stats.lowStockItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/products?search=${encodeURIComponent(item.sku !== "-" ? item.sku : item.name)}`}
                  className="group block rounded-lg border border-border/60 bg-card p-2.5 transition-all hover:border-primary/50 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold group-hover:text-primary transition-colors">
                        {item.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[10px]">SKU: {item.sku}</span>
                        <span>·</span>
                        <span>Merk: {item.brand}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-xs font-bold ${
                          item.stock === 0
                            ? "bg-red-500/15 text-red-700 dark:text-red-400"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {item.stock} unit
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              {!stats.lowStockItems.length && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Package className="mx-auto mb-2 size-7 text-muted-foreground/30" />
                  <p className="font-medium">Semua stok aman!</p>
                  <p className="mt-0.5 text-xs">Tidak ada produk dengan stok ≤ {threshold} unit.</p>
                </div>
              )}
            </div>
          </CardContent>
          <div className="border-t p-4 pt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Maksimal 10 produk prioritas</span>
            <Link href="/admin/products" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
              Kelola di Produk <ArrowRight className="size-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Log Kejadian & Aktivitas Toko (Audit Trail) dengan Tombol Unduh Multi-Format */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4 text-primary" />
              Log Kejadian & Aktivitas Toko (Audit Trail)
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Catatan otomatis dari seluruh peristiwa operasional toko, aksi staf admin, status pesanan, dan penyesuaian inventaris.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Unduh Laporan Log (Excel, Word, PDF) */}
            <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground px-2 hidden md:inline">
                Unduh Log:
              </span>
              <a
                href="/api/admin/reports/logs?format=csv"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-background hover:shadow-xs transition-colors"
                title="Unduh log kejadian ke Microsoft Excel (CSV)"
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                Excel (CSV)
              </a>
              <a
                href="/api/admin/reports/logs?format=doc"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-background hover:shadow-xs transition-colors"
                title="Unduh log kejadian ke Microsoft Word (.doc)"
              >
                <FileText className="size-3.5 text-blue-600" />
                Word (.doc)
              </a>
              <a
                href="/api/admin/reports/logs?format=html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-background hover:shadow-xs transition-colors"
                title="Cetak atau Simpan Laporan sebagai PDF"
              >
                <Printer className="size-3.5 text-purple-600" />
                Cetak / PDF
              </a>
            </div>

            {isSuperAdmin && (
              <Link
                href="/admin/logs"
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-primary hover:bg-muted transition-colors"
              >
                Semua Log <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentLogs.length > 0 ? (
            <div className="divide-y rounded-lg border">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        log.action === "create"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : log.action === "update"
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                          : log.action === "status_change"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          : "bg-red-500/15 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {log.action}
                    </span>
                    <div>
                      <p className="font-medium">
                        <span className="font-semibold text-primary">{log.admin_name}</span>{" "}
                        <span className="text-muted-foreground">({log.admin_role})</span>{" "}
                        — {log.details}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Target: {log.entity_name} ({log.entity_type})
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
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
            <div className="py-6 text-center text-xs text-muted-foreground">
              Belum ada catatan aktivitas admin terbaru.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
