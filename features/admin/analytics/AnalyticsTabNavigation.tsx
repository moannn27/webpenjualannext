"use client";

import React from "react";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Filter,
  Package,
  Sparkles,
} from "lucide-react";

export type AnalyticsTabKey =
  | "ringkasan"
  | "penjualan"
  | "traffic"
  | "corong"
  | "produk"
  | "marketing_ai";

interface TabItem {
  key: AnalyticsTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabItem[] = [
  { key: "ringkasan", label: "Ringkasan Eksekutif", icon: LayoutDashboard },
  { key: "penjualan", label: "Penjualan & Pesanan", icon: DollarSign },
  { key: "traffic", label: "Traffic & Pengunjung", icon: Users },
  { key: "corong", label: "Corong Konversi", icon: Filter },
  { key: "produk", label: "Performa Produk & Stok", icon: Package },
  { key: "marketing_ai", label: "Marketing & AI", icon: Sparkles },
];

export function AnalyticsTabNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: AnalyticsTabKey;
  onTabChange: (tab: AnalyticsTabKey) => void;
}) {
  return (
    <div className="no-print border-b border-border">
      <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-px" aria-label="Tab Analitik">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 ${
                isActive
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className={`size-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
