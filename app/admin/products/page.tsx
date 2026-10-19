import { ProductTable } from "@/features/admin/ProductTable";
import { getAdminProductsAction } from "@/actions/admin";
import { getBrandsAction, getCategoriesAction } from "@/actions/catalog";
import { requireModulePermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

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

        <div className="flex items-center gap-2">
          <Link
            href="/admin/stock-sync"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors shadow-2xs"
          >
            <RefreshCw className="size-3.5" />
            Sinkronisasi Stok Offline
          </Link>
        </div>
      </div>
      
      <ProductTable initialProducts={products} categories={categories ?? []} brands={brands ?? []} initialSearch={search} />
    </div>
  );
}
