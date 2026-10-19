import Link from "next/link";
import {
  ChevronRight,
  Home,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
  Package,
} from "lucide-react";
import { getProductsPageAction } from "@/actions/product";
import { getCategoriesAction, getBrandsAction } from "@/actions/catalog";
import { getStorefrontSettingsAction } from "@/actions/content";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import { PagedProductCatalog } from "@/features/catalog/PagedProductCatalog";
import type { Metadata } from "next";
import { clampCatalogPage, normalizeCatalogSearchParams, parseCatalogFilters, type RawCatalogSearchParams } from "@/lib/catalog-filters";

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<RawCatalogSearchParams>;
}): Promise<Metadata> {
  const filters = normalizeCatalogSearchParams(await searchParams);
  let title = "Katalog Produk & Komputer";
  if (filters.search) {
    title = `Cari: "${filters.search}"`;
  } else if (filters.promo === "1") {
    title = "Produk Promo Spesial";
  }

  const description = filters.search
    ? `Hasil pencarian produk untuk "${filters.search}" di Next Solution Store. Pilihan laptop, PC, dan aksesoris komputer.`
    : filters.promo === "1"
      ? "Koleksi produk promo dan penawaran potongan harga pilihan di Next Solution Store."
      : "Jelajahi katalog lengkap laptop, PC desktop, suku cadang, dan aksesoris komputer di Next Solution Store.";

  return {
    title,
    description,
    alternates: {
      canonical: "/products",
    },
    openGraph: {
      title,
      description,
      url: "/products",
    },
  };
}

export default async function ProductsPage({ searchParams }: {
  searchParams: Promise<RawCatalogSearchParams>;
}) {
  const filters = normalizeCatalogSearchParams(await searchParams);
  const technicalFilters = parseCatalogFilters(filters);
  const [rawSettings, categories, brands] = await Promise.all([
    getStorefrontSettingsAction().catch(() => null),
    getCategoriesAction().catch(() => []),
    getBrandsAction().catch(() => []),
  ]);
  const settings = normalizeStorefrontSettings(rawSettings);
  const pageSize = settings.admin.catalogPageSize;
  const parsedPage = Number.parseInt(filters.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const result = await getProductsPageAction({
    page, pageSize, categoryId: filters.category, brandId: filters.brand,
    search: filters.search, promoOnly: filters.promo === '1', sort: filters.sort, filters: technicalFilters,
  });
  const { page: currentPage } = clampCatalogPage(page, result.total, result.pageSize);
  const products = currentPage === result.page
    ? result.rows.map((row) => toStorefrontProduct(row as StoreProduct))
    : (await getProductsPageAction({ page: currentPage, pageSize, categoryId: filters.category, brandId: filters.brand, search: filters.search, promoOnly: filters.promo === '1', sort: filters.sort, filters: technicalFilters })).rows.map((row) => toStorefrontProduct(row as StoreProduct));

  const pageTitle = filters.search
    ? `Hasil pencarian: "${filters.search}"`
    : filters.promo
      ? "Produk Promo Spesial"
      : "Katalog Lengkap Produk";

  const pageSubtitle = filters.search
    ? `Menampilkan produk yang cocok dengan kata kunci "${filters.search}".`
    : filters.promo
      ? "Dapatkan penawaran potongan harga terbaik untuk laptop, PC, dan aksesoris pilihan."
      : "Jelajahi laptop, PC desktop, monitor, dan aksesoris bergaransi resmi dari brand terkemuka.";

  return (
    <div className="pb-24 pt-8">
      <div className="container mx-auto mb-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="size-3.5" />
            <span>Beranda</span>
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">Katalog Produk</span>
          {filters.search && (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
              <span className="font-medium text-foreground truncate max-w-xs">&quot;{filters.search}&quot;</span>
            </>
          )}
        </nav>

        {/* Hero Banner Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 sm:p-8 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 size-48 rounded-full bg-blue-500/10 blur-2xl dark:bg-blue-500/20" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
                  <Layers className="size-6" />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  <Sparkles className="size-3" />
                  <span>Katalog Resmi Next Solution</span>
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                  {pageTitle}
                </h1>
                <p className="mt-1.5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {pageSubtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2.5 shrink-0">
              <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground backdrop-blur-xs shadow-2xs">
                <Package className="size-4 text-primary" />
                <span>{result.total} Produk Ditemukan</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground backdrop-blur-xs shadow-2xs">
                <ShieldCheck className="size-4 text-emerald-500" />
                <span>100% Produk Original</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground backdrop-blur-xs shadow-2xs">
                <Zap className="size-4 text-amber-500" />
                <span>Garansi Resmi Distributor</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PagedProductCatalog products={products} total={result.total} page={currentPage} pageSize={pageSize} categories={categories ?? []} brands={brands ?? []} filters={filters} />
    </div>
  );
}
