"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Award,
  CheckCircle,
  Clock,
  Headphones,
  HeartHandshake,
  Laptop,
  Mail,
  MapPin,
  MessageSquare,
  PackageCheck,
  Phone,
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {activeStats.map((item) => (
                  <div
                    key={item.id}
                    className="relative rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 text-center shadow-xs hover:shadow-md transition-all hover:-translate-y-1"
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

      // 4. VALUES / KEUNGGULAN SECTION
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
              <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {activeValues.map((val) => (
                  <div
                    key={val.id}
                    className="group relative rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-6 sm:p-7 shadow-xs hover:shadow-xl hover:border-blue-500/40 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-[#0A4EA3] dark:text-blue-400 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-[#0A4EA3] group-hover:text-white transition-all duration-300">
                          {renderDynamicIcon(val.icon, "h-6 w-6")}
                        </div>
                        {val.badge && (
                          <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {val.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-[#0A4EA3] dark:group-hover:text-blue-400 transition-colors">
                        {val.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {val.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      // 5. BRANDS & TECHNOLOGY SECTION
      case "brands": {
        if (!brands || !brands.items || brands.items.length === 0) return null;
        const activeBrands = brands.items.filter((item) => item.is_active !== false);
        if (activeBrands.length === 0) return null;

        return (
          <section
            key="brands"
            aria-label="Brand & Merek Mitra Resmi"
            className="py-16 sm:py-20 bg-[#F8F9FA]/60 dark:bg-slate-950/40 border-b border-slate-200/70 dark:border-white/5"
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

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {activeBrands.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all hover:scale-[1.01]"
                  >
                    <div>
                      {b.logo_url && (
                        <div className="relative h-10 w-28 mb-3">
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
                      <p className="text-xs font-medium text-[#0A4EA3] dark:text-blue-400 mt-0.5">
                        {b.category}
                      </p>
                    </div>
                    {b.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 leading-snug">
                        {b.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      // 6. PROCESS / LAYANAN SECTION
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
              <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
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

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-6 relative">
                {activeSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all hover:-translate-y-1"
                  >
                    <div>
                      {/* Step number badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black tracking-wider uppercase px-2.5 py-1 rounded-md bg-[#0A4EA3]/10 dark:bg-blue-400/10 text-[#0A4EA3] dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50">
                          {step.step_number || `0${idx + 1}`}
                        </span>
                        <div className="text-slate-400 dark:text-slate-500">
                          {renderDynamicIcon(step.icon, "h-5 w-5")}
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                        {step.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
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

              {/* Team Members List */}
              {members.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-5 text-center shadow-xs hover:shadow-md transition-all hover:scale-[1.02]"
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

      // 8. CTA SECTION
      case "cta": {
        if (!cta) return null;

        return (
          <section
            key="cta"
            aria-label="Hubungi Kami & Konsultasi"
            className="py-16 sm:py-24"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A4EA3] via-[#0D5BBF] to-[#1E3A8A] text-white p-8 sm:p-12 lg:p-16 shadow-2xl">
                {/* Decorative background glows */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-8">
                    {cta.tag && (
                      <span className="inline-block rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-bold tracking-wider uppercase text-blue-100 mb-3 border border-white/20">
                        {cta.tag}
                      </span>
                    )}
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white mb-4 leading-tight">
                      {cta.title}
                    </h2>
                    <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-2xl mb-8">
                      {cta.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      {cta.primary_button_label && (
                        <Link
                          href={cta.primary_button_url || "/products"}
                          target={cta.primary_button_url?.startsWith("http") ? "_blank" : undefined}
                          rel={cta.primary_button_url?.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#0A4EA3] hover:bg-blue-50 px-6 py-3.5 text-sm sm:text-base font-bold shadow-lg transition-all hover:scale-[1.02]"
                        >
                          <span>{cta.primary_button_label}</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}

                      {cta.secondary_button_label && (
                        <Link
                          href={cta.secondary_button_url || "/products"}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-sm px-6 py-3.5 text-sm sm:text-base font-semibold transition-all hover:scale-[1.02]"
                        >
                          <span>{cta.secondary_button_label}</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Direct Contact Info Box */}
                  <div className="lg:col-span-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5 sm:p-6 text-xs sm:text-sm space-y-3.5">
                    <p className="text-xs uppercase tracking-wider text-blue-200 font-bold mb-1">
                      Kontak Langsung
                    </p>

                    {cta.contact_whatsapp && (
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] text-blue-200">WhatsApp Resmi</p>
                          <a
                            href={`https://wa.me/${cta.contact_whatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-white hover:underline"
                          >
                            {cta.contact_whatsapp}
                          </a>
                        </div>
                      </div>
                    )}

                    {cta.contact_phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-4 w-4 text-blue-200 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] text-blue-200">Telepon Toko</p>
                          <a
                            href={`tel:${cta.contact_phone}`}
                            className="font-semibold text-white hover:underline"
                          >
                            {cta.contact_phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {cta.contact_email && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-4 w-4 text-blue-200 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] text-blue-200">Email Layanan</p>
                          <a
                            href={`mailto:${cta.contact_email}`}
                            className="font-semibold text-white hover:underline break-all"
                          >
                            {cta.contact_email}
                          </a>
                        </div>
                      </div>
                    )}

                    {cta.contact_address && (
                      <div className="flex items-start gap-3 pt-1 border-t border-white/15">
                        <MapPin className="h-4 w-4 text-rose-300 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] text-blue-200">Alamat Toko</p>
                          <p className="font-medium text-white/95 text-xs leading-snug">
                            {cta.contact_address}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
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

