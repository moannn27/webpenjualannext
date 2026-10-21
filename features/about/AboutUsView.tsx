"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Award,
  CheckCircle,
  CheckCircle2,
  Clock,
  Headphones,
  HeartHandshake,
  Laptop,
  MapPin,
  MessageSquare,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  Truck,
  Users,
  Zap,
  ArrowRight,
} from "lucide-react";
import type { AboutUsContent } from "@/lib/about-us";
import { PhotoLayoutRenderer } from "@/components/shared/PhotoLayoutRenderer";

interface AboutUsViewProps {
  content: AboutUsContent;
}

function renderDynamicIcon(iconName: string, className = "h-5 w-5") {
  switch (iconName?.toLowerCase()) {
    case "shieldcheck":
    case "shield":
      return <ShieldCheck className={className} />;
    case "award":
      return <Award className={className} />;
    case "zap":
      return <Zap className={className} />;
    case "laptop":
      return <Laptop className={className} />;
    case "headphones":
      return <Headphones className={className} />;
    case "packagecheck":
      return <PackageCheck className={className} />;
    case "truck":
      return <Truck className={className} />;
    case "clock":
      return <Clock className={className} />;
    case "thumbsup":
      return <ThumbsUp className={className} />;
    case "sparkles":
      return <Sparkles className={className} />;
    case "users":
      return <Users className={className} />;
    case "hearthandshake":
      return <HeartHandshake className={className} />;
    case "star":
      return <Star className={className} />;
    case "check":
    case "checkcircle":
    default:
      return <CheckCircle className={className} />;
  }
}

function repeatToFill<T>(items: T[], minLength = 6): T[] {
  if (items.length === 0) return [];
  let result = [...items];
  while (result.length < minLength) {
    result = [...result, ...items];
  }
  return result;
}

