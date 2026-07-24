import { BRANDS } from "@/constants/dummy";

export function BrandShowcase() {
  return (
    <section className="bg-muted py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-12 text-foreground">
          Trusted by Top Brands
        </h2>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {BRANDS.map((brand) => (
            <div
              key={brand.id}
              className="flex items-center gap-2 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer"
            >
              <span className="text-4xl" aria-hidden="true">{brand.logo}</span>
              <span className="text-xl font-semibold tracking-tight text-foreground">{brand.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
