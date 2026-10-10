"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HERO_SLIDES } from "@/constants/dummy";

type LandingBanner = { id: string; title: string; subtitle: string | null; headline: string; description: string; button_label: string; image_url: string; target_url: string | null };

export function HeroSection({ banners = [] }: { banners?: LandingBanner[] }) {
  const slides = banners.length ? banners.map((banner) => ({ image: banner.image_url, title: banner.headline, subtitle: banner.subtitle || banner.title, description: banner.description, cta: banner.button_label, href: banner.target_url || "/products" })) : HERO_SLIDES;
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const slide = slides[currentSlide % slides.length];

  return (
    <section className="container mx-auto w-full px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      <div className="group/hero relative mx-auto flex h-[min(74vh,760px)] min-h-[480px] w-full items-center justify-center overflow-hidden rounded-[28px] bg-muted shadow-sm sm:rounded-[36px] lg:min-h-[560px]">
      <AnimatePresence mode="sync">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>
      </AnimatePresence>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center text-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${currentSlide}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.65, delay: 0.12, ease: "easeOut" }}
            className="max-w-3xl flex flex-col items-center"
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
              <Button render={<Link href={slide.href} />} size="lg" className="rounded-full px-7 text-sm font-semibold bg-white text-black hover:bg-white/90 sm:px-8 sm:text-base">
                {slide.cta}
              </Button>
              <Button variant="outline" render={<Link href="/products" />} size="lg" className="rounded-full border-white/40 bg-black/25 px-7 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 sm:px-8 sm:text-base">
                Semua Produk
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentSlide ? "w-8 bg-white" : "w-4 bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-3 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-black/60 md:opacity-0 md:group-hover/hero:opacity-100 md:focus-visible:opacity-100 md:-translate-x-2 md:group-hover/hero:translate-x-0"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-3 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-black/60 md:opacity-0 md:group-hover/hero:opacity-100 md:focus-visible:opacity-100 md:translate-x-2 md:group-hover/hero:translate-x-0"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
      </div>
    </section>
  );
}
