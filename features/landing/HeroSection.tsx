"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HERO_SLIDES } from "@/constants/dummy";

type LandingBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  headline: string;
  description: string;
  button_label: string;
  image_url: string;
  target_url: string | null;
};

export function HeroSection({ banners = [] }: { banners?: LandingBanner[] }) {
  const slides = banners.length
    ? banners.map((banner) => ({
        image: banner.image_url,
        title: banner.headline,
        subtitle: banner.subtitle || banner.title,
        description: banner.description,
        cta: banner.button_label,
        href: banner.target_url || "/products",
      }))
    : HERO_SLIDES;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-advance with pause on hover
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(nextSlide, 5500);
    return () => clearInterval(timer);
  }, [isPaused, slides.length, nextSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevSlide, nextSlide]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      nextSlide();
    } else if (diff < -45) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const slide = slides[currentSlide % slides.length];

  return (
    <section className="container mx-auto w-full px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      <div
        className="group/hero relative mx-auto flex h-[min(74vh,760px)] min-h-[480px] w-full items-center justify-center overflow-hidden rounded-[28px] bg-muted shadow-sm sm:rounded-[36px] lg:min-h-[560px]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background Image Carousel (Pure CSS Fade: instant first render, no 3.5s render delay, zero JS animation overhead) */}
        {slides.map((s, index) => {
          const isActive = index === (currentSlide % slides.length);
          return (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100 z-1" : "opacity-0 pointer-events-none z-0"
              }`}
              aria-hidden={!isActive}
            >
              <Image
                src={s.image}
                alt={s.title}
                fill
                sizes="100vw"
                className="object-cover"
                priority={index === 0}
              />
              <div className="absolute inset-0 bg-black/45" />
            </div>
          );
        })}

        {/* Slide Counter Pill (Top-Right) */}
        {slides.length > 1 && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white/90 border border-white/10 shadow-sm">
              <span className="font-bold text-white">{(currentSlide % slides.length) + 1}</span>
              <span className="text-white/60">/</span>
              <span className="text-white/70">{slides.length}</span>
            </span>
          </div>
        )}

        {/* Content Overlay */}
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center text-white">
          <div
            key={currentSlide}
            className="max-w-3xl flex flex-col items-center animate-in fade-in duration-500"
          >
            <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/80 sm:mb-4 sm:text-sm md:text-base">
              {slide.subtitle}
            </span>
            <h1 className="mb-4 text-3xl font-bold tracking-tight leading-tight sm:mb-6 sm:text-5xl md:text-6xl lg:text-7xl">
              {slide.title}
            </h1>
            <p className="mb-8 max-w-2xl text-sm font-light text-white/90 sm:mb-10 sm:text-base md:text-xl">
              {slide.description}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Button
                render={<Link href={slide.href} />}
                size="lg"
                className="rounded-full px-7 text-sm font-semibold bg-white text-black hover:bg-white/90 sm:px-8 sm:text-base cursor-pointer"
              >
                {slide.cta}
              </Button>
              <Button
                variant="outline"
                render={<Link href="/products" />}
                size="lg"
                className="rounded-full border-white/40 bg-black/25 px-7 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 sm:px-8 sm:text-base cursor-pointer"
              >
                Semua Produk
              </Button>
            </div>
          </div>
        </div>

        {/* Multi-Slide Navigation Indicators (Supports 2 to 10+ slides cleanly) */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 max-w-[90vw] overflow-x-auto scrollbar-none py-1">
            <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    index === (currentSlide % slides.length)
                      ? "w-6 sm:w-8 bg-white"
                      : "w-2 sm:w-2.5 bg-white/40 hover:bg-white/75"
                  }`}
                  aria-label={`Pindah ke slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Prev / Next Arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 z-20 flex size-10 sm:size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-black/60 md:opacity-0 md:group-hover/hero:opacity-100 md:focus-visible:opacity-100 md:-translate-x-2 md:group-hover/hero:translate-x-0 cursor-pointer"
              aria-label="Slide sebelumnya"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 z-20 flex size-10 sm:size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-black/60 md:opacity-0 md:group-hover/hero:opacity-100 md:focus-visible:opacity-100 md:translate-x-2 md:group-hover/hero:translate-x-0 cursor-pointer"
              aria-label="Slide berikutnya"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
