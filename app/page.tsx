import { HeroSection } from "@/features/landing/HeroSection";
import { CategorySection } from "@/features/landing/CategorySection";
import { FeaturedProducts } from "@/features/landing/FeaturedProducts";
import { PromoBanner } from "@/features/landing/PromoBanner";
import { BrandShowcase } from "@/features/landing/BrandShowcase";
import { WhyChooseUs } from "@/features/landing/WhyChooseUs";
import { Testimonials } from "@/features/landing/Testimonials";
import { FaqSection } from "@/features/landing/FaqSection";
import { BranchLocatorSection } from "@/features/landing/BranchLocatorSection";
import { OfficialChannelsSection } from "@/features/landing/OfficialChannelsSection";
import type { Metadata } from "next";
import { getBestSellerAction, getNewArrivalAction, getProductsByIdsAction, getPromoProductsAction } from "@/actions/product";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import { getBrandsAction, getCategoriesAction } from "@/actions/catalog";
import { getBannersAction, getFAQsAction, getTestimonialsAction } from "@/actions/content";
import { getStorefrontSettingsAction } from "@/actions/content";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { buildStoreJsonLd, DEFAULT_SITE_TITLE } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: DEFAULT_SITE_TITLE,
  },
  description: "Toko komputer dan laptop dengan spesifikasi lengkap, ragam brand pilihan, serta kemudahan ambil di toko maupun pengiriman pesanan.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: DEFAULT_SITE_TITLE,
    description: "Toko komputer dan laptop dengan spesifikasi lengkap, ragam brand pilihan, serta kemudahan ambil di toko.",
    url: "/",
  },
};

export default async function Home() {
  const [bestSellers, newArrivals, promoProducts, categories, brands, faqs, testimonials, banners, rawSettings] = await Promise.all([
    getBestSellerAction().catch(() => []),
    getNewArrivalAction().catch(() => []),
    getPromoProductsAction(8).catch(() => []),
    getCategoriesAction().catch(() => []),
    getBrandsAction().catch(() => []),
    getFAQsAction().catch(() => []),
    getTestimonialsAction().catch(() => []),
    getBannersAction().catch(() => []),
    getStorefrontSettingsAction().catch(() => null),
  ]);
  const settings = normalizeStorefrontSettings(rawSettings);
  const sections = settings.sections;
  const selectedIds = ["bestsellers", "newArrivals", "promo"].flatMap((key) => sections[key].productIds ?? []);
  const selectedRows = await getProductsByIdsAction(selectedIds).catch(() => []);
  const selectedProducts = selectedRows.map((product) => toStorefrontProduct(product as StoreProduct));
  const selected = (key: "bestsellers" | "newArrivals" | "promo", fallback: typeof selectedProducts) => {
    const ids = sections[key].productIds ?? [];
    return ids.length ? ids.map((id) => selectedProducts.find((product) => product.id === id)).filter((product): product is (typeof selectedProducts)[number] => Boolean(product)) : fallback;
  };

  const storeJsonLd = buildStoreJsonLd(settings.store);

  return (
    <div className="flex flex-col gap-14 pb-16 sm:gap-20 sm:pb-20 lg:gap-24 lg:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
      />
      <HeroSection banners={(banners ?? []).filter((banner) => banner.placement === "hero")} />
      {sections.categories.visible && <CategorySection categories={categories ?? []} title={sections.categories.title} subtitle={sections.categories.subtitle} />}
      {sections.bestsellers.visible && <FeaturedProducts title={sections.bestsellers.title} subtitle={sections.bestsellers.subtitle} type="bestseller" initialData={selected("bestsellers", (bestSellers || []).map((product) => toStorefrontProduct(product as StoreProduct)))} />}
      {sections.promo.visible && <PromoBanner banner={(banners ?? []).find((banner) => banner.placement === "promo")} sectionTitle={sections.promo.title} sectionSubtitle={sections.promo.subtitle} />}
      {sections.newArrivals.visible && <FeaturedProducts title={sections.newArrivals.title} subtitle={sections.newArrivals.subtitle} type="new" initialData={selected("newArrivals", (newArrivals || []).map((product) => toStorefrontProduct(product as StoreProduct)))} />}
      {sections.promo.visible && <FeaturedProducts title={sections.promo.title} subtitle={sections.promo.subtitle} type="promo" initialData={selected("promo", promoProducts.map((product) => toStorefrontProduct(product as StoreProduct)))} />}
      {sections.brands.visible && <BrandShowcase brands={brands ?? []} title={sections.brands.title} />}
      {sections.branches?.visible && (
        <BranchLocatorSection
          sectionSetting={sections.branches}
          branches={settings.store.branches}
          storeWhatsApp={settings.store.whatsapp}
          storeAddress={settings.store.address}
          storeMapsUrl={settings.store.maps_url}
          storeName="Next Solution"
        />
      )}
      {sections.channels?.visible && (
        <OfficialChannelsSection
          sectionSetting={sections.channels}
          marketplaces={settings.official_marketplaces}
          storeName="Next Solution"
        />
      )}
      {sections.whyUs.visible && <WhyChooseUs title={sections.whyUs.title} subtitle={sections.whyUs.subtitle} store={settings.store} pickupInfo={settings.pickup_info} />}
      {sections.testimonials.visible && <Testimonials testimonials={testimonials ?? []} title={sections.testimonials.title} subtitle={sections.testimonials.subtitle} />}
      {sections.faq.visible && <FaqSection faqs={faqs ?? []} title={sections.faq.title} subtitle={sections.faq.subtitle} />}
    </div>
  );
}
