import Link from "next/link";
import { getAdminEcommerceReportAction } from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesChart } from "@/features/admin/SalesChart";
import { ReportExports } from "@/features/admin/ReportExports";
import type { EcommerceReport } from "@/lib/admin-reports";

const money = (value: number) => `Rp ${Number(value).toLocaleString("id-ID")}`;
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${value.slice(0, 10)}T12:00:00+07:00`)) : "-";

function ProductRank({ title, rows, low = false }: { title: string; rows: EcommerceReport["best_products"]; low?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => row.units_sold));
  return <Card><CardHeader><CardTitle>{title}</CardTitle><p className="text-sm text-muted-foreground">{low ? "Produk terbit dengan unit terjual paling sedikit, termasuk yang belum terjual." : "Diurutkan berdasarkan jumlah unit terjual."}</p></CardHeader><CardContent className="space-y-4">{rows.map((row) => <div key={row.id} className="space-y-1.5"><div className="flex items-start justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium">{row.name}</span><span className="shrink-0 text-muted-foreground">{row.units_sold} unit</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${low ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.max(row.units_sold ? 4 : 0, row.units_sold / max * 100)}%` }} /></div><p className="text-xs text-muted-foreground">{row.order_count} pesanan · {money(row.item_revenue)}</p></div>)}{!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data produk pada periode ini.</p>}</CardContent></Card>;
}

function CustomerSpendRank({ report }: { report: EcommerceReport }) {
  const maximum = Math.max(1, ...report.top_customers.map((customer) => customer.spend));
  return <Card><CardHeader><CardTitle>Belanja pelanggan</CardTitle><p className="text-sm text-muted-foreground">Pelanggan dengan nilai pesanan selesai tertinggi.</p></CardHeader><CardContent className="space-y-4">{report.top_customers.slice(0, 8).map((customer) => <div key={customer.id} className="space-y-1"><div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium">{customer.name}</span><span className="shrink-0 text-muted-foreground">{money(customer.spend)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(4, customer.spend / maximum * 100)}%` }} /></div></div>)}{!report.top_customers.length && <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data pelanggan pembeli.</p>}</CardContent></Card>;
}

function ReportBody({ report }: { report: EcommerceReport }) {
  const summary = report.summary;
  const metrics = [
    ["Total pesanan", summary.total_orders.toLocaleString("id-ID")],
    ["Pesanan selesai", summary.completed_orders.toLocaleString("id-ID")],
    ["Nilai pesanan selesai", money(summary.completed_sales)],
    ["Rata-rata pesanan selesai", money(summary.average_order_value)],
    ["Pelanggan yang membeli", summary.buying_customers.toLocaleString("id-ID")],
    ["Pelanggan berulang", summary.repeat_customers.toLocaleString("id-ID")],
    ["Pelanggan baru", summary.new_customers.toLocaleString("id-ID")],
    ["Menunggu pembayaran", summary.pending_orders.toLocaleString("id-ID")],
    ["Pembayaran sukses", summary.successful_payment_orders.toLocaleString("id-ID")],
    ["Pembayaran gagal/kedaluwarsa", summary.failed_payment_orders.toLocaleString("id-ID")],
    ["Pembayaran dikembalikan", summary.refunded_orders.toLocaleString("id-ID")],
    ["Dalam proses / dikirim", summary.active_orders.toLocaleString("id-ID")],
    ["Pembayaran tertunda", summary.pending_payment_orders.toLocaleString("id-ID")],
    ["Dibatalkan", summary.cancelled_orders.toLocaleString("id-ID")],
  ];
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><p className="text-sm text-muted-foreground">{label}</p></CardHeader><CardContent><p className="text-2xl font-bold">{value}</p></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Penjualan harian</CardTitle></CardHeader><CardContent><SalesChart points={report.daily} days={report.days} /></CardContent></Card>
    <div className="grid gap-6 xl:grid-cols-2"><ProductRank title="Produk paling laku" rows={report.best_products} /><ProductRank title="Produk paling sedikit terjual" rows={report.least_products} low /></div>
    <CustomerSpendRank report={report} />
    <Card><CardHeader><CardTitle>Pelanggan dengan belanja tertinggi</CardTitle><p className="text-sm text-muted-foreground">Hanya pesanan berstatus selesai dalam periode laporan.</p></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="pb-3 pr-4 font-medium">Pelanggan</th><th className="pb-3 pr-4 font-medium">Telepon</th><th className="pb-3 pr-4 text-right font-medium">Pesanan</th><th className="pb-3 pr-4 text-right font-medium">Total belanja</th><th className="pb-3 text-right font-medium">Terakhir beli</th></tr></thead><tbody>{report.top_customers.map((customer) => <tr key={customer.id} className="border-b last:border-0"><td className="py-3 pr-4 font-medium">{customer.name}</td><td className="py-3 pr-4">{customer.phone || "-"}</td><td className="py-3 pr-4 text-right">{customer.completed_orders}</td><td className="py-3 pr-4 text-right">{money(customer.spend)}</td><td className="py-3 text-right">{formatDate(customer.last_order_day)}</td></tr>)}{!report.top_customers.length && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Belum ada pesanan selesai dari pelanggan pada periode ini.</td></tr>}</tbody></table></div></CardContent></Card>
  </div>;
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const params = await searchParams;
  const requested = Number.parseInt(params.days ?? "30", 10);
  const days = [7, 30, 90, 365].includes(requested) ? requested : 30;
  let report: EcommerceReport | null = null;
  try { report = await getAdminEcommerceReportAction(days); } catch { /* Show an actionable migration notice until the report RPC has been deployed. */ }

  return <section className="admin-report-print mx-auto w-full max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Laporan ecommerce</h1><p className="mt-1 text-muted-foreground">Ringkasan pesanan, produk, dan pelanggan berdasarkan transaksi selesai.</p></div>{report && <ReportExports report={report} />}</header>
    <nav className="no-print flex flex-wrap items-center gap-2" aria-label="Pilih periode laporan">{[7, 30, 90, 365].map((value) => <Link key={value} href={`/admin/reports?days=${value}`} aria-current={days === value ? "page" : undefined} className={`rounded-lg border px-4 py-2 text-sm ${days === value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{value === 365 ? "12 bulan" : `${value} hari`}</Link>)}</nav>
    {report ? <><ReportBody report={report} /><p className="text-xs text-muted-foreground">Nilai penjualan pada laporan ini adalah total pesanan berstatus selesai, termasuk ongkir sesuai grand total. Ini laporan operasional, bukan rekonsiliasi bank atau laporan laba bersih.</p></> : <Card><CardContent className="space-y-3 py-10 text-center"><h2 className="text-lg font-semibold">Laporan belum aktif di database</h2><p className="mx-auto max-w-2xl text-sm text-muted-foreground">Migrasi `20261013000000_ecommerce_analytics_reports.sql` perlu diterapkan agar ringkasan bisa dihitung aman di database. Cek daftar migrasi terlebih dahulu; jangan reset database.</p></CardContent></Card>}
  </section>;
}
