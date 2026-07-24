import { ProductCatalog } from "@/features/catalog/ProductCatalog";
import { getProductsAction } from "@/actions/product";

export default async function ProductsPage() {
  const products = await getProductsAction({});

  return (
    <div className="pt-8 pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          All Products
        </h1>
        <p className="text-muted-foreground mt-2">
          Browse our complete catalog of premium electronics.
        </p>
      </div>
      <ProductCatalog initialProducts={products || []} />
    </div>
  );
}
