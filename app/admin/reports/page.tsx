import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminEcommerceReportAction } from "@/actions/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SalesChart } from "@/features/admin/SalesChart";
import { ReportExports } from "@/features/admin/ReportExports";
import type { EcommerceReport } from "@/lib/admin-reports";
import { requireModulePermission } from "@/lib/auth/permissions";
import {
  TrendingUp,
  DollarSign,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RotateCcw,
  CreditCard,
  Users,
  UserPlus,
  Repeat,
  FileText,
  ArrowUpRight,
} from "lucide-react";

const money = (value: number) => `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeZone: "Asia/Jakarta",
      }).format(new Date(`${value.slice(0, 10)}T12:00:00+07:00`))
    : "-";

function ProductRank({
  title,
  rows,
  low = false,
}: {
  title: string;
  rows: EcommerceReport["best_products"];
  low?: boolean;
}) {
  const max = Math.max(1, ...rows.map((row) => row.units_sold));
  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {low
            ? "Produk terbit dengan unit terjual paling sedikit atau belum ada penjualan."
            : "Diurutkan berdasarkan total unit yang berhasil terjual."}
        </p>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {rows.map((row) => (
          <div key={row.id} className="space-y-1">
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-foreground">{row.name}</span>
              <span className="shrink-0 font-semibold text-muted-foreground">{row.units_sold} unit</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  low ? "bg-amber-500" : "bg-primary"
                }`}
                style={{
                  width: `${Math.max(row.units_sold ? 5 : 0, (row.units_sold / max) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {row.order_count} pesanan · {money(row.item_revenue)}
            </p>
          </div>
        ))}
        {!rows.length && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Belum ada data produk pada periode ini.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerSpendRank({ report }: { report: EcommerceReport }) {
  const maximum = Math.max(1, ...report.top_customers.map((c) => c.spend));
  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Distribusi Belanja Pelanggan Teratas</CardTitle>
        <p className="text-xs text-muted-foreground">
          Pelanggan dengan total nilai pesanan selesai tertinggi di periode ini.
        </p>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {report.top_customers.slice(0, 8).map((customer) => (
          <div key={customer.id} className="space-y-1">
            <div className="flex justify-between gap-3 text-sm">
              <span className="truncate font-medium text-foreground">{customer.name}</span>
              <span className="shrink-0 font-mono font-semibold text-foreground">
                {money(customer.spend)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${Math.max(4, (customer.spend / maximum) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {!report.top_customers.length && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Belum ada data pelanggan pembeli pada periode ini.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

type RecentCompletedOrder = {
  id: string;
  order_number: string;
  status: string;
  grand_total: number;
  courier: string;
  created_at: string;
  users?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

function ReportBody({
  report,
  recentOrders,
}: {
  report: EcommerceReport;
  recentOrders: RecentCompletedOrder[];
}) {
  const summary = report.summary;
  const conversionRate =
    summary.total_orders > 0
      ? ((summary.completed_orders / summary.total_orders) * 100).toFixed(1)
      : "0";
  const repeatRate =
    summary.buying_customers > 0
      ? ((summary.repeat_customers / summary.buying_customers) * 100).toFixed(0)
      : "0";

  return (
    <div className="space-y-8">
      {/* 1. Ringkasan Finansial Utama */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <DollarSign className="size-4 text-emerald-600" />
          Ringkasan Finansial &amp; Pendapatan
        </h2>
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-l-4 border-l-emerald-500 shadow-xs">
            <CardHeader className="pb-1.5 pt-4">
              <p className="text-xs font-medium text-muted-foreground">Total Nilai Penjualan Selesai</p>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {money(summary.completed_sales)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Dari {summary.completed_orders.toLocaleString("id-ID")} pesanan terverifikasi lunas
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-xs">
            <CardHeader className="pb-1.5 pt-4">
              <p className="text-xs font-medium text-muted-foreground">Rata-rata Nilai Pesanan (AOV)</p>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-black font-mono tracking-tight text-foreground">
                {money(summary.average_order_value)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Per transaksi yang berhasil diselesaikan
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500 shadow-xs">
            <CardHeader className="pb-1.5 pt-4">
              <p className="text-xs font-medium text-muted-foreground">Tingkat Penyelesaian Transaksi</p>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-black tracking-tight text-foreground">
                {conversionRate}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {summary.completed_orders} selesai dari {summary.total_orders} total pesanan
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-rose-500 shadow-xs">
            <CardHeader className="pb-1.5 pt-4">
              <p className="text-xs font-medium text-muted-foreground">Pesanan Dibatalkan</p>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                {summary.cancelled_orders.toLocaleString("id-ID")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Batal atau dana dikembalikan (refund)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. Pipeline Pesanan & Kesehatan Pembayaran */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline Pesanan */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-blue-600" />
              <CardTitle className="text-base font-semibold">Pipeline Operasional Pesanan</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4 text-amber-500" /> Menunggu Pembayaran
              </span>
              <span className="font-bold text-foreground">{summary.pending_orders}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Truck className="size-4 text-blue-500" /> Dalam Proses / Pengiriman
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{summary.active_orders}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" /> Selesai (Diterima)
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{summary.completed_orders}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <XCircle className="size-4 text-rose-500" /> Dibatalkan
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{summary.cancelled_orders}</span>
            </div>
          </CardContent>
        </Card>

        {/* Status Pembayaran */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-violet-600" />
              <CardTitle className="text-base font-semibold">Kesehatan &amp; Status Pembayaran</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" /> Pembayaran Berhasil
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {summary.successful_payment_orders}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4 text-amber-500" /> Pembayaran Tertunda / Menunggu Verifikasi
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {summary.pending_payment_orders}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="size-4 text-rose-500" /> Gagal / Kedaluwarsa
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {summary.failed_payment_orders}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <RotateCcw className="size-4 text-purple-500" /> Dana Dikembalikan (Refund)
              </span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {summary.refunded_orders}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Metrik Pelanggan */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Users className="size-4 text-indigo-600" />
          Pertumbuhan &amp; Retensi Pelanggan
        </h2>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Card className="shadow-xs">
            <CardHeader className="pb-1.5 pt-4">
              <p className="text-xs font-medium text-muted-foreground">Pelanggan yang Berbelanja</p>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-bold text-foreground">
                {summary.buying_customers.toLocaleString("id-ID")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Pelanggan unik dengan transaksi berhasil
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-1.5 pt-4">
              <p className="text-xs font-medium text-muted-foreground">Pelanggan Baru</p>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {summary.new_customers.toLocaleString("id-ID")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Pertama kali bertransaksi di periode ini
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-1.5 pt-4">
              <p className="text-xs font-medium text-muted-foreground">Pelanggan Berulang (Repeat)</p>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {summary.repeat_customers.toLocaleString("id-ID")}
                <span className="ml-2 text-xs font-semibold text-muted-foreground">
                  ({repeatRate}% retensi)
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Membeli lebih dari satu kali
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Grafik Penjualan Harian */}
      <Card className="shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Tren Penjualan Harian</CardTitle>
              <p className="text-xs text-muted-foreground">
                Perkembangan jumlah omzet dan order yang selesai dari hari ke hari
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <SalesChart points={report.daily} days={report.days} />
        </CardContent>
      </Card>

      {/* 5. Performa Produk */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ProductRank title="Produk Terlaris (Top Selling)" rows={report.best_products} />
        <ProductRank
          title="Produk Perlu Promosi (Unit Terendah)"
          rows={report.least_products}
          low
        />
      </div>

      {/* 6. Analisis Pelanggan Belanja Tertinggi */}
      <CustomerSpendRank report={report} />

      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold">
            Tabel Pelanggan Belanja Tertinggi
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Rekap transaksi selesai pelanggan dengan nilai belanja terbanyak dalam periode laporan.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="py-3 pr-4 font-semibold">Pelanggan</th>
                  <th className="py-3 pr-4 font-semibold">No. WhatsApp / HP</th>
                  <th className="py-3 pr-4 text-right font-semibold">Pesanan Selesai</th>
                  <th className="py-3 pr-4 text-right font-semibold">Total Belanja</th>
                  <th className="py-3 text-right font-semibold">Terakhir Belanja</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.top_customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 pr-4 font-medium text-foreground">{customer.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{customer.phone || "-"}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{customer.completed_orders}</td>
                    <td className="py-3 pr-4 text-right font-mono font-bold text-foreground">
                      {money(customer.spend)}
                    </td>
                    <td className="py-3 text-right text-xs text-muted-foreground">
                      {formatDate(customer.last_order_day)}
                    </td>
                  </tr>
                ))}
                {!report.top_customers.length && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-muted-foreground">
                      Belum ada pesanan selesai dari pelanggan pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 7. Tabel Rincian Transaksi Selesai Periode Terpilih */}
      {recentOrders.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Transaksi Selesai Terbaru di Periode Terpilih
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Daftar transaksi yang telah terverifikasi lunas &amp; barang diterima oleh pelanggan.
                </p>
              </div>
              <Link
                href="/admin/orders?status=delivered"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Lihat Semua di Menu Pesanan
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase">
                    <th className="py-3 pr-3 font-semibold">No. Pesanan</th>
                    <th className="py-3 px-3 font-semibold">Pelanggan</th>
                    <th className="py-3 px-3 font-semibold">Tanggal Transaksi</th>
                    <th className="py-3 px-3 font-semibold">Metode / Kurir</th>
                    <th className="py-3 px-3 text-right font-semibold">Total Tagihan</th>
                    <th className="py-3 px-3 text-center font-semibold">Status</th>
                    <th className="py-3 pl-3 text-right font-semibold">Faktur</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-3 font-mono font-bold text-foreground">
                        {ord.order_number}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-foreground">
                          {ord.users?.full_name || "Pelanggan"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {ord.users?.phone || ord.users?.email || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Jakarta",
                        }).format(new Date(ord.created_at))}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        <span className="capitalize">{ord.courier}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                        {money(ord.grand_total)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-none font-semibold text-[11px]">
                          Selesai
                        </Badge>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <Link
                          href={`/orders/${ord.id}/invoice`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <FileText className="size-3.5" />
                          Faktur
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  try {
    await requireModulePermission("reports");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const params = await searchParams;
  const requested = Number.parseInt(params.days ?? "30", 10);
  const days = [7, 30, 90, 365].includes(requested) ? requested : 30;
  let report: EcommerceReport | null = null;
  try {
    report = await getAdminEcommerceReportAction(days);
  } catch {
    /* Show an actionable migration notice until the report RPC has been deployed. */
  }

  // Also fetch recent completed orders in the period to display actionable transaction list
  let recentOrders: RecentCompletedOrder[] = [];
  if (report) {
    try {
      const adminClient = getSupabaseAdminClient();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const { data } = await adminClient
        .from("orders")
        .select(
          `
          id,
          order_number,
          status,
          grand_total,
          courier,
          created_at,
          users:user_id (
            full_name,
            email,
            phone
          )
        `
        )
        .eq("status", "delivered")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);
      recentOrders = (data as unknown as RecentCompletedOrder[]) ?? [];
    } catch {
      // Non-blocking fallback
    }
  }

  return (
    <section className="admin-report-print mx-auto w-full max-w-7xl space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Laporan &amp; Analitik Penjualan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Laporan komprehensif performa transaksi, omzet selesai, kesehatan pembayaran, dan perilaku pelanggan.
          </p>
        </div>
        {report && <ReportExports report={report} />}
      </header>

      {/* Period Selection Navigation */}
      <nav
        className="no-print flex flex-wrap items-center gap-2 border-b pb-4"
        aria-label="Pilih periode laporan"
      >
        <span className="text-xs font-semibold text-muted-foreground mr-1">Periode Waktu:</span>
        {[7, 30, 90, 365].map((value) => (
          <Link
            key={value}
            href={`/admin/reports?days=${value}`}
            aria-current={days === value ? "page" : undefined}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${
              days === value
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border hover:bg-muted text-foreground"
            }`}
          >
            {value === 365 ? "12 Bulan Terakhir" : `${value} Hari Terakhir`}
          </Link>
        ))}
      </nav>

      {report ? (
        <>
          <ReportBody report={report} recentOrders={recentOrders} />
          <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-0.5">ℹ️ Catatan Metrik Operasional:</p>
            Nilai omzet pada laporan ini bersumber dari seluruh pesanan yang telah berstatus <strong>Selesai (delivered)</strong>, termasuk biaya ongkos kirim dan potongan voucher sesuai grand total faktur resmi.
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <h2 className="text-lg font-semibold">Laporan belum aktif di database</h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              Migrasi `20261013000000_ecommerce_analytics_reports.sql` perlu diterapkan agar ringkasan bisa dihitung aman di database. Cek daftar migrasi terlebih dahulu; jangan reset database.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
