import { HeroSection } from "@/features/landing/HeroSection";
import { CategorySection } from "@/features/landing/CategorySection";
import { ProductDiscovery } from "@/features/catalog/ProductDiscovery";
import { FeaturedProducts } from "@/features/landing/FeaturedProducts";
import { PromoBanner } from "@/features/landing/PromoBanner";
import { BrandShowcase } from "@/features/landing/BrandShowcase";
import { WhyChooseUs } from "@/features/landing/WhyChooseUs";
import { FaqSection } from "@/features/landing/FaqSection";
import { AboutUsSection } from "@/features/landing/AboutUsSection";
import { BranchLocatorSection } from "@/features/landing/BranchLocatorSection";
import { ProductReviewsSection } from "@/features/landing/ProductReviewsSection";
import { OfficialChannelsSection } from "@/features/landing/OfficialChannelsSection";
import type { Metadata } from "next";
import { getBestSellerAction, getNewArrivalAction, getProductsByIdsAction, getPromoProductsAction } from "@/actions/product";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import { getBrandsAction, getCategoriesAction } from "@/actions/catalog";
import { getBannersAction, getFAQsAction } from "@/actions/content";
import { getAboutUsContentAction } from "@/actions/about";
import { DEFAULT_ABOUT_US_CONTENT } from "@/lib/about-us";
import { getStorefrontSettingsAction } from "@/actions/content";
import { getStorefrontFeaturedReviewsAction } from "@/actions/review";
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
  const [bestSellers, newArrivals, promoProducts, categories, brands, faqs, banners, rawSettings, aboutContent] = await Promise.all([
    getBestSellerAction().catch(() => []),
    getNewArrivalAction().catch(() => []),
    getPromoProductsAction(12).catch(() => []),
    getCategoriesAction().catch(() => []),
    getBrandsAction().catch(() => []),
    getFAQsAction().catch(() => []),
    getBannersAction().catch(() => []),
    getStorefrontSettingsAction().catch(() => null),
    getAboutUsContentAction().catch(() => DEFAULT_ABOUT_US_CONTENT),
  ]);
  const settings = normalizeStorefrontSettings(rawSettings);
  const sections = settings.sections;
  const selectedIds = ["bestsellers", "newArrivals", "promo", "featuredDiscovery"].flatMap((key) => sections[key]?.productIds ?? []);
  const [selectedRows, featuredReviews] = await Promise.all([
    selectedIds.length ? getProductsByIdsAction(selectedIds).catch(() => []) : Promise.resolve([]),
    getStorefrontFeaturedReviewsAction(
      settings.featured_reviews,
      settings.selected_review_ids
    ).catch(() => settings.featured_reviews),
  ]);
  const selectedProducts = selectedRows.map((product) => toStorefrontProduct(product as StoreProduct));
  const selected = (key: "bestsellers" | "newArrivals" | "promo" | "featuredDiscovery", fallback: typeof selectedProducts) => {
    const ids = sections[key]?.productIds ?? [];
    return ids.length ? ids.map((id) => selectedProducts.find((product) => product.id === id)).filter((product): product is (typeof selectedProducts)[number] => Boolean(product)) : fallback;
  };

  // Gabungkan produk promo, best seller, dan produk baru untuk spotlight
  const spotlightCandidateRows = [
    ...(promoProducts ?? []),
    ...(bestSellers ?? []),
    ...(newArrivals ?? []),
  ];
  const uniqueSpotlightProducts = Array.from(
    new Map(spotlightCandidateRows.map((product) => [product.id, product])).values()
  ).map((product) => toStorefrontProduct(product as StoreProduct));

  // Produk promo gabungan (pinned pilihan admin + produk bertanda promo / diskon aktif)
  const promoDisplayProducts = (() => {
    const pinned = selected("promo", []);
    const remainingPromos = uniqueSpotlightProducts.filter(
      (p) => (p.isPromo || p.discountPrice != null) && !pinned.some((pin) => pin.id === p.id)
    );
    const combined = [...pinned, ...remainingPromos];
    return combined.length > 0 ? combined : uniqueSpotlightProducts;
  })();

  const storeJsonLd = buildStoreJsonLd(settings.store);

  return (
    <div className="flex flex-col gap-14 pb-16 sm:gap-20 sm:pb-20 lg:gap-24 lg:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd).replace(/</g, '\\u003c') }}
      />
      <HeroSection banners={(banners ?? []).filter((banner) => banner.placement === "hero")} />
      {sections.about?.visible !== false && (
        <AboutUsSection content={aboutContent} storeWhatsApp={settings.store.whatsapp} />
      )}
      {sections.promo.visible && (
        <PromoBanner
          banner={(banners ?? []).find((banner) => banner.placement === "promo")}
          sectionTitle={sections.promo.title}
          sectionSubtitle={sections.promo.subtitle}
          products={promoDisplayProducts}
        />
      )}
      {sections.categories.visible && (
        <CategorySection categories={categories ?? []} title={sections.categories.title} subtitle={sections.categories.subtitle} />
      )}
      {sections.featuredDiscovery?.visible !== false && (
        <ProductDiscovery
          title={sections.featuredDiscovery?.title || "Pilihan Produk Unggulan"}
          subtitle={
            sections.featuredDiscovery?.subtitle ||
            "Cari langsung, saring kategori pilihan, dan urutkan harga terbaik."
          }
          initialProducts={
            (sections.featuredDiscovery?.productIds?.length ?? 0) > 0
              ? selected("featuredDiscovery", uniqueSpotlightProducts)
              : (uniqueSpotlightProducts.length > 0 ? uniqueSpotlightProducts : undefined)
          }
        />
      )}
      {sections.bestsellers.visible && (
        <FeaturedProducts
          title={sections.bestsellers.title}
          subtitle={sections.bestsellers.subtitle}
          type="bestseller"
          initialData={selected(
            "bestsellers",
            (bestSellers || []).map((product) => toStorefrontProduct(product as StoreProduct))
          ).map((p) => ({
            ...p,
            isBestSeller: true,
            badges: Array.from(new Set([...(p.badges || []), "Best Seller", "Terlaris"])),
          }))}
        />
      )}
      {sections.newArrivals.visible && (
        <FeaturedProducts
          title={sections.newArrivals.title}
          subtitle={sections.newArrivals.subtitle}
          type="new"
          initialData={selected(
            "newArrivals",
            (newArrivals || []).map((product) => toStorefrontProduct(product as StoreProduct))
          ).map((p) => ({
            ...p,
            isNewArrival: true,
            badges: Array.from(new Set([...(p.badges || []), "Baru", "Terbaru"])),
          }))}
        />
      )}
      {sections.brands.visible && <BrandShowcase brands={brands ?? []} title={sections.brands.title} />}
      {sections.branches?.visible && (
        <BranchLocatorSection
          sectionSetting={sections.branches}
          branches={settings.store.branches}
          storeWhatsApp={settings.store.whatsapp}
          storeAddress={settings.store.address}
          storeMapsUrl={settings.store.maps_url}
          storeLatitude={settings.store.latitude}
          storeLongitude={settings.store.longitude}
          storeCity={settings.store.city}
          storeName="Next Solution"
        />
      )}
      {sections.reviews?.visible && (
        <ProductReviewsSection
          sectionSetting={sections.reviews}
          reviews={featuredReviews}
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
      {sections.faq.visible && <FaqSection faqs={faqs ?? []} title={sections.faq.title} subtitle={sections.faq.subtitle} />}
    </div>
  );
}
