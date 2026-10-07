import { ProductTable } from "@/features/admin/ProductTable";
import { getAdminProductsAction } from "@/actions/admin";
import { getBrandsAction, getCategoriesAction } from "@/actions/catalog";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = "" } = await searchParams;
  const [products, categories, brands] = await Promise.all([
    getAdminProductsAction(),
    getCategoriesAction(),
    getBrandsAction(),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Products</h2>
        <p className="text-muted-foreground mt-1">
          Manage your store&apos;s inventory, pricing, and availability.
        </p>
      </div>
      
      <ProductTable initialProducts={products} categories={categories ?? []} brands={brands ?? []} initialSearch={search} />
    </div>
  );
}
