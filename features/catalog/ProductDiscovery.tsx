"use client";

import { useState, useMemo } from "react";
import { Search, ArrowUpDown, RotateCcw, PackageSearch, X } from "lucide-react";
import { ProductCard } from "@/components/shared/ProductCard";
import { MASTER_PRODUCTS, MASTER_CATEGORIES, type ProductItem } from "@/constants/products";
import type { Product } from "@/store/useProductStore";
import { cn } from "@/lib/utils";

interface ProductDiscoveryProps {
  initialProducts?: ProductItem[] | Product[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function ProductDiscovery({
  initialProducts = MASTER_PRODUCTS,
  title = "Pilihan Produk Unggulan",
  subtitle = "Cari langsung, saring kategori pilihan, dan urutkan harga terbaik.",
  className,
}: ProductDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [sortOption, setSortOption] = useState<"default" | "lowest" | "highest" | "newest" | "bestseller" | "promo">("default");
  const [showAll, setShowAll] = useState(false);

  // Derive categories dynamically from constants and products
  const categories = useMemo(() => {
    const set = new Set<string>();
    MASTER_CATEGORIES.forEach((cat) => set.add(cat));
    (initialProducts as (ProductItem & Product)[]).forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ["Semua", "🏷️ Promo", "⚡ Terbaru", "🔥 Terlaris", ...Array.from(set)];
  }, [initialProducts]);

  // Filter and sort products live
  const filteredProducts = useMemo(() => {
    return (initialProducts as (ProductItem & Product)[])
      .filter((product) => {
        const isNew = Boolean(product.isNewArrival || product.badges?.includes("Baru") || product.badges?.includes("Terbaru"));
        const isBest = Boolean(product.isBestSeller || product.badges?.includes("Best Seller") || product.badges?.includes("Terlaris"));
        const isPromo = Boolean(product.isPromo || product.isFeatured || product.discountPrice != null || product.badges?.includes("Promo") || product.badges?.includes("Sale"));

        // 1. Live search match across name, category, brand, sku, and label tags
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesName = product.name?.toLowerCase().includes(query);
          const matchesCategory = product.category?.toLowerCase().includes(query);
          const matchesBrand = product.brand?.toLowerCase().includes(query);
          const matchesSku = product.sku?.toLowerCase().includes(query);
          const matchesNew = (query.includes("terbaru") || query.includes("baru") || query.includes("new")) && isNew;
          const matchesBest = (query.includes("terlaris") || query.includes("bestseller") || query.includes("best seller")) && isBest;
          const matchesPromo = (query.includes("promo") || query.includes("diskon") || query.includes("sale") || query.includes("pilihan") || query.includes("potongan")) && isPromo;

          if (!matchesName && !matchesCategory && !matchesBrand && !matchesSku && !matchesNew && !matchesBest && !matchesPromo) {
            return false;
          }
        }

        // 2. Category / Filter pill match
        if (selectedCategory !== "Semua") {
          if (selectedCategory === "🏷️ Promo") {
            if (!isPromo) return false;
          } else if (selectedCategory === "⚡ Terbaru") {
            if (!isNew) return false;
          } else if (selectedCategory === "🔥 Terlaris") {
            if (!isBest) return false;
          } else if (product.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "promo") {
          const isPromoA = a.isPromo || a.isFeatured || a.discountPrice != null ? 1 : 0;
          const isPromoB = b.isPromo || b.isFeatured || b.discountPrice != null ? 1 : 0;
          if (isPromoA !== isPromoB) return isPromoB - isPromoA;
        }
        if (sortOption === "newest") {
          const isNewA = a.isNewArrival ? 1 : 0;
          const isNewB = b.isNewArrival ? 1 : 0;
          if (isNewA !== isNewB) return isNewB - isNewA;
        }
        if (sortOption === "bestseller") {
          const isBestA = a.isBestSeller ? 1 : 0;
          const isBestB = b.isBestSeller ? 1 : 0;
          if (isBestA !== isBestB) return isBestB - isBestA;
        }

        const priceA = a.discountPrice ?? a.price;
        const priceB = b.discountPrice ?? b.price;

        if (sortOption === "lowest") {
          return priceA - priceB;
        }
        if (sortOption === "highest") {
          return priceB - priceA;
        }
        return 0;
      });
  }, [initialProducts, searchQuery, selectedCategory, sortOption]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Semua");
    setSortOption("default");
    setShowAll(false);
  };

  const hasActiveFilters = searchQuery.trim() !== "" || selectedCategory !== "Semua" || sortOption !== "default";
  const displayedProducts = (hasActiveFilters || showAll) ? filteredProducts : filteredProducts.slice(0, 8);

  return (
    <section className={cn("container mx-auto px-4 sm:px-6 lg:px-8", className)}>
      {/* Outer White Card Container */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2028] p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-100 dark:border-white/5">
        {/* Section Header */}
        <div className="mb-5 sm:mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>

        {/* Discovery Controls Bar */}
        <div className="mb-6 space-y-4 rounded-2xl bg-[#F6F7F9] dark:bg-white/5 p-4 sm:p-5 border border-slate-100 dark:border-white/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Live Search Input */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk langsung (contoh: promo, baru, terlaris, Asus, Lenovo, LOQ)..."
                aria-label="Pencarian langsung produk"
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#131418] pl-10 pr-9 text-xs sm:text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Hapus kata kunci pencarian"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Price Sort Dropdown */}
            <div className="relative w-full sm:w-56 shrink-0">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as "default" | "lowest" | "highest" | "newest" | "bestseller" | "promo")}
                aria-label="Urutan harga produk"
                className="h-10 w-full appearance-none rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#131418] pl-9 pr-8 text-xs sm:text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="default">Urutkan: Rekomendasi</option>
                <option value="promo">🏷️ Produk Promo Pilihan</option>
                <option value="newest">⚡ Produk Terbaru</option>
                <option value="bestseller">🔥 Produk Terlaris</option>
                <option value="lowest">Harga: Termurah</option>
                <option value="highest">Harga: Termahal</option>
              </select>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">
              Kategori:
            </span>
            {categories.map((category) => {
              const isActive = selectedCategory.toLowerCase() === category.toLowerCase();
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1 text-xs font-medium transition-all cursor-pointer border",
                    isActive
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xs font-semibold"
                      : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                  )}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Header */}
        <div className="mb-5 flex items-center justify-between text-xs text-slate-400">
          <span>
            Menampilkan <strong className="text-slate-900 dark:text-white font-bold">{filteredProducts.length}</strong> produk
          </span>
          {hasActiveFilters && (
            <span className="text-[11px] text-slate-400 italic">
              Filter aktif diterapkan
            </span>
          )}
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {filteredProducts.length > 8 && !hasActiveFilters && !showAll && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-6 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  Lihat Semua ({filteredProducts.length} Produk Pilihan)
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-[#F6F7F9] dark:bg-white/5 py-16 px-4 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white dark:bg-white/10 text-slate-400 shadow-2xs">
              <PackageSearch className="size-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Tidak ada produk yang cocok
            </h3>
            <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {searchQuery
                ? `Tidak ditemukan produk untuk "${searchQuery}". Coba gunakan kata kunci lain seperti "promo", "baru", atau pilih kategori berbeda.`
                : "Tidak ada produk yang sesuai dengan kombinasi filter yang Anda pilih saat ini."}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-white px-5 py-2 text-xs font-semibold text-white dark:text-slate-900 shadow-xs transition-colors hover:bg-black dark:hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
