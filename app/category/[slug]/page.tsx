import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Home,
  Monitor,
  Laptop,
  Cpu,
  Package,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { getCategoriesAction, getBrandsAction } from "@/actions/catalog";
import { getProductsPageAction } from "@/actions/product";
import { getStorefrontSettingsAction } from "@/actions/content";
import { PagedProductCatalog } from "@/features/catalog/PagedProductCatalog";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import type { Product } from "@/store/useProductStore";
import { clampCatalogPage, normalizeCatalogSearchParams, parseCatalogFilters, type RawCatalogSearchParams } from "@/lib/catalog-filters";
import { RichTextRenderer } from "@/components/shared/RichTextRenderer";
import { stripHtmlToPlainText } from "@/lib/sanitize-html";

function CategoryIcon({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const s = `${slug} ${name}`.toLowerCase();
  if (s.includes("monitor") || s.includes("layar") || s.includes("display")) return <Monitor className={className} />;
  if (s.includes("laptop") || s.includes("notebook")) return <Laptop className={className} />;
  if (s.includes("cpu") || s.includes("pc") || s.includes("desktop") || s.includes("all-in-one") || s.includes("aio")) return <Cpu className={className} />;
  return <Package className={className} />;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getCategoriesAction().catch(() => []);
  const category = categories?.find((item) => item.slug === slug);
  if (!category) return { title: "Kategori Tidak Ditemukan" };
  const title = `Kategori ${category.name}`;
  const description = category.description
    ? stripHtmlToPlainText(category.description).slice(0, 160)
    : `Temukan koleksi produk ${category.name} dengan pilihan spesifikasi lengkap dan penawaran menarik di Next Solution Store.`;
  return {
    title,
    description,
    alternates: {
      canonical: `/category/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/category/${slug}`,
      images: category.image_url ? [{ url: category.image_url }] : [],
    },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<RawCatalogSearchParams> }) {
  const [{ slug }, rawFilters] = await Promise.all([params, searchParams]);
  const filters = normalizeCatalogSearchParams(rawFilters);
  const [categories, brands, rawSettings] = await Promise.all([getCategoriesAction(), getBrandsAction().catch(() => []), getStorefrontSettingsAction().catch(() => null)]);
  const category = categories?.find((item) => item.slug === slug);
  if (!category) notFound();
  const pageSize = normalizeStorefrontSettings(rawSettings).admin.catalogPageSize;
  const parsedPage = Number.parseInt(filters.page ?? "1", 10);
  const requestedPage = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const technicalFilters = parseCatalogFilters(filters);
  const result = await getProductsPageAction({ page: requestedPage, pageSize, categoryId: category.id, brandId: filters.brand, search: filters.search, sort: filters.sort, filters: technicalFilters, promoOnly: filters.promo === '1' });
  const { page } = clampCatalogPage(requestedPage, result.total, pageSize);
  const rows = page === result.page ? result.rows : (await getProductsPageAction({ page, pageSize, categoryId: category.id, brandId: filters.brand, search: filters.search, sort: filters.sort, filters: technicalFilters, promoOnly: filters.promo === '1' })).rows;
  const products = rows.map((row) => toStorefrontProduct(row as StoreProduct)) as Product[];

  return (
    <main className="py-8 sm:py-10">
      <div className="container mx-auto mb-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="size-3.5" />
            <span>Beranda</span>
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <Link href="/products" className="hover:text-foreground transition-colors">
            Katalog
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">{category.name}</span>
        </nav>

        {/* Natural & Grounded Category Banner Card (No Glossy AI Look) */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#1E2028] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left Column: Icon Badge, Title, Description */}
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-primary shrink-0">
                  <CategoryIcon slug={category.slug} name={category.name} className="size-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-blue-400">
                  Kategori Resmi
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {category.name}
                </h1>
                <RichTextRenderer
                  content={category.description}
                  fallback={
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Temukan koleksi {category.name} terlengkap dengan garansi resmi, jaminan keaslian 100%, dan penawaran harga terbaik di Next Solution.
                    </p>
                  }
                  className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed"
                />
              </div>
            </div>

            {/* Right Column: Highlights / Value Props (Clean & Solid) */}
            <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
                <Package className="size-3.5 text-primary" />
                <span>{result.total} Produk Tersedia</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span>100% Garansi Resmi</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
                <Zap className="size-3.5 text-amber-500" />
                <span>Siap Kirim & Ambil di Toko</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PagedProductCatalog
        products={products}
        total={result.total}
        page={page}
        pageSize={pageSize}
        categories={categories ?? []}
        brands={brands ?? []}
        filters={{ ...filters, category: category.id }}
        basePath="/products"
      />
    </main>
  );
}
