"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type {
  AspectRatioOption,
  BorderOption,
  ImageSizeOption,
  ObjectFitOption,
  ObjectPositionOption,
  PhotoImageItem,
  PhotoLayoutConfig,
  RoundedOption,
  ShadowOption,
} from "@/lib/about-us";

interface PhotoLayoutRendererProps {
  config: PhotoLayoutConfig;
  className?: string;
  isPreview?: boolean;
  priority?: boolean;
}

const ASPECT_RATIO_MAP: Record<AspectRatioOption, string> = {
  square: "aspect-square",
  landscape: "aspect-[16/10]",
  portrait: "aspect-[3/4]",
  tall: "aspect-[9/16]",
  wide: "aspect-[21/9]",
  auto: "aspect-auto min-h-[220px]",
};

const SIZE_MAP: Record<ImageSizeOption, string> = {
  small: "max-w-[260px] mx-auto",
  medium: "max-w-[440px] mx-auto",
  large: "max-w-[640px] mx-auto",
  full: "w-full",
};

const ROUNDED_MAP: Record<RoundedOption, string> = {
  none: "rounded-none",
  md: "rounded-md",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",
};

const OBJECT_FIT_MAP: Record<ObjectFitOption, string> = {
  cover: "object-cover",
  contain: "object-contain bg-slate-900/5 dark:bg-white/5",
};

const OBJECT_POS_MAP: Record<ObjectPositionOption, string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right",
};

const BORDER_MAP: Record<BorderOption, string> = {
  none: "border-0",
  subtle: "border border-slate-200/80 dark:border-white/10",
  accent: "border-2 border-[#0A4EA3] dark:border-blue-400",
  white: "border-4 border-white dark:border-slate-800 shadow-md",
};

const SHADOW_MAP: Record<ShadowOption, string> = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-2xl shadow-slate-900/10 dark:shadow-black/40",
};

