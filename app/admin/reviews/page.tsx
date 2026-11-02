import { getAdminReviewsPageAction } from "@/actions/review";
import { ReviewManager } from "@/features/admin/ReviewManager";
import { requireModulePermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export default async function AdminReviewsPage() {
  try {
    await requireModulePermission("content");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const { reviews, total } = await getAdminReviewsPageAction(1);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Ulasan Produk
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tinjau ulasan pembeli, balas pertanyaan pelanggan, atau hapus konten yang tidak sesuai.
        </p>
      </header>
      <ReviewManager initialReviews={reviews} initialTotal={total} />
    </div>
  );
}