export function AboutUsView({ content }: AboutUsViewProps) {
  const {
    section_order = ["hero", "story", "stats", "values", "brands", "process", "team_gallery", "cta"],
    section_visibility = {},
    hero,
    story,
    stats,
    values,
    brands,
    process: processSection,
    team_gallery,
    cta,
  } = content;

  // Render individual sections
  const renderSection = (sectionKey: string) => {
    if (section_visibility[sectionKey] === false) return null;

    switch (sectionKey) {
      // 1. HERO SECTION
      case "hero": {
        if (!hero) return null;
        const isPhotoLeft = hero.photo_layout?.placement === "left";

        return (
          <section
            key="hero"
            aria-label="Hero Section"
            className="relative overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-24 border-b border-slate-200/70 dark:border-white/5 bg-gradient-to-b from-[#F8F9FA]/80 via-white to-transparent dark:from-slate-950/40 dark:via-transparent dark:to-transparent"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div
                className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center ${
                  isPhotoLeft ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Text Content */}
                <div
                  className={`lg:col-span-6 flex flex-col justify-center ${
                    isPhotoLeft ? "lg:order-2" : "lg:order-1"
                  }`}
                >
                  {hero.badge && (
                    <div className="inline-flex items-center gap-2 self-start rounded-full bg-blue-50 dark:bg-blue-950/60 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#0A4EA3] dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 shadow-xs mb-4">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{hero.badge}</span>
                    </div>
                  )}

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-3">
                    {hero.title}
                  </h1>

                  {hero.subtitle && (
                    <p className="text-lg sm:text-xl font-bold text-[#0A4EA3] dark:text-blue-400 mb-4">
                      {hero.subtitle}
                    </p>
                  )}

                  <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8 max-w-xl">
                    {hero.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    {hero.primary_button_label && (
                      <Link
                        href={hero.primary_button_url || "/products"}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4EA3] hover:bg-[#083D80] text-white px-6 py-3.5 text-sm sm:text-base font-semibold shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span>{hero.primary_button_label}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}

                    {hero.secondary_button_label && (
                      <Link
                        href={hero.secondary_button_url || "/#"}
                        target={hero.secondary_button_url?.startsWith("http") ? "_blank" : undefined}
                        rel={hero.secondary_button_url?.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 px-6 py-3.5 text-sm sm:text-base font-semibold shadow-xs transition-all hover:scale-[1.02]"
                      >
                        <MessageSquare className="h-4 w-4 text-[#0A4EA3] dark:text-blue-400" />
                        <span>{hero.secondary_button_label}</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Photo Layout */}
                <div
                  className={`lg:col-span-6 ${
                    isPhotoLeft ? "lg:order-1" : "lg:order-2"
                  }`}
                >
                  <PhotoLayoutRenderer
                    config={hero.photo_layout}
                    priority={true}
                  />
                </div>
              </div>
            </div>
          </section>
        );
      }

      // 2. STORY SECTION
      case "story": {
        if (!story) return null;
        const isPhotoLeft = story.photo_layout?.placement === "left";

        return (
          <section
            key="story"
            aria-label="Tentang Kami & Cerita Toko"
            className="py-16 sm:py-24 border-b border-slate-200/70 dark:border-white/5"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                {/* Photo Layout */}
                <div
                  className={`lg:col-span-6 ${
                    isPhotoLeft ? "lg:order-1" : "lg:order-2"
                  }`}
                >
                  <PhotoLayoutRenderer config={story.photo_layout} />
                </div>

                {/* Story Content */}
                <div
                  className={`lg:col-span-6 flex flex-col justify-center ${
                    isPhotoLeft ? "lg:order-2" : "lg:order-1"
                  }`}
                >
                  {story.tag && (
                    <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-[#0A4EA3] dark:text-blue-400 mb-2">
                      {story.tag}
                    </span>
                  )}
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
                    {story.title}
                  </h2>

                  <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
                    {(story.story_paragraphs || []).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>

                  {/* Mission & Vision Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {story.mission && (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-xs">
                        <div className="flex items-center gap-2.5 text-[#0A4EA3] dark:text-blue-400 font-bold text-sm mb-2">
                          <Award className="h-4 w-4" />
                          <span>Misi Kami</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-snug">
                          {story.mission}
                        </p>
                      </div>
                    )}

                    {story.vision && (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-xs">
                        <div className="flex items-center gap-2.5 text-[#0A4EA3] dark:text-blue-400 font-bold text-sm mb-2">
                          <Zap className="h-4 w-4" />
                          <span>Visi Kami</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-snug">
                          {story.vision}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      }

      // 3. STATS SECTION
      case "stats": {
        if (!stats || !stats.items || stats.items.length === 0) return null;
        const activeStats = stats.items.filter((item) => item.is_active !== false);
        if (activeStats.length === 0) return null;

        return (
          <section
            key="stats"
            aria-label="Fakta & Statistik Toko"
            className="py-14 sm:py-20 bg-[#F8F9FA] dark:bg-slate-950/60 border-b border-slate-200/70 dark:border-white/5"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
                {stats.tag && (
                  <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-[#0A4EA3] dark:text-blue-400 mb-2 block">
                    {stats.tag}
                  </span>
                )}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight mb-3">
                  {stats.title}
                </h2>
                {stats.subtitle && (
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                    {stats.subtitle}
                  </p>
                )}
              </div>

              {/* Flex wrap container to automatically center orphan rows (Ref: Gambar No. 5) */}
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                {activeStats.map((item) => (
                  <div
                    key={item.id}
                    className="w-[calc(50%-0.5rem)] sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)] min-w-[200px] max-w-xs relative rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 text-center shadow-xs hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-center"
                  >
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0A4EA3] dark:text-blue-400 tracking-tight">
                        {item.value}
                      </span>
                      {item.suffix && (
                        <span className="text-xl sm:text-2xl font-bold text-[#0A4EA3]/80 dark:text-blue-400/80">
                          {item.suffix}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">
                      {item.label}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      // 4. VALUES / KEUNGGULAN SECTION (Ref: Image No. 1 - Elevated Top-Tab Cards)
      case "values": {
        if (!values || !values.items || values.items.length === 0) return null;
        const activeValues = values.items.filter((item) => item.is_active !== false);
        if (activeValues.length === 0) return null;

        return (
          <section
            key="values"
            aria-label="Keunggulan Next Solution Store"
            className="py-16 sm:py-24 border-b border-slate-200/70 dark:border-white/5"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
                {values.tag && (
                  <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-[#0A4EA3] dark:text-blue-400 mb-2 block">
                    {values.tag}
                  </span>
                )}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight mb-3">
                  {values.title}
                </h2>
                {values.subtitle && (
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                    {values.subtitle}
                  </p>
                )}
              </div>

              {/* 3-Column Grid with Top Protruding Tab Icon Badges (Ref: Image No. 1) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 sm:gap-y-14 gap-x-6 sm:gap-x-8 pt-4">
                {activeValues.map((val) => (
                  <div
                    key={val.id}
                    className="group relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 pt-11 pb-7 px-6 sm:px-7 shadow-xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col items-center text-center justify-between"
                  >
                    {/* Protruding Top Icon Tab Badge (Ref: Image No. 1) */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2">
                      <div className="size-14 sm:size-15 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-white/10 shadow-md flex items-center justify-center text-primary dark:text-blue-400 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        {renderDynamicIcon(val.icon, "size-6")}
                      </div>
                    </div>

                    <div className="w-full flex flex-col items-center">
                      {val.badge && (
                        <span className="inline-block rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0A4EA3] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 px-3 py-0.5 text-[11px] font-bold tracking-wide mb-3">
                          {val.badge}
                        </span>
                      )}

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2 leading-snug group-hover:text-[#0A4EA3] dark:group-hover:text-blue-400 transition-colors">
                        {val.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px]">
                        {val.description}
                      </p>
                    </div>

                    {/* Circular Action Arrow at Bottom (Ref: Image No. 1) */}
                    <div className="mt-6 pt-2">
                      <div className="size-9 rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-[#0A4EA3] group-hover:text-white group-hover:border-[#0A4EA3] group-hover:scale-110 transition-all duration-300 shadow-2xs">
                        <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      // 5. BRANDS & TECHNOLOGY SECTION (Continuous Dual-Row Moving Marquee)
      case "brands": {
        if (!brands || !brands.items || brands.items.length === 0) return null;
        const activeBrands = brands.items.filter((item) => item.is_active !== false);
        if (activeBrands.length === 0) return null;

        const rawRow1 = activeBrands.filter((_, idx) => idx % 2 === 0);
        const rawRow2 = activeBrands.filter((_, idx) => idx % 2 === 1);
        const baseRow1 = rawRow1.length > 0 ? rawRow1 : activeBrands;
        const baseRow2 = rawRow2.length > 0 ? rawRow2 : activeBrands;

        const filledRow1 = repeatToFill(baseRow1, 6);
        const filledRow2 = repeatToFill(baseRow2, 6);

        const track1 = [...filledRow1, ...filledRow1];
        const track2 = [...filledRow2, ...filledRow2];

        return (
          <section
            key="brands"
            aria-label="Brand & Merek Mitra Resmi"
            className="py-16 sm:py-20 bg-[#F8F9FA]/60 dark:bg-slate-950/40 border-b border-slate-200/70 dark:border-white/5 overflow-hidden"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
                {brands.tag && (
                  <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-[#0A4EA3] dark:text-blue-400 mb-2 block">
                    {brands.tag}
                  </span>
                )}
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight mb-2">
                  {brands.title}
                </h2>
                {brands.subtitle && (
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                    {brands.subtitle}
                  </p>
                )}
              </div>

              {/* Dual-Row Animated Marquee (Alternating continuous movement) */}
              <div className="marquee-container relative space-y-4 sm:space-y-5 overflow-hidden py-2">
                {/* Subtle gradient edges for smooth fade effect */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-[#F8F9FA] dark:from-slate-950 to-transparent z-10" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#F8F9FA] dark:from-slate-950 to-transparent z-10" />

                {/* Row 1: Moves Left */}
                <div className="flex w-max gap-4 sm:gap-5 animate-marquee-left">
                  {track1.map((b, idx) => (
                    <div
                      key={`r1-${b.id}-${idx}`}
                      className="w-[280px] sm:w-[320px] shrink-0 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-300"
                    >
                      <div>
                        {b.logo_url && (
                          <div className="relative h-9 w-28 mb-3">
                            <Image
                              src={b.logo_url}
                              alt={b.name}
                              fill
                              unoptimized
                              className="object-contain object-left"
                            />
                          </div>
                        )}
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {b.name}
                        </h3>
                        <p className="text-xs font-semibold text-[#0A4EA3] dark:text-blue-400 mt-0.5">
                          {b.category}
                        </p>
                      </div>
                      {b.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 leading-snug line-clamp-2">
                          {b.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Row 2: Moves Right */}
                <div className="flex w-max gap-4 sm:gap-5 animate-marquee-right">
                  {track2.map((b, idx) => (
                    <div
                      key={`r2-${b.id}-${idx}`}
                      className="w-[280px] sm:w-[320px] shrink-0 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-300"
                    >
                      <div>
                        {b.logo_url && (
                          <div className="relative h-9 w-28 mb-3">
                            <Image
                              src={b.logo_url}
                              alt={b.name}
                              fill
                              unoptimized
                              className="object-contain object-left"
                            />
                          </div>
                        )}
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {b.name}
                        </h3>
                        <p className="text-xs font-semibold text-[#0A4EA3] dark:text-blue-400 mt-0.5">
                          {b.category}
                        </p>
                      </div>
                      {b.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 leading-snug line-clamp-2">
                          {b.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      }

      // 6. PROCESS / LAYANAN SECTION (Interconnected Workflow - Ref: Image No. 3)
      case "process": {
        if (!processSection || !processSection.steps || processSection.steps.length === 0) return null;
        const activeSteps = processSection.steps.filter((s) => s.is_active !== false);
        if (activeSteps.length === 0) return null;

        return (
          <section
            key="process"
            aria-label="Alur Pelayanan Pelanggan"
            className="py-16 sm:py-24 border-b border-slate-200/70 dark:border-white/5"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
                {processSection.tag && (
                  <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-[#0A4EA3] dark:text-blue-400 mb-2 block">
                    {processSection.tag}
                  </span>
                )}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight mb-3">
                  {processSection.title}
                </h2>
                {processSection.subtitle && (
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                    {processSection.subtitle}
                  </p>
                )}
              </div>

              {/* Interconnected Workflow (Ref: Image No. 3) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4 relative">
                {activeSteps.map((step, idx) => (
                  <div key={step.id} className="group relative flex flex-col items-center">
                    {/* Connecting Line with Arrow to Next Step (Desktop: Horizontal) */}
                    {idx < activeSteps.length - 1 && (
                      <div className="hidden lg:flex items-center absolute top-10 left-[calc(50%+2.75rem)] w-[calc(100%-5.5rem)] pointer-events-none z-0">
                        <div className="h-0.5 w-full bg-gradient-to-r from-[#0A4EA3]/30 via-[#0A4EA3]/60 to-[#0A4EA3]/30 border-b border-dashed border-[#0A4EA3]/40" />
                        <ArrowRight className="size-4 text-[#0A4EA3] dark:text-blue-400 shrink-0 -ml-1 stroke-[2.5]" />
                      </div>
                    )}

                    {/* Step Node Circle (Ref: Image No. 3) */}
                    <div className="relative mb-5 z-10">
                      <div className="size-20 sm:size-22 rounded-full border-2 border-[#0A4EA3]/25 dark:border-blue-400/30 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-[#0A4EA3] dark:text-blue-400 group-hover:scale-110 group-hover:border-[#0A4EA3] group-hover:bg-[#0A4EA3] group-hover:text-white transition-all duration-300">
                        {renderDynamicIcon(step.icon, "size-8")}
                      </div>
                      {/* Step Number Badge */}
                      <span className="absolute -top-1.5 -right-1.5 size-7 rounded-full bg-[#0A4EA3] text-white text-xs font-black flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900">
                        {step.step_number || `0${idx + 1}`}
                      </span>
                    </div>

                    {/* Step Card / Text Content */}
                    <div className="w-full rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 p-5 shadow-2xs group-hover:shadow-md group-hover:border-[#0A4EA3]/40 transition-all duration-300 flex-1 flex flex-col text-center">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug group-hover:text-[#0A4EA3] dark:group-hover:text-blue-400 transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    {/* Mobile Connecting Line Downward */}
                    {idx < activeSteps.length - 1 && (
                      <div className="lg:hidden flex flex-col items-center my-3 text-[#0A4EA3]/40 pointer-events-none">
                        <div className="w-0.5 h-6 border-l-2 border-dashed border-[#0A4EA3]/40" />
                        <ArrowRight className="size-4 rotate-90 text-[#0A4EA3] dark:text-blue-400 -mt-1 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      // 7. TEAM OR ACTIVITY GALLERY SECTION
      case "team_gallery": {
        if (!team_gallery || team_gallery.is_active === false) return null;
        const members = (team_gallery.members || []).filter((m) => m.is_active !== false);
        const hasPhotos = (team_gallery.photo_layout?.images || []).length > 0;

        if (members.length === 0 && !hasPhotos) return null;

        return (
          <section
            key="team_gallery"
            aria-label="Tim & Aktivitas Toko"
            className="py-16 sm:py-24 bg-[#F8F9FA]/40 dark:bg-slate-950/40 border-b border-slate-200/70 dark:border-white/5"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                {team_gallery.tag && (
                  <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-[#0A4EA3] dark:text-blue-400 mb-2 block">
                    {team_gallery.tag}
                  </span>
                )}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight mb-3">
                  {team_gallery.title}
                </h2>
                {team_gallery.subtitle && (
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-2">
                    {team_gallery.subtitle}
                  </p>
                )}
                {team_gallery.description && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-500 max-w-xl mx-auto">
                    {team_gallery.description}
                  </p>
                )}
              </div>

              {/* Photo layout showcase of store/activity */}
              {hasPhotos && (
                <div className="mb-12">
                  <PhotoLayoutRenderer config={team_gallery.photo_layout} />
                </div>
              )}

              {/* Team Members List - Centered Flex Layout */}
              {members.length > 0 && (
                <div className="flex flex-wrap justify-center gap-6">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-6 text-center shadow-xs hover:shadow-md transition-all hover:scale-[1.02] flex flex-col items-center justify-between"
                    >
                      {member.photo_url ? (
                        <div className="relative mx-auto h-24 w-24 rounded-full overflow-hidden mb-4 border-2 border-[#0A4EA3]/20 shadow-xs">
                          <Image
                            src={member.photo_url}
                            alt={member.name}
                            fill
                            unoptimized
                            className="object-cover object-center"
                          />
                        </div>
                      ) : (
                        <div className="mx-auto h-24 w-24 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-900/50 flex items-center justify-center text-[#0A4EA3] dark:text-blue-400 mb-4 font-bold text-2xl">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {member.name}
                      </h3>
                      <p className="text-xs font-semibold text-[#0A4EA3] dark:text-blue-400 mt-0.5">
                        {member.role}
                      </p>
                      {member.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                          {member.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      }

      // 8. CTA SECTION (Split Human-Centric Layout - Ref: Screenshot 2)
      case "cta": {
        if (!cta) return null;

        const defaultConsultationImage = "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=1200&auto=format&fit=crop";
        const ctaImage = cta.image_url || defaultConsultationImage;
        const badge1 = cta.badge_1 || "Rekomendasi Spesifikasi Tepat Sesuai Budget";
        const badge2 = cta.badge_2 || "100% Unit Baru, Segel & Bergaransi Resmi";
        const badge3 = cta.badge_3 || "Konsultasi Gratis & Layanan Purna Jual Terpercaya";

        return (
          <section
            key="cta"
            aria-label="Hubungi Kami & Konsultasi"
            className="py-12 sm:py-16"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              {/* Outer Card with Split Layout */}
              <div className="relative overflow-hidden rounded-3xl bg-[#0A4EA3] text-white shadow-xl grid grid-cols-1 lg:grid-cols-12">
                {/* Left Side: Authentic Specialist Photo */}
                <div className="lg:col-span-5 relative min-h-[300px] sm:min-h-[380px] lg:min-h-full overflow-hidden bg-slate-900">
                  <Image
                    src={ctaImage}
                    alt="Konsultasi Perangkat Komputer"
                    fill
                    unoptimized
                    className="object-cover object-center"
                  />
                  {/* Subtle decorative dot-matrix accent (Ref: Screenshot 2) */}
                  <div className="absolute bottom-5 right-5 grid grid-cols-6 gap-1.5 opacity-40 pointer-events-none">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <span key={i} className="size-1 rounded-full bg-white block" />
                    ))}
                  </div>
                </div>

                {/* Right Side: Deep Blue Card Content */}
                <div className="lg:col-span-7 p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
                  {cta.tag && (
                    <span className="inline-block self-start rounded-full bg-white/15 px-3.5 py-1 text-[11px] font-bold tracking-wider uppercase text-blue-100 border border-white/20 mb-3.5">
                      {cta.tag}
                    </span>
                  )}
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-3 leading-tight">
                    {cta.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-xl mb-6">
                    {cta.description}
                  </p>

                  {/* 3 Circular Badge Value Items (Ref: Screenshot 2) */}
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="size-6 sm:size-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="size-3.5 sm:size-4 stroke-[2.5]" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-white/95">
                        {badge1}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-6 sm:size-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="size-3.5 sm:size-4 stroke-[2.5]" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-white/95">
                        {badge2}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-6 sm:size-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="size-3.5 sm:size-4 stroke-[2.5]" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-white/95">
                        {badge3}
                      </span>
                    </div>
                  </div>

                  {/* High-Contrast CTA Buttons */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    {cta.primary_button_label && (
                      <Link
                        href={cta.primary_button_url || "/products"}
                        target={cta.primary_button_url?.startsWith("http") ? "_blank" : undefined}
                        rel={cta.primary_button_url?.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-6 py-3.5 text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span>{cta.primary_button_label}</span>
                        <ArrowRight className="size-4" />
                      </Link>
                    )}

                    {cta.secondary_button_label && (
                      <Link
                        href={cta.secondary_button_url || "/products"}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/25 px-5 py-3.5 text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span>{cta.secondary_button_label}</span>
                      </Link>
                    )}
                  </div>

                  {/* Direct Contact Bar (Subtle & clean at bottom) */}
                  {(cta.contact_whatsapp || cta.contact_phone || cta.contact_address) && (
                    <div className="mt-8 pt-5 border-t border-white/15 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-blue-100/90">
                      {cta.contact_whatsapp && (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-400" />
                          <span>WA:</span>
                          <a
                            href={`https://wa.me/${cta.contact_whatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-white hover:underline"
                          >
                            {cta.contact_whatsapp}
                          </a>
                        </div>
                      )}
                      {cta.contact_phone && (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-blue-300" />
                          <span>Telp:</span>
                          <a
                            href={`tel:${cta.contact_phone}`}
                            className="font-semibold text-white hover:underline"
                          >
                            {cta.contact_phone}
                          </a>
                        </div>
                      )}
                      {cta.contact_address && (
                        <div className="inline-flex items-center gap-1.5 text-white/80">
                          <MapPin className="size-3 text-rose-300 shrink-0" />
                          <span className="truncate max-w-[240px] sm:max-w-[320px]">{cta.contact_address}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {section_order.map((sectionKey) => renderSection(sectionKey))}
    </div>
  );
}

