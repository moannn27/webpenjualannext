"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/shared/ProductCard";
import type { Product } from "@/store/useProductStore";
import type { CatalogSearchParams } from "@/lib/catalog-filters";

type Choice = { id: string; name: string };
type SearchParams = CatalogSearchParams;

function pageHref(params: SearchParams, page: number, basePath: string) {
  const query = new URLSearchParams();
  for (const key of ["search", "category", "brand", "promo", "sort", "price_min", "price_max", "processor", "ram", "storage", "gpu", "display", "stock"] as const) {
    const value = params[key];
    if (value) query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  return `${basePath}${query.size ? `?${query.toString()}` : ""}`;
}

export function PagedProductCatalog({
  products,
  total,
  page,
  pageSize,
  categories,
  brands,
  filters,
  basePath = "/products",
}: {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  categories: Choice[];
  brands: Choice[];
  filters: SearchParams;
  basePath?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Hitung berapa filter lanjutan yang sedang aktif
  const advancedActiveKeys = [
    filters.price_min,
    filters.price_max,
    filters.processor,
    filters.ram,
    filters.storage,
    filters.gpu,
    filters.display,
    filters.stock,
    basePath !== "/promo" && filters.promo === "1" ? "1" : undefined,
  ].filter(Boolean);

  const [showAdvanced, setShowAdvanced] = useState(advancedActiveKeys.length > 0);

  const hasAnyFilter = Boolean(
    filters.search ||
    filters.category ||
    filters.brand ||
    (filters.sort && filters.sort !== "newest") ||
    advancedActiveKeys.length > 0
  );

  return (
    <>
      <section className="container mx-auto px-4 sm:px-6 lg:px-8">
        <form
          action={basePath}
          method="GET"
          className="mb-8 rounded-2xl border bg-card p-4 font-sans text-sm shadow-xs transition-all sm:p-5"
        >
          {/* Baris Utama: Filter Penting Saja */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            {/* 1. Pencarian Produk (lg: 4 kolom) */}
            <div className="relative sm:col-span-2 lg:col-span-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="search"
                defaultValue={filters.search}
                placeholder="Cari nama produk, SKU, brand..."
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* 2. Kategori (lg: 3 kolom) */}
            <div className="lg:col-span-3">
              <select
                name="category"
                defaultValue={filters.category ?? ""}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Semua kategori</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Brand (lg: 2 kolom) */}
            <div className="lg:col-span-2">
              <select
                name="brand"
                defaultValue={filters.brand ?? ""}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Semua brand</option>
                {brands.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Urutan (lg: 3 kolom) */}
            <div className="lg:col-span-3">
              <select
                name="sort"
                defaultValue={filters.sort ?? "newest"}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="newest">Terbaru</option>
                <option value="popular">Terpopuler</option>
                <option value="price-low">Harga terendah</option>
                <option value="price-high">Harga tertinggi</option>
              </select>
            </div>
          </div>

          {/* Baris Tombol Aksi & Toggle Filter Lanjutan */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <SlidersHorizontal className="size-3.5 text-primary" />
              <span>Filter Spesifikasi & Harga</span>
              {advancedActiveKeys.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                  {advancedActiveKeys.length}
                </span>
              )}
              {showAdvanced ? <ChevronUp className="size-3 text-muted-foreground" /> : <ChevronDown className="size-3 text-muted-foreground" />}
            </button>

            <div className="flex items-center gap-2">
              {hasAnyFilter && (
                <Link
                  href={basePath}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset</span>
                </Link>
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90"
              >
                Terapkan Filter
              </button>
            </div>
          </div>

          {/* Panel Filter Lanjutan (Spesifikasi, Rentang Harga, Ketersediaan) */}
          {showAdvanced && (
            <div className="mt-4 space-y-4 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 transition-all animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Grup 1: Rentang Harga & Ketersediaan */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Harga minimum</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">Rp</span>
                    <input
                      aria-label="Harga minimum"
                      name="price_min"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      defaultValue={filters.price_min}
                      placeholder="Min"
                      className="h-10 w-full rounded-lg border bg-background pl-8 pr-3 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Harga maksimum</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">Rp</span>
                    <input
                      aria-label="Harga maksimum"
                      name="price_max"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      defaultValue={filters.price_max}
                      placeholder="Maks"
                      className="h-10 w-full rounded-lg border bg-background pl-8 pr-3 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Status stok</label>
                  <select
                    name="stock"
                    defaultValue={filters.stock ?? ""}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Semua stok</option>
                    <option value="in">Tersedia saja</option>
                    <option value="out">Habis saja</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Penawaran khusus</label>
                  <label className="relative flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg border font-medium transition-colors">
                    <input
                      type="checkbox"
                      name="promo"
                      value="1"
                      defaultChecked={filters.promo === "1"}
                      className="peer sr-only"
                    />
                    <span className="flex h-full w-full items-center justify-center gap-1.5 bg-background px-3 text-xs transition-colors hover:bg-accent peer-checked:bg-primary peer-checked:text-primary-foreground">
                      <Sparkles className="size-3.5" />
                      Promo saja
                    </span>
                  </label>
                </div>
              </div>

              {/* Grup 2: Spesifikasi Teknis */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground/80">Spesifikasi Teknis (Opsional)</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <input
                    name="processor"
                    defaultValue={filters.processor}
                    placeholder="Processor (Core i5, Ryzen)"
                    className="h-10 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    name="ram"
                    defaultValue={filters.ram}
                    placeholder="RAM (mis. 16 GB)"
                    className="h-10 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    name="storage"
                    defaultValue={filters.storage}
                    placeholder="Storage (mis. 512 GB SSD)"
                    className="h-10 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    name="gpu"
                    defaultValue={filters.gpu}
                    placeholder="GPU (RTX 4060, Iris)"
                    className="h-10 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    name="display"
                    defaultValue={filters.display}
                    placeholder="Ukuran layar (mis. 14, 15.6)"
                    className="h-10 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Counter Info */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Menampilkan {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} dari {total.toLocaleString("id-ID")} produk
          </span>
          <span>{pageSize} produk per halaman · diatur super admin</span>
        </div>

        {/* Products Grid */}
        {products.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
            Produk tidak ditemukan. Ubah filter atau kata kunci.
          </div>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <nav aria-label="Halaman katalog" className="mt-10 flex items-center justify-center gap-4">
            <Link
              aria-disabled={page <= 1}
              className={`rounded-lg border px-4 py-2 text-sm ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}
              href={pageHref(filters, Math.max(1, page - 1), basePath)}
            >
              Sebelumnya
            </Link>
            <span className="text-sm text-muted-foreground">
              Halaman {page} dari {pageCount}
            </span>
            <Link
              aria-disabled={page >= pageCount}
              className={`rounded-lg border px-4 py-2 text-sm ${page >= pageCount ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}
              href={pageHref(filters, Math.min(pageCount, page + 1), basePath)}
            >
              Berikutnya
            </Link>
          </nav>
        )}
      </section>
    </>
  );
}
