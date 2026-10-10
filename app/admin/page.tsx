import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, CreditCard, Activity, Package, Tags, AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardStatsAction } from "@/actions/admin";
import { SalesChart } from "@/features/admin/SalesChart";
import { CleanupStorageButton } from "@/features/admin/CleanupStorageButton";

export default async function AdminOverview(props: {
  searchParams?: Promise<{ threshold?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const parsedThreshold = Number(searchParams?.threshold);
  const threshold = [3, 5, 10, 15, 20].includes(parsedThreshold) ? parsedThreshold : 5;
  const stats = await getDashboardStatsAction(threshold);

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

      {/* Alert Notifikasi Stok Menipis (Screenshot 1) */}
      {stats.lowStockProducts > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="font-semibold">
                Perhatian: Ada {stats.lowStockProducts} produk dengan stok menipis (≤ {threshold} unit)
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Segera lakukan restock agar pesanan dan transaksi pelanggan tidak tertunda.
              </p>
            </div>
          </div>
          <a
            href="#stok-menipis"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors"
          >
            Lihat Stok Menipis ↓
          </a>
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
    </div>
  );
}
