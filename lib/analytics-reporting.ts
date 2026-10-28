import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EcommerceReport } from "@/lib/admin-reports";

export type EnhancedAnalyticsReport = EcommerceReport & {
  comparison: {
    prior_sales: number;
    sales_growth_pct: number | null;
    prior_orders: number;
    orders_growth_pct: number | null;
    prior_aov: number;
    aov_growth_pct: number | null;
  };
  traffic: {
    unique_visitors: number;
    total_sessions: number;
    total_pageviews: number;
    daily_traffic: { day: string; visitors: number; pageviews: number }[];
    top_pages: { path: string; views: number }[];
    sources: { source: string; count: number; percentage: number }[];
    devices: { device: string; count: number; percentage: number }[];
    peak_hours: { hour: number; label: string; count: number }[];
    tracking_active: boolean;
  };
  funnel: {
    stages: {
      key: string;
      label: string;
      count: number;
      conversion_pct: number;
      dropoff_pct: number;
    }[];
    is_complete: boolean;
  };
  marketing: {
    vouchers_used_count: number;
    total_voucher_discount: number;
    voucher_sales_revenue: number;
    voucher_usage_list: { code: string; count: number; discount: number }[];
    campaigns: { name: string; visits: number; orders: number }[];
  };
  ai_assistant: {
    recommendation_clicks: number;
    searches_with_results: number;
    searches_without_results: number;
    top_zero_searches: { query: string; count: number }[];
    chat_enabled: boolean;
  };
  health: {
    low_stock_products: { id: string; name: string; stock: number; price: number }[];
    out_of_stock_products: { id: string; name: string; price: number }[];
    total_catalog_active: number;
    total_catalog_draft: number;
    tracking_integration_status: "active" | "standby" | "pending_migration";
  };
};

