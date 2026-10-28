import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getAdminEcommerceReportAction,
  getAdminEnhancedAnalyticsReportAction,
} from "@/actions/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { ReportExports } from "@/features/admin/ReportExports";
import type { EnhancedAnalyticsReport } from "@/lib/analytics-reporting";
import { requireModulePermission } from "@/lib/auth/permissions";
import { AnalyticsDashboardView } from "@/features/admin/analytics/AnalyticsDashboardView";
import type { RecentCompletedOrder } from "@/features/admin/analytics/AnalyticsSalesSection";

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

  let report: EnhancedAnalyticsReport | null = null;
  try {
    report = await getAdminEnhancedAnalyticsReportAction(days);
  } catch {
    try {
      const baseReport = await getAdminEcommerceReportAction(days);
      // Construct minimal enhanced fallback
      report = {
        ...baseReport,
        comparison: {
          prior_sales: 0,
          sales_growth_pct: null,
          prior_orders: 0,
          orders_growth_pct: null,
          prior_aov: 0,
          aov_growth_pct: null,
        },
        traffic: {
          unique_visitors: 0,
          total_sessions: 0,
          total_pageviews: 0,
          daily_traffic: baseReport.daily.map((d) => ({ day: d.day, visitors: 0, pageviews: 0 })),
          top_pages: [],
          sources: [],
          devices: [],
          peak_hours: [],
          tracking_active: false,
        },
        funnel: {
          stages: [
            { key: "visitors", label: "1. Pengunjung Unik", count: baseReport.summary.total_orders, conversion_pct: 100, dropoff_pct: 0 },
            { key: "view_item", label: "2. Melihat Produk", count: baseReport.summary.total_orders, conversion_pct: 100, dropoff_pct: 0 },
            { key: "add_to_cart", label: "3. Tambah Keranjang", count: baseReport.summary.total_orders, conversion_pct: 100, dropoff_pct: 0 },
            { key: "checkout", label: "4. Mulai Checkout", count: baseReport.summary.total_orders, conversion_pct: 100, dropoff_pct: 0 },
            { key: "completed", label: "5. Pesanan Berhasil", count: baseReport.summary.completed_orders, conversion_pct: 100, dropoff_pct: 0 },
          ],
          is_complete: false,
        },
        marketing: {
          vouchers_used_count: 0,
          total_voucher_discount: 0,
          voucher_sales_revenue: 0,
          voucher_usage_list: [],
          campaigns: [],
        },
        ai_assistant: {
          recommendation_clicks: 0,
          searches_with_results: 0,
          searches_without_results: 0,
          top_zero_searches: [],
          chat_enabled: true,
        },
        health: {
          low_stock_products: [],
          out_of_stock_products: [],
          total_catalog_active: 0,
          total_catalog_draft: 0,
          tracking_integration_status: "standby",
        },
      };
    } catch {
      // Fallback stays null
    }
  }

  // Fetch recent completed orders in the period to display actionable transaction list
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
            Laporan komprehensif performa transaksi, omzet selesai, kesehatan pembayaran, dan perilaku pengunjung.
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
          <AnalyticsDashboardView report={report} recentOrders={recentOrders} />
          <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed mt-6">
            <p className="font-semibold text-foreground mb-0.5">ℹ️ Catatan Metrik Operasional:</p>
            Nilai omzet pada laporan ini bersumber dari seluruh pesanan yang telah berstatus <strong>Selesai (delivered)</strong>, termasuk biaya ongkos kirim dan potongan voucher sesuai grand total faktur resmi. Telemetri pengunjung menggunakan first-party privacy-respecting identifier yang teragregasi secara otomatis.
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
