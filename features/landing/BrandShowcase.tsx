import Link from "next/link";

export function BrandShowcase({ brands = [], title = "Trusted by Top Brands" }: { brands?: { id: string; name: string; logo_url?: string | null }[]; title?: string }) {
  return (
    <section className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl rounded-[28px] bg-muted px-5 py-12 text-center sm:rounded-[36px] sm:px-10 sm:py-16 lg:px-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-12 text-foreground">
          {title}
        </h2>
        
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 lg:gap-8">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/products?brand=${brand.id}`}
              className="group flex min-h-20 min-w-40 items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4 text-foreground/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md"
            >
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5" aria-hidden="true">{brand.logo_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={brand.logo_url} alt="" loading="lazy" className="size-full object-contain" /> : <span className="text-sm font-bold text-primary">{brand.name.slice(0, 1).toUpperCase()}</span>}</span>
              <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{brand.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
