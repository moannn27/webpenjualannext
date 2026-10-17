import { ProductTable } from "@/features/admin/ProductTable";
import { getAdminProductsAction } from "@/actions/admin";
import { getBrandsAction, getCategoriesAction } from "@/actions/catalog";
import { requireModulePermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  try {
    await requireModulePermission("products");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const { search = "" } = await searchParams;
  const [products, categories, brands] = await Promise.all([
    getAdminProductsAction(),
    getCategoriesAction(),
    getBrandsAction(),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Katalog Produk
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola inventaris toko, varian spek, penetapan harga, dan ketersediaan stok produk.
          </p>
        </div>
      </div>
      
      <ProductTable initialProducts={products} categories={categories ?? []} brands={brands ?? []} initialSearch={search} />
    </div>
  );
}
