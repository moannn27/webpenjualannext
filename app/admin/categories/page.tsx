import { getAdminCategoriesAction } from "@/actions/admin";
import { CategoryManager } from "@/features/admin/CategoryManager";
import { requireModulePermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export default async function AdminCategoriesPage() {
  try {
    await requireModulePermission("categories");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const categories = await getAdminCategoriesAction();
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Kategori Produk</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Atur nama, deskripsi, dan gambar kategori yang tampil di katalog toko.
          </p>
        </div>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
