"use client";

import { useState, useId, useMemo, useEffect, useTransition } from "react";
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Calendar,
  Sparkles,
  Filter,
  RotateCcw,
  X,
  Download,
  User,
  Phone,
  Package,
  Search,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAdminSalesChartDetailsAction,
  type AdminSaleItemDetail,
  type AdminSalesChartData,
} from "@/actions/admin";

export type SalesChartPoint = {
  day: string;
  orders: number;
  revenue: number;
  details?: AdminSaleItemDetail[];
};

interface SalesChartProps {
  points: SalesChartPoint[];
  days?: number;
}

function getCubicBezierPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

function exportDaySalesCsv(day: string, details: AdminSaleItemDetail[]) {
  if (!details || details.length === 0) return;
  const headers = [
    "No Pesanan",
    "Tanggal",
    "Jam",
    "Nama Pelanggan",
    "No Telepon",
    "Nama Produk",
    "Varian",
    "Brand",
    "Kategori",
    "Jumlah",
    "Harga Satuan",
    "Subtotal",
    "Total Pesanan",
    "Status",
  ];
  const rows = details.map((d) => [
    `"${d.orderNumber}"`,
    `"${d.day}"`,
    `"${d.time}"`,
    `"${d.customerName.replace(/"/g, '""')}"`,
    `"${d.customerPhone}"`,
    `"${d.productName.replace(/"/g, '""')}"`,
    `"${(d.variantDetails || "").replace(/"/g, '""')}"`,
    `"${(d.brandName || "").replace(/"/g, '""')}"`,
    `"${(d.categoryName || "").replace(/"/g, '""')}"`,
    d.quantity,
    d.price,
    d.subtotal,
    d.grandTotal,
    `"${d.orderStatus}"`,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `laporan-penjualan-${day}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function SalesChart({ points: rawPoints, days = 30 }: SalesChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30 | 90>(
    days === 7 ? 7 : days === 14 ? 14 : days === 90 ? 90 : 30
  );
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Filters
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchProduct, setSearchProduct] = useState("");

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedDayItem, setSelectedDayItem] = useState<SalesChartPoint | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  const [detailedData, setDetailedData] = useState<AdminSalesChartData | null>(null);
  const [isLoadingDetails, startTransition] = useTransition();

  const gradientId = useId();

  // Fetch detailed sales transactions whenever date range changes
  useEffect(() => {
    let isCancelled = false;
    startTransition(async () => {
      try {
        const result = await getAdminSalesChartDetailsAction({
          days: selectedPeriod,
          startDate: isCustomRange && customStartDate ? customStartDate : undefined,
          endDate: isCustomRange && customEndDate ? customEndDate : undefined,
        });
        if (!isCancelled) {
          setDetailedData(result);
          setAnimationKey((k) => k + 1);
        }
      } catch (err) {
        console.error("Gagal memuat rincian transaksi penjualan:", err);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedPeriod, isCustomRange, customStartDate, customEndDate]);

  // Available filter options from database/sales
  const filterOptions = useMemo(() => {
    return (
      detailedData?.filterOptions ?? {
        brands: [],
        categories: [],
        products: [],
      }
    );
  }, [detailedData]);

  // Compute active filtered points
  const activePoints = useMemo<SalesChartPoint[]>(() => {
    if (detailedData && detailedData.points.length > 0) {
      const hasFilters =
        selectedBrand !== "all" ||
        selectedCategory !== "all" ||
        searchProduct.trim() !== "";

      if (!hasFilters) {
        return detailedData.points;
      }

      return detailedData.points.map((p) => {
        const filteredDetails = (p.details ?? []).filter((item) => {
          if (
            selectedBrand !== "all" &&
            item.brandId !== selectedBrand &&
            item.brandName !== selectedBrand
          ) {
            return false;
          }
          if (
            selectedCategory !== "all" &&
            item.categoryId !== selectedCategory &&
            item.categoryName !== selectedCategory
          ) {
            return false;
          }
          if (searchProduct.trim()) {
            const q = searchProduct.toLowerCase();
            const matchesName = item.productName.toLowerCase().includes(q);
            const matchesVar = (item.variantDetails || "")
              .toLowerCase()
              .includes(q);
            if (!matchesName && !matchesVar) return false;
          }
          return true;
        });

        const uniqueOrders = new Set(filteredDetails.map((d) => d.orderId));
        const filteredRevenue = filteredDetails.reduce(
          (sum, d) => sum + d.subtotal,
          0
        );

        return {
          day: p.day,
          orders: uniqueOrders.size,
          revenue: filteredRevenue,
          details: filteredDetails,
        };
      });
    }

    // Fallback while loading
    if (!rawPoints || rawPoints.length === 0) return [];
    return rawPoints.slice(-selectedPeriod);
  }, [detailedData, rawPoints, selectedPeriod, selectedBrand, selectedCategory, searchProduct]);

  // Compute key sales metrics for the active period
  const metrics = useMemo(() => {
    const totalRev = activePoints.reduce((acc, p) => acc + p.revenue, 0);
    const totalOrd = activePoints.reduce((acc, p) => acc + p.orders, 0);
    const aov = totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0;
    const dailyAvg =
      activePoints.length > 0 ? Math.round(totalRev / activePoints.length) : 0;
    const maxRevPoint = activePoints.reduce(
      (max, p) => (p.revenue > max.revenue ? p : max),
      { day: "", orders: 0, revenue: 0, details: [] }
    );

    return { totalRev, totalOrd, aov, dailyAvg, maxRevPoint };
  }, [activePoints]);

  const hasActiveFilters = Boolean(
    selectedBrand !== "all" ||
      selectedCategory !== "all" ||
      searchProduct.trim() !== "" ||
      isCustomRange
  );

  const resetFilters = () => {
    setSelectedBrand("all");
    setSelectedCategory("all");
    setSearchProduct("");
    setIsCustomRange(false);
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedPeriod(30);
  };

  const width = 900;
  const height = 260;
  const inset = { x: 55, y: 24, bottom: 40 };
  const plotWidth = width - inset.x - 20;
  const plotHeight = height - inset.y - inset.bottom;

  const maxRevenue = Math.max(1, ...activePoints.map((p) => p.revenue));
  const maxOrders = Math.max(1, ...activePoints.map((p) => p.orders));

  const coordinates = useMemo(() => {
    return activePoints.map((p, idx) => {
      const x =
        inset.x +
        (activePoints.length <= 1
          ? plotWidth / 2
          : (idx * plotWidth) / (activePoints.length - 1));
      const revY =
        inset.y + plotHeight - (p.revenue / maxRevenue) * plotHeight;
      const orderY =
        inset.y + plotHeight - (p.orders / maxOrders) * plotHeight;
      return {
        ...p,
        x,
        y: revY,
        orderY,
      };
    });
  }, [activePoints, inset.x, inset.y, plotWidth, plotHeight, maxRevenue, maxOrders]);

  const revenueSpline = useMemo(
    () => getCubicBezierPath(coordinates),
    [coordinates]
  );
  const ordersSpline = useMemo(
    () =>
      getCubicBezierPath(
        coordinates.map((c) => ({
          x: c.x,
          y: c.orderY,
        }))
      ),
    [coordinates]
  );

  const areaSpline = useMemo(() => {
    if (coordinates.length <= 1) return "";
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    return `${revenueSpline} L ${last.x.toFixed(1)} ${(
      inset.y + plotHeight
    ).toFixed(1)} L ${first.x.toFixed(1)} ${(inset.y + plotHeight).toFixed(1)} Z`;
  }, [coordinates, revenueSpline, inset.y, plotHeight]);

  const tickValues = [maxRevenue, maxRevenue * 0.66, maxRevenue * 0.33, 0];
  const compactMoney = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}rb`;
    return Math.round(val).toLocaleString("id-ID");
  };

  // Fixed Non-overlapping X-Axis Label Distribution
  const visibleLabelIndices = useMemo(() => {
    if (coordinates.length === 0) return new Set<number>();
    const indices: number[] = [];
    const targetLabelCount =
      selectedPeriod <= 7 ? 7 : selectedPeriod <= 14 ? 7 : 6;
    const step = Math.max(
      1,
      Math.floor(coordinates.length / targetLabelCount)
    );

    for (let i = 0; i < coordinates.length; i += step) {
      indices.push(i);
    }

    const lastIdx = coordinates.length - 1;
    if (indices[indices.length - 1] !== lastIdx) {
      const prevIdx = indices[indices.length - 1];
      const prevX = coordinates[prevIdx]?.x ?? 0;
      const lastX = coordinates[lastIdx]?.x ?? 0;
      // If the penultimate label is within 55px of the final date label, replace it to prevent overlap
      if (lastX - prevX < 55) {
        indices[indices.length - 1] = lastIdx;
      } else {
        indices.push(lastIdx);
      }
    }

    return new Set(indices);
  }, [coordinates, selectedPeriod]);

  const activeHoverItem =
    hoverIndex !== null && coordinates[hoverIndex]
      ? coordinates[hoverIndex]
      : null;

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes drawLineAnimation {
          from { stroke-dashoffset: 1400; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes areaFadeIn {
          from { opacity: 0; transform: scaleY(0.92); }
          to { opacity: 1; transform: scaleY(1); }
        }
        @keyframes pointScale {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .chart-path-animated {
          stroke-dasharray: 1400;
          stroke-dashoffset: 0;
          animation: drawLineAnimation 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .chart-area-animated {
          transform-origin: bottom;
          animation: areaFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .chart-point-pop {
          transform-box: fill-box;
          transform-origin: center;
          animation: pointScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Top Header & Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black tracking-tight text-foreground">
              Tren Omset &amp; Penjualan
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3" /> Live
            </span>
            {isLoadingDetails && (
              <span className="text-[11px] text-muted-foreground animate-pulse">
                • Memperbarui...
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Visualisasi kurva penjualan selesai dan volume transaksi per hari. Klik titik kurva untuk melihat rincian produk &amp; pembeli.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-muted/40 p-1 self-start sm:self-auto shadow-2xs">
          {([7, 14, 30, 90] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setIsCustomRange(false);
                setSelectedPeriod(p);
                setHoverIndex(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                !isCustomRange && selectedPeriod === p
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p} Hari
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCustomRange(true)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              isCustomRange
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Kustom
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Strip */}
      {isCustomRange && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/20 p-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Dari:</span>
            <Input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Sampai:</span>
            <Input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>
          {(customStartDate || customEndDate) && (
            <span className="text-[11px] text-muted-foreground italic">
              Menampilkan data dalam rentang tanggal terpilih
            </span>
          )}
        </div>
      )}

      {/* Filter Bar (Brand, Category/Type, Product Search) */}
      <div className="rounded-xl border bg-card p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Filter className="size-3.5 text-primary" />
            <span>Filter Analitik Penjualan</span>
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Reset Filter
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {/* Brand Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground block">
              Brand
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Semua Brand</option>
              {filterOptions.brands.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category / Type Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground block">
              Kategori / Tipe
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Semua Kategori</option>
              {filterOptions.categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Product Search */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground block">
              Produk Spesifik
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari nama atau tipe produk..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Analytics Helper Strip (AOV, Daily Run Rate, Total) */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 pt-1">
        <div className="rounded-xl border bg-card p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <DollarSign className="size-3.5 text-emerald-600" />
            <span>Omset Selesai ({isCustomRange ? "Kustom" : `${selectedPeriod}H`})</span>
          </div>
          <p className="mt-1 font-mono text-lg font-black text-foreground">
            Rp {metrics.totalRev.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <ShoppingBag className="size-3.5 text-blue-600" />
            <span>Pesanan Selesai</span>
          </div>
          <p className="mt-1 font-mono text-lg font-black text-foreground">
            {metrics.totalOrd.toLocaleString("id-ID")}{" "}
            <span className="text-xs font-normal text-muted-foreground">trx</span>
          </p>
        </div>

        <div className="rounded-xl border bg-card p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Sparkles className="size-3.5 text-violet-600" />
            <span>AOV (Rata-rata Nilai)</span>
          </div>
          <p className="mt-1 font-mono text-lg font-black text-foreground">
            Rp {metrics.aov.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Calendar className="size-3.5 text-amber-600" />
            <span>Rata-rata Harian</span>
          </div>
          <p className="mt-1 font-mono text-lg font-black text-foreground">
            Rp {metrics.dailyAvg.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      {/* Peak Day Banner (if revenue exists) */}
      {metrics.maxRevPoint.revenue > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
            <Flame className="size-4 text-amber-500 fill-amber-500" />
            <span>
              Hari Terlaris:{" "}
              <strong>
                {new Intl.DateTimeFormat("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  timeZone: "Asia/Jakarta",
                }).format(new Date(`${metrics.maxRevPoint.day}T12:00:00+07:00`))}
              </strong>{" "}
              (Omset:{" "}
              <span className="font-mono font-bold">
                Rp {metrics.maxRevPoint.revenue.toLocaleString("id-ID")}
              </span>
              , {metrics.maxRevPoint.orders} pesanan)
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDayItem(metrics.maxRevPoint)}
            className="h-6 px-2 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
          >
            Lihat Transaksi <ArrowRight className="ml-1 size-3" />
          </Button>
        </div>
      )}

      {/* Legend & Hover Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 font-medium">
            <span className="size-2.5 rounded-full bg-primary ring-2 ring-primary/20" />
            Pendapatan Omset (Rp)
          </span>
          <span className="inline-flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            Pesanan Selesai (Klik titik untuk rincian)
          </span>
        </div>

        {activeHoverItem ? (
          <div className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary animate-in fade-in duration-150">
            {new Intl.DateTimeFormat("id-ID", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Asia/Jakarta",
            }).format(new Date(`${activeHoverItem.day}T12:00:00+07:00`))}
            : <span className="font-mono font-bold">Rp {activeHoverItem.revenue.toLocaleString("id-ID")}</span> ({activeHoverItem.orders} pesanan) • <span className="underline cursor-pointer">Klik untuk buka rincian</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-[11px]">
            Arahkan kursor &amp; klik pada titik grafik untuk detail transaksi per hari
          </span>
        )}
      </div>

      {/* Animated SVG Chart */}
      <div
        role="img"
        aria-label={`Grafik pendapatan harian pesanan selesai`}
        className="relative w-full overflow-hidden rounded-xl border bg-card/60 p-2 sm:p-3"
      >
        <svg
          key={`${animationKey}-${selectedBrand}-${selectedCategory}-${searchProduct}`}
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full select-none"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
              <stop offset="85%" stopColor="var(--primary)" stopOpacity="0.02" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id={`${gradientId}-orders`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
            <filter id={`${gradientId}-glow`} x1="-20%" y1="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="var(--primary)" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Grid Lines & Y-Axis Labels */}
          {tickValues.map((val, idx) => {
            const y = inset.y + (idx * plotHeight) / 3;
            return (
              <g key={idx}>
                <line
                  x1={inset.x}
                  y1={y}
                  x2={width - 20}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity=".1"
                  strokeDasharray="4 6"
                />
                <text
                  x={inset.x - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="currentColor"
                  opacity=".6"
                  fontSize="11"
                  className="font-mono font-medium"
                >
                  {compactMoney(val)}
                </text>
              </g>
            );
          })}

          {/* Area Gradient under Revenue Spline */}
          {areaSpline && (
            <path
              d={areaSpline}
              fill={`url(#${gradientId})`}
              className="chart-area-animated transition-all duration-300 ease-out"
            />
          )}

          {/* Smooth Orders Curve (Dashed Green) */}
          {coordinates.length > 1 && (
            <path
              d={ordersSpline}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="6 4"
              opacity="0.85"
              className="chart-path-animated transition-all duration-300 ease-out"
            />
          )}

          {/* Smooth Revenue Curve (Solid Primary Line) */}
          {coordinates.length > 1 && (
            <path
              d={revenueSpline}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              filter={`url(#${gradientId}-glow)`}
              className="chart-path-animated transition-all duration-300 ease-out"
            />
          )}

          {/* Active Hover Guideline and Markers */}
          {activeHoverItem && (
            <g className="transition-all duration-150">
              <line
                x1={activeHoverItem.x}
                y1={inset.y}
                x2={activeHoverItem.x}
                y2={inset.y + plotHeight}
                stroke="var(--primary)"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {/* Order point halo */}
              <circle
                cx={activeHoverItem.x}
                cy={activeHoverItem.orderY}
                r="5.5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
              {/* Revenue point pulsing halo */}
              <circle
                cx={activeHoverItem.x}
                cy={activeHoverItem.y}
                r="7.5"
                fill="var(--primary)"
                stroke="#ffffff"
                strokeWidth="2.5"
                className="animate-pulse"
              />
            </g>
          )}

          {/* Active Selected Day Marker */}
          {selectedDayItem && (
            <g>
              {coordinates
                .filter((c) => c.day === selectedDayItem.day)
                .map((pt) => (
                  <g key={`selected-${pt.day}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="10"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                      className="animate-spin"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.orderY}
                      r="8"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      className="animate-pulse"
                    />
                  </g>
                ))}
            </g>
          )}

          {/* Interactive touch/mouse targets for every data point */}
          {coordinates.map((point, idx) => {
            const isHovered = hoverIndex === idx;
            const hasSales = point.revenue > 0 || point.orders > 0;
            return (
              <g
                key={point.day}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onTouchStart={() => setHoverIndex(idx)}
                onClick={() => setSelectedDayItem(point)}
              >
                {/* Visual Dot on Revenue Curve */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? 6.5 : hasSales ? 4.5 : 3}
                  fill="var(--primary)"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1}
                  className="chart-point-pop transition-all duration-150"
                />

                {/* Visual Dot on Order Curve (Green Circle) */}
                <circle
                  cx={point.x}
                  cy={point.orderY}
                  r={isHovered ? 5.5 : hasSales ? 4 : 2.5}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : hasSales ? 1.5 : 0.8}
                  className="chart-point-pop transition-all duration-150"
                />

                {/* Broad transparent hit area for easy hover/tap */}
                <rect
                  x={point.x - plotWidth / (coordinates.length * 2)}
                  y={inset.y}
                  width={plotWidth / coordinates.length}
                  height={plotHeight}
                  fill="transparent"
                />
              </g>
            );
          })}

          {/* X-Axis Date Labels with Non-Overlapping Distribution */}
          {coordinates.map((point, idx) => {
            if (!visibleLabelIndices.has(idx)) return null;

            return (
              <text
                key={`label-${point.day}`}
                x={point.x}
                y={height - 10}
                textAnchor={
                  idx === 0
                    ? "start"
                    : idx === coordinates.length - 1
                    ? "end"
                    : "middle"
                }
                fill="currentColor"
                opacity={hoverIndex === idx ? "1" : "0.6"}
                fontSize="11"
                className={`font-sans ${
                  hoverIndex === idx ? "font-bold fill-primary" : "font-normal"
                }`}
              >
                {new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                  month: "short",
                  timeZone: "Asia/Jakarta",
                }).format(new Date(`${point.day}T12:00:00+07:00`))}
              </text>
            );
          })}
        </svg>
      </div>

      {!activePoints.some((p) => p.revenue > 0) && (
        <p className="text-center text-xs text-muted-foreground py-2">
          Belum ada transaksi selesai dalam filter atau periode ini.
        </p>
      )}

      {/* Modal / Dialog Rincian Penjualan Harian */}
      {selectedDayItem && (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4 animate-in fade-in duration-200"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedDayItem(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="day-details-title"
            className="w-full max-w-2xl flex flex-col rounded-2xl bg-card border shadow-2xl overflow-hidden max-h-[90vh]"
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between p-5 border-b bg-muted/20">
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    id="day-details-title"
                    className="text-lg font-bold text-foreground"
                  >
                    Rincian Penjualan Harian
                  </h3>
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedDayItem.day}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Intl.DateTimeFormat("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date(`${selectedDayItem.day}T12:00:00+07:00`))}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedDayItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Stat Summary Strip */}
            <div className="grid grid-cols-2 gap-3 p-4 px-5 border-b bg-background">
              <div className="rounded-xl border bg-muted/20 p-2.5">
                <span className="text-[11px] text-muted-foreground block">
                  Total Omset Hari Ini
                </span>
                <span className="font-mono text-base font-black text-foreground">
                  Rp {selectedDayItem.revenue.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="rounded-xl border bg-muted/20 p-2.5">
                <span className="text-[11px] text-muted-foreground block">
                  Volume Transaksi Selesai
                </span>
                <span className="font-mono text-base font-black text-foreground">
                  {selectedDayItem.orders} Pesanan
                </span>
              </div>
            </div>

            {/* List of Items Sold on That Day */}
            <div className="p-5 space-y-3.5 overflow-y-auto">
              {selectedDayItem.details && selectedDayItem.details.length > 0 ? (
                selectedDayItem.details.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="rounded-xl border bg-card p-3.5 shadow-2xs space-y-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          Pesanan #{item.orderNumber}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        >
                          <CheckCircle2 className="mr-1 size-3" /> Selesai
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Clock className="size-3" /> {item.time}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Customer Info */}
                      <div className="space-y-1 rounded-lg bg-muted/30 p-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Pembeli:
                        </span>
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <User className="size-3.5 text-primary" />
                          <span>{item.customerName}</span>
                        </div>
                        {item.customerPhone && item.customerPhone !== "-" && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                            <Phone className="size-3" />
                            <span>{item.customerPhone}</span>
                          </div>
                        )}
                      </div>

                      {/* Product & Price Info */}
                      <div className="space-y-1 rounded-lg bg-muted/30 p-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Produk Terjual:
                        </span>
                        <div className="flex items-start gap-1.5">
                          <Package className="size-3.5 text-blue-600 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-foreground block">
                              {item.productName}
                            </span>
                            {item.variantDetails && (
                              <span className="text-[11px] text-muted-foreground block">
                                Varian: {item.variantDetails}
                              </span>
                            )}
                            {(item.brandName || item.categoryName) && (
                              <span className="text-[10px] text-muted-foreground block mt-0.5">
                                {[item.brandName, item.categoryName]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="flex items-center justify-between pt-1 border-t text-xs font-mono">
                      <span className="text-muted-foreground">
                        {item.quantity} unit × Rp{" "}
                        {item.price.toLocaleString("id-ID")}
                      </span>
                      <span className="font-bold text-foreground">
                        Subtotal: Rp {item.subtotal.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-muted-foreground text-xs space-y-2">
                  <ShoppingBag className="mx-auto size-8 text-muted-foreground/40" />
                  <p>Tidak ada rincian transaksi penjualan selesai pada tanggal ini.</p>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between p-4 px-5 border-t bg-muted/10 shrink-0">
              {selectedDayItem.details && selectedDayItem.details.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportDaySalesCsv(
                      selectedDayItem.day,
                      selectedDayItem.details || []
                    )
                  }
                  className="text-xs"
                >
                  <Download className="mr-1.5 size-3.5" />
                  Ekspor CSV Hari Ini
                </Button>
              ) : (
                <div />
              )}

              <Button
                type="button"
                onClick={() => setSelectedDayItem(null)}
                className="text-xs font-semibold"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