export async function getEnhancedAnalyticsReport(
  baseReport: EcommerceReport,
  days: number
): Promise<EnhancedAnalyticsReport> {
  const adminClient = getSupabaseAdminClient();
  const now = new Date();
  const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const priorStart = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);

  // 1. Calculate Period Comparison (Prior Days vs Current Days)
  let priorSales = 0;
  let priorCompletedOrders = 0;
  try {
    const { data: priorOrders } = await adminClient
      .from("orders")
      .select("grand_total")
      .eq("status", "delivered")
      .gte("created_at", priorStart.toISOString())
      .lt("created_at", currentStart.toISOString());

    if (priorOrders && priorOrders.length > 0) {
      priorCompletedOrders = priorOrders.length;
      priorSales = priorOrders.reduce((sum, ord) => sum + Number(ord.grand_total || 0), 0);
    }
  } catch {
    // Non-blocking fallback
  }

  const currentSales = baseReport.summary.completed_sales;
  const currentCompletedOrders = baseReport.summary.completed_orders;

  const salesGrowthPct =
    priorSales > 0 ? Number((((currentSales - priorSales) / priorSales) * 100).toFixed(1)) : null;
  const ordersGrowthPct =
    priorCompletedOrders > 0
      ? Number(
          (
            ((currentCompletedOrders - priorCompletedOrders) / priorCompletedOrders) *
            100
          ).toFixed(1)
        )
      : null;

  const priorAov = priorCompletedOrders > 0 ? Math.round(priorSales / priorCompletedOrders) : 0;
  const currentAov = baseReport.summary.average_order_value;
  const aovGrowthPct =
    priorAov > 0 ? Number((((currentAov - priorAov) / priorAov) * 100).toFixed(1)) : null;

  // 2. Fetch Traffic & First-Party Analytics Events (if analytics_events table exists)
  let uniqueVisitors = 0;
  let totalSessions = 0;
  let totalPageviews = 0;
  const dailyTrafficMap = new Map<string, { visitors: Set<string>; pageviews: number }>();
  const pathViewsMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const hourMap = new Map<number, number>();
  let aiRecommendationClicks = 0;
  let searchSuccessCount = 0;
  let searchZeroCount = 0;
  const searchZeroTermsMap = new Map<string, number>();
  const viewItemUniqueSet = new Set<string>();
  const addToCartUniqueSet = new Set<string>();
  const checkoutUniqueSet = new Set<string>();
  let trackingActive = false;
  let trackingStatus: "active" | "standby" | "pending_migration" = "standby";

  try {
    const { data: events, error } = await adminClient
      .from("analytics_events")
      .select("event_name, path, referrer_domain, utm_source, device_type, visitor_id, session_id, metadata, created_at")
      .gte("created_at", currentStart.toISOString())
      .order("created_at", { ascending: true })
      .limit(50000);

    if (!error && events) {
      trackingStatus = events.length > 0 ? "active" : "standby";
      trackingActive = events.length > 0;

      const allVisitors = new Set<string>();
      const allSessions = new Set<string>();

      events.forEach((ev) => {
        const dateStr = ev.created_at.slice(0, 10);
        allVisitors.add(ev.visitor_id);
        allSessions.add(ev.session_id);

        // Daily traffic grouping
        if (!dailyTrafficMap.has(dateStr)) {
          dailyTrafficMap.set(dateStr, { visitors: new Set(), pageviews: 0 });
        }
        const dailyEntry = dailyTrafficMap.get(dateStr)!;
        dailyEntry.visitors.add(ev.visitor_id);

        if (ev.event_name === "page_view") {
          totalPageviews++;
          dailyEntry.pageviews++;

          // Path aggregation
          const cleanPath = ev.path || "/";
          pathViewsMap.set(cleanPath, (pathViewsMap.get(cleanPath) || 0) + 1);

          // Traffic Source aggregation
          let source = "Direct / Langsung";
          if (ev.utm_source) {
            source = `Kampanye: ${ev.utm_source}`;
          } else if (ev.referrer_domain) {
            const domain = ev.referrer_domain.toLowerCase();
            if (domain.includes("google")) source = "Google Search";
            else if (domain.includes("facebook") || domain.includes("instagram") || domain.includes("tiktok"))
              source = "Media Sosial";
            else source = `Rujukan: ${ev.referrer_domain}`;
          }
          sourceMap.set(source, (sourceMap.get(source) || 0) + 1);

          // Device aggregation
          const dev = ev.device_type || "desktop";
          deviceMap.set(dev, (deviceMap.get(dev) || 0) + 1);

          // Hour of day
          const evHour = new Date(ev.created_at).getHours();
          hourMap.set(evHour, (hourMap.get(evHour) || 0) + 1);
        } else if (ev.event_name === "view_item") {
          viewItemUniqueSet.add(ev.visitor_id);
        } else if (ev.event_name === "add_to_cart") {
          addToCartUniqueSet.add(ev.visitor_id);
        } else if (ev.event_name === "begin_checkout") {
          checkoutUniqueSet.add(ev.visitor_id);
        } else if (ev.event_name === "ai_recommendation_click") {
          aiRecommendationClicks++;
        } else if (ev.event_name === "search") {
          searchSuccessCount++;
        } else if (ev.event_name === "search_no_results") {
          searchZeroCount++;
          const q = String(ev.metadata?.query || "").trim();
          if (q) {
            searchZeroTermsMap.set(q, (searchZeroTermsMap.get(q) || 0) + 1);
          }
        }
      });

      uniqueVisitors = allVisitors.size;
      totalSessions = allSessions.size;
    } else if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
      trackingStatus = "pending_migration";
    }
  } catch {
    trackingStatus = "pending_migration";
  }

  // Build daily traffic array matching the baseReport.daily date range
  const dailyTraffic = baseReport.daily.map((d) => {
    const entry = dailyTrafficMap.get(d.day);
    return {
      day: d.day,
      visitors: entry ? entry.visitors.size : 0,
      pageviews: entry ? entry.pageviews : 0,
    };
  });

  // Top pages
  const topPages = Array.from(pathViewsMap.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  // Traffic sources with percentages
  const totalSourcesCount = Array.from(sourceMap.values()).reduce((a, b) => a + b, 0);
  const sources = Array.from(sourceMap.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalSourcesCount > 0 ? Number(((count / totalSourcesCount) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Device breakdown
  const totalDevicesCount = Array.from(deviceMap.values()).reduce((a, b) => a + b, 0);
  const devices = Array.from(deviceMap.entries())
    .map(([device, count]) => ({
      device,
      count,
      percentage: totalDevicesCount > 0 ? Number(((count / totalDevicesCount) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Peak hours
  const peakHours = Array.from({ length: 24 }).map((_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, "0")}:00`,
    count: hourMap.get(h) || 0,
  }));

  // 3. Marketing & Voucher Usage Analysis
  let vouchersUsedCount = 0;
  let totalVoucherDiscount = 0;
  let voucherSalesRevenue = 0;
  const voucherUsageMap = new Map<string, { count: number; discount: number }>();
  const campaignsMap = new Map<string, { visits: number; orders: number }>();

  try {
    const { data: voucherOrders } = await adminClient
      .from("orders")
      .select("grand_total, discount_amount, voucher_id, vouchers:voucher_id (code)")
      .eq("status", "delivered")
      .gte("created_at", currentStart.toISOString())
      .gt("discount_amount", 0);

    if (voucherOrders && voucherOrders.length > 0) {
      vouchersUsedCount = voucherOrders.length;
      voucherOrders.forEach((vo) => {
        const disc = Number(vo.discount_amount || 0);
        const rev = Number(vo.grand_total || 0);
        totalVoucherDiscount += disc;
        voucherSalesRevenue += rev;
        const vouchersData = vo.vouchers as unknown as { code?: string } | { code?: string }[] | null;
        const code = (Array.isArray(vouchersData) ? vouchersData[0]?.code : vouchersData?.code) || "VOUCHER-TOKO";
        const current = voucherUsageMap.get(code) || { count: 0, discount: 0 };
        current.count += 1;
        current.discount += disc;
        voucherUsageMap.set(code, current);
      });
    }
  } catch {
    // Non-blocking
  }

  const voucherUsageList = Array.from(voucherUsageMap.entries())
    .map(([code, data]) => ({ code, count: data.count, discount: data.discount }))
    .sort((a, b) => b.count - a.count);

  const campaigns = Array.from(campaignsMap.entries()).map(([name, data]) => ({
    name,
    visits: data.visits,
    orders: data.orders,
  }));

  // 4. Conversion Funnel Calculation
  // Funnel stages: Visitors -> View Item -> Add to Cart -> Begin Checkout -> Paid / Completed Orders
  const stage1 = trackingActive ? uniqueVisitors : baseReport.summary.total_orders;
  const stage2 = trackingActive ? viewItemUniqueSet.size : baseReport.best_products.reduce((acc, p) => acc + p.order_count, 0);
  const stage3 = trackingActive ? addToCartUniqueSet.size : baseReport.summary.total_orders;
  const stage4 = trackingActive ? checkoutUniqueSet.size : baseReport.summary.total_orders;
  const stage5 = baseReport.summary.completed_orders;

  const funnelStages = [
    {
      key: "visitors",
      label: "1. Pengunjung Unik",
      count: stage1,
      conversion_pct: 100,
      dropoff_pct: 0,
    },
    {
      key: "view_item",
      label: "2. Melihat Produk",
      count: stage2,
      conversion_pct: stage1 > 0 ? Number(((stage2 / stage1) * 100).toFixed(1)) : 0,
      dropoff_pct: stage1 > 0 ? Number((((stage1 - stage2) / stage1) * 100).toFixed(1)) : 0,
    },
    {
      key: "add_to_cart",
      label: "3. Tambah ke Keranjang",
      count: stage3,
      conversion_pct: stage2 > 0 ? Number(((stage3 / stage2) * 100).toFixed(1)) : 0,
      dropoff_pct: stage2 > 0 ? Number((((stage2 - stage3) / stage2) * 100).toFixed(1)) : 0,
    },
    {
      key: "checkout",
      label: "4. Mulai Checkout",
      count: stage4,
      conversion_pct: stage3 > 0 ? Number(((stage4 / stage3) * 100).toFixed(1)) : 0,
      dropoff_pct: stage3 > 0 ? Number((((stage3 - stage4) / stage3) * 100).toFixed(1)) : 0,
    },
    {
      key: "completed",
      label: "5. Pesanan Berhasil (Lunas)",
      count: stage5,
      conversion_pct: stage4 > 0 ? Number(((stage5 / stage4) * 100).toFixed(1)) : 0,
      dropoff_pct: stage4 > 0 ? Number((((stage4 - stage5) / stage4) * 100).toFixed(1)) : 0,
    },
  ];

  // 5. Operational & Catalog Health (Low Stock & Out of Stock)
  const lowStockProducts: { id: string; name: string; stock: number; price: number }[] = [];
  const outOfStockProducts: { id: string; name: string; price: number }[] = [];
  let totalCatalogActive = 0;
  let totalCatalogDraft = 0;

  try {
    const { data: allProds } = await adminClient
      .from("products")
      .select("id, name, stock, price, discount_price, status")
      .order("stock", { ascending: true })
      .limit(500);

    if (allProds) {
      allProds.forEach((p) => {
        if (p.status === "published") totalCatalogActive++;
        else totalCatalogDraft++;

        const effectivePrice = Number(p.discount_price ?? p.price ?? 0);
        if (p.status === "published") {
          if (p.stock <= 0) {
            outOfStockProducts.push({ id: p.id, name: p.name, price: effectivePrice });
          } else if (p.stock < 5) {
            lowStockProducts.push({ id: p.id, name: p.name, stock: p.stock, price: effectivePrice });
          }
        }
      });
    }
  } catch {
    // Non-blocking
  }

  // 6. AI Assistant Metrics
  const topZeroSearches = Array.from(searchZeroTermsMap.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    ...baseReport,
    comparison: {
      prior_sales: priorSales,
      sales_growth_pct: salesGrowthPct,
      prior_orders: priorCompletedOrders,
      orders_growth_pct: ordersGrowthPct,
      prior_aov: priorAov,
      aov_growth_pct: aovGrowthPct,
    },
    traffic: {
      unique_visitors: uniqueVisitors,
      total_sessions: totalSessions,
      total_pageviews: totalPageviews,
      daily_traffic: dailyTraffic,
      top_pages: topPages,
      sources,
      devices,
      peak_hours: peakHours,
      tracking_active: trackingActive,
    },
    funnel: {
      stages: funnelStages,
      is_complete: trackingActive,
    },
    marketing: {
      vouchers_used_count: vouchersUsedCount,
      total_voucher_discount: totalVoucherDiscount,
      voucher_sales_revenue: voucherSalesRevenue,
      voucher_usage_list: voucherUsageList,
      campaigns,
    },
    ai_assistant: {
      recommendation_clicks: aiRecommendationClicks,
      searches_with_results: searchSuccessCount,
      searches_without_results: searchZeroCount,
      top_zero_searches: topZeroSearches,
      chat_enabled: true,
    },
    health: {
      low_stock_products: lowStockProducts.slice(0, 10),
      out_of_stock_products: outOfStockProducts.slice(0, 10),
      total_catalog_active: totalCatalogActive,
      total_catalog_draft: totalCatalogDraft,
      tracking_integration_status: trackingStatus,
    },
  };
}