function SinglePhotoCard({
  img,
  fallbackAspect = "landscape",
  priority = false,
  className = "",
}: {
  img: PhotoImageItem;
  fallbackAspect?: AspectRatioOption;
  priority?: boolean;
  className?: string;
}) {
  const aspectClass = ASPECT_RATIO_MAP[img.aspect_ratio || fallbackAspect] || "aspect-[16/10]";
  const sizeClass = SIZE_MAP[img.size || "full"] || "w-full";
  const roundedClass = ROUNDED_MAP[img.rounded || "2xl"] || "rounded-2xl";
  const fitClass = OBJECT_FIT_MAP[img.object_fit || "cover"] || "object-cover";
  const posClass = OBJECT_POS_MAP[img.object_position || "center"] || "object-center";
  const borderClass = BORDER_MAP[img.border || "subtle"] || "border border-slate-200/80";
  const shadowClass = SHADOW_MAP[img.shadow || "md"] || "shadow-md";

  return (
    <div
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl ${aspectClass} ${sizeClass} ${roundedClass} ${borderClass} ${shadowClass} ${className}`}
    >
      <Image
        src={img.url}
        alt={img.alt || "Next Solution Store"}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
        unoptimized
        className={`w-full h-full transition-transform duration-500 group-hover:scale-105 ${fitClass} ${posClass}`}
      />
      {img.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-8 text-white transition-opacity duration-300">
          <p className="text-xs sm:text-sm font-medium leading-snug drop-shadow-sm">{img.caption}</p>
        </div>
      )}
    </div>
  );
}

function FloatingBadge({
  badgeText,
  badgeSubtext,
}: {
  badgeText?: string;
  badgeSubtext?: string;
}) {
  if (!badgeText && !badgeSubtext) return null;
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-900/10 dark:shadow-black/50 transition-all hover:scale-[1.02]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A4EA3] to-[#2563EB] text-white shadow-md shadow-blue-500/20">
        <Sparkles className="h-5 w-5" />
      </div>
      <div>
        {badgeText && (
          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
            {badgeText}
          </p>
        )}
        {badgeSubtext && (
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 leading-tight">
            {badgeSubtext}
          </p>
        )}
      </div>
    </div>
  );
}

export function PhotoLayoutRenderer({
  config,
  className = "",
  isPreview = false,
  priority = false,
}: PhotoLayoutRendererProps) {
  const [carouselIndex, setCarouselIndex] = useState(0);

  const images = (config.images || []).filter((img) => img && img.url);

  if (images.length === 0) {
    return isPreview ? (
      <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 p-8 text-center text-slate-400">
        <p className="text-sm font-medium">Belum ada foto yang ditambahkan pada layout ini.</p>
      </div>
    ) : null;
  }

  // 1. COLLAGE TEMPLATE (Matching Screenshot 2 - asymmetric featured + stacked side photos)
  if (config.template === "collage") {
    const mainImage = images[0];
    const sideImages = images.slice(1, 3);

    return (
      <div className={`relative w-full ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-stretch">
          {/* Main featured photo */}
          <div className="md:col-span-7 flex flex-col">
            <SinglePhotoCard
              img={mainImage}
              fallbackAspect="portrait"
              priority={priority}
              className="h-full min-h-[300px] sm:min-h-[420px]"
            />
          </div>

          {/* Secondary stacked photos */}
          <div className="md:col-span-5 flex flex-col justify-between gap-4 sm:gap-6">
            {sideImages.length > 0 ? (
              sideImages.map((sideImg) => (
                <SinglePhotoCard
                  key={sideImg.id}
                  img={sideImg}
                  fallbackAspect="landscape"
                  className="min-h-[160px] sm:min-h-[195px] flex-1"
                />
              ))
            ) : (
              // Fallback if only 1 image provided in collage
              <div className="hidden md:flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-xs text-slate-400">
                Tambahkan foto ke-2 & ke-3 untuk melengkapi collage
              </div>
            )}
          </div>
        </div>

        {/* Floating badge */}
        {(config.badge_text || config.badge_subtext) && (
          <div className="mt-4 md:mt-0 md:absolute md:-bottom-5 md:left-6 z-10">
            <FloatingBadge
              badgeText={config.badge_text}
              badgeSubtext={config.badge_subtext}
            />
          </div>
        )}
      </div>
    );
  }

  // 2. SPLIT TEMPLATE (2 Photos side-by-side or stacked)
  if (config.template === "split") {
    return (
      <div className={`relative w-full ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {images.slice(0, 2).map((img, i) => (
            <SinglePhotoCard
              key={img.id}
              img={img}
              fallbackAspect="landscape"
              priority={priority && i === 0}
            />
          ))}
        </div>
        {(config.badge_text || config.badge_subtext) && (
          <div className="mt-4 flex justify-center">
            <FloatingBadge
              badgeText={config.badge_text}
              badgeSubtext={config.badge_subtext}
            />
          </div>
        )}
      </div>
    );
  }

  // 3. GRID TEMPLATE (Configurable columns: 2, 3, or 4)
  if (config.template === "grid") {
    const cols = config.columns || 3;
    const colClass =
      cols === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : cols === 4
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

    return (
      <div className={`relative w-full ${className}`}>
        <div className={`grid ${colClass} gap-4 sm:gap-6`}>
          {images.map((img, i) => (
            <SinglePhotoCard
              key={img.id}
              img={img}
              fallbackAspect="landscape"
              priority={priority && i === 0}
            />
          ))}
        </div>
        {(config.badge_text || config.badge_subtext) && (
          <div className="mt-6 flex justify-center">
            <FloatingBadge
              badgeText={config.badge_text}
              badgeSubtext={config.badge_subtext}
            />
          </div>
        )}
      </div>
    );
  }

  // 4. BANNER TEMPLATE (Wide banner layout)
  if (config.template === "banner") {
    const bannerImg = images[0];
    return (
      <div className={`relative w-full ${className}`}>
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-lg min-h-[220px] sm:min-h-[340px]">
          <Image
            src={bannerImg.url}
            alt={bannerImg.alt || "Banner Next Solution Store"}
            fill
            sizes="100vw"
            priority={priority}
            unoptimized
            className={`w-full h-full ${OBJECT_FIT_MAP[bannerImg.object_fit || "cover"]} ${OBJECT_POS_MAP[bannerImg.object_position || "center"]}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {(config.badge_text || config.badge_subtext || bannerImg.caption) && (
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              {bannerImg.caption && (
                <p className="text-white text-sm sm:text-base font-medium max-w-xl drop-shadow-md">
                  {bannerImg.caption}
                </p>
              )}
              {(config.badge_text || config.badge_subtext) && (
                <FloatingBadge
                  badgeText={config.badge_text}
                  badgeSubtext={config.badge_subtext}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 5. CAROUSEL TEMPLATE (Interactive slider / swipeable row)
  if (config.template === "carousel") {
    const activeImg = images[carouselIndex] || images[0];

    const prevSlide = () => {
      setCarouselIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const nextSlide = () => {
      setCarouselIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    return (
      <div className={`relative w-full ${className}`}>
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xl aspect-[16/10] sm:aspect-[16/9]">
          <Image
            src={activeImg.url}
            alt={activeImg.alt || `Slide ${carouselIndex + 1}`}
            fill
            sizes="(max-width: 1024px) 100vw, 800px"
            priority={priority}
            unoptimized
            className={`w-full h-full transition-opacity duration-500 ${OBJECT_FIT_MAP[activeImg.object_fit || "cover"]} ${OBJECT_POS_MAP[activeImg.object_position || "center"]}`}
          />

          {/* Controls */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all shadow-md z-10"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all shadow-md z-10"
                aria-label="Next Slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              {/* Dots */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2 z-10">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCarouselIndex(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === carouselIndex ? "w-7 bg-white shadow-md" : "w-2 bg-white/50 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {activeImg.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-8 text-white">
              <p className="text-xs sm:text-sm font-medium">{activeImg.caption}</p>
            </div>
          )}
        </div>

        {(config.badge_text || config.badge_subtext) && (
          <div className="mt-4 flex justify-center">
            <FloatingBadge
              badgeText={config.badge_text}
              badgeSubtext={config.badge_subtext}
            />
          </div>
        )}
      </div>
    );
  }

  // 6. SINGLE TEMPLATE (Default)
  const singleImg = images[0];
  return (
    <div className={`relative w-full ${className}`}>
      <SinglePhotoCard
        img={singleImg}
        fallbackAspect="landscape"
        priority={priority}
      />
      {(config.badge_text || config.badge_subtext) && (
        <div className="mt-4 flex justify-center">
          <FloatingBadge
            badgeText={config.badge_text}
            badgeSubtext={config.badge_subtext}
          />
        </div>
      )}
    </div>
  );
}
