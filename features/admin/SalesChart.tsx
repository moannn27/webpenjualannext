"use client";

import { useState, useId, useMemo } from "react";
import { TrendingUp, ShoppingBag, DollarSign, Calendar, Sparkles } from "lucide-react";

export type SalesChartPoint = {
  day: string;
  orders: number;
  revenue: number;
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

export function SalesChart({ points: rawPoints, days = 30 }: SalesChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30>(
    days === 7 ? 7 : days === 14 ? 14 : 30
  );
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId();

  // Filter points according to selected period
  const activePoints = useMemo(() => {
    if (!rawPoints || rawPoints.length === 0) return [];
    return rawPoints.slice(-selectedPeriod);
  }, [rawPoints, selectedPeriod]);

  // Compute key sales metrics for the period
  const metrics = useMemo(() => {
    const totalRev = activePoints.reduce((acc, p) => acc + p.revenue, 0);
    const totalOrd = activePoints.reduce((acc, p) => acc + p.orders, 0);
    const aov = totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0;
    const dailyAvg = activePoints.length > 0 ? Math.round(totalRev / activePoints.length) : 0;
    const maxRevPoint = activePoints.reduce(
      (max, p) => (p.revenue > max.revenue ? p : max),
      { day: "", orders: 0, revenue: 0 }
    );

    return { totalRev, totalOrd, aov, dailyAvg, maxRevPoint };
  }, [activePoints]);

  const width = 900;
  const height = 260;
  const inset = { x: 50, y: 24, bottom: 38 };
  const plotWidth = width - inset.x - 20;
  const plotHeight = height - inset.y - inset.bottom;

  const maxRevenue = Math.max(1, ...activePoints.map((p) => p.revenue));
  const maxOrders = Math.max(1, ...activePoints.map((p) => p.orders));

  const coordinates = useMemo(() => {
    return activePoints.map((p, idx) => {
      const x =
        inset.x +
        (activePoints.length <= 1 ? plotWidth / 2 : (idx * plotWidth) / (activePoints.length - 1));
      const revY = inset.y + plotHeight - (p.revenue / maxRevenue) * plotHeight;
      const orderY = inset.y + plotHeight - (p.orders / maxOrders) * plotHeight;
      return {
        ...p,
        x,
        y: revY,
        orderY,
      };
    });
  }, [activePoints, inset.x, inset.y, plotWidth, plotHeight, maxRevenue, maxOrders]);

  const revenueSpline = useMemo(() => getCubicBezierPath(coordinates), [coordinates]);
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
    return `${revenueSpline} L ${last.x.toFixed(1)} ${(inset.y + plotHeight).toFixed(1)} L ${first.x.toFixed(1)} ${(inset.y + plotHeight).toFixed(1)} Z`;
  }, [coordinates, revenueSpline, inset.y, plotHeight]);

  const tickValues = [maxRevenue, maxRevenue * 0.66, maxRevenue * 0.33, 0];
  const compactMoney = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}rb`;
    return Math.round(val).toLocaleString("id-ID");
  };

  // Determine x-axis label intervals
  const labelInterval = activePoints.length <= 8 ? 1 : activePoints.length <= 16 ? 2 : 4;

  const activeHoverItem = hoverIndex !== null && coordinates[hoverIndex] ? coordinates[hoverIndex] : null;

  return (
    <div className="space-y-4">
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
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Visualisasi kurva penjualan selesai dan volume transaksi per hari.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl border bg-muted/40 p-1 self-start sm:self-auto shadow-2xs">
          {([7, 14, 30] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setSelectedPeriod(p);
                setHoverIndex(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedPeriod === p
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p} Hari
            </button>
          ))}
        </div>
      </div>

      {/* Sales Analytics Helper Strip (AOV, Daily Run Rate, Total) */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 pt-1">
        <div className="rounded-xl border bg-card p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <DollarSign className="size-3.5 text-emerald-600" />
            <span>Omset Selesai ({selectedPeriod}H)</span>
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

      {/* Legend & Hover Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 font-medium">
            <span className="size-2.5 rounded-full bg-primary ring-2 ring-primary/20" />
            Pendapatan Omset (Rp)
          </span>
          <span className="inline-flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            Pesanan Selesai
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
            : <span className="font-mono font-bold">Rp {activeHoverItem.revenue.toLocaleString("id-ID")}</span> ({activeHoverItem.orders} pesanan)
          </div>
        ) : (
          <span className="text-muted-foreground text-[11px]">
            Arahkan kursor ke titik grafik untuk detail per hari
          </span>
        )}
      </div>

      {/* Animated SVG Chart */}
      <div
        role="img"
        aria-label={`Grafik pendapatan harian pesanan selesai selama ${selectedPeriod} hari terakhir`}
        className="relative w-full overflow-hidden rounded-xl border bg-card/60 p-2 sm:p-3"
      >
        <svg
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
              className="transition-all duration-300 ease-out"
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
              className="transition-all duration-300 ease-out"
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
                r="5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
              {/* Revenue point pulsing halo */}
              <circle
                cx={activeHoverItem.x}
                cy={activeHoverItem.y}
                r="7"
                fill="var(--primary)"
                stroke="#ffffff"
                strokeWidth="2.5"
                className="animate-pulse"
              />
            </g>
          )}

          {/* Interactive invisible touch/mouse targets for every data point */}
          {coordinates.map((point, idx) => {
            const isHovered = hoverIndex === idx;
            return (
              <g
                key={point.day}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
                onTouchStart={() => setHoverIndex(idx)}
              >
                {/* Visual Dot on Revenue Curve */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? 6 : 3.5}
                  fill="var(--primary)"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1}
                  className="transition-all duration-150"
                />

                {/* Visual Dot on Order Curve */}
                <circle
                  cx={point.x}
                  cy={point.orderY}
                  r={isHovered ? 4.5 : 2.5}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 0.8}
                  className="transition-all duration-150"
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

          {/* X-Axis Date Labels */}
          {coordinates.map((point, idx) => {
            const showLabel =
              idx === 0 ||
              idx === coordinates.length - 1 ||
              idx % labelInterval === 0;

            if (!showLabel) return null;

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
          Belum ada transaksi selesai dalam periode ini.
        </p>
      )}
    </div>
  );
}
