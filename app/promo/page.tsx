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

      {/* Hero Banner Card */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-card via-card to-rose-500/[0.05] p-6 sm:p-8 shadow-xs">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-rose-500/10 blur-3xl dark:bg-rose-500/20" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 size-48 rounded-full bg-orange-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500 shadow-xs">
                <Flame className="size-6" />
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/5 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                <Sparkles className="size-3" />
                <span>Promo & Diskon Terbatas</span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2.5 shrink-0">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground backdrop-blur-xs shadow-2xs">
              <Percent className="size-4 text-rose-500" />
              <span>Diskon Langsung</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground backdrop-blur-xs shadow-2xs">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>100% Garansi Resmi</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-foreground backdrop-blur-xs shadow-2xs">
              <Zap className="size-4 text-amber-500" />
              <span>Stok Terbatas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (selectedIds.length) {
    const rows = await getProductsByIdsAction(selectedIds).catch(() => []);
    const products = rows.map((row) => toStorefrontProduct(row as StoreProduct));
    return (
      <main className="py-8 sm:py-10">
        {heroBanner}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {products.length ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p className="mb-4 text-muted-foreground">Produk pilihan promo belum tersedia.</p>
              <Link className="text-primary hover:underline" href="/products">
                Lihat semua produk
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  const pageSize = settings.admin.catalogPageSize;
  const parsedPage = Number.parseInt(filters.page ?? "1", 10);
  const requestedPage = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const technicalFilters = parseCatalogFilters(filters);
  const result = await getProductsPageAction({ page: requestedPage, pageSize, search: filters.search, categoryId: filters.category, brandId: filters.brand, promoOnly: true, sort: filters.sort, filters: technicalFilters });
  const { page } = clampCatalogPage(requestedPage, result.total, pageSize);
  const rows = page === result.page ? result.rows : (await getProductsPageAction({ page, pageSize, search: filters.search, categoryId: filters.category, brandId: filters.brand, promoOnly: true, sort: filters.sort, filters: technicalFilters })).rows;
  const products = rows.map((row) => toStorefrontProduct(row as StoreProduct)) as Product[];
  return (
    <main className="py-8 sm:py-10">
      {heroBanner}
      <PagedProductCatalog products={products} total={result.total} page={page} pageSize={pageSize} categories={categories ?? []} brands={brands ?? []} filters={{ ...filters, promo: "1" }} basePath="/promo" />
    </main>
  );
}
