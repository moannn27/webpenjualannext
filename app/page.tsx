import { HeroSection } from "@/features/landing/HeroSection";
import { CategorySection } from "@/features/landing/CategorySection";
import { FeaturedProducts } from "@/features/landing/FeaturedProducts";
import { PromoBanner } from "@/features/landing/PromoBanner";
import { BrandShowcase } from "@/features/landing/BrandShowcase";
import { WhyChooseUs } from "@/features/landing/WhyChooseUs";
import { Testimonials } from "@/features/landing/Testimonials";
import { FaqSection } from "@/features/landing/FaqSection";
import { getBestSellerAction, getNewArrivalAction } from "@/actions/product";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import { getBrandsAction, getCategoriesAction } from "@/actions/catalog";
import { getBannersAction, getFAQsAction, getTestimonialsAction } from "@/actions/content";
import { getStorefrontSettingsAction } from "@/actions/content";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";

export default async function Home() {
  const [bestSellers, newArrivals, categories, brands, faqs, testimonials, banners, rawSettings] = await Promise.all([
    getBestSellerAction().catch(() => []),
    getNewArrivalAction().catch(() => []),
    getCategoriesAction().catch(() => []),
    getBrandsAction().catch(() => []),
    getFAQsAction().catch(() => []),
    getTestimonialsAction().catch(() => []),
    getBannersAction().catch(() => []),
    getStorefrontSettingsAction().catch(() => null),
  ]);
  const settings = normalizeStorefrontSettings(rawSettings);
  const sections = settings.sections;

  return (
    <div className="flex flex-col gap-14 pb-16 sm:gap-20 sm:pb-20 lg:gap-24 lg:pb-24">
      <HeroSection banners={(banners ?? []).filter((banner) => banner.placement === "hero")} />
      {sections.categories.visible && <CategorySection categories={categories ?? []} title={sections.categories.title} subtitle={sections.categories.subtitle} />}
      {sections.bestsellers.visible && <FeaturedProducts title={sections.bestsellers.title} subtitle={sections.bestsellers.subtitle} type="bestseller" initialData={(bestSellers || []).map((product) => toStorefrontProduct(product as StoreProduct))} />}
      {sections.promo.visible && <PromoBanner banner={(banners ?? []).find((banner) => banner.placement === "promo")} sectionTitle={sections.promo.title} sectionSubtitle={sections.promo.subtitle} />}
      {sections.newArrivals.visible && <FeaturedProducts title={sections.newArrivals.title} subtitle={sections.newArrivals.subtitle} type="new" initialData={(newArrivals || []).map((product) => toStorefrontProduct(product as StoreProduct))} />}
      {sections.brands.visible && <BrandShowcase brands={brands ?? []} title={sections.brands.title} />}
      {sections.whyUs.visible && <WhyChooseUs title={sections.whyUs.title} subtitle={sections.whyUs.subtitle} />}
      {sections.testimonials.visible && <Testimonials testimonials={testimonials ?? []} title={sections.testimonials.title} subtitle={sections.testimonials.subtitle} />}
      {sections.faq.visible && <FaqSection faqs={faqs ?? []} title={sections.faq.title} subtitle={sections.faq.subtitle} />}
    </div>
  );
}
