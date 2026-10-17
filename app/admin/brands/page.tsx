import { getAdminBrandsAction } from "@/actions/admin";
import { BrandManager } from "@/features/admin/BrandManager";
import { requireModulePermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export default async function AdminBrandsPage() {
  try {
    await requireModulePermission("brands");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const brands = await getAdminBrandsAction();
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Kelola Brand</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Atur nama dan logo brand partner yang tampil pada katalog dan etalase toko.
          </p>
        </div>
      </div>
      <BrandManager initialBrands={brands} />
    </div>
  );
}
