"use client";

import { useState, useId, useMemo, useEffect, useRef, useTransition } from "react";
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
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAdminSalesChartDetailsAction,
  type AdminSaleItemDetail,
  type AdminSalesChartData,
} from "@/actions/admin";
import {
  generateSalesCsv,
  generateSalesExcel,
  generateSalesWord,
  openSalesPrintPdf,
  triggerBlobDownload,
  type SalesExportFormat,
} from "@/lib/export-sales";

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

type ChartMetricMode = "combined" | "revenue" | "orders";

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

/**
 * Dropdown Menu Ekspor Multi-Format (Excel, Word, PDF, CSV)
 */
function SalesExportDropdown({
  title,
  details,
  buttonLabel = "Opsi Ekspor",
  variant = "outline",
}: {
  title: string;
  details: AdminSaleItemDetail[];
  buttonLabel?: string;
  variant?: "outline" | "default";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleExport = async (format: SalesExportFormat) => {
    if (!details || details.length === 0) return;
    setIsExporting(true);
    setIsOpen(false);
    try {
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_");
      if (format === "xlsx") {
        const blob = await generateSalesExcel(title, details);
        triggerBlobDownload(blob, `laporan-penjualan-${sanitizedTitle}.xlsx`);
      } else if (format === "doc") {
        const blob = generateSalesWord(title, details);
        triggerBlobDownload(blob, `laporan-penjualan-${sanitizedTitle}.doc`);
      } else if (format === "pdf") {
        openSalesPrintPdf(title, details);
      } else if (format === "csv") {
        const blob = generateSalesCsv(title, details);
        triggerBlobDownload(blob, `laporan-penjualan-${sanitizedTitle}.csv`);
      }
    } catch (err) {
      console.error("Gagal mengekspor data penjualan:", err);
      alert("Terjadi kendala saat mengekspor laporan.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled={isExporting || details.length === 0}
        onClick={() => setIsOpen((prev) => !prev)}
        className="gap-1.5 text-xs font-semibold"
      >
        <Download className="size-3.5" />
        <span>{isExporting ? "Mengekspor..." : buttonLabel}</span>
        <ChevronDown
          className={`size-3 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {isOpen && (
        <div className="absolute left-0 bottom-full sm:bottom-auto sm:top-full mb-1 sm:mb-0 sm:mt-1 z-50 w-56 rounded-xl border bg-popover p-1.5 shadow-xl text-popover-foreground animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Pilih Format Ekspor:
          </div>
          <button
            type="button"
            onClick={() => handleExport("xlsx")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-muted font-medium transition-colors text-left"
          >
            <FileSpreadsheet className="size-4 text-emerald-600" />
            <div>
              <span className="font-semibold block">Excel (.xlsx)</span>
              <span className="text-[10px] text-muted-foreground">Spreadsheet resmi terformat</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleExport("doc")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-muted font-medium transition-colors text-left"
          >
            <FileText className="size-4 text-blue-600" />
            <div>
              <span className="font-semibold block">Word (.doc)</span>
              <span className="text-[10px] text-muted-foreground">Dokumen laporan &amp; tabel</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleExport("pdf")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-muted font-medium transition-colors text-left"
          >
            <Printer className="size-4 text-rose-600" />
            <div>
              <span className="font-semibold block">Cetak / Simpan PDF</span>
              <span className="text-[10px] text-muted-foreground">Format cetak A4 rapi</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleExport("csv")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-muted font-medium transition-colors text-left"
          >
            <Download className="size-4 text-slate-600" />
            <div>
              <span className="font-semibold block">CSV (.csv)</span>
              <span className="text-[10px] text-muted-foreground">Data mentah UTF-8</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export function SalesChart({ points: rawPoints, days = 30 }: SalesChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30 | 90>(
    days === 7 ? 7 : days === 14 ? 14 : days === 90 ? 90 : 30
  );
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Chart Metric Mode: Gabungan, Omset Saja, Pesanan Saja
  const [chartMetric, setChartMetric] = useState<ChartMetricMode>("combined");

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

  // All filtered details across the active points (for full period export)
  const allFilteredDetails = useMemo(() => {
    return activePoints.flatMap((p) => p.details || []);
  }, [activePoints]);

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
  const inset = { x: 55, y: 26, bottom: 40 };
  const plotWidth = width - inset.x - 20;
  const plotHeight = height - inset.y - inset.bottom;

  const maxRevenue = Math.max(1, ...activePoints.map((p) => p.revenue));
  const maxOrders = Math.max(1, ...activePoints.map((p) => p.orders));

  // Determine bar width for order volume pillars
  const barWidth = useMemo(() => {
    if (activePoints.length === 0) return 12;
    return Math.max(6, Math.min(22, (plotWidth / activePoints.length) * 0.45));
  }, [activePoints.length, plotWidth]);

  const coordinates = useMemo(() => {
    return activePoints.map((p, idx) => {
      const x =
        inset.x +
        (activePoints.length <= 1
          ? plotWidth / 2
          : (idx * plotWidth) / (activePoints.length - 1));
      const revY =
        inset.y + plotHeight - (p.revenue / maxRevenue) * plotHeight;
      // In dedicated orders mode: full height scale
      const orderOnlyY =
        inset.y + plotHeight - (p.orders / maxOrders) * plotHeight;
      // In combined mode: order bar height is proportional and capped at 40% of plotHeight
      const orderBarHeight =
        p.orders > 0 && maxOrders > 0
          ? Math.max(6, (p.orders / maxOrders) * (plotHeight * 0.40))
          : 0;
      return {
        ...p,
        x,
        y: revY,
        orderOnlyY,
        orderBarHeight,
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
          y: c.orderOnlyY,
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

  const ordersAreaSpline = useMemo(() => {
    if (coordinates.length <= 1) return "";
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    return `${ordersSpline} L ${last.x.toFixed(1)} ${(
      inset.y + plotHeight
    ).toFixed(1)} L ${first.x.toFixed(1)} ${(inset.y + plotHeight).toFixed(1)} Z`;
  }, [coordinates, ordersSpline, inset.y, plotHeight]);

  const compactMoney = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}rb`;
    return Math.round(val).toLocaleString("id-ID");
  };

  // Dynamic Y-Axis Ticks depending on active metric mode
  const tickValues = useMemo(() => {
    if (chartMetric === "orders") {
      const top = Math.max(1, maxOrders);
      return [
        top,
        Math.max(1, Math.round(top * 0.66)),
        Math.max(1, Math.round(top * 0.33)),
        0,
      ];
    }
    return [maxRevenue, maxRevenue * 0.66, maxRevenue * 0.33, 0];
  }, [chartMetric, maxOrders, maxRevenue]);

  const formatTickLabel = (val: number) => {
    if (chartMetric === "orders") {
      return `${val} trx`;
    }
    return compactMoney(val);
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
          0% {
            stroke-dashoffset: 1200;
            opacity: 0.2;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        @keyframes fillAreaAnimation {
          0% {
            opacity: 0;
            transform: scaleY(0.9);
          }
          100% {
            opacity: 1;
            transform: scaleY(1);
          }
        }
        @keyframes pointScale {
          0% {
            transform: scale(0);
          }
          70% {
            transform: scale(1.3);
          }
          100% {
            transform: scale(1);
          }
        }
        .chart-path-animated {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: drawLineAnimation 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .chart-area-animated {
          transform-origin: bottom;
          animation: fillAreaAnimation 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
            Grafik penjualan selesai dan volume transaksi per hari. Klik titik kurva untuk melihat &amp; ekspor rincian pesanan.
          </p>
        </div>

        {/* Actions & Period Selector */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Export Full Filtered Period */}
          {allFilteredDetails.length > 0 && (
            <SalesExportDropdown
              title={`Periode-${isCustomRange ? "Kustom" : `${selectedPeriod}H`}`}
              details={allFilteredDetails}
              buttonLabel={`Ekspor Periode (${allFilteredDetails.length})`}
              variant="outline"
            />
          )}

          {/* Period Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-muted/40 p-1 shadow-2xs">
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

      {/* Legend, Metric Selector & Hover Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        {/* Metric Mode Switcher Buttons */}
        <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setChartMetric("combined")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              chartMetric === "combined"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 Gabungan
          </button>
          <button
            type="button"
            onClick={() => setChartMetric("revenue")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              chartMetric === "revenue"
                ? "bg-background text-primary shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            💰 Omset (Rp)
          </button>
          <button
            type="button"
            onClick={() => setChartMetric("orders")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              chartMetric === "orders"
                ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📦 Pesanan (Trx)
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          {(chartMetric === "combined" || chartMetric === "revenue") && (
            <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="size-2.5 rounded-xs bg-[#7C5CFC] ring-2 ring-[#7C5CFC]/25" />
              Omset Selesai (Rp)
            </span>
          )}
          {chartMetric === "combined" && (
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="size-2.5 rounded-xs bg-[#FFB020] ring-2 ring-[#FFB020]/25" />
              Volume Pesanan (Trx)
            </span>
          )}
          {chartMetric === "orders" && (
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="size-2.5 rounded-xs bg-[#FFB020] ring-2 ring-[#FFB020]/25" />
              Volume Pesanan Selesai (Trx)
            </span>
          )}
        </div>

        {/* Active Hover / Info Banner */}
        {activeHoverItem ? (
          <div className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary animate-in fade-in duration-150">
            {new Intl.DateTimeFormat("id-ID", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Asia/Jakarta",
            }).format(new Date(`${activeHoverItem.day}T12:00:00+07:00`))}
            : <span className="font-mono font-bold">Rp {activeHoverItem.revenue.toLocaleString("id-ID")}</span> ({activeHoverItem.orders} pesanan selesai) • <span className="underline cursor-pointer">Klik untuk buka rincian</span>
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
        aria-label={`Grafik analitik penjualan selesai`}
        className="relative w-full overflow-hidden rounded-xl border bg-card/60 p-2 sm:p-3"
      >
        <svg
          key={`${animationKey}-${chartMetric}-${selectedBrand}-${selectedCategory}-${searchProduct}`}
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full select-none"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Revenue Area Gradient (Finly Violet) */}
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.25" />
              <stop offset="85%" stopColor="#7C5CFC" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0.00" />
            </linearGradient>

            {/* Orders Area Gradient (Finly Amber) */}
            <linearGradient id={`${gradientId}-orders-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB020" stopOpacity="0.25" />
              <stop offset="85%" stopColor="#FFB020" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#FFB020" stopOpacity="0.00" />
            </linearGradient>

            {/* Volume Pillar Gradient (Finly Amber) */}
            <linearGradient id={`${gradientId}-pillar`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB020" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFB020" stopOpacity="0.12" />
            </linearGradient>

            <filter id={`${gradientId}-glow`} x1="-20%" y1="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7C5CFC" floodOpacity="0.35" />
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
                  opacity=".65"
                  fontSize="11"
                  className="font-mono font-medium"
                >
                  {formatTickLabel(val)}
                </text>
              </g>
            );
          })}

          {/* Combined Mode: Right side subtle volume hint */}
          {chartMetric === "combined" && (
            <text
              x={width - 20}
              y={inset.y - 8}
              textAnchor="end"
              fill="#10b981"
              fontSize="10"
              fontWeight="600"
              className="font-mono opacity-85"
            >
              Maks Volume: {maxOrders} pesanan
            </text>
          )}

          {/* 1. ORDERS ONLY MODE: Area & Curve */}
          {chartMetric === "orders" && (
            <>
              {ordersAreaSpline && (
                <path
                  d={ordersAreaSpline}
                  fill={`url(#${gradientId}-orders-area)`}
                  className="chart-area-animated transition-all duration-300 ease-out"
                />
              )}
              {coordinates.length > 1 && (
                <path
                  d={ordersSpline}
                  fill="none"
                  stroke="#FFB020"
                  strokeWidth="3.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className="chart-path-animated transition-all duration-300 ease-out"
                />
              )}
            </>
          )}

          {/* 2. COMBINED & REVENUE MODE: Revenue Area Gradient */}
          {(chartMetric === "combined" || chartMetric === "revenue") && areaSpline && (
            <path
              d={areaSpline}
              fill={`url(#${gradientId})`}
              className="chart-area-animated transition-all duration-300 ease-out"
            />
          )}

          {/* 3. COMBINED MODE: Order Volume Pillars at base of chart */}
          {chartMetric === "combined" && (
            <g className="chart-area-animated transition-all duration-300">
              {coordinates.map((point, idx) => {
                if (point.orders <= 0) return null;
                const isHovered = hoverIndex === idx;
                const pillarX = point.x - barWidth / 2;
                const pillarY = inset.y + plotHeight - point.orderBarHeight;

                return (
                  <g key={`pillar-${point.day}`} className="transition-all duration-150">
                    <rect
                      x={pillarX}
                      y={pillarY}
                      width={barWidth}
                      height={point.orderBarHeight}
                      rx="3"
                      ry="3"
                      fill={`url(#${gradientId}-pillar)`}
                      stroke="#FFB020"
                      strokeWidth={isHovered ? 2 : 1.2}
                      className="transition-all duration-150"
                    />
                    {/* Floating label above pillar when hovered or few days */}
                    {(isHovered || activePoints.length <= 14) && (
                      <text
                        x={point.x}
                        y={pillarY - 4}
                        textAnchor="middle"
                        fill="#D97706"
                        fontSize="9"
                        fontWeight="bold"
                        className="font-mono"
                      >
                        {point.orders} trx
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* 4. COMBINED & REVENUE MODE: Revenue Spline Curve */}
          {(chartMetric === "combined" || chartMetric === "revenue") && coordinates.length > 1 && (
            <path
              d={revenueSpline}
              fill="none"
              stroke="#7C5CFC"
              strokeWidth="3.5"
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
                stroke={chartMetric === "orders" ? "#FFB020" : "#7C5CFC"}
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Pulsing Dot Marker on active curve */}
              {chartMetric === "orders" ? (
                <circle
                  cx={activeHoverItem.x}
                  cy={activeHoverItem.orderOnlyY}
                  r="7.5"
                  fill="#FFB020"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
              ) : (
                <circle
                  cx={activeHoverItem.x}
                  cy={activeHoverItem.y}
                  r="7.5"
                  fill="#7C5CFC"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
              )}
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
                      cy={chartMetric === "orders" ? pt.orderOnlyY : pt.y}
                      r="11"
                      fill="none"
                      stroke={chartMetric === "orders" ? "#10b981" : "var(--primary)"}
                      strokeWidth="2"
                      strokeDasharray="3 2"
                      className="animate-spin"
                    />
                  </g>
                ))}
            </g>
          )}

          {/* Interactive touch/mouse targets & clean static markers (ONLY on active days) */}
          {coordinates.map((point, idx) => {
            const isHovered = hoverIndex === idx;
            const isSelected = selectedDayItem?.day === point.day;
            const hasRevenue = point.revenue > 0;
            const hasOrders = point.orders > 0;

            const showRevenueMarker =
              (chartMetric === "combined" || chartMetric === "revenue") &&
              (hasRevenue || isHovered || isSelected);

            const showOrdersMarker =
              chartMetric === "orders" &&
              (hasOrders || isHovered || isSelected);

            return (
              <g
                key={point.day}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onTouchStart={() => setHoverIndex(idx)}
                onClick={() => setSelectedDayItem(point)}
              >
                {/* Visual Dot on Revenue Curve (Clean: only when revenue > 0 or hovered) */}
                {showRevenueMarker && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isHovered || isSelected ? 6.5 : 4.5}
                    fill="var(--primary)"
                    stroke="#ffffff"
                    strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                    className="chart-point-pop transition-all duration-150"
                  />
                )}

                {/* Visual Dot on Orders Curve (Only in orders mode when orders > 0 or hovered) */}
                {showOrdersMarker && (
                  <circle
                    cx={point.x}
                    cy={point.orderOnlyY}
                    r={isHovered || isSelected ? 6.5 : 4.5}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                    className="chart-point-pop transition-all duration-150"
                  />
                )}

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
                opacity={hoverIndex === idx ? "1" : "0.65"}
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
                className="size-8 rounded-full"
                aria-label="Tutup rincian"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Daily KPI Badges */}
            <div className="grid grid-cols-2 gap-3 p-4 px-5 border-b bg-muted/5">
              <div className="rounded-xl border bg-card p-3 shadow-2xs">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Total Omset Hari Ini
                </span>
                <span className="font-mono text-base font-black text-foreground mt-0.5 block">
                  Rp {selectedDayItem.revenue.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="rounded-xl border bg-card p-3 shadow-2xs">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Volume Transaksi Selesai
                </span>
                <span className="font-mono text-base font-black text-foreground mt-0.5 block">
                  {selectedDayItem.orders} Pesanan
                </span>
              </div>
            </div>

            {/* List of Sales Items for this Day */}
            <div className="p-4 px-5 overflow-y-auto space-y-3 divide-y divide-border/60">
              {selectedDayItem.details && selectedDayItem.details.length > 0 ? (
                selectedDayItem.details.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          Pesanan #{item.orderNumber}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <CheckCircle2 className="size-2.5" /> Selesai
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {item.time || "-"}
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

            {/* Footer Modal: Multi-Format Export Options */}
            <div className="flex items-center justify-between p-4 px-5 border-t bg-muted/10 shrink-0">
              {selectedDayItem.details && selectedDayItem.details.length > 0 ? (
                <SalesExportDropdown
                  title={`Harian-${selectedDayItem.day}`}
                  details={selectedDayItem.details || []}
                  buttonLabel="Ekspor Laporan Hari Ini"
                  variant="outline"
                />
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
