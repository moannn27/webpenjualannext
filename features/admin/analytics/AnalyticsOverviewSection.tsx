"use client";

import {
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  Target,
  Lightbulb,
} from "lucide-react";
import type { EnhancedAnalyticsReport } from "@/lib/analytics-reporting";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const money = (val: number) => `Rp ${Number(val ?? 0).toLocaleString("id-ID")}`;

export function AnalyticsOverviewSection({ report }: { report: EnhancedAnalyticsReport }) {
  const summary = report.summary;
  const comp = report.comparison;
  const traffic = report.traffic;

  const conversionRate =
    summary.total_orders > 0
      ? ((summary.completed_orders / summary.total_orders) * 100).toFixed(1)
      : "0";

  const dailyAverageSales = Math.round(summary.completed_sales / Math.max(1, report.days));
  const projectedMonthlyRevenue = dailyAverageSales * 30;
  const topProduct = report.best_products[0] || null;
  const leastProduct = report.least_products[0] || null;
  const topCustomer = report.top_customers[0] || null;

  return (
    <div className="space-y-6">
      {/* 1. KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Sales Card */}
        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-[#ECFDF5] dark:bg-emerald-950/25 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span>Total Omzet Selesai</span>
            <DollarSign className="size-4" />
          </div>
          <p className="text-2xl font-black font-mono tracking-tight text-emerald-800 dark:text-emerald-200">
            {money(summary.completed_sales)}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
            {comp.sales_growth_pct !== null ? (
              <span className={`inline-flex items-center font-bold ${comp.sales_growth_pct >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {comp.sales_growth_pct >= 0 ? <ArrowUpRight className="size-3 mr-0.5" /> : <ArrowDownRight className="size-3 mr-0.5" />}
                {comp.sales_growth_pct >= 0 ? `+${comp.sales_growth_pct}%` : `${comp.sales_growth_pct}%`}
              </span>
            ) : (
              <span>Periode baru</span>
            )}
            <span>vs {report.days} hari sebelumnya</span>
          </div>
        </div>

        {/* AOV Card */}
        <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-[#EFF6FF] dark:bg-blue-950/25 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-300">
            <span>Rata-Rata Order (AOV)</span>
            <TrendingUp className="size-4" />
          </div>
          <p className="text-2xl font-black font-mono tracking-tight text-blue-800 dark:text-blue-200">
            {money(summary.average_order_value)}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-blue-700/80 dark:text-blue-400/80">
            {comp.aov_growth_pct !== null ? (
              <span className={`inline-flex items-center font-bold ${comp.aov_growth_pct >= 0 ? "text-blue-700" : "text-rose-600"}`}>
                {comp.aov_growth_pct >= 0 ? `+${comp.aov_growth_pct}%` : `${comp.aov_growth_pct}%`}
              </span>
            ) : null}
            <span>Per transaksi lunas</span>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-[#EEF2FF] dark:bg-indigo-950/25 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <span>Pengunjung Unik</span>
            <Users className="size-4" />
          </div>
          <p className="text-2xl font-black tracking-tight text-indigo-800 dark:text-indigo-200">
            {traffic.tracking_active ? traffic.unique_visitors.toLocaleString("id-ID") : "—"}
          </p>
          <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80">
            {traffic.tracking_active
              ? `${traffic.total_pageviews.toLocaleString("id-ID")} total page views`
              : "Tracking belum merekam sesi di periode ini"}
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-[#F5F3FF] dark:bg-purple-950/25 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-700 dark:text-purple-300">
            <span>Tingkat Konversi</span>
            <CheckCircle2 className="size-4" />
          </div>
          <p className="text-2xl font-black tracking-tight text-purple-800 dark:text-purple-200">
            {conversionRate}%
          </p>
          <p className="text-[11px] text-purple-600/80 dark:text-purple-400/80">
            {summary.completed_orders} lunas dari {summary.total_orders} total pesanan
          </p>
        </div>
      </div>

      {/* 2. Sales Intelligence & Rekomendasi Aksi */}
      <Card className="border-border bg-gradient-to-br from-card via-card to-muted/30 shadow-xs">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Sales Intelligence &amp; Rekomendasi Aksi Toko
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Wawasan analitik performa penjualan untuk membantu admin &amp; staf sales mengambil keputusan operasional.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                <Target className="mr-1.5 size-3.5 text-primary" />
                Run-Rate: {money(dailyAverageSales)}/hari
              </Badge>
              <Badge variant="secondary" className="text-xs font-semibold">
                Proyeksi 30H: {money(projectedMonthlyRevenue)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card A: Follow up Pending */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <Clock className="size-4 shrink-0" />
              <span>Prioritas Follow-Up</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11.5px]">
              Ada <b>{summary.pending_orders} pesanan</b> menanti pembayaran/verifikasi. Segera kirim konfirmasi WhatsApp ke pelanggan agar transaksi tidak kedaluwarsa.
            </p>
          </div>

          {/* Card B: Buffer Stock Top Seller */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
              <TrendingUp className="size-4 shrink-0" />
              <span>Jaga Stok Unggulan</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11.5px]">
              {topProduct ? (
                <>
                  Produk <b>{topProduct.name}</b> memimpin dengan {topProduct.units_sold} unit. Pastikan koordinasi restock distributor berjalan lancar.
                </>
              ) : (
                "Belum ada produk dominan di periode ini. Pantau pergerakan katalog terbit."
              )}
            </p>
          </div>

          {/* Card C: Bundling & Promo Slow Movers */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300">
              <Lightbulb className="size-4 shrink-0" />
              <span>Strategi Perputaran Modal</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11.5px]">
              {leastProduct ? (
                <>
                  Produk <b>{leastProduct.name}</b> memiliki unit terendah. Disarankan buat promo kombo atau diskon bundling aksesoris di etalase.
                </>
              ) : (
                "Perputaran katalog seimbang. Teruskan pemantauan produk dengan margin tinggi."
              )}
            </p>
          </div>

          {/* Card D: Retensi Pelanggan VIP */}
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-violet-800 dark:text-violet-300">
              <Sparkles className="size-4 shrink-0" />
              <span>Apresiasi Pembeli Teratas</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11.5px]">
              {topCustomer ? (
                <>
                  <b>{topCustomer.name}</b> telah berbelanja {money(topCustomer.spend)}. Pertimbangkan penawaran diskon loyalitas personal untuk menjaga repeat order.
                </>
              ) : (
                "Fokuskan promosi pada pelanggan baru untuk membangun basis pelanggan loyal."
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Conversion Funnel Preview */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Corong Konversi Pelanggan (Funnel Overview)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Perjalanan calon pembeli dari kunjungan awal hingga menjadi transaksi terkonfirmasi lunas.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {report.funnel.is_complete ? "Data First-Party Aktif" : "Data Transaksional"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-5">
            {report.funnel.stages.map((stage, idx) => (
              <div
                key={stage.key}
                className="relative rounded-xl border border-border/70 bg-card p-3.5 text-center space-y-1.5 shadow-2xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
                  {stage.label}
                </span>
                <p className="text-xl font-black text-foreground">
                  {stage.count.toLocaleString("id-ID")}
                </p>
                {idx > 0 && (
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {stage.conversion_pct}% lolos
                  </div>
                )}
                {idx > 0 && stage.dropoff_pct > 0 && (
                  <div className="text-[10px] text-rose-500">
                    -{stage.dropoff_pct}% drop
                  </div>
                )}
              </div>
            ))}
          </div>
          {!report.funnel.is_complete && (
            <p className="text-[11px] text-muted-foreground italic">
              ℹ️ Tahap pengunjung awal menggunakan estimasi pesanan sampai tracking first-party aktif penuh.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
