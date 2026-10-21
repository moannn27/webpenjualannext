import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

type BrandItem = {
  id: string;
  name: string;
  logo_url?: string | null;
};

function repeatToFill(items: BrandItem[], minLength = 6): BrandItem[] {
  if (items.length === 0) return [];
  let result = [...items];
  while (result.length < minLength) {
    result = [...result, ...items];
  }
  return result;
}

export function BrandShowcase({
  brands = [],
  title = "Pilihan Brand Resmi",
}: {
  brands?: BrandItem[];
  title?: string;
}) {
  if (!brands || brands.length === 0) return null;

  // Split brands into 2 rows for dual alternating tracks
  const rawRow1 = brands.filter((_, idx) => idx % 2 === 0);
  const rawRow2 = brands.filter((_, idx) => idx % 2 === 1);
  const baseRow1 = rawRow1.length > 0 ? rawRow1 : brands;
  const baseRow2 = rawRow2.length > 0 ? rawRow2 : brands;

  const filledRow1 = repeatToFill(baseRow1, 6);
  const filledRow2 = repeatToFill(baseRow2, 6);

  // Duplicate for seamless 50% infinite translation
  const track1 = [...filledRow1, ...filledRow1];
  const track2 = [...filledRow2, ...filledRow2];

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Outer Card */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2028] p-5 sm:p-7 lg:p-8 shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
        <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Mitra resmi brand teknologi terkemuka dengan jaminan garansi distributor terpercaya.
            </p>
          </div>

          <Link
            href="/brands"
            className="text-xs sm:text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1.5 shrink-0"
          >
            Lihat semua brand <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Dual-Row Infinite Animated Marquee Container */}
        <div className="marquee-container relative space-y-3.5 py-1 overflow-hidden">
          {/* Subtle gradient edges for smooth fade effect */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-white dark:from-[#1E2028] to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-white dark:from-[#1E2028] to-transparent z-10" />

          {/* Row 1: Moves Left */}
          <div className="flex w-max gap-3.5 sm:gap-4 animate-marquee-left">
            {track1.map((brand, idx) => (
              <Link
                key={`r1-${brand.id}-${idx}`}
                href={`/products?brand=${brand.id}`}
                className="group/card flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-[#F8F9FA] dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-primary/40 hover:bg-white dark:hover:bg-white/10 hover:shadow-md transition-all duration-300 shrink-0 w-[200px] sm:w-[240px]"
              >
                <div className="relative size-10 shrink-0 flex items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-black/30 p-1.5 shadow-2xs border border-slate-100 dark:border-white/5">
                  {brand.logo_url ? (
                    <Image
                      src={brand.logo_url}
                      alt={`Logo ${brand.name}`}
                      fill
                      sizes="40px"
                      unoptimized
                      className="object-contain p-1"
                    />
                  ) : (
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {brand.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover/card:text-primary transition-colors block truncate">
                    {brand.name}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                    Official Partner
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Row 2: Moves Right (Alternating Direction) */}
          <div className="flex w-max gap-3.5 sm:gap-4 animate-marquee-right">
            {track2.map((brand, idx) => (
              <Link
                key={`r2-${brand.id}-${idx}`}
                href={`/products?brand=${brand.id}`}
                className="group/card flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-[#F8F9FA] dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:border-primary/40 hover:bg-white dark:hover:bg-white/10 hover:shadow-md transition-all duration-300 shrink-0 w-[200px] sm:w-[240px]"
              >
                <div className="relative size-10 shrink-0 flex items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-black/30 p-1.5 shadow-2xs border border-slate-100 dark:border-white/5">
                  {brand.logo_url ? (
                    <Image
                      src={brand.logo_url}
                      alt={`Logo ${brand.name}`}
                      fill
                      sizes="40px"
                      unoptimized
                      className="object-contain p-1"
                    />
                  ) : (
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {brand.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover/card:text-primary transition-colors block truncate">
                    {brand.name}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                    Official Partner
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
