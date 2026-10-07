import { ProductCatalog } from "@/features/catalog/ProductCatalog";
import { getProductsAction, searchProductsAction } from "@/actions/product";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";

export default async function ProductsPage({ searchParams }: {
  searchParams: Promise<{ search?: string; category?: string; brand?: string; promo?: string; sort?: string }>;
}) {
  const filters = await searchParams;
  const search = filters.search?.trim() ?? "";
  const rows = search
    ? await searchProductsAction(search)
    : await getProductsAction({
        categoryId: filters.category,
        brandId: filters.brand,
        isBestSeller: filters.sort === "bestseller" || filters.sort === "popular" || undefined,
        isNewArrival: filters.sort === "new" || undefined,
      });
  const products = (rows ?? []).map((row) => toStorefrontProduct(row as StoreProduct))
    .filter((product) => !filters.promo || Boolean(product.originalPrice));

  return (
    <div className="pt-8 pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          {search ? `Hasil pencarian: ${search}` : filters.promo ? "Produk promo" : "Semua produk"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {search ? "Hasil dicocokkan dari nama, brand, kategori, SKU, dan deskripsi produk." : "Jelajahi semua produk yang tersedia di toko."}
        </p>
      </div>
      <ProductCatalog initialProducts={products || []} initialSort={filters.sort === "new" ? "newest" : filters.sort === "bestseller" ? "popular" : filters.sort} />
    </div>
  );
}
