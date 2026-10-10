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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Kategori</h2>
        <p className="mt-1 text-muted-foreground">
          Atur nama, deskripsi, dan gambar kategori yang tampil di katalog.
        </p>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
