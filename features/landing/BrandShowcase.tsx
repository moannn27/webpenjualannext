import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function BrandShowcase({
  brands = [],
  title = "Pilihan Brand Resmi",
}: {
  brands?: { id: string; name: string; logo_url?: string | null }[];
  title?: string;
}) {
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Outer White Card */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2028] p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-100 dark:border-white/5">
        <div className="mb-5 sm:mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Mitra resmi brand teknologi terkemuka dengan jaminan garansi distributor terpercaya.
            </p>
          </div>

          {brands.length > 0 && (
            <Link
              href="/brands"
              className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white hover:underline inline-flex items-center gap-1.5 shrink-0"
            >
              Lihat semua brand <ArrowRight className="size-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/products?brand=${brand.id}`}
              aria-label={`Lihat produk ${brand.name}`}
              className="group flex flex-col items-center justify-center p-5 rounded-2xl bg-[#F6F7F9] dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all duration-300 text-center"
            >
              <div className="relative size-12 mb-2 flex items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-black/30 p-2 shadow-2xs">
                {brand.logo_url ? (
                  <Image
                    src={brand.logo_url}
                    alt={`Logo ${brand.name}`}
                    fill
                    sizes="48px"
                    unoptimized
                    className="object-contain p-1"
                  />
                ) : (
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {brand.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
