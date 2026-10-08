import Link from "next/link";
import { getProductsByIdsAction, getProductsPageAction } from "@/actions/product";
import { getCategoriesAction, getBrandsAction } from "@/actions/catalog";
import { getStorefrontSettingsAction } from "@/actions/content";
import { ProductCard } from "@/components/shared/ProductCard";
import { PagedProductCatalog } from "@/features/catalog/PagedProductCatalog";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import type { Product } from "@/store/useProductStore";

export default async function PromoPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; category?: string; brand?: string; sort?: string }> }) {
  const filters = await searchParams;
  const [rawSettings, categories, brands] = await Promise.all([getStorefrontSettingsAction().catch(() => null), getCategoriesAction().catch(() => []), getBrandsAction().catch(() => [])]);
  const settings = normalizeStorefrontSettings(rawSettings);
  const selectedIds = settings.sections.promo.productIds ?? [];
  const title = settings.sections.promo.title;
  const subtitle = settings.sections.promo.subtitle || "Produk promo yang tersedia saat ini.";

  if (selectedIds.length) {
    const rows = await getProductsByIdsAction(selectedIds).catch(() => []);
    const products = rows.map((row) => toStorefrontProduct(row as StoreProduct));
    return <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8"><h1 className="mb-2 text-3xl font-bold">{title}</h1><p className="mb-8 text-muted-foreground">{subtitle}</p>{products.length ? <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="rounded-2xl border p-8 text-center"><p className="mb-4 text-muted-foreground">Produk pilihan promo belum tersedia.</p><Link className="text-primary hover:underline" href="/products">Lihat semua produk</Link></div>}</main>;
  }

  const pageSize = settings.admin.catalogPageSize;
  const parsedPage = Number.parseInt(filters.page ?? "1", 10);
  const requestedPage = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const result = await getProductsPageAction({ page: requestedPage, pageSize, search: filters.search, categoryId: filters.category, brandId: filters.brand, promoOnly: true, sort: filters.sort });
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(result.total / pageSize)));
  const rows = page === result.page ? result.rows : (await getProductsPageAction({ page, pageSize, search: filters.search, categoryId: filters.category, brandId: filters.brand, promoOnly: true, sort: filters.sort })).rows;
  const products = rows.map((row) => toStorefrontProduct(row as StoreProduct)) as Product[];
  return <main className="py-12"><div className="container mx-auto px-4 sm:px-6 lg:px-8"><h1 className="mb-2 text-3xl font-bold">{title}</h1><p className="mb-8 text-muted-foreground">{subtitle}</p></div><PagedProductCatalog products={products} total={result.total} page={page} pageSize={pageSize} categories={categories ?? []} brands={brands ?? []} filters={{ ...filters, promo: "1" }} basePath="/promo" /></main>;
}
