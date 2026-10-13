"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/shared/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { type Product } from "@/store/useProductStore";

interface FeaturedProductsProps {
  title: string;
  type: "bestseller" | "new" | "promo";
  initialData?: Product[];
  subtitle?: string;
}

export function FeaturedProducts({ title, type, initialData = [], subtitle }: FeaturedProductsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [isInView, setIsInView] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  // Intersection observer: only animate when visible on screen to save CPU/GPU
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

  // Detect responsive items per page
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

  // Auto rotation: runs only when in view and user is not hovering
  useEffect(() => {
    if (!canSlide || isPaused || !isInView) return;
    const timer = setInterval(() => {
      goToNext();
    }, 5000);
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

  return (
    <section ref={sectionRef} className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:mb-10 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-foreground">
            {title}
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            {subtitle ?? (type === "bestseller" ? "Pilihan terfavorit yang paling banyak dibeli pelanggan." : type === "promo" ? "Penawaran harga terbaik dan potongan spesial." : "Lini produk dan teknologi terbaru yang siap dimiliki.")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {canSlide && (
            <div className="flex items-center gap-1.5 mr-2">
              <button
                type="button"
                onClick={goToPrev}
                aria-label={`Lihat produk ${title} sebelumnya`}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border/80 bg-background text-foreground transition-all hover:bg-muted hover:border-primary/50 shadow-2xs active:scale-95"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                aria-label={`Lihat produk ${title} berikutnya`}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border/80 bg-background text-foreground transition-all hover:bg-muted hover:border-primary/50 shadow-2xs active:scale-95"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}

          <Button
            variant="outline"
            className="rounded-full shadow-2xs hover:border-primary/40"
            aria-label={`Lihat semua ${title}`}
            render={<Link href={type === "promo" ? "/promo" : `/products?sort=${type}`} />}
          >
            Lihat semua <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

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
          <div className="overflow-hidden py-2 -mx-2 sm:-mx-2.5">
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
                  className="w-full sm:w-1/2 lg:w-1/4 shrink-0 px-2 sm:px-2.5 flex flex-col"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

          {/* Dots Indicator */}
          {canSlide && (
            <div className="mt-6 flex items-center justify-center gap-1.5">
              {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Slide ke-${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentIndex === idx
                      ? "w-6 bg-primary shadow-xs"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-card/60 px-5 py-8 text-center text-sm text-muted-foreground">
          Produk pilihan akan segera hadir.
        </div>
      )}
    </section>
  );
}
