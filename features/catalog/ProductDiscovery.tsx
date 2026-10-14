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
  title = "Eksplorasi Katalog Produk",
  subtitle = "Cari cepat dan filter produk berdasarkan kategori dan rentang harga.",
  className,
}: ProductDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [sortOption, setSortOption] = useState<"default" | "lowest" | "highest">("default");

  // Derive categories dynamically from constants/products.ts
  const categories = useMemo(() => ["Semua", ...MASTER_CATEGORIES], []);

  // Filter and sort products live
  const filteredProducts = useMemo(() => {
    return (initialProducts as (ProductItem & Product)[]).filter((product) => {
      // 1. Live search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = product.name?.toLowerCase().includes(query);
        const matchesCategory = product.category?.toLowerCase().includes(query);
        const matchesBrand = product.brand?.toLowerCase().includes(query);
        const matchesSku = product.sku?.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesBrand && !matchesSku) {
          return false;
        }
      }

      // 2. Category pill match
      if (selectedCategory !== "Semua") {
        if (product.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
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
  };

  const hasActiveFilters = searchQuery.trim() !== "" || selectedCategory !== "Semua" || sortOption !== "default";

  return (
    <section className={cn("container mx-auto px-4 sm:px-6 lg:px-8 py-8", className)}>
      {/* Section Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
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
      <div className="mb-6 space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk langsung (contoh: MacBook, iPhone, Sony)..."
              aria-label="Pencarian langsung produk"
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-9 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Hapus kata kunci pencarian"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Price Sort Dropdown */}
          <div className="relative w-full sm:w-56 shrink-0">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as "default" | "lowest" | "highest")}
              aria-label="Urutan harga produk"
              className="h-10 w-full appearance-none rounded-xl border border-border bg-background pl-9 pr-8 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="default">Urutkan: Rekomendasi</option>
              <option value="lowest">Harga: Termurah</option>
              <option value="highest">Harga: Termahal</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1">
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
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                )}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Menampilkan <strong className="text-foreground">{filteredProducts.length}</strong> produk
        </span>
        {hasActiveFilters && (
          <span className="italic">Filter aktif</span>
        )}
      </div>

      {/* Products Grid or Empty State */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                ...product,
                sku: product.sku || product.id,
                status: product.status || "Active",
              }}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 py-16 px-4 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <PackageSearch className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Tidak ada produk yang cocok
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {searchQuery
              ? `Tidak ditemukan produk untuk "${searchQuery}". Coba gunakan kata kunci lain atau pilih kategori berbeda.`
              : "Tidak ada produk yang sesuai dengan kombinasi filter yang Anda pilih saat ini."}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset Filter</span>
          </button>
        </div>
      )}
    </section>
  );
}

