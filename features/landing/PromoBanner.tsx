import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type LandingPromo = { title: string; headline: string; description: string; button_label: string; image_url: string; target_url: string | null };

export function PromoBanner({ banner, sectionTitle, sectionSubtitle }: { banner?: LandingPromo; sectionTitle?: string; sectionSubtitle?: string }) {
  const title = banner?.headline || "Temukan promo pilihan";
  const description = banner?.description || sectionSubtitle || "Lihat penawaran dan produk pilihan dari Next Solution.";
  const image = banner?.image_url;
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative flex min-h-[320px] items-center overflow-hidden rounded-[26px] bg-primary text-primary-foreground sm:min-h-[360px] sm:rounded-[32px] lg:min-h-[400px]">
        <div className="absolute inset-0 h-full w-full">
          {image && <Image src={image} alt={banner?.title || "Promo"} fill sizes="100vw" className="object-cover opacity-20 mix-blend-overlay" />}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-2xl p-6 sm:p-10 lg:p-16">
          <span className="mb-4 inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold backdrop-blur-md sm:mb-6 sm:text-sm">
            {sectionTitle || banner?.title || "Pilihan Next Solution"}
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:mb-6 sm:text-4xl lg:text-6xl">
            {title}
          </h2>
          <p className="mb-6 max-w-xl text-base font-light text-primary-foreground/90 sm:mb-8 sm:text-lg lg:mb-10 lg:text-xl">
            {description}
          </p>
          <Button render={<Link href={banner?.target_url || "/products"} />} size="lg" className="rounded-full px-8 bg-white text-primary hover:bg-white/90">
            {banner?.button_label || "Lihat produk"}
          </Button>
        </div>
      </div>
    </section>
  );
}
