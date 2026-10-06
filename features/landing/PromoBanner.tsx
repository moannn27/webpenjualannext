import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PromoBanner() {
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative rounded-[32px] overflow-hidden bg-primary text-primary-foreground min-h-[400px] flex items-center">
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="https://images.unsplash.com/photo-1603192070110-336338b248a0?q=80&w=2000&auto=format&fit=crop"
            alt="Promo Background"
            fill
            className="object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
        </div>
        
        <div className="relative z-10 p-8 md:p-16 max-w-2xl">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-sm font-semibold mb-6">
            Limited Time Offer
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Upgrade Your Setup. <br />
            <span className="text-white/80">Save up to 30%.</span>
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-10 max-w-xl font-light">
            Discover incredible deals on premium electronics, from high-performance laptops to immersive audio gear. Don&apos;t miss out.
          </p>
          <Button render={<Link href="/promo" />} size="lg" className="rounded-full px-8 bg-white text-primary hover:bg-white/90">
            Shop the Sale
          </Button>
        </div>
      </div>
    </section>
  );
}
