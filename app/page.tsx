import { HeroSection } from "@/features/landing/HeroSection";
import { CategorySection } from "@/features/landing/CategorySection";
import { FeaturedProducts } from "@/features/landing/FeaturedProducts";
import { PromoBanner } from "@/features/landing/PromoBanner";
import { BrandShowcase } from "@/features/landing/BrandShowcase";
import { WhyChooseUs } from "@/features/landing/WhyChooseUs";
import { Testimonials } from "@/features/landing/Testimonials";
import { FaqSection } from "@/features/landing/FaqSection";
import { getBestSellerAction, getNewArrivalAction } from "@/actions/product";

export default async function Home() {
  const bestSellers = await getBestSellerAction();
  const newArrivals = await getNewArrivalAction();

  return (
    <div className="flex flex-col gap-24 pb-24">
      <HeroSection />
      <CategorySection />
      <FeaturedProducts title="Best Sellers" type="bestseller" initialData={bestSellers || []} />
      <PromoBanner />
      <FeaturedProducts title="New Arrivals" type="new" initialData={newArrivals || []} />
      <BrandShowcase />
      <WhyChooseUs />
      <Testimonials />
      <FaqSection />
    </div>
  );
}
