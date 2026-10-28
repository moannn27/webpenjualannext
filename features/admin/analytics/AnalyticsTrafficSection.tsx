"use client";

import {
  Compass,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Layers,
} from "lucide-react";
import type { EnhancedAnalyticsReport } from "@/lib/analytics-reporting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AnalyticsTrafficSection({ report }: { report: EnhancedAnalyticsReport }) {
  const traffic = report.traffic;

  if (!traffic.tracking_active) {
    return (
      <Card className="shadow-xs border-dashed border-2">
        <CardContent className="py-12 text-center space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Globe className="size-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            Belum Ada Data Kunjungan Tercatat
          </h3>
          <p className="max-w-md mx-auto text-xs text-muted-foreground leading-relaxed">
            Sistem tracking first-party telah terpasang di storefront Next Solution Store. Begitu pelanggan mengunjungi katalog produk dan berinteraksi, statistik traffic unik, sumber rujukan, perangkat, dan halaman terpopuler akan otomatis muncul di sini.
          </p>
          <div className="pt-2">
            <Badge variant="outline" className="text-xs">
              Status Telemetry: Menunggu Aktivitas Pengunjung
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgViewsPerSession =
    traffic.total_sessions > 0
      ? (traffic.total_pageviews / traffic.total_sessions).toFixed(1)
      : "1.0";

  return (
    <div className="space-y-6">
      {/* 1. Header Traffic Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-[#EEF2FF] dark:bg-indigo-950/25 p-5 shadow-2xs space-y-1.5">
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            Pengunjung Unik (Visitors)
          </span>
          <p className="text-2xl font-black font-mono text-indigo-900 dark:text-indigo-100">
            {traffic.unique_visitors.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80">
            Pseudonymized client ID
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-[#EFF6FF] dark:bg-blue-950/25 p-5 shadow-2xs space-y-1.5">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            Total Sesi Kunjungan
          </span>
          <p className="text-2xl font-black font-mono text-blue-900 dark:text-blue-100">
            {traffic.total_sessions.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80">
            Jeda inaktivitas 30 menit
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-[#ECFDF5] dark:bg-emerald-950/25 p-5 shadow-2xs space-y-1.5">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            Total Halaman Dilihat (Pageviews)
          </span>
          <p className="text-2xl font-black font-mono text-emerald-900 dark:text-emerald-100">
            {traffic.total_pageviews.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
            Deduped anti-rerender
          </p>
        </div>

        <div className="rounded-2xl border border-violet-100 dark:border-violet-900/40 bg-[#F5F3FF] dark:bg-violet-950/25 p-5 shadow-2xs space-y-1.5">
          <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
            Rata-rata Pageview / Sesi
          </span>
          <p className="text-2xl font-black font-mono text-violet-900 dark:text-violet-100">
            {avgViewsPerSession}
          </p>
          <p className="text-[11px] text-violet-600/80 dark:text-violet-400/80">
            Kedalaman penjelajahan katalog
          </p>
        </div>
      </div>

      {/* 2. Sumber Traffic & Distribusi Perangkat */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sumber Traffic */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Compass className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Kanal &amp; Sumber Rujukan (Traffic Sources)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            {traffic.sources.map((src) => (
              <div key={src.source} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                  <span className="text-foreground">{src.source}</span>
                  <span className="text-muted-foreground font-semibold">
                    {src.count.toLocaleString("id-ID")} ({src.percentage}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(3, src.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
            {!traffic.sources.length && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Belum ada data sumber rujukan.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Distribusi Perangkat */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Monitor className="size-4 text-indigo-500" />
              <CardTitle className="text-base font-semibold">Perangkat Pengunjung (Device Breakdown)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            {traffic.devices.map((dev) => {
              const Icon =
                dev.device === "mobile" ? Smartphone : dev.device === "tablet" ? Tablet : Monitor;
              return (
                <div key={dev.device} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                    <span className="inline-flex items-center gap-2 capitalize text-foreground">
                      <Icon className="size-4 text-muted-foreground" />
                      {dev.device}
                    </span>
                    <span className="text-muted-foreground font-semibold">
                      {dev.count.toLocaleString("id-ID")} ({dev.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${Math.max(3, dev.percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!traffic.devices.length && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Belum ada data perangkat.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Halaman Terpopuler */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-emerald-600" />
            <CardTitle className="text-base font-semibold">Halaman Paling Banyak Dikunjungi (Top Pages)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="py-3 pr-4 font-semibold">Alamat URL Halaman (Path)</th>
                  <th className="py-3 text-right font-semibold">Total Tampilan (Pageviews)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {traffic.top_pages.map((p) => (
                  <tr key={p.path} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-foreground">{p.path}</td>
                    <td className="py-3 text-right font-bold text-foreground">
                      {p.views.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
                {!traffic.top_pages.length && (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-xs text-muted-foreground">
                      Belum ada halaman yang tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
