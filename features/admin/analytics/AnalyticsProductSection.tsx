"use client";

import Link from "next/link";
import {
  Package,
  AlertTriangle,
  Search,
  Flame,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import type { EnhancedAnalyticsReport } from "@/lib/analytics-reporting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const money = (val: number) => `Rp ${Number(val ?? 0).toLocaleString("id-ID")}`;

export function AnalyticsProductSection({ report }: { report: EnhancedAnalyticsReport }) {
  const maxSold = Math.max(1, ...report.best_products.map((p) => p.units_sold));
  const health = report.health;
  const zeroSearches = report.ai_assistant.top_zero_searches;

  return (
    <div className="space-y-6">
      {/* 1. Ringkasan Stok & Inventaris */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-[#EFF6FF] dark:bg-blue-950/25 p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            Total Katalog Terbit (Aktif)
          </span>
          <p className="text-2xl font-black text-blue-900 dark:text-blue-100">
            {health.total_catalog_active.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80">
            Tersedia untuk dibeli di website
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">
            Katalog Draft / Nonaktif
          </span>
          <p className="text-2xl font-black text-foreground">
            {health.total_catalog_draft.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Disembunyikan dari etalase
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-[#FEF3C7] dark:bg-amber-950/25 p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="size-3.5" />
            Stok Menipis (&lt; 5 Unit)
          </span>
          <p className="text-2xl font-black text-amber-950 dark:text-amber-100">
            {health.low_stock_products.length.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
            Perlu restock distributor
          </p>
        </div>

        <div className="rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-[#FFF1F2] dark:bg-rose-950/25 p-5 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
            <ShieldAlert className="size-3.5" />
            Stok Habis (0 Unit)
          </span>
          <p className="text-2xl font-black text-rose-900 dark:text-rose-100">
            {health.out_of_stock_products.length.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
            Tidak dapat dipesan pembeli
          </p>
        </div>
      </div>

      {/* 2. Top Selling vs Least Products */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Top Selling */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-orange-500" />
                <CardTitle className="text-base font-semibold">Produk Terlaris (Top Selling)</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">Diurutkan Unit</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            {report.best_products.map((p) => (
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-start justify-between gap-3 text-xs sm:text-sm">
                  <span className="min-w-0 truncate font-semibold text-foreground">{p.name}</span>
                  <span className="shrink-0 font-bold text-muted-foreground">{p.units_sold} unit</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${Math.max(5, (p.units_sold / maxSold) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {p.order_count} pesanan · {money(p.item_revenue)}
                </p>
              </div>
            ))}
            {!report.best_products.length && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Belum ada produk yang terjual di periode ini.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Slow Movers */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                <CardTitle className="text-base font-semibold">Produk Perlu Promosi (Unit Terendah)</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">Potensi Bundling</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            {report.least_products.map((p) => (
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-start justify-between gap-3 text-xs sm:text-sm">
                  <span className="min-w-0 truncate font-semibold text-foreground">{p.name}</span>
                  <span className="shrink-0 font-bold text-muted-foreground">{p.units_sold} unit</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${Math.max(p.units_sold ? 5 : 0, (p.units_sold / maxSold) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {p.order_count} pesanan · {money(p.item_revenue)}
                </p>
              </div>
            ))}
            {!report.least_products.length && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Tidak ada data produk.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Peringatan Stok & Pencarian Tanpa Hasil */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Peringatan Stok Menipis */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-amber-600" />
                <CardTitle className="text-base font-semibold">Daftar Stok Menipis (&lt; 5 Unit)</CardTitle>
              </div>
              <Link
                href="/admin/products"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Katalog Produk <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase">
                    <th className="py-2.5 font-semibold">Nama Produk</th>
                    <th className="py-2.5 text-right font-semibold">Harga</th>
                    <th className="py-2.5 text-right font-semibold">Sisa Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {health.low_stock_products.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/40">
                      <td className="py-2.5 pr-2 font-medium text-foreground truncate max-w-[200px]">
                        {p.name}
                      </td>
                      <td className="py-2.5 text-right font-mono">{money(p.price)}</td>
                      <td className="py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                        {p.stock} unit
                      </td>
                    </tr>
                  ))}
                  {!health.low_stock_products.length && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-muted-foreground">
                        Semua produk terbit memiliki stok aman (&ge; 5 unit).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pencarian Pelanggan Tanpa Hasil */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="size-4 text-rose-500" />
                <CardTitle className="text-base font-semibold">Kata Kunci Dicari Tapi Tidak Ada Hasil</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">Peluang Produk Baru</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase">
                    <th className="py-2.5 font-semibold">Kata Kunci Pencarian</th>
                    <th className="py-2.5 text-right font-semibold">Frekuensi Dicari</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {zeroSearches.map((s) => (
                    <tr key={s.query} className="hover:bg-muted/40">
                      <td className="py-2.5 font-mono text-foreground font-medium">{s.query}</td>
                      <td className="py-2.5 text-right font-bold text-muted-foreground">
                        {s.count} kali
                      </td>
                    </tr>
                  ))}
                  {!zeroSearches.length && (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-muted-foreground">
                        Belum ada rekaman pencarian tanpa hasil untuk periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
