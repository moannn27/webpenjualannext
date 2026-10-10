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

  return <div className="pb-24 pt-8">
    <div className="container mx-auto mb-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{filters.search ? `Hasil pencarian: ${filters.search}` : filters.promo ? "Produk promo" : "Semua produk"}</h1>
      <p className="mt-2 text-muted-foreground">Cari dan jelajahi katalog berdasarkan kategori, brand, harga, atau promo.</p>
    </div>
    <PagedProductCatalog products={products} total={result.total} page={currentPage} pageSize={pageSize} categories={categories ?? []} brands={brands ?? []} filters={filters} />
  </div>;
}
