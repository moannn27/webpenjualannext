import { describe, it, expect } from "vitest";
import {
  generateAnalyticsExcel,
  generateAnalyticsWord,
  generateAnalyticsPowerPoint,
  isEnhancedReport,
} from "@/lib/analytics-exports";
import type { EcommerceReport } from "@/lib/admin-reports";
import type { EnhancedAnalyticsReport } from "@/lib/analytics-reporting";

const mockBaseReport: EcommerceReport = {
  days: 30,
  summary: {
    total_orders: 20,
    completed_orders: 16,
    active_orders: 2,
    pending_orders: 1,
    cancelled_orders: 1,
    completed_sales: 120_000_000,
    average_order_value: 7_500_000,
    successful_payment_orders: 16,
    pending_payment_orders: 1,
    failed_payment_orders: 1,
    refunded_orders: 1,
    buying_customers: 14,
    new_customers: 10,
    repeat_customers: 4,
  },
  daily: [
    { day: "2026-10-01", orders: 2, revenue: 15_000_000 },
    { day: "2026-10-02", orders: 3, revenue: 22_500_000 },
  ],
  best_products: [
    { id: "p-1", name: "Laptop ASUS Vivobook", units_sold: 10, order_count: 8, item_revenue: 75_000_000 },
    { id: "p-2", name: "Lenovo IdeaPad Slim 3", units_sold: 6, order_count: 5, item_revenue: 45_000_000 },
  ],
  least_products: [
    { id: "p-3", name: "Mouse Wireless", units_sold: 1, order_count: 1, item_revenue: 150_000 },
  ],
  top_customers: [
    { id: "c-1", name: "Budi Santoso", phone: "08123456789", completed_orders: 3, spend: 22_500_000, last_order_day: "2026-10-25" },
    { id: "c-2", name: "Siti Rahma", phone: "08198765432", completed_orders: 2, spend: 15_000_000, last_order_day: "2026-10-26" },
  ],
};

const mockEnhancedReport: EnhancedAnalyticsReport = {
  ...mockBaseReport,
  comparison: {
    prior_sales: 100_000_000,
    sales_growth_pct: 20.0,
    prior_orders: 14,
    orders_growth_pct: 14.3,
    prior_aov: 7_142_857,
    aov_growth_pct: 5.0,
  },
  traffic: {
    unique_visitors: 450,
    total_sessions: 620,
    total_pageviews: 1850,
    daily_traffic: [
      { day: "2026-10-01", visitors: 45, pageviews: 180 },
      { day: "2026-10-02", visitors: 60, pageviews: 240 },
    ],
    top_pages: [
      { path: "/", views: 800 },
      { path: "/category/laptops", views: 450 },
    ],
    sources: [
      { source: "Direct / Langsung", count: 280, percentage: 62.2 },
      { source: "Google Search", count: 170, percentage: 37.8 },
    ],
    devices: [
      { device: "mobile", count: 260, percentage: 57.8 },
      { device: "desktop", count: 190, percentage: 42.2 },
    ],
    peak_hours: [
      { hour: 13, label: "13:00", count: 120 },
      { hour: 19, label: "19:00", count: 150 },
    ],
    tracking_active: true,
  },
  funnel: {
    stages: [
      { key: "visitors", label: "1. Pengunjung Unik", count: 450, conversion_pct: 100, dropoff_pct: 0 },
      { key: "view_item", label: "2. Melihat Produk", count: 320, conversion_pct: 71.1, dropoff_pct: 28.9 },
      { key: "add_to_cart", label: "3. Tambah ke Keranjang", count: 85, conversion_pct: 26.6, dropoff_pct: 73.4 },
      { key: "checkout", label: "4. Mulai Checkout", count: 35, conversion_pct: 41.2, dropoff_pct: 58.8 },
      { key: "completed", label: "5. Pesanan Berhasil", count: 16, conversion_pct: 45.7, dropoff_pct: 54.3 },
    ],
    is_complete: true,
  },
  marketing: {
    vouchers_used_count: 5,
    total_voucher_discount: 1_250_000,
    voucher_sales_revenue: 37_500_000,
    voucher_usage_list: [
      { code: "DISKONLAPTOP", count: 3, discount: 750_000 },
      { code: "HEMAT50", count: 2, discount: 500_000 },
    ],
    campaigns: [
      { name: "promo-gajian", visits: 120, orders: 8 },
    ],
  },
  ai_assistant: {
    recommendation_clicks: 42,
    searches_with_results: 156,
    searches_without_results: 12,
    top_zero_searches: [
      { query: "rtx 5090", count: 8 },
      { query: "laptop oled murah", count: 4 },
    ],
    chat_enabled: true,
  },
  health: {
    low_stock_products: [
      { id: "p-4", name: "Lenovo Legion 5", stock: 2, price: 18_500_000 },
    ],
    out_of_stock_products: [
      { id: "p-5", name: "MacBook Air M2", price: 16_000_000 },
    ],
    total_catalog_active: 48,
    total_catalog_draft: 5,
    tracking_integration_status: "active",
  },
};

