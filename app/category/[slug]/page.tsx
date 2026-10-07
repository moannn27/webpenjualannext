import { notFound } from "next/navigation";
import { getCategoriesAction } from "@/actions/catalog";
import { getProductsAction } from "@/actions/product";
import { ProductCatalog } from "@/features/catalog/ProductCatalog";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getCategoriesAction();
  const category = categories?.find((item) => item.slug === slug);
  if (!category) notFound();
  const rows = await getProductsAction({ categoryId: category.id });
  const products = (rows ?? []).map((row) => toStorefrontProduct(row as StoreProduct));
  return <main className="py-10"><div className="container mx-auto mb-8 px-4 sm:px-6 lg:px-8"><h1 className="text-3xl font-bold">{category.name}</h1><p className="mt-2 text-muted-foreground">Produk dalam kategori {category.name}.</p></div><ProductCatalog initialProducts={products} /></main>;
}
