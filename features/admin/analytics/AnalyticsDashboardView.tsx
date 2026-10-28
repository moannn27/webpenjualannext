"use client";

import React, { useState } from "react";
import type { EnhancedAnalyticsReport } from "@/lib/analytics-reporting";
import {
  AnalyticsTabNavigation,
  type AnalyticsTabKey,
} from "@/features/admin/analytics/AnalyticsTabNavigation";
import { AnalyticsOverviewSection } from "@/features/admin/analytics/AnalyticsOverviewSection";
import {
  AnalyticsSalesSection,
  type RecentCompletedOrder,
} from "@/features/admin/analytics/AnalyticsSalesSection";
import { AnalyticsTrafficSection } from "@/features/admin/analytics/AnalyticsTrafficSection";
import { AnalyticsFunnelSection } from "@/features/admin/analytics/AnalyticsFunnelSection";
import { AnalyticsProductSection } from "@/features/admin/analytics/AnalyticsProductSection";
import { AnalyticsMarketingAISection } from "@/features/admin/analytics/AnalyticsMarketingAISection";

export function AnalyticsDashboardView({
  report,
  recentOrders,
}: {
  report: EnhancedAnalyticsReport;
  recentOrders: RecentCompletedOrder[];
}) {
  const [activeTab, setActiveTab] = useState<AnalyticsTabKey>("ringkasan");

  return (
    <div className="space-y-6">
      {/* 1. Client Interactive Tab Navigation (hidden during print) */}
      <AnalyticsTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 2. Screen View: Interactive Tab Content (hidden during print) */}
      <div className="no-print">
        {activeTab === "ringkasan" && <AnalyticsOverviewSection report={report} />}
        {activeTab === "penjualan" && (
          <AnalyticsSalesSection report={report} recentOrders={recentOrders} />
        )}
        {activeTab === "traffic" && <AnalyticsTrafficSection report={report} />}
        {activeTab === "corong" && <AnalyticsFunnelSection report={report} />}
        {activeTab === "produk" && <AnalyticsProductSection report={report} />}
        {activeTab === "marketing_ai" && <AnalyticsMarketingAISection report={report} />}
      </div>

      {/* 3. Print / PDF View: Render All Sections Sequentially (only visible during print) */}
      <div className="hidden print:block space-y-10">
        <div>
          <h2 className="text-xl font-black mb-4 border-b pb-2">I. Ringkasan Eksekutif &amp; KPI</h2>
          <AnalyticsOverviewSection report={report} />
        </div>
        <div className="break-before-page">
          <h2 className="text-xl font-black mb-4 border-b pb-2">II. Kinerja Penjualan &amp; Transaksi</h2>
          <AnalyticsSalesSection report={report} recentOrders={recentOrders} />
        </div>
        <div className="break-before-page">
          <h2 className="text-xl font-black mb-4 border-b pb-2">III. Traffic, Pengunjung &amp; Perangkat</h2>
          <AnalyticsTrafficSection report={report} />
        </div>
        <div className="break-before-page">
          <h2 className="text-xl font-black mb-4 border-b pb-2">IV. Corong Konversi E-Commerce</h2>
          <AnalyticsFunnelSection report={report} />
        </div>
        <div className="break-before-page">
          <h2 className="text-xl font-black mb-4 border-b pb-2">V. Kesehatan Katalog &amp; Stok Produk</h2>
          <AnalyticsProductSection report={report} />
        </div>
        <div className="break-before-page">
          <h2 className="text-xl font-black mb-4 border-b pb-2">VI. Marketing, Voucher &amp; AI Assistant</h2>
          <AnalyticsMarketingAISection report={report} />
        </div>
      </div>
    </div>
  );
}

