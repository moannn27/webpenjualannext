"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/shared/ProductCard";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { type Product } from "@/store/useProductStore";

interface FeaturedProductsProps {
  title: string;
  type: "bestseller" | "new" | "promo";
  initialData?: Product[];
  subtitle?: string;
  viewAllHref?: string;
}

export function FeaturedProducts({
  title,
  type,
  initialData = [],
  subtitle,
  viewAllHref,
}: FeaturedProductsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [isInView, setIsInView] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  // Intersection observer: only animate when visible on screen
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Responsive items per page
  useEffect(() => {
    const updateItemsPerPage = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth < 640) {
        setItemsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2);
      } else {
        setItemsPerPage(4);
      }
    };
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage, { passive: true });
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  const products = initialData;
  const maxIndex = Math.max(0, products.length - itemsPerPage);
  const canSlide = products.length > itemsPerPage;
  const safeIndex = Math.min(currentIndex, maxIndex);

  const goToNext = useCallback(() => {
    if (!canSlide) return;
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [canSlide, maxIndex]);

  const goToPrev = useCallback(() => {
    if (!canSlide) return;
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [canSlide, maxIndex]);

  // Auto rotation
  useEffect(() => {
    if (!canSlide || isPaused || !isInView) return;
    const timer = setInterval(() => {
      goToNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [canSlide, isPaused, isInView, goToNext]);

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null) {
      if (touchDeltaX.current < -40) {
        goToNext();
      } else if (touchDeltaX.current > 40) {
        goToPrev();
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setIsPaused(false);
  };

  const browseAllUrl =
    viewAllHref ?? (type === "promo" ? "/promo" : `/products?sort=${type}`);

  return (
    <section ref={sectionRef} className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Outer White Card (Screenshot Bottom Container Style: Bestsellers) */}
      <div className="rounded-[32px] sm:rounded-[36px] bg-white dark:bg-[#1E2028] p-6 sm:p-8 lg:p-10 shadow-sm border border-slate-100 dark:border-white/5">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {canSlide && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={goToPrev}
                  aria-label={`Lihat produk ${title} sebelumnya`}
                  className="size-8 sm:size-9 rounded-full bg-[#F6F7F9] dark:bg-white/5 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  aria-label={`Lihat produk ${title} berikutnya`}
                  className="size-8 sm:size-9 rounded-full bg-[#F6F7F9] dark:bg-white/5 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition cursor-pointer"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}

            <Link
              href={browseAllUrl}
              className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white hover:underline inline-flex items-center gap-1.5 shrink-0"
            >
              Browse all products <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* Product Slider / Grid */}
        {products.length ? (
          <div
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Slider Track Viewport */}
            <div className="overflow-hidden py-1 -mx-2.5">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{
                  transform: `translate3d(-${safeIndex * (100 / itemsPerPage)}%, 0, 0)`,
                  willChange: "transform",
                }}
              >
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="w-full sm:w-1/2 lg:w-1/4 shrink-0 px-2.5 flex flex-col"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>

            {/* Dots Indicator */}
            {canSlide && (
              <div className="mt-8 flex items-center justify-center gap-1.5">
                {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Slide ke-${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      currentIndex === idx
                        ? "w-6 bg-slate-900 dark:bg-white"
                        : "w-1.5 bg-slate-300 dark:bg-white/20 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-slate-50 dark:bg-white/5 px-5 py-12 text-center text-sm text-slate-400">
            Produk pilihan akan segera hadir.
          </div>
        )}
      </div>
    </section>
  );
}
