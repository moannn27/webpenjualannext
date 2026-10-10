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
      <div>
        <h1 className="text-3xl font-bold">Kelola brand</h1>
        <p className="mt-1 text-muted-foreground">
          Atur logo yang tampil pada bagian brand di halaman depan.
        </p>
      </div>
      <BrandManager initialBrands={brands} />
    </div>
  );
}