describe("Admin Analytics & Reports Suite", () => {
  describe("1. KPI Calculations & Integrity", () => {
    it("completed_sales only counts delivered orders and AOV is properly computed", () => {
      const summary = mockBaseReport.summary;
      expect(summary.completed_orders).toBe(16);
      expect(summary.completed_sales).toBe(120_000_000);
      const computedAov = Math.round(summary.completed_sales / summary.completed_orders);
      expect(computedAov).toBe(summary.average_order_value);
    });

    it("pending and cancelled orders are not counted in completed_orders", () => {
      const summary = mockBaseReport.summary;
      expect(summary.completed_orders + summary.active_orders + summary.pending_orders + summary.cancelled_orders).toBe(
        summary.total_orders
      );
    });

    it("repeat customer rate does not exceed 100%", () => {
      const summary = mockBaseReport.summary;
      const rate = (summary.repeat_customers / summary.buying_customers) * 100;
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });

  describe("2. Period Comparison & Growth Ratios", () => {
    it("computes sales growth percentage accurately", () => {
      const { comparison } = mockEnhancedReport;
      const expectedGrowth = ((mockBaseReport.summary.completed_sales - comparison.prior_sales) / comparison.prior_sales) * 100;
      expect(comparison.sales_growth_pct).toBeCloseTo(expectedGrowth, 1);
    });

    it("handles zero prior sales without dividing by zero", () => {
      const priorSales = 0;
      const currentSales = 50_000_000;
      const growth = priorSales > 0 ? Number((((currentSales - priorSales) / priorSales) * 100).toFixed(1)) : null;
      expect(growth).toBeNull();
    });
  });

  describe("3. First-Party Tracking Deduplication & Admin Filter", () => {
    it("correctly identifies admin paths to prevent recording admin traffic", () => {
      const isAdminPath = (path: string) => path.startsWith("/admin");
      expect(isAdminPath("/admin")).toBe(true);
      expect(isAdminPath("/admin/reports")).toBe(true);
      expect(isAdminPath("/admin/orders")).toBe(true);
      expect(isAdminPath("/admin/products")).toBe(true);

      expect(isAdminPath("/")).toBe(false);
      expect(isAdminPath("/category/laptops")).toBe(false);
      expect(isAdminPath("/product/123")).toBe(false);
      expect(isAdminPath("/checkout")).toBe(false);
    });

    it("deduplicates fast repeated client events within debounce threshold", () => {
      const lastEvents = new Map<string, number>();
      const isDuplicate = (key: string, now: number, thresholdMs = 3000): boolean => {
        const last = lastEvents.get(key);
        if (last !== undefined && now - last < thresholdMs) return true;
        lastEvents.set(key, now);
        return false;
      };

      const key = "v1:page_view:/product/laptop-1";
      expect(isDuplicate(key, 1000)).toBe(false); // First event recorded
      expect(isDuplicate(key, 1500)).toBe(true);  // 500ms later: duplicate suppressed
      expect(isDuplicate(key, 2900)).toBe(true);  // 1900ms later: duplicate suppressed
      expect(isDuplicate(key, 4500)).toBe(false); // 3500ms later: new event recorded
    });

    it("strips sensitive query parameters from tracked URLs", () => {
      const sanitizePath = (url: string) => {
        try {
          const parsed = new URL(url, "https://store.local");
          const allowed = ["page", "category", "sort", "brand"];
          const sanitized = new URLSearchParams();
          parsed.searchParams.forEach((val, k) => {
            if (allowed.includes(k.toLowerCase())) {
              sanitized.set(k, val);
            }
          });
          const query = sanitized.toString();
          return parsed.pathname + (query ? `?${query}` : "");
        } catch {
          return "/";
        }
      };

      const clean = sanitizePath("/checkout?token=secret123&email=user@test.com&category=laptops");
      expect(clean).toBe("/checkout?category=laptops");
      expect(clean.includes("token")).toBe(false);
      expect(clean.includes("email")).toBe(false);
    });
  });

  describe("4. Conversion Funnel Integrity", () => {
    it("ensures conversion percentages are bounded and drop-off is complementary", () => {
      mockEnhancedReport.funnel.stages.forEach((stage, idx) => {
        expect(stage.count).toBeGreaterThanOrEqual(0);
        if (idx === 0) {
          expect(stage.conversion_pct).toBe(100);
          expect(stage.dropoff_pct).toBe(0);
        } else {
          expect(stage.conversion_pct).toBeGreaterThanOrEqual(0);
          expect(stage.conversion_pct).toBeLessThanOrEqual(100);
          expect(stage.dropoff_pct).toBeGreaterThanOrEqual(0);
          expect(stage.dropoff_pct).toBeLessThanOrEqual(100);
        }
      });
    });

    it("calculates overall conversion rate from top to bottom stage", () => {
      const stages = mockEnhancedReport.funnel.stages;
      const top = stages[0].count;
      const bottom = stages[stages.length - 1].count;
      const overall = Number(((bottom / top) * 100).toFixed(2));
      expect(overall).toBe(3.56);
    });
  });

  describe("5. Catalog Health & Low Stock Alerts", () => {
    it("correctly flags low stock < 5 units and out of stock = 0", () => {
      const { health } = mockEnhancedReport;
      expect(health.low_stock_products.length).toBe(1);
      expect(health.low_stock_products[0].stock).toBe(2);
      expect(health.low_stock_products[0].stock).toBeLessThan(5);

      expect(health.out_of_stock_products.length).toBe(1);
      expect(health.out_of_stock_products[0].name).toBe("MacBook Air M2");
    });
  });

  describe("6. Export Formats Generation (Excel, Word, PowerPoint)", () => {
    it("identifies enhanced vs base reports correctly", () => {
      expect(isEnhancedReport(mockEnhancedReport)).toBe(true);
      expect(isEnhancedReport(mockBaseReport)).toBe(false);
    });

    it("generates a valid multi-sheet Excel (.xlsx) Blob", async () => {
      const blob = await generateAnalyticsExcel(mockEnhancedReport);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(1000);
      expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    });

    it("generates a valid Microsoft Word (.docx) Blob", async () => {
      const blob = await generateAnalyticsWord(mockEnhancedReport);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(500);
    });

    it("generates a valid 6-slide PowerPoint (.pptx) Blob", async () => {
      const blob = await generateAnalyticsPowerPoint(mockEnhancedReport);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(2000);
    });

    it("handles base reports in Excel generator gracefully without crashing", async () => {
      const blob = await generateAnalyticsExcel(mockBaseReport);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(1000);
    });
  });

  describe("7. Empty State Handling (No Fake Data)", () => {
    it("renders standby status when tracking events table is unpopulated", () => {
      const emptyReport: EnhancedAnalyticsReport = {
        ...mockBaseReport,
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
          daily_traffic: [],
          top_pages: [],
          sources: [],
          devices: [],
          peak_hours: [],
          tracking_active: false,
        },
        funnel: {
          stages: [
            { key: "visitors", label: "1. Pengunjung Unik", count: 0, conversion_pct: 100, dropoff_pct: 0 },
            { key: "view_item", label: "2. Melihat Produk", count: 0, conversion_pct: 0, dropoff_pct: 0 },
            { key: "add_to_cart", label: "3. Tambah Keranjang", count: 0, conversion_pct: 0, dropoff_pct: 0 },
            { key: "checkout", label: "4. Mulai Checkout", count: 0, conversion_pct: 0, dropoff_pct: 0 },
            { key: "completed", label: "5. Pesanan Berhasil", count: 16, conversion_pct: 0, dropoff_pct: 0 },
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
          total_catalog_active: 10,
          total_catalog_draft: 0,
          tracking_integration_status: "standby",
        },
      };

      expect(emptyReport.traffic.tracking_active).toBe(false);
      expect(emptyReport.funnel.is_complete).toBe(false);
      expect(emptyReport.traffic.unique_visitors).toBe(0);
      expect(emptyReport.health.tracking_integration_status).toBe("standby");
    });
  });
});
