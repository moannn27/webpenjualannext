import React from "react";
import Link from "next/link";
import { ArrowRight, MessagesSquare, CheckCircle2 } from "lucide-react";
import type { AboutUsContent } from "@/lib/about-us";
import { PhotoLayoutRenderer } from "@/components/shared/PhotoLayoutRenderer";

interface AboutUsSectionProps {
  content: AboutUsContent;
  storeWhatsApp?: string;
  className?: string;
}

export function AboutUsSection({ content, storeWhatsApp, className = "" }: AboutUsSectionProps) {
  // If explicitly hidden via section_visibility or essential content missing
  if (content.section_visibility?.homepage === false) {
    return null;
  }

  const { hero, story, stats } = content;
  if (!hero && !story) return null;

  const badge = hero?.badge || "TENTANG NEXT SOLUTION STORE";
  const title = story?.title || hero?.title || "Solusi Terpercaya untuk Kebutuhan Laptop & Teknologi Anda";
  const subtitle = hero?.subtitle || "Next Solution Store";
  const description =
    story?.story_paragraphs?.[0] ||
    hero?.description ||
    "Next Solution Store menyediakan laptop bisnis, gaming, PC all-in-one, dan perangkat komputasi 100% original bergaransi resmi dengan konsultasi spesifikasi jujur dan layanan purna jual andal.";

  const configuredPhotoLayout = hero?.photo_layout || story?.photo_layout;
  const photoClaims = [configuredPhotoLayout?.badge_text, configuredPhotoLayout?.badge_subtext]
    .map((claim) => claim?.replace(/^[\s⭐✨🌟★☆]+/u, "").trim())
    .filter((claim): claim is string => Boolean(claim));
  const photoLayout = configuredPhotoLayout
    ? { ...configuredPhotoLayout, badge_text: undefined, badge_subtext: undefined }
    : null;
  const activeStats = (stats?.items || []).filter((s) => s.is_active).slice(0, 4);
  const coreValues = (story?.core_values || []).slice(0, 3);

  // Single source of truth for WhatsApp URL
  const cleanPhone = (storeWhatsApp || "628112238310").replace(/\D/g, "");
  const waConsultationUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Halo Next Solution, saya ingin konsultasi pilihan laptop.")}`;
  const secondaryUrl = (hero?.secondary_button_url && !hero.secondary_button_url.includes("wa.me"))
    ? hero.secondary_button_url
    : waConsultationUrl;
  const secondaryLabel = hero?.secondary_button_label || "Konsultasi WhatsApp";

  return (
    <section
      aria-label="Tentang Kami - Next Solution Store"
      className={`container mx-auto px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2028] p-6 sm:p-8 lg:p-12 shadow-sm border border-slate-100 dark:border-white/5 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Text & Content Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            {badge && (
              <p className="mb-3 self-start text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {badge}
              </p>
            )}

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.2] mb-3">
              {title}
            </h2>

            {subtitle && (
              <p className="text-base sm:text-lg font-bold text-[#0A4EA3] dark:text-blue-400 mb-4">
                {subtitle}
              </p>
            )}

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              {description}
            </p>

            {/* Value Highlights or Quick Stats */}
            {activeStats.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 mb-6 border-y border-slate-200/80 dark:border-white/10">
                {activeStats.map((stat) => (
                  <div key={stat.id} className="flex flex-col">
                    <span className="text-xl sm:text-2xl font-black text-[#0A4EA3] dark:text-blue-400 tracking-tight">
                      {stat.value}
                      {stat.suffix && <span className="text-base font-bold">{stat.suffix}</span>}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : coreValues.length > 0 ? (
              <div className="space-y-2.5 mb-6">
                {coreValues.map((cv) => (
                  <div key={cv.id} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {cv.title}:{" "}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        {cv.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4EA3] hover:bg-[#083D80] text-white px-5 py-3 text-sm font-semibold shadow-md shadow-blue-900/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Tentang Kami Selengkapnya</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              {secondaryUrl && (
                <Link
                  href={secondaryUrl}
                  target={secondaryUrl.startsWith("http") ? "_blank" : undefined}
                  rel={secondaryUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 px-5 py-3 text-sm font-semibold shadow-xs transition-all hover:scale-[1.02]"
                >
                  <MessagesSquare className="h-4 w-4 text-[#0A4EA3] dark:text-blue-400" />
                  <span>{secondaryLabel}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Photo Layout Column */}
          {photoLayout && (
            <div className="lg:col-span-6">
              <PhotoLayoutRenderer config={photoLayout} />
              {photoClaims.length > 0 && (
                <p className="mt-3 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {photoClaims.join(" · ")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
