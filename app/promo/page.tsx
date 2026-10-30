import Link from "next/link";
import {
  ChevronRight,
  Home,
  Flame,
  Sparkles,
  Percent,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { getProductsByIdsAction, getProductsPageAction } from "@/actions/product";
import { getCategoriesAction, getBrandsAction } from "@/actions/catalog";
import { getStorefrontSettingsAction } from "@/actions/content";
import { ProductCard } from "@/components/shared/ProductCard";
import { PagedProductCatalog } from "@/features/catalog/PagedProductCatalog";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import type { Product } from "@/store/useProductStore";
import type { Metadata } from "next";
import { clampCatalogPage, normalizeCatalogSearchParams, parseCatalogFilters, type RawCatalogSearchParams } from "@/lib/catalog-filters";

export const metadata: Metadata = {
  title: "Promo & Penawaran Spesial",
  description: "Dapatkan penawaran harga terbaik dan potongan spesial untuk laptop, komputer, dan produk elektronik pilihan di Next Solution Store.",
  alternates: {
    canonical: "/promo",
  },
  openGraph: {
    title: "Promo & Penawaran Spesial | Next Solution Store",
    description: "Dapatkan penawaran harga terbaik dan diskon spesial untuk produk elektronik pilihan di Next Solution Store.",
    url: "/promo",
  },
};

export default async function PromoPage({ searchParams }: { searchParams: Promise<RawCatalogSearchParams> }) {
  const filters = normalizeCatalogSearchParams(await searchParams);
  const [rawSettings, categories, brands] = await Promise.all([getStorefrontSettingsAction().catch(() => null), getCategoriesAction().catch(() => []), getBrandsAction().catch(() => [])]);
  const settings = normalizeStorefrontSettings(rawSettings);
  const selectedIds = settings.sections.promo.productIds ?? [];
  const title = settings.sections.promo.title;
  const subtitle = settings.sections.promo.subtitle || "Produk promo yang tersedia saat ini.";

  const heroBanner = (
    <div className="container mx-auto mb-8 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="size-3.5" />
          <span>Beranda</span>
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground/50" />
        <span className="font-medium text-foreground">Promo Spesial</span>
      </nav>

      {/* Hero Banner Card - Standard Elegant Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2028] p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-white/5">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-2xs">
                <Flame className="size-5" />
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Promo &amp; Penawaran Pilihan</span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2.5 shrink-0">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs">
              <Percent className="size-4 text-rose-500" />
              <span>Diskon Langsung</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>100% Garansi Resmi</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs">
              <Zap className="size-4 text-amber-500" />
              <span>Stok Pilihan Toko</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const pageSize = settings.admin.catalogPageSize;
  const parsedPage = Number.parseInt(filters.page ?? "1", 10);
  const requestedPage = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const technicalFilters = parseCatalogFilters(filters);

  // Ambil produk promo terverifikasi dari database
  const result = await getProductsPageAction({
    page: requestedPage,
    pageSize,
    search: filters.search,
    categoryId: filters.category,
    brandId: filters.brand,
    promoOnly: true,
    sort: filters.sort,
    filters: technicalFilters,
  });

  const { page } = clampCatalogPage(requestedPage, result.total, pageSize);
  const rows = page === result.page ? result.rows : (await getProductsPageAction({ page, pageSize, search: filters.search, categoryId: filters.category, brandId: filters.brand, promoOnly: true, promoProductIds: selectedIds, sort: filters.sort, filters: technicalFilters })).rows;
  const catalogProducts = rows.map((row) => toStorefrontProduct(row as StoreProduct, selectedIds)) as Product[];

  // Ambil produk yang di-pin/dipilih admin di pengaturan banner promo (ditampilkan di urutan teratas)
  const isFirstPageDefault = requestedPage === 1 && !filters.search && !filters.category && !filters.brand;
  const pinnedRows = (selectedIds.length > 0 && isFirstPageDefault)
    ? await getProductsByIdsAction(selectedIds).catch(() => [])
    : [];
  const pinnedProducts = pinnedRows.map((row) => toStorefrontProduct(row as StoreProduct, selectedIds)) as Product[];

  // Gabungkan produk pinned pilihan admin di depan + seluruh produk bertanda promo / diskon
  const combinedProducts = [
    ...pinnedProducts,
    ...catalogProducts.filter((p) => !pinnedProducts.some((pin) => pin.id === p.id)),
  ];

  return (
    <main className="py-8 sm:py-10">
      {heroBanner}
      <PagedProductCatalog
        products={combinedProducts}
        total={Math.max(result.total, combinedProducts.length)}
        page={page}
        pageSize={pageSize}
        categories={categories ?? []}
        brands={brands ?? []}
        filters={{ ...filters, promo: "1" }}
        basePath="/promo"
      />
    </main>
  );
}
