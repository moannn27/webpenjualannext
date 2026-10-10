"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Quote,
  ExternalLink,
  Laptop,
  Sparkles,
  Pause,
  Play,
} from "lucide-react";
import type { FeaturedReviewItem, StoreSectionSetting } from "@/lib/storefront-settings";

type ProductReviewsSectionProps = {
  sectionSetting?: StoreSectionSetting;
  reviews: FeaturedReviewItem[];
};

export function ProductReviewsSection({
  sectionSetting,
  reviews = [],
}: ProductReviewsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Responsive itemsPerPage: 1 on mobile, 2 on tablet, 3 on desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 640) {
        setItemsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2);
      } else {
        setItemsPerPage(3);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalReviews = reviews.length;
  const maxIndex = Math.max(0, totalReviews - itemsPerPage);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  // Autoplay timer (5 seconds)
  useEffect(() => {
    if (isPaused || totalReviews <= itemsPerPage) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, nextSlide, totalReviews, itemsPerPage]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      nextSlide();
    } else if (distance < -50) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!reviews || reviews.length === 0) return null;

  const title = sectionSetting?.title || "Ulasan Pembeli Next Solution";
  const subtitle =
    sectionSetting?.subtitle ||
    "Pengalaman nyata dari pembeli terverifikasi produk pilihan di Next Solution.";
  const tag = sectionSetting?.tag || "ULASAN PELANGGAN";

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary tracking-wide uppercase mb-3">
            <Sparkles className="size-3.5" />
            <span>{tag}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
            {subtitle}
          </p>
        </div>

        {/* Carousel Navigation Buttons (Desktop & Tablet) */}
        {totalReviews > itemsPerPage && (
          <div className="flex items-center gap-2 self-start md:self-end">
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              aria-label={isPaused ? "Lanjutkan putar otomatis" : "Jeda putar otomatis"}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition shadow-2xs"
              title={isPaused ? "Lanjutkan otomatis" : "Jeda otomatis"}
            >
              {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Ulasan sebelumnya"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted transition shadow-2xs"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Ulasan selanjutnya"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted transition shadow-2xs"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </div>

      {/* Reviews Slider Viewport */}
      <div
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
          }}
        >
          {reviews.map((review, index) => {
            const ratingScore = Math.min(5, Math.max(1, review.rating || 5));
            const initials = review.user_name
              ? review.user_name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              : "NS";

            return (
              <div
                key={review.id || index}
                className="shrink-0 px-2.5 sm:px-3"
                style={{ width: `${100 / itemsPerPage}%` }}
              >
                <article className="group flex flex-col justify-between h-full rounded-3xl border border-border/80 bg-card/90 p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300">
                  {/* Top: Rating Stars & Badges */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`size-4 ${
                                i < ratingScore
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-muted text-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {ratingScore}.0
                        </span>
                      </div>

                      {review.is_verified !== false && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="size-3.5" />
                          Terverifikasi
                        </span>
                      )}
                    </div>

                    {/* Review Quote / Comment */}
                    <div className="relative min-h-[80px]">
                      <Quote className="absolute -left-1 -top-2 size-6 text-primary/15 pointer-events-none" />
                      <p className="relative text-xs sm:text-sm text-foreground/90 leading-relaxed italic line-clamp-4 font-light pl-4">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    </div>

                    {/* Reviewer Customer Info */}
                    <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                      {review.user_avatar ? (
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border">
                          <Image
                            src={review.user_avatar}
                            alt={review.user_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-xs text-white shadow-xs">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {review.user_name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {review.date_text || "Pelanggan Terverifikasi"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Pembelian Produk Apa ("sama pembelian produk apa gitu bang") */}
                  <div className="mt-5 pt-4 border-t border-border/80">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-2">
                      Produk Yang Dibeli:
                    </span>
                    <Link
                      href={review.product_id ? `/product/${review.product_id}` : "#"}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/40 p-2.5 sm:p-3 hover:bg-muted hover:border-primary/40 transition group/prod"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {review.product_image ? (
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                            <Image
                              src={review.product_image}
                              alt={review.product_name}
                              fill
                              className="object-cover group-hover/prod:scale-105 transition duration-300"
                            />
                          </div>
                        ) : (
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                            <Laptop className="size-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-foreground truncate group-hover/prod:text-primary transition">
                            {review.product_name}
                          </h5>
                          <span className="text-[11px] text-primary font-medium inline-flex items-center gap-1 mt-0.5">
                            Lihat Detail Produk
                          </span>
                        </div>
                      </div>

                      <span className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-background border border-border text-muted-foreground group-hover/prod:text-primary group-hover/prod:border-primary/40 transition">
                        <ExternalLink className="size-3.5" />
                      </span>
                    </Link>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots Pagination Indicators */}
      {totalReviews > itemsPerPage && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {[...Array(maxIndex + 1)].map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Ke slide ulasan ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex === i
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

