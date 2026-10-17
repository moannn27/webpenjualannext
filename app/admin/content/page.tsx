import { getLandingContentAction, getAdminHomepageItemsAction } from "@/actions/admin";
import { LandingContentManager } from "@/features/admin/LandingContentManager";
import { getStorefrontSettingsAction } from "@/actions/content";
import { getAllReviewsForAdminAction } from "@/actions/review";
import { HomepageItemsManager } from "@/features/admin/HomepageItemsManager";
import { StorefrontSettingsManager } from "@/features/admin/StorefrontSettingsManager";

import { requireModulePermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export default async function LandingContentPage() {
  try {
    await requireModulePermission("content");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const [banners, homepageItems, settings, reviews] = await Promise.all([
    getLandingContentAction(),
    getAdminHomepageItemsAction(),
    getStorefrontSettingsAction(),
    getAllReviewsForAdminAction(),
  ]);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Pengaturan Halaman Depan</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola hero banner, section, produk pilihan, testimoni, FAQ, dan informasi toko tanpa mengubah kode.
          </p>
        </div>
      </div>
      <section className="space-y-4 rounded-[28px] sm:rounded-[34px] border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] shadow-sm p-5 sm:p-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Hero dan banner</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gambar, headline, deskripsi, tombol, urutan, dan status tayang.
          </p>
        </div>
        <LandingContentManager initialBanners={banners} />
      </section>
      <StorefrontSettingsManager initialSettings={settings} />
      <HomepageItemsManager
        initialFaqs={homepageItems.faqs}
        initialTestimonials={homepageItems.testimonials}
        initialReviews={reviews}
      />
    </div>
  );
}
