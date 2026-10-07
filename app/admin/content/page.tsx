import { getLandingContentAction } from "@/actions/admin";
import { LandingContentManager } from "@/features/admin/LandingContentManager";
import { getAdminHomepageItemsAction } from "@/actions/admin";
import { getStorefrontSettingsAction } from "@/actions/content";
import { HomepageItemsManager } from "@/features/admin/HomepageItemsManager";
import { StorefrontSettingsManager } from "@/features/admin/StorefrontSettingsManager";

export default async function LandingContentPage() {
  const [banners, homepageItems, settings] = await Promise.all([getLandingContentAction(), getAdminHomepageItemsAction(), getStorefrontSettingsAction()]);
  return <div className="mx-auto w-full max-w-7xl space-y-8"><div><h1 className="text-3xl font-bold">Pengaturan halaman depan</h1><p className="mt-1 max-w-3xl text-muted-foreground">Kelola hero, section, produk pilihan, testimoni, FAQ, dan informasi toko tanpa mengubah kode.</p></div>
    <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6"><div><h2 className="text-xl font-semibold">Hero dan banner</h2><p className="mt-1 text-sm text-muted-foreground">Gambar, headline, deskripsi, tombol, urutan, dan status tayang.</p></div><LandingContentManager initialBanners={banners} /></section>
    <StorefrontSettingsManager initialSettings={settings} />
    <HomepageItemsManager initialFaqs={homepageItems.faqs} initialTestimonials={homepageItems.testimonials} />
  </div>;
}
