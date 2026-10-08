import { getProductsPageAction } from "@/actions/product";
import { getCategoriesAction, getBrandsAction } from "@/actions/catalog";
import { getStorefrontSettingsAction } from "@/actions/content";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import { PagedProductCatalog } from "@/features/catalog/PagedProductCatalog";

export default async function ProductsPage({ searchParams }: {
  searchParams: Promise<{ search?: string; category?: string; brand?: string; promo?: string; sort?: string; page?: string }>;
}) {
  const filters = await searchParams;
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
    search: filters.search, promoOnly: Boolean(filters.promo), sort: filters.sort,
  });
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const currentPage = Math.min(page, pageCount);
  const products = currentPage === result.page
    ? result.rows.map((row) => toStorefrontProduct(row as StoreProduct))
    : (await getProductsPageAction({ page: currentPage, pageSize, categoryId: filters.category, brandId: filters.brand, search: filters.search, promoOnly: Boolean(filters.promo), sort: filters.sort })).rows.map((row) => toStorefrontProduct(row as StoreProduct));

  return <div className="pb-24 pt-8">
    <div className="container mx-auto mb-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{filters.search ? `Hasil pencarian: ${filters.search}` : filters.promo ? "Produk promo" : "Semua produk"}</h1>
      <p className="mt-2 text-muted-foreground">Cari dan jelajahi katalog berdasarkan kategori, brand, harga, atau promo.</p>
    </div>
    <PagedProductCatalog products={products} total={result.total} page={currentPage} pageSize={pageSize} categories={categories ?? []} brands={brands ?? []} filters={filters} />
  </div>;
}
