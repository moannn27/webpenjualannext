import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnhancedAnalyticsReport } from "@/lib/analytics-reporting";
import {
  Filter,
  Users,
  Eye,
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  TrendingDown,
  Info,
} from "lucide-react";

const STAGE_ICONS = [Users, Eye, ShoppingCart, CreditCard, CheckCircle2];
const STAGE_COLORS = [
  "from-blue-500 to-blue-600",
  "from-indigo-500 to-indigo-600",
  "from-purple-500 to-purple-600",
  "from-amber-500 to-amber-600",
  "from-emerald-500 to-emerald-600",
];

export function AnalyticsFunnelSection({ report }: { report: EnhancedAnalyticsReport }) {
  const { funnel } = report;
  const stages = funnel.stages;
  const topStageCount = Math.max(1, stages[0]?.count || 1);

  // Overall visitor to completed order conversion rate
  const visitorCount = stages[0]?.count || 0;
  const completedOrderCount = stages[4]?.count || 0;
  const overallConversionRate =
    visitorCount > 0 ? ((completedOrderCount / visitorCount) * 100).toFixed(2) : "0";

  // Key drop-offs
  const cartStage = stages[2]?.count || 0;
  const checkoutStage = stages[3]?.count || 0;
  const cartToCheckoutDropoff =
    cartStage > 0 ? (((cartStage - checkoutStage) / cartStage) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Funnel Notice if Telemetry is still gathering data */}
      {!funnel.is_complete && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <Info className="size-4.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Corong Konversi Berjalan dalam Mode Transaksi &amp; Telemetri Tahap Awal
            </p>
            <p className="text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
              Tahap 1 s/d 4 akan terus diperkaya oleh pelacak first-party anonim toko saat pengunjung aktif melihat produk, memasukkan keranjang, dan membuka checkout. Tahap 5 bersumber langsung dari verifikasi pesanan faktur di database.
            </p>
          </div>
        </div>
      )}

      {/* Main Funnel Visualization Card */}
      <Card className="shadow-xs">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Filter className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">
                  Corong Konversi E-Commerce (Conversion Funnel)
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Pelacakan alur perjalanan pengunjung dari penjelajahan awal hingga transaksi selesai ({report.days} hari terakhir).
                </p>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
              Rasio Konversi Total: {overallConversionRate}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Funnel Steps */}
          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const Icon = STAGE_ICONS[idx] || Users;
              const widthPct = Math.max(12, Math.round((stage.count / topStageCount) * 100));
              const isFirst = idx === 0;

              return (
                <div key={stage.key} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-md bg-muted text-foreground">
                        <Icon className="size-3.5" />
                      </div>
                      <span className="font-semibold text-foreground">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-foreground">
                        {stage.count.toLocaleString("id-ID")}{" "}
                        <span className="text-[11px] font-normal text-muted-foreground">pengunjung</span>
                      </span>
                      {!isFirst && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          {stage.conversion_pct}% dari tahap sebelumnya
                        </span>
                      )}
                      {!isFirst && stage.dropoff_pct > 0 && (
                        <span className="text-[11px] text-rose-500 dark:text-rose-400 flex items-center gap-0.5">
                          <TrendingDown className="size-3" />
                          -{stage.dropoff_pct}% drop-off
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Funnel Bar */}
                  <div className="h-6 w-full rounded-xl bg-muted/60 overflow-hidden p-0.5 border border-border/40">
                    <div
                      className={`h-full rounded-lg bg-gradient-to-r ${STAGE_COLORS[idx]} transition-all duration-500 flex items-center justify-end px-2.5`}
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className="text-[10px] font-bold text-white drop-shadow-xs">
                        {stage.count.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Diagnostic Breakdown & Actionable Takeaways */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4 border-t">
            {/* Step 1: Browse to Cart */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span>1. Minat Belanja (View → Cart)</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {stages[2]?.conversion_pct ?? 0}%
                </span>
              </div>
              <p className="text-muted-foreground text-[11.5px] leading-relaxed">
                Persentase pengunjung yang terdorong menambahkan produk ke keranjang belanja setelah melihat rincian spesifikasi laptop/gadget.
              </p>
            </div>

            {/* Step 2: Cart to Checkout */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span>2. Drop-off Keranjang ke Checkout</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {cartToCheckoutDropoff}%
                </span>
              </div>
              <p className="text-muted-foreground text-[11.5px] leading-relaxed">
                Pengunjung memasukkan produk ke keranjang namun belum membuka formulir checkout. Pertimbangkan promo voucher atau reminder keranjang.
              </p>
            </div>

            {/* Step 3: Checkout to Paid */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span>3. Konversi Akhir Pembayaran</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {stages[4]?.conversion_pct ?? 0}%
                </span>
              </div>
              <p className="text-muted-foreground text-[11.5px] leading-relaxed">
                Pesanan yang berhasil diselesaikan dan diverifikasi dari seluruh checkout yang dimulai ({stages[4]?.count || 0} order sukses).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
