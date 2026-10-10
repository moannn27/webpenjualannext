import { notFound } from "next/navigation";
import { getCategoriesAction, getBrandsAction } from "@/actions/catalog";
import { getProductsPageAction } from "@/actions/product";
import { getStorefrontSettingsAction } from "@/actions/content";
import { PagedProductCatalog } from "@/features/catalog/PagedProductCatalog";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import type { Product } from "@/store/useProductStore";
import { clampCatalogPage, normalizeCatalogSearchParams, parseCatalogFilters, type RawCatalogSearchParams } from "@/lib/catalog-filters";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getCategoriesAction().catch(() => []);
  const category = categories?.find((item) => item.slug === slug);
  if (!category) return { title: "Kategori Tidak Ditemukan" };
  const title = `Kategori ${category.name}`;
  const description = `Temukan koleksi produk ${category.name} dengan pilihan spesifikasi lengkap dan penawaran menarik di Next Solution Store.`;
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
  return <main className="py-10"><div className="container mx-auto mb-8 px-4 sm:px-6 lg:px-8"><h1 className="text-3xl font-bold">{category.name}</h1><p className="mt-2 text-muted-foreground">Produk dalam kategori {category.name}.</p></div><PagedProductCatalog products={products} total={result.total} page={page} pageSize={pageSize} categories={categories ?? []} brands={brands ?? []} filters={{ ...filters, category: category.id }} basePath="/products" /></main>;
}
