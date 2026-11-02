"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CriticalStockItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  brand: string;
  category: string;
  image?: string | null;
}

interface CriticalStockWidgetProps {
  items: CriticalStockItem[];
  threshold: number;
  totalLowStockCount: number;
}

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CriticalStockWidget({
  items,
  threshold,
  totalLowStockCount,
}: CriticalStockWidgetProps) {
  const [tab, setTab] = useState<"all" | "out_of_stock" | "critical">("all");
  const [search, setSearch] = useState("");

  const outOfStockItems = useMemo(
    () => items.filter((item) => item.stock === 0),
    [items]
  );
  const criticalItems = useMemo(
    () => items.filter((item) => item.stock > 0 && item.stock <= 2),
    [items]
  );

  const displayedItems = useMemo(() => {
    let base = items;
    if (tab === "out_of_stock") base = outOfStockItems;
    if (tab === "critical") base = criticalItems;

    if (!search.trim()) return base;
    const term = search.toLowerCase();
    return base.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        item.brand.toLowerCase().includes(term)
    );
  }, [items, tab, outOfStockItems, criticalItems, search]);

  return (
    <div
      id="stok-menipis"
      className="finly-card bg-white dark:bg-[#23252C] rounded-[26px] p-6 border border-slate-100 dark:border-white/5 shadow-xs flex flex-col justify-between"
    >
      <div>
        {/* Widget Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle className="size-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Peringatan Stok Kritis
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {totalLowStockCount} produk berada pada batas stok ≤ {threshold} unit
              </p>
            </div>
          </div>

          {/* Threshold Filter Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 self-start sm:self-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Batas:
            </span>
            {[3, 5, 10, 15, 20].map((val) => (
              <Link
                key={val}
                href={`/admin?threshold=${val}#stok-menipis`}
                className={cn(
                  "rounded-lg px-2.5 py-0.5 text-[11px] font-bold transition-all",
                  threshold === val
                    ? "bg-rose-500 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10"
                )}
              >
                {val}
              </Link>
            ))}
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 my-3.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                tab === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70"
              )}
            >
              Semua Kritis ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("out_of_stock")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                tab === "out_of_stock"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100/70"
              )}
            >
              <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Habis / 0 ({outOfStockItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("critical")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                tab === "critical"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100/70"
              )}
            >
              Sisa 1–2 ({criticalItems.length})
            </button>
          </div>

          <div className="relative sm:w-48">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari SKU / nama..."
              className="w-full h-8 pl-8 pr-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Product Items List */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {displayedItems.map((item) => {
            const isZero = item.stock === 0;
            const isWarning = item.stock <= 2 && item.stock > 0;

            return (
              <div
                key={item.id}
                className="group flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-rose-400/50 hover:bg-slate-50/80 dark:hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 dark:border-white/10 bg-card p-1">
                    <Image
                      src={item.image || "/product-image-unavailable.svg"}
                      alt={item.name}
                      fill
                      className="object-contain p-0.5"
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <span>{item.brand}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-slate-500 font-mono font-normal">
                        SKU: {item.sku}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {item.name}
                    </p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatIdr(item.price)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full font-mono text-[11px] font-extrabold shadow-2xs",
                      isZero
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50"
                        : isWarning
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/50"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/50"
                    )}
                  >
                    {isZero ? "Habis (0)" : `Sisa ${item.stock} unit`}
                  </span>

                  <Link
                    href={`/admin/products?search=${encodeURIComponent(
                      item.sku !== "-" ? item.sku : item.name
                    )}`}
                    title="Edit stok produk di katalog"
                    className="size-7 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-primary transition"
                  >
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
            );
          })}

          {!displayedItems.length && (
            <div className="py-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-6 space-y-1">
              <Sparkles className="size-6 text-emerald-500 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Stok Aman!
              </p>
              <p className="text-[11px] text-slate-400">
                Tidak ada produk yang berada di bawah ambang batas stok {threshold} unit.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Widget Action Footer */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <Link
          href="/admin/stock-sync"
          className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <RefreshCw className="size-3.5" />
          <span>Buka Sinkronisasi Stok Excel</span>
        </Link>

        <Link
          href="/admin/products?stock=low_stock"
          className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 hover:underline"
        >
          <span>Lihat Semua di Tabel Produk</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

