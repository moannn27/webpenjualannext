import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  image_url?: string | null;
  image?: string;
  slug?: string;
  description?: string | null;
}

export function CategorySection({
  categories = [],
  title = "Kategori & Ekosistem Perangkat",
  subtitle = "Temukan laptop, monitor, desktop, dan ekosistem komputasi terbaik.",
}: {
  categories?: CategoryItem[];
  title?: string;
  subtitle?: string;
}) {
  // Map specific category highlights or fallback to the first 4 categories
  const highlightDefs = [
    {
      categoryKeyword: "laptops",
      badge: "Technology",
      headline: "Laptops & Notebooks",
      desc: "Performa tangguh untuk produktivitas kerja, komputasi, dan mobilitas tanpa batas.",
      fallbackImg: "https://xyhooykvidzstnmaggku.supabase.co/storage/v1/object/public/products/dc3c3e5e-5508-49f2-a09e-9b661b9ef808.webp",
    },
    {
      categoryKeyword: "gaming",
      badge: "Gear",
      headline: "Gaming Laptops",
      desc: "Grafis bertenaga tinggi dan refresh rate mulus untuk performa gaming kompetitif.",
      fallbackImg: "https://xyhooykvidzstnmaggku.supabase.co/storage/v1/object/public/products/official-lenovo-loq-15.png",
    },
    {
      categoryKeyword: "monitor",
      badge: "Gear",
      headline: "Monitors & Display",
      desc: "Visual tajam, resolusi tinggi, dan panel warna akurat untuk setup meja kerja modern.",
      fallbackImg: "https://xyhooykvidzstnmaggku.supabase.co/storage/v1/object/public/products/official-lenovo-monitor-l24d-4c.png",
    },
    {
      categoryKeyword: "all-in-one",
      badge: "Accessory",
      headline: "Desktops & All-in-One",
      desc: "Solusi PC terintegrasi ringkas dan bertenaga untuk ruang kerja profesional.",
      fallbackImg: "https://xyhooykvidzstnmaggku.supabase.co/storage/v1/object/public/products/official-lenovo-ideacentre-aio-24irh9.png",
    },
  ];

  // Resolve matching category objects from DB
  const heroCards = highlightDefs.map((def) => {
    // Match exact slug or exact name first to prevent collision (e.g. 'laptops' vs 'gaming-laptops')
    const matched =
      categories.find((c) => (c.slug && c.slug.toLowerCase() === def.categoryKeyword) || c.name.toLowerCase() === def.categoryKeyword) ||
      categories.find((c) =>
        c.name.toLowerCase().includes(def.categoryKeyword) ||
        (c.slug && c.slug.toLowerCase().includes(def.categoryKeyword))
      );
    const href = matched?.slug
      ? `/category/${matched.slug}`
      : matched?.id
      ? `/products?category=${matched.id}`
      : "/products";
    const imgUrl = matched?.image_url || matched?.image || def.fallbackImg;
    const name = matched?.name || def.headline;

    return {
      id: `hero-category-${def.categoryKeyword}`,
      badge: def.badge,
      headline: name,
      desc: def.desc,
      href,
      imgUrl,
    };
  });

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Outer White Card */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2028] p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-100 dark:border-white/5">
        {/* Header */}
        <div className="mb-5 sm:mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
          <Link
            href="/category"
            className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white hover:underline inline-flex items-center gap-1.5 shrink-0"
          >
            Lihat semua kategori <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* 2x2 Bento Grid (Technology, Gear, Accessory Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {heroCards.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="group bg-[#F8F9FA] dark:bg-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-7 relative overflow-hidden flex flex-col justify-between min-h-[200px] sm:min-h-[240px] transition-all duration-300 hover:shadow-md hover:bg-[#F2F4F7] dark:hover:bg-white/10"
            >
              {/* Text content on left */}
              <div className="z-10 max-w-[62%] sm:max-w-[240px]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  {card.badge}
                </span>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {card.headline}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {card.desc}
                </p>
              </div>

              {/* Action link */}
              <div className="z-10 mt-5">
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:gap-2.5 transition-all">
                  Explore category <ArrowRight className="size-3.5" />
                </span>
              </div>

              {/* Cutout real product image on right */}
              <div className="absolute -right-3 -bottom-3 sm:right-2 sm:bottom-0 w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 pointer-events-none transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-1">
                <Image
                  src={card.imgUrl}
                  alt={card.headline}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-contain drop-shadow-md"
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Category Pills Strip (for remaining categories) */}
        {categories.length > 4 && (
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">Lainnya:</span>
            {categories.slice(4).map((cat, idx) => {
              const href = cat.slug ? `/category/${cat.slug}` : `/products?category=${cat.id}`;
              return (
                <Link
                  key={cat.id ? `more-cat-${cat.id}` : `more-cat-idx-${idx}`}
                  href={href}
                  className="px-3.5 py-1.5 rounded-full bg-[#F8F9FA] dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition"
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
