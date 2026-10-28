import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EnhancedAnalyticsReport } from "@/lib/analytics-reporting";
import {
  Tag,
  Sparkles,
  Search,
  MousePointerClick,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Ticket,
  BarChart3,
} from "lucide-react";

const money = (value: number) => `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;

export function AnalyticsMarketingAISection({ report }: { report: EnhancedAnalyticsReport }) {
  const { marketing, ai_assistant } = report;

  const avgDiscountPerOrder =
    marketing.vouchers_used_count > 0
      ? Math.round(marketing.total_voucher_discount / marketing.vouchers_used_count)
      : 0;

  return (
    <div className="space-y-8">
      {/* 1. Marketing & Voucher Analytics */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Ticket className="size-4 text-primary" />
            Performa Promosi &amp; Pemanfaatan Voucher
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evaluasi keefektifan kupon diskon dan promosi potongan harga pada pesanan yang berhasil diselesaikan ({report.days} hari terakhir).
          </p>
        </div>

        {/* Voucher KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-2xs">
            <CardHeader className="pb-1.5 pt-4">
              <span className="text-xs font-medium text-muted-foreground">Kupon Digunakan</span>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold font-mono text-foreground">
                  {marketing.vouchers_used_count.toLocaleString("id-ID")}
                </p>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Tag className="size-4" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Transaksi sukses dengan voucher</p>
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="pb-1.5 pt-4">
              <span className="text-xs font-medium text-muted-foreground">Total Diskon Diberikan</span>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                  {money(marketing.total_voucher_discount)}
                </p>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <DollarSign className="size-4" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Potongan harga ditanggung toko</p>
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="pb-1.5 pt-4">
              <span className="text-xs font-medium text-muted-foreground">Omzet dari Pesanan Voucher</span>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {money(marketing.voucher_sales_revenue)}
                </p>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Total belanja setelah diskon</p>
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="pb-1.5 pt-4">
              <span className="text-xs font-medium text-muted-foreground">Rata-rata Diskon</span>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {money(avgDiscountPerOrder)}
                </p>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <BarChart3 className="size-4" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Rata-rata potongan per klaim</p>
            </CardContent>
          </Card>
        </div>

        {/* Voucher Usage Table */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold">Tabel Efektivitas Kode Voucher</CardTitle>
            <p className="text-xs text-muted-foreground">
              Rekap kode promosi yang diklaim pada pesanan yang telah berstatus selesai.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase">
                    <th className="py-3 pr-4 font-semibold">Kode Voucher</th>
                    <th className="py-3 px-4 text-right font-semibold">Jumlah Klaim Selesai</th>
                    <th className="py-3 pl-4 text-right font-semibold">Total Nilai Diskon</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {marketing.voucher_usage_list.map((v) => (
                    <tr key={v.code} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-4 font-mono font-bold text-primary">{v.code}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">{v.count} pesanan</td>
                      <td className="py-3 pl-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {money(v.discount)}
                      </td>
                    </tr>
                  ))}
                  {!marketing.voucher_usage_list.length && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
                        Belum ada penggunaan kode voucher pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. AI Assistant & Search Telemetry */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-4 text-indigo-500" />
            AI Assistant &amp; Telemetri Pencarian Pengunjung
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitoring interaksi asisten cerdas katalog toko, klik rekomendasi laptop, dan kata kunci pencarian pengunjung.
          </p>
        </div>

        {/* AI Health & Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-2xs">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Status Mesin AI</span>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none font-semibold text-[11px] gap-1">
                  <CheckCircle2 className="size-3" />
                  Aktif (Failover Dual-Provider)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-4 space-y-1.5 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">Primary:</strong> Google Gemini 2.5 Flash
              </p>
              <p>
                <strong className="text-foreground">Secondary:</strong> Groq Llama 3.3 70B Versatile
              </p>
              <p className="text-[11px] text-muted-foreground/80 pt-1">
                Otomatis beralih ke penyedia cadangan jika kuota atau latensi terlampaui.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="pb-2 pt-4">
              <span className="text-xs font-medium text-muted-foreground">Klik Rekomendasi AI</span>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {ai_assistant.recommendation_clicks.toLocaleString("id-ID")}
                </p>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <MousePointerClick className="size-4" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Produk diklik langsung dari rekomendasi chatbot
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="pb-2 pt-4">
              <span className="text-xs font-medium text-muted-foreground">Pencarian Sukses vs Kosong</span>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {ai_assistant.searches_with_results}
                  </span>
                  <span className="mx-2 text-muted-foreground">/</span>
                  <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {ai_assistant.searches_without_results}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-muted text-foreground">
                  <Search className="size-4" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {ai_assistant.searches_with_results} dengan hasil · {ai_assistant.searches_without_results} tanpa hasil katalog
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Zero Search Terms Table */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-500" />
              <div>
                <CardTitle className="text-base font-semibold">
                  Kata Kunci Pencarian Tanpa Hasil (0 Results)
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Kata kunci yang dicari pelanggan namun belum tersedia di katalog. Berguna untuk acuan restock dan pengadaan laptop baru.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase">
                    <th className="py-3 pr-4 font-semibold">Kata Kunci Dicari</th>
                    <th className="py-3 pl-4 text-right font-semibold">Frekuensi Pencarian</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ai_assistant.top_zero_searches.map((item) => (
                    <tr key={item.query} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-4 font-medium text-foreground">
                        <span className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-800 dark:text-amber-300 font-mono text-xs">
                          {item.query}
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-right font-mono font-bold text-foreground">
                        {item.count} kali
                      </td>
                    </tr>
                  ))}
                  {!ai_assistant.top_zero_searches.length && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-xs text-muted-foreground">
                        Belum ada pencarian tanpa hasil pada periode ini.
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
