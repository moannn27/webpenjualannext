"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Save,
  RotateCcw,
  ExternalLink,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Layout,
  Layers,
  Settings,
  Sparkles,
  Award,
  ShieldCheck,
  HelpCircle,
  Grid,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  AboutUsContent,
  DEFAULT_ABOUT_US_CONTENT,
  PhotoImageItem,
  PhotoLayoutConfig,
  PhotoLayoutTemplate,
  AspectRatioOption,
  ImageSizeOption,
  RoundedOption,
  ObjectFitOption,
  ObjectPositionOption,
  BorderOption,
  ShadowOption,
  AboutStatItem,
  AboutValueItem,
  AboutBrandItem,
  AboutProcessStep,
  AboutTeamMember,
} from "@/lib/about-us";
import { PhotoLayoutRenderer } from "@/components/shared/PhotoLayoutRenderer";
import { saveAboutUsContentAction } from "@/actions/about";
import { uploadAdminImageAction } from "@/actions/admin";
import { prepareImageUpload } from "@/features/admin/prepare-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AboutUsManagerProps {
  initialContent: AboutUsContent;
}

const SECTION_LABELS: Record<string, { title: string; desc: string }> = {
  hero: { title: "1. Hero / Perkenalan", desc: "Headline utama, tombol CTA, dan foto perkenalan" },
  story: { title: "2. Cerita & Profil", desc: "Cerita toko, visi, misi, dan foto aktivitas" },
  stats: { title: "3. Fakta & Statistik", desc: "Angka pencapaian, pelanggan, dan produk" },
  values: { title: "4. Keunggulan Kami", desc: "Kartu keunggulan, ikon, dan fitur layanan" },
  brands: { title: "5. Brand & Teknologi", desc: "Daftar merek dan prinsipal resmi" },
  process: { title: "6. Alur Pelayanan", desc: "Langkah konsultasi hingga penerimaan produk" },
  team_gallery: { title: "7. Tim & Galeri", desc: "Profil staf dan dokumentasi toko (opsional)" },
  cta: { title: "8. CTA & Kontak", desc: "Banner ajakan belanja dan kontak langsung" },
};

export function AboutUsManager({ initialContent }: AboutUsManagerProps) {
  const [content, setContent] = useState<AboutUsContent>(initialContent);
  const [activeTab, setActiveTab] = useState<string>("structure");
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tab horizontal scroll states and refs
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkTabsScroll = React.useCallback(() => {
    if (!tabsRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  React.useEffect(() => {
    checkTabsScroll();
    const handleResize = () => checkTabsScroll();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [checkTabsScroll]);

  const scrollTabs = (direction: "left" | "right") => {
    if (!tabsRef.current) return;
    const distance = 280;
    tabsRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
    setTimeout(checkTabsScroll, 320);
  };

  // Helper to update specific fields
  const updateContent = <K extends keyof AboutUsContent>(key: K, value: AboutUsContent[K]) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setStatusMessage(null);
    startTransition(async () => {
      try {
        const res = await saveAboutUsContentAction(content);
        if (res.success) {
          setContent(res.data);
          setStatusMessage({ type: "success", text: res.message });
          setTimeout(() => setStatusMessage(null), 5000);
        }
      } catch (err) {
        setStatusMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Gagal menyimpan perubahan.",
        });
      }
    });
  };

  const handleResetToDefault = () => {
    if (window.confirm("Apakah Anda yakin ingin mengembalikan semua konten Tentang Kami ke setelan awal default Next Solution Store?")) {
      setContent(DEFAULT_ABOUT_US_CONTENT);
      setStatusMessage({ type: "success", text: "Konten dikembalikan ke default. Klik 'Simpan Perubahan' untuk menerapkan." });
    }
  };

  // Section Ordering Helpers
  const moveSection = (index: number, direction: "up" | "down") => {
    const order = [...content.section_order];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= order.length) return;
    const temp = order[index];
    order[index] = order[targetIndex];
    order[targetIndex] = temp;
    updateContent("section_order", order);
  };

  const toggleSectionVisibility = (key: string) => {
    const current = content.section_visibility[key] !== false;
    updateContent("section_visibility", {
      ...content.section_visibility,
      [key]: !current,
    });
  };

  // Generic Image Upload Handler
  const uploadImageFile = async (file: File): Promise<string> => {
    const prepared = await prepareImageUpload(file);
    const form = new FormData();
    form.set("file", prepared);
    form.set("bucket", "banners");
    const res = await uploadAdminImageAction(form);
    return res.url;
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Top Sticky Header */}
      <div className="sticky top-16 z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#1E2028]/95 backdrop-blur-md p-4 sm:p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Kelola Halaman Tentang Kami (About Us)
            </h1>
            <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 text-xs font-bold text-[#0A4EA3] dark:text-blue-400">
              Live Layout Editor
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Atur teks narasi, angka statistik, brand resmi, alur pelayanan, serta tata letak foto interaktif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/about"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Lihat Halaman Publik</span>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            className="rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset Default
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl bg-[#0A4EA3] hover:bg-[#083D80] text-white font-bold text-xs shadow-md shadow-blue-900/20 px-4 py-2"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-xs sm:text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs underline hover:opacity-80"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tabs Navigation Bar with Slider Controls */}
      <div className="relative flex items-center">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollTabs("left")}
            aria-label="Geser tab ke kiri"
            title="Geser ke kiri"
            className="absolute left-0 z-20 flex h-8 w-8 -translate-x-3 items-center justify-center rounded-full bg-white dark:bg-[#1E2028] border border-slate-200/90 dark:border-white/20 text-slate-700 dark:text-slate-200 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Left Gradient Fade */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-white dark:from-[#1E2028] to-transparent z-10" />
        )}

        {/* Scrollable Tabs Container */}
        <div
          ref={tabsRef}
          onScroll={checkTabsScroll}
          className="flex overflow-x-auto gap-2 pb-2 border-b border-slate-200/80 dark:border-white/10 no-scrollbar scroll-smooth w-full select-none"
        >
          {[
            { id: "structure", label: "Urutan & SEO", icon: Settings },
            { id: "hero", label: "1. Hero Section", icon: Layout },
            { id: "story", label: "2. Cerita & Profil", icon: Layers },
            { id: "stats", label: "3. Fakta & Angka", icon: Award },
            { id: "values", label: "4. Keunggulan", icon: ShieldCheck },
            { id: "brands", label: "5. Brand Mitra", icon: Grid },
            { id: "process", label: "6. Alur Pelayanan", icon: HelpCircle },
            { id: "team_gallery", label: "7. Tim & Galeri", icon: ImageIcon },
            { id: "cta", label: "8. CTA & Kontak", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
                  setActiveTab(tab.id);
                  e.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#0A4EA3] text-white shadow-sm shadow-blue-900/20"
                    : "bg-white dark:bg-[#1E2028] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Gradient Fade */}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-white dark:from-[#1E2028] to-transparent z-10" />
        )}

        {/* Right Scroll Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollTabs("right")}
            aria-label="Geser tab ke kanan"
            title="Geser ke kanan"
            className="absolute right-0 z-20 flex h-8 w-8 translate-x-3 items-center justify-center rounded-full bg-white dark:bg-[#1E2028] border border-slate-200/90 dark:border-white/20 text-slate-700 dark:text-slate-200 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* TAB 1: STRUKTUR SECTION & SEO */}
      {activeTab === "structure" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section Order & Visibility */}
          <div className="lg:col-span-7 space-y-4 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Urutan & Visibilitas Section
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gunakan tombol panah untuk memindahkan urutan tampil di halaman publik. Nonaktifkan jika belum ada data.
              </p>
            </div>

            <div className="space-y-2.5">
              {content.section_order.map((key, idx) => {
                const info = SECTION_LABELS[key] || { title: key, desc: "" };
                const isVisible = content.section_visibility[key] !== false;

                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all ${
                      isVisible
                        ? "border-slate-200/90 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40"
                        : "border-dashed border-slate-300 dark:border-white/5 opacity-50 bg-slate-100/30 dark:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200/70 dark:bg-white/10 text-xs font-black text-slate-700 dark:text-slate-300">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {info.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {info.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSectionVisibility(key)}
                        title={isVisible ? "Sembunyikan section" : "Tampilkan section"}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isVisible
                            ? "border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                            : "border-slate-300 text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>

                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, "up")}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        disabled={idx === content.section_order.length - 1}
                        onClick={() => moveSection(idx, "down")}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SEO & Meta Settings */}
          <div className="lg:col-span-5 space-y-4 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Pengaturan SEO & Meta
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Optimasi tampilan di hasil pencarian Google dan pratinjau tautan media sosial.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Meta Title
                </label>
                <Input
                  value={content.meta_title}
                  onChange={(e) => updateContent("meta_title", e.target.value)}
                  placeholder="Tentang Kami - Next Solution Store"
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={3}
                  value={content.meta_description}
                  onChange={(e) => updateContent("meta_description", e.target.value)}
                  placeholder="Deskripsi singkat untuk snippet Google..."
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent p-3 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0A4EA3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  URL OpenGraph Image (OG Image)
                </label>
                <Input
                  value={content.og_image}
                  onChange={(e) => updateContent("og_image", e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl text-xs sm:text-sm"
                />
                <div className="mt-2 flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors">
                    <ImagePlus className="h-3.5 w-3.5" />
                    <span>Upload Foto OG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const url = await uploadImageFile(file);
                          updateContent("og_image", url);
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "Gagal upload gambar.");
                        }
                      }}
                    />
                  </label>
                  {content.og_image && (
                    <div className="relative h-9 w-14 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10">
                      <Image
                        src={content.og_image}
                        alt="OG Preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HERO SECTION */}
      {activeTab === "hero" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Teks & Tombol Hero
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Badge Atas
                </label>
                <Input
                  value={content.hero.badge}
                  onChange={(e) =>
                    updateContent("hero", { ...content.hero, badge: e.target.value })
                  }
                  placeholder="AUTHORIZED PARTNER & TECH SPECIALIST"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subtitle Brand
                </label>
                <Input
                  value={content.hero.subtitle}
                  onChange={(e) =>
                    updateContent("hero", { ...content.hero, subtitle: e.target.value })
                  }
                  placeholder="Next Solution Store"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Utama (Headline)
                </label>
                <Input
                  value={content.hero.title}
                  onChange={(e) =>
                    updateContent("hero", { ...content.hero, title: e.target.value })
                  }
                  placeholder="Solusi Terpercaya untuk Kebutuhan Laptop & Teknologi Anda"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Paragraf Deskripsi Hero
                </label>
                <textarea
                  rows={3}
                  value={content.hero.description}
                  onChange={(e) =>
                    updateContent("hero", { ...content.hero, description: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent p-3 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0A4EA3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Label Tombol Utama
                </label>
                <Input
                  value={content.hero.primary_button_label}
                  onChange={(e) =>
                    updateContent("hero", {
                      ...content.hero,
                      primary_button_label: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  URL Tujuan Tombol Utama
                </label>
                <Input
                  value={content.hero.primary_button_url}
                  onChange={(e) =>
                    updateContent("hero", {
                      ...content.hero,
                      primary_button_url: e.target.value,
                    })
                  }
                  placeholder="/products"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Label Tombol Sekunder
                </label>
                <Input
                  value={content.hero.secondary_button_label}
                  onChange={(e) =>
                    updateContent("hero", {
                      ...content.hero,
                      secondary_button_label: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  URL Tombol Sekunder (WhatsApp / Info)
                </label>
                <Input
                  value={content.hero.secondary_button_url}
                  onChange={(e) =>
                    updateContent("hero", {
                      ...content.hero,
                      secondary_button_url: e.target.value,
                    })
                  }
                  placeholder="https://wa.me/..."
                />
              </div>
            </div>
          </div>

          {/* Photo Layout Editor for Hero */}
          <PhotoLayoutConfigEditor
            title="Tata Letak & Foto Hero"
            description="Atur gaya tampilan foto hero (Collage asimetris seperti referensi, Split, Banner, atau Carousel)."
            config={content.hero.photo_layout}
            onChange={(newConfig) =>
              updateContent("hero", { ...content.hero, photo_layout: newConfig })
            }
            onUploadImage={uploadImageFile}
            supportPlacement={true}
          />
        </div>
      )}

      {/* TAB 3: STORY & PROFIL */}
      {activeTab === "story" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Cerita & Profil Toko
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tag Kecil Atas
                </label>
                <Input
                  value={content.story.tag}
                  onChange={(e) =>
                    updateContent("story", { ...content.story, tag: e.target.value })
                  }
                  placeholder="CERITA & KOMITMEN KAMI"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Section Cerita
                </label>
                <Input
                  value={content.story.title}
                  onChange={(e) =>
                    updateContent("story", { ...content.story, title: e.target.value })
                  }
                  placeholder="Dedikasi Menghadirkan Solusi Komputasi Terbaik..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Paragraf Narasi (Pisahkan tiap paragraf dengan enter / baris baru)
                </label>
                <textarea
                  rows={6}
                  value={(content.story.story_paragraphs || []).join("\n\n")}
                  onChange={(e) =>
                    updateContent("story", {
                      ...content.story,
                      story_paragraphs: e.target.value.split("\n\n").filter(Boolean),
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent p-3 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0A4EA3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Misi Toko
                </label>
                <textarea
                  rows={2}
                  value={content.story.mission}
                  onChange={(e) =>
                    updateContent("story", { ...content.story, mission: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent p-3 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Visi Toko
                </label>
                <textarea
                  rows={2}
                  value={content.story.vision}
                  onChange={(e) =>
                    updateContent("story", { ...content.story, vision: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent p-3 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Photo Layout Editor for Story */}
          <PhotoLayoutConfigEditor
            title="Tata Letak & Foto Cerita"
            description="Atur foto aktivitas toko, unboxing, atau showroom yang mendampingi teks profil toko."
            config={content.story.photo_layout}
            onChange={(newConfig) =>
              updateContent("story", { ...content.story, photo_layout: newConfig })
            }
            onUploadImage={uploadImageFile}
            supportPlacement={true}
          />
        </div>
      )}

      {/* TAB 4: FAKTA & STATISTIK */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Fakta & Angka Statistik
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Semua angka harus dapat diedit bebas dan sesuai fakta toko. Jangan mengarang data klaim.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const newItem: AboutStatItem = {
                    id: `stat-${Date.now()}`,
                    value: "100",
                    suffix: "+",
                    label: "Statistik Baru",
                    description: "Keterangan singkat statistik",
                    is_active: true,
                  };
                  updateContent("stats", {
                    ...content.stats,
                    items: [...content.stats.items, newItem],
                  });
                }}
                className="rounded-xl bg-[#0A4EA3] text-white text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Statistik
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tag Section
                </label>
                <Input
                  value={content.stats.tag}
                  onChange={(e) =>
                    updateContent("stats", { ...content.stats, tag: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Section
                </label>
                <Input
                  value={content.stats.title}
                  onChange={(e) =>
                    updateContent("stats", { ...content.stats, title: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/80 dark:border-white/10">
              {content.stats.items.map((stat, idx) => (
                <div
                  key={stat.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0A4EA3] dark:text-blue-400">
                      Item #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = content.stats.items.map((it) =>
                            it.id === stat.id ? { ...it, is_active: !it.is_active } : it
                          );
                          updateContent("stats", { ...content.stats, items: updated });
                        }}
                        className={`p-1 rounded-md text-xs font-semibold ${
                          stat.is_active
                            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                            : "text-slate-400 bg-slate-100 dark:bg-white/5"
                        }`}
                      >
                        {stat.is_active ? "Aktif" : "Nonaktif"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Hapus statistik "${stat.label}"?`)) {
                            const updated = content.stats.items.filter((it) => it.id !== stat.id);
                            updateContent("stats", { ...content.stats, items: updated });
                          }
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Nilai Angka
                      </label>
                      <Input
                        value={stat.value}
                        onChange={(e) => {
                          const updated = content.stats.items.map((it) =>
                            it.id === stat.id ? { ...it, value: e.target.value } : it
                          );
                          updateContent("stats", { ...content.stats, items: updated });
                        }}
                        placeholder="10.000"
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Suffix (+, %, Th)
                      </label>
                      <Input
                        value={stat.suffix || ""}
                        onChange={(e) => {
                          const updated = content.stats.items.map((it) =>
                            it.id === stat.id ? { ...it, suffix: e.target.value } : it
                          );
                          updateContent("stats", { ...content.stats, items: updated });
                        }}
                        placeholder="+"
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Label Statistik
                    </label>
                    <Input
                      value={stat.label}
                      onChange={(e) => {
                        const updated = content.stats.items.map((it) =>
                          it.id === stat.id ? { ...it, label: e.target.value } : it
                        );
                        updateContent("stats", { ...content.stats, items: updated });
                      }}
                      placeholder="Laptop Terjual"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Deskripsi Penjelas
                    </label>
                    <Input
                      value={stat.description}
                      onChange={(e) => {
                        const updated = content.stats.items.map((it) =>
                          it.id === stat.id ? { ...it, description: e.target.value } : it
                        );
                        updateContent("stats", { ...content.stats, items: updated });
                      }}
                      placeholder="Keterangan singkat..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: KEUNGGULAN KAMI */}
      {activeTab === "values" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Keunggulan Kami (Value Propositions)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Kartu berisi ikon, judul, deskripsi, dan badge keunggulan kompetitif Next Solution Store.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const newItem: AboutValueItem = {
                    id: `val-${Date.now()}`,
                    title: "Keunggulan Baru",
                    description: "Penjelasan keunggulan layanan atau produk toko.",
                    icon: "ShieldCheck",
                    badge: "Fitur Unggulan",
                    is_active: true,
                  };
                  updateContent("values", {
                    ...content.values,
                    items: [...content.values.items, newItem],
                  });
                }}
                className="rounded-xl bg-[#0A4EA3] text-white text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Keunggulan
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tag Section
                </label>
                <Input
                  value={content.values.tag}
                  onChange={(e) =>
                    updateContent("values", { ...content.values, tag: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Section
                </label>
                <Input
                  value={content.values.title}
                  onChange={(e) =>
                    updateContent("values", { ...content.values, title: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 dark:border-white/10">
              {content.values.items.map((val) => (
                <div
                  key={val.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0A4EA3] dark:text-blue-400">
                      {val.icon || "ShieldCheck"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = content.values.items.map((it) =>
                            it.id === val.id ? { ...it, is_active: !it.is_active } : it
                          );
                          updateContent("values", { ...content.values, items: updated });
                        }}
                        className={`p-1 rounded-md text-xs font-semibold ${
                          val.is_active
                            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                            : "text-slate-400 bg-slate-100 dark:bg-white/5"
                        }`}
                      >
                        {val.is_active ? "Aktif" : "Nonaktif"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Hapus keunggulan "${val.title}"?`)) {
                            const updated = content.values.items.filter((it) => it.id !== val.id);
                            updateContent("values", { ...content.values, items: updated });
                          }
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Nama / Judul Keunggulan
                    </label>
                    <Input
                      value={val.title}
                      onChange={(e) => {
                        const updated = content.values.items.map((it) =>
                          it.id === val.id ? { ...it, title: e.target.value } : it
                        );
                        updateContent("values", { ...content.values, items: updated });
                      }}
                      className="h-8 text-xs font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Ikon (Lucide)
                      </label>
                      <select
                        value={val.icon}
                        onChange={(e) => {
                          const updated = content.values.items.map((it) =>
                            it.id === val.id ? { ...it, icon: e.target.value } : it
                          );
                          updateContent("values", { ...content.values, items: updated });
                        }}
                        className="w-full h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2"
                      >
                        <option value="ShieldCheck">ShieldCheck (Garansi)</option>
                        <option value="Award">Award (Penghargaan)</option>
                        <option value="Zap">Zap (Cepat)</option>
                        <option value="Laptop">Laptop (Spesialis)</option>
                        <option value="Headphones">Headphones (Konsultasi)</option>
                        <option value="PackageCheck">PackageCheck (QC)</option>
                        <option value="Truck">Truck (Kirim Aman)</option>
                        <option value="Clock">Clock (Responsif)</option>
                        <option value="ThumbsUp">ThumbsUp (Terpercaya)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Badge Kecil (Opsional)
                      </label>
                      <Input
                        value={val.badge || ""}
                        onChange={(e) => {
                          const updated = content.values.items.map((it) =>
                            it.id === val.id ? { ...it, badge: e.target.value } : it
                          );
                          updateContent("values", { ...content.values, items: updated });
                        }}
                        placeholder="Resmi"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Deskripsi
                    </label>
                    <textarea
                      rows={2}
                      value={val.description}
                      onChange={(e) => {
                        const updated = content.values.items.map((it) =>
                          it.id === val.id ? { ...it, description: e.target.value } : it
                        );
                        updateContent("values", { ...content.values, items: updated });
                      }}
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-2 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BRAND & TEKNOLOGI */}
      {activeTab === "brands" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Brand & Prinsipal Teknologi Resmi
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daftar merek resmi laptop dan komponen teknologi yang dijual di Next Solution Store.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const newItem: AboutBrandItem = {
                    id: `brand-${Date.now()}`,
                    name: "Brand Baru",
                    category: "Laptop & PC",
                    description: "Mitra resmi bergaransi Indonesia",
                    is_active: true,
                  };
                  updateContent("brands", {
                    ...content.brands,
                    items: [...content.brands.items, newItem],
                  });
                }}
                className="rounded-xl bg-[#0A4EA3] text-white text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Brand
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tag Section
                </label>
                <Input
                  value={content.brands.tag}
                  onChange={(e) =>
                    updateContent("brands", { ...content.brands, tag: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Section
                </label>
                <Input
                  value={content.brands.title}
                  onChange={(e) =>
                    updateContent("brands", { ...content.brands, title: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200/80 dark:border-white/10">
              {content.brands.items.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {b.name || "Brand"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Hapus brand "${b.name}"?`)) {
                          const updated = content.brands.items.filter((it) => it.id !== b.id);
                          updateContent("brands", { ...content.brands, items: updated });
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Nama Brand
                    </label>
                    <Input
                      value={b.name}
                      onChange={(e) => {
                        const updated = content.brands.items.map((it) =>
                          it.id === b.id ? { ...it, name: e.target.value } : it
                        );
                        updateContent("brands", { ...content.brands, items: updated });
                      }}
                      className="h-8 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Kategori Produk Brand
                    </label>
                    <Input
                      value={b.category}
                      onChange={(e) => {
                        const updated = content.brands.items.map((it) =>
                          it.id === b.id ? { ...it, category: e.target.value } : it
                        );
                        updateContent("brands", { ...content.brands, items: updated });
                      }}
                      placeholder="Laptop Bisnis & Gaming"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      URL Logo (Opsional)
                    </label>
                    <Input
                      value={b.logo_url || ""}
                      onChange={(e) => {
                        const updated = content.brands.items.map((it) =>
                          it.id === b.id ? { ...it, logo_url: e.target.value } : it
                        );
                        updateContent("brands", { ...content.brands, items: updated });
                      }}
                      placeholder="https://..."
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Keterangan Ringkas
                    </label>
                    <Input
                      value={b.description || ""}
                      onChange={(e) => {
                        const updated = content.brands.items.map((it) =>
                          it.id === b.id ? { ...it, description: e.target.value } : it
                        );
                        updateContent("brands", { ...content.brands, items: updated });
                      }}
                      placeholder="Official distributor..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ALUR PELAYANAN */}
      {activeTab === "process" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Alur Pelayanan / Proses Pembelian
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Langkah-langkah membantu pelanggan memilih dan membeli produk hingga purna jual.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const idx = content.process.steps.length + 1;
                  const newStep: AboutProcessStep = {
                    id: `step-${Date.now()}`,
                    step_number: `0${idx}`,
                    title: `Langkah ${idx}`,
                    description: "Penjelasan tahapan proses.",
                    icon: "CheckCircle",
                    is_active: true,
                  };
                  updateContent("process", {
                    ...content.process,
                    steps: [...content.process.steps, newStep],
                  });
                }}
                className="rounded-xl bg-[#0A4EA3] text-white text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Langkah
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tag Section
                </label>
                <Input
                  value={content.process.tag}
                  onChange={(e) =>
                    updateContent("process", { ...content.process, tag: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Section
                </label>
                <Input
                  value={content.process.title}
                  onChange={(e) =>
                    updateContent("process", { ...content.process, title: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 dark:border-white/10">
              {content.process.steps.map((st, i) => (
                <div
                  key={st.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-[#0A4EA3] dark:text-blue-400">
                      Step {st.step_number || `0${i + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Hapus langkah "${st.title}"?`)) {
                          const updated = content.process.steps.filter((it) => it.id !== st.id);
                          updateContent("process", { ...content.process, steps: updated });
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        No. Step
                      </label>
                      <Input
                        value={st.step_number}
                        onChange={(e) => {
                          const updated = content.process.steps.map((it) =>
                            it.id === st.id ? { ...it, step_number: e.target.value } : it
                          );
                          updateContent("process", { ...content.process, steps: updated });
                        }}
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Judul Langkah
                      </label>
                      <Input
                        value={st.title}
                        onChange={(e) => {
                          const updated = content.process.steps.map((it) =>
                            it.id === st.id ? { ...it, title: e.target.value } : it
                          );
                          updateContent("process", { ...content.process, steps: updated });
                        }}
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Deskripsi Langkah
                    </label>
                    <textarea
                      rows={2}
                      value={st.description}
                      onChange={(e) => {
                        const updated = content.process.steps.map((it) =>
                          it.id === st.id ? { ...it, description: e.target.value } : it
                        );
                        updateContent("process", { ...content.process, steps: updated });
                      }}
                      className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-2 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: TIM & GALERI TOKO */}
      {activeTab === "team_gallery" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Tim & Aktivitas Toko
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Section ini bersifat opsional dan dapat disembunyikan jika materi staf belum lengkap.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateContent("team_gallery", {
                      ...content.team_gallery,
                      is_active: !content.team_gallery.is_active,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    content.team_gallery.is_active
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300"
                      : "bg-slate-100 dark:bg-white/5 text-slate-500 border-slate-300"
                  }`}
                >
                  {content.team_gallery.is_active ? "Status: Ditampilkan" : "Status: Disembunyikan"}
                </button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const newMember: AboutTeamMember = {
                      id: `member-${Date.now()}`,
                      name: "Nama Staf",
                      role: "Product Consultant",
                      description: "Membantu rekomendasi spek laptop.",
                      is_active: true,
                    };
                    updateContent("team_gallery", {
                      ...content.team_gallery,
                      members: [...content.team_gallery.members, newMember],
                    });
                  }}
                  className="rounded-xl bg-[#0A4EA3] text-white text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Tambah Staf
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tag Section
                </label>
                <Input
                  value={content.team_gallery.tag}
                  onChange={(e) =>
                    updateContent("team_gallery", {
                      ...content.team_gallery,
                      tag: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Section
                </label>
                <Input
                  value={content.team_gallery.title}
                  onChange={(e) =>
                    updateContent("team_gallery", {
                      ...content.team_gallery,
                      title: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* List of Team Members */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200/80 dark:border-white/10">
              {content.team_gallery.members.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {m.name || "Staf"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Hapus staf "${m.name}"?`)) {
                          const updated = content.team_gallery.members.filter((it) => it.id !== m.id);
                          updateContent("team_gallery", {
                            ...content.team_gallery,
                            members: updated,
                          });
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Nama Lengkap
                    </label>
                    <Input
                      value={m.name}
                      onChange={(e) => {
                        const updated = content.team_gallery.members.map((it) =>
                          it.id === m.id ? { ...it, name: e.target.value } : it
                        );
                        updateContent("team_gallery", {
                          ...content.team_gallery,
                          members: updated,
                        });
                      }}
                      className="h-8 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Jabatan / Peran
                    </label>
                    <Input
                      value={m.role}
                      onChange={(e) => {
                        const updated = content.team_gallery.members.map((it) =>
                          it.id === m.id ? { ...it, role: e.target.value } : it
                        );
                        updateContent("team_gallery", {
                          ...content.team_gallery,
                          members: updated,
                        });
                      }}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Foto Profil Staf (URL atau Upload)
                    </label>
                    <Input
                      value={m.photo_url || ""}
                      onChange={(e) => {
                        const updated = content.team_gallery.members.map((it) =>
                          it.id === m.id ? { ...it, photo_url: e.target.value } : it
                        );
                        updateContent("team_gallery", {
                          ...content.team_gallery,
                          members: updated,
                        });
                      }}
                      placeholder="https://..."
                      className="h-8 text-xs"
                    />
                    <div className="mt-1 flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[#0A4EA3] dark:text-blue-400 hover:underline">
                        <ImagePlus className="h-3 w-3" />
                        <span>Upload Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const url = await uploadImageFile(file);
                              const updated = content.team_gallery.members.map((it) =>
                                it.id === m.id ? { ...it, photo_url: url } : it
                              );
                              updateContent("team_gallery", {
                                ...content.team_gallery,
                                members: updated,
                              });
                            } catch (err) {
                              alert(err instanceof Error ? err.message : "Gagal upload gambar.");
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo Layout Editor for Gallery */}
          <PhotoLayoutConfigEditor
            title="Galeri Foto Aktivitas Toko"
            description="Dokumentasi penyiapan pesanan, showroom toko fisik, atau konsultasi pelanggan."
            config={content.team_gallery.photo_layout}
            onChange={(newConfig) =>
              updateContent("team_gallery", {
                ...content.team_gallery,
                photo_layout: newConfig,
              })
            }
            onUploadImage={uploadImageFile}
            supportPlacement={false}
          />
        </div>
      )}

      {/* TAB 9: CTA & KONTAK */}
      {activeTab === "cta" && (
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Banner Ajakan Bertindak (CTA) & Kontak Langsung
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tag CTA
              </label>
              <Input
                value={content.cta.tag}
                onChange={(e) =>
                  updateContent("cta", { ...content.cta, tag: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Judul Ajakan
              </label>
              <Input
                value={content.cta.title}
                onChange={(e) =>
                  updateContent("cta", { ...content.cta, title: e.target.value })
                }
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Deskripsi
              </label>
              <textarea
                rows={2}
                value={content.cta.description}
                onChange={(e) =>
                  updateContent("cta", { ...content.cta, description: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent p-3 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Label Tombol Utama
              </label>
              <Input
                value={content.cta.primary_button_label}
                onChange={(e) =>
                  updateContent("cta", { ...content.cta, primary_button_label: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                URL Tombol Utama
              </label>
              <Input
                value={content.cta.primary_button_url}
                onChange={(e) =>
                  updateContent("cta", { ...content.cta, primary_button_url: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Label Tombol Sekunder
              </label>
              <Input
                value={content.cta.secondary_button_label}
                onChange={(e) =>
                  updateContent("cta", { ...content.cta, secondary_button_label: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                URL Tombol Sekunder
              </label>
              <Input
                value={content.cta.secondary_button_url}
                onChange={(e) =>
                  updateContent("cta", { ...content.cta, secondary_button_url: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nomor WhatsApp Toko
              </label>
              <Input
                value={content.cta.contact_whatsapp}
                onChange={(e) =>
                  updateContent("cta", { ...content.cta, contact_whatsapp: e.target.value })
                }
                placeholder="+62 812-3456-7890"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Telepon Kantor / CS
              </label>
              <Input
                value={content.cta.contact_phone}
                onChange={(e) =>
                  updateContent("cta", { ...content.cta, contact_phone: e.target.value })
                }
                placeholder="021-1234567"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Email CS
              </label>
              <Input
                value={content.cta.contact_email}
                onChange={(e) =>
                  updateContent("cta", { ...content.cta, contact_email: e.target.value })
                }
                placeholder="support@nextsolution.id"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Lengkap Toko / Showroom
              </label>
              <Input
                value={content.cta.contact_address}
                onChange={(e) =>
                  updateContent("cta", { ...content.cta, contact_address: e.target.value })
                }
                placeholder="Harco Mangga Dua Mall Lt. 2..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =======================================================================
// SUB-COMPONENT: PHOTO LAYOUT CONFIG EDITOR (Fitur Khusus Edit Layout Foto)
// =======================================================================
interface PhotoLayoutConfigEditorProps {
  title: string;
  description: string;
  config: PhotoLayoutConfig;
  onChange: (config: PhotoLayoutConfig) => void;
  onUploadImage: (file: File) => Promise<string>;
  supportPlacement?: boolean;
}

function PhotoLayoutConfigEditor({
  title,
  description,
  config,
  onChange,
  onUploadImage,
  supportPlacement = true,
}: PhotoLayoutConfigEditorProps) {
  const [editingImageId, setEditingImageId] = useState<string | null>(null);

  const updateConfig = (patch: Partial<PhotoLayoutConfig>) => {
    onChange({ ...config, ...patch });
  };

  const addImage = () => {
    const newImg: PhotoImageItem = {
      id: `img-${Date.now()}`,
      url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop",
      alt: "Dokumentasi Next Solution Store",
      aspect_ratio: "landscape",
      size: "full",
      rounded: "2xl",
      object_fit: "cover",
      object_position: "center",
      border: "subtle",
      shadow: "md",
    };
    updateConfig({ images: [...(config.images || []), newImg] });
    setEditingImageId(newImg.id);
  };

  const removeImage = (id: string) => {
    if (window.confirm("Hapus foto ini dari tata letak?")) {
      updateConfig({ images: (config.images || []).filter((img) => img.id !== id) });
      if (editingImageId === id) setEditingImageId(null);
    }
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    const list = [...(config.images || [])];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    updateConfig({ images: list });
  };

  const updateImageField = (id: string, patch: Partial<PhotoImageItem>) => {
    const updated = (config.images || []).map((img) =>
      img.id === id ? { ...img, ...patch } : img
    );
    updateConfig({ images: updated });
  };

  const templates: { id: PhotoLayoutTemplate; label: string; desc: string }[] = [
    { id: "collage", label: "Collage Asimetris", desc: "1 foto besar + 2 foto bertumpuk (Sesuai Referensi)" },
    { id: "split", label: "Split (2 Foto)", desc: "2 foto sejajar berdampingan" },
    { id: "grid", label: "Grid Kolom", desc: "Kisi foto berkolom rapi (2, 3, atau 4)" },
    { id: "banner", label: "Wide Banner", desc: "1 banner lanskap lebar dengan teks" },
    { id: "carousel", label: "Carousel Slider", desc: "Slider foto interaktif dengan navigasi panah" },
    { id: "single", label: "Foto Tunggal", desc: "1 foto tunggal dengan rasio kustom" },
  ];

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
              Template: {config.template}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={addImage}
            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Tambah Foto
          </Button>
        </div>
      </div>

      {/* Template Selector Radio Buttons */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          Pilih Template Tata Letak Foto
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => updateConfig({ template: tpl.id })}
              className={`p-3 rounded-2xl border text-left transition-all ${
                config.template === tpl.id
                  ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 shadow-xs"
                  : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/40 dark:bg-white/5"
              }`}
            >
              <p className="text-xs font-bold leading-tight">{tpl.label}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                {tpl.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Badge & Placement settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Badge Melayang (Teks Utama)
          </label>
          <Input
            value={config.badge_text || ""}
            onChange={(e) => updateConfig({ badge_text: e.target.value })}
            placeholder="⭐ 100% Original BNIB"
            className="h-8 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Badge Melayang (Subteks)
          </label>
          <Input
            value={config.badge_subtext || ""}
            onChange={(e) => updateConfig({ badge_subtext: e.target.value })}
            placeholder="Garansi Resmi Prinsipal"
            className="h-8 text-xs"
          />
        </div>

        {supportPlacement && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Posisi Sisi Foto (Layar Besar)
            </label>
            <select
              value={config.placement || "right"}
              onChange={(e) => updateConfig({ placement: e.target.value as "left" | "right" })}
              className="w-full h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2"
            >
              <option value="right">Foto di Kanan, Teks di Kiri (Default)</option>
              <option value="left">Foto di Kiri, Teks di Kanan</option>
            </select>
          </div>
        )}

        {config.template === "grid" && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Jumlah Kolom Grid
            </label>
            <select
              value={config.columns || 3}
              onChange={(e) =>
                updateConfig({ columns: Number(e.target.value) as 2 | 3 | 4 })
              }
              className="w-full h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2"
            >
              <option value={2}>2 Kolom</option>
              <option value={3}>3 Kolom</option>
              <option value={4}>4 Kolom</option>
            </select>
          </div>
        )}
      </div>

      {/* LIVE INTERACTIVE PREVIEW */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            Pratinjau Langsung (Live Preview)
          </label>
          <span className="text-[11px] text-slate-400">
            {config.images?.length || 0} foto terpasang
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-slate-950 p-4 sm:p-6 overflow-hidden">
          <PhotoLayoutRenderer config={config} isPreview={true} />
        </div>
      </div>

      {/* INDIVIDUAL IMAGE CONTROLS */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Daftar Foto & Pengaturan Tampilan Per Foto
        </label>

        {(config.images || []).map((img, idx) => {
          const isEditing = editingImageId === img.id;

          return (
            <div
              key={img.id}
              className={`rounded-2xl border transition-all ${
                isEditing
                  ? "border-purple-500 bg-purple-50/20 dark:bg-purple-950/20 shadow-xs"
                  : "border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900"
              } p-4 space-y-4`}
            >
              {/* Image Summary Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative h-12 w-16 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 shrink-0">
                    <Image
                      src={img.url}
                      alt={img.alt || "Thumb"}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      Foto #{idx + 1}: {img.alt || "Tanpa alt text"}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      Rasio: {img.aspect_ratio || "auto"} | Sudut: {img.rounded || "2xl"} | Ukuran:{" "}
                      {img.size || "full"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingImageId(isEditing ? null : img.id)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    {isEditing ? "Tutup" : "Atur Bentuk"}
                  </button>

                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveImage(idx, "up")}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={idx === (config.images || []).length - 1}
                    onClick={() => moveImage(idx, "down")}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expandable Image Settings Form */}
              {isEditing && (
                <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* URL & Upload */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1">URL Gambar (HTTPS atau Upload)</label>
                    <Input
                      value={img.url}
                      onChange={(e) => updateImageField(img.id, { url: e.target.value })}
                      placeholder="https://..."
                      className="h-8 text-xs"
                    />
                    <div className="mt-1 flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors">
                        <ImagePlus className="h-3 w-3" />
                        <span>Upload File Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const url = await onUploadImage(file);
                              updateImageField(img.id, { url });
                            } catch (err) {
                              alert(err instanceof Error ? err.message : "Gagal upload gambar.");
                            }
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">WebP, PNG, JPG otomatis dikompres</span>
                    </div>
                  </div>

                  {/* Alt Text */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1">Alt Text (SEO & Aksesibilitas)</label>
                    <Input
                      value={img.alt}
                      onChange={(e) => updateImageField(img.id, { alt: e.target.value })}
                      placeholder="Deskripsi foto untuk Google & screen reader"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="block font-semibold mb-1">Rasio Foto</label>
                    <select
                      value={img.aspect_ratio || "landscape"}
                      onChange={(e) =>
                        updateImageField(img.id, {
                          aspect_ratio: e.target.value as AspectRatioOption,
                        })
                      }
                      className="w-full h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2"
                    >
                      <option value="square">Square (1:1)</option>
                      <option value="landscape">Landscape (16:10)</option>
                      <option value="portrait">Portrait (3:4)</option>
                      <option value="tall">Tall / Vertikal (9:16)</option>
                      <option value="wide">Wide Banner (21:9)</option>
                      <option value="auto">Auto (Bebas)</option>
                    </select>
                  </div>

                  {/* Size */}
                  <div>
                    <label className="block font-semibold mb-1">Ukuran Foto</label>
                    <select
                      value={img.size || "full"}
                      onChange={(e) =>
                        updateImageField(img.id, {
                          size: e.target.value as ImageSizeOption,
                        })
                      }
                      className="w-full h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2"
                    >
                      <option value="full">Lebar Penuh (100%)</option>
                      <option value="large">Besar (640px)</option>
                      <option value="medium">Sedang (440px)</option>
                      <option value="small">Kecil (260px)</option>
                    </select>
                  </div>

                  {/* Rounded */}
                  <div>
                    <label className="block font-semibold mb-1">Bentuk Sudut (Radius)</label>
                    <select
                      value={img.rounded || "2xl"}
                      onChange={(e) =>
                        updateImageField(img.id, {
                          rounded: e.target.value as RoundedOption,
                        })
                      }
                      className="w-full h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2"
                    >
                      <option value="none">Kotak Tajam (None)</option>
                      <option value="md">Sedikit Rounded (md)</option>
                      <option value="xl">Rounded (xl)</option>
                      <option value="2xl">Sangat Rounded (2xl)</option>
                      <option value="3xl">Kapsul Rounded (3xl)</option>
                      <option value="full">Lingkaran Penuh (Circle)</option>
                    </select>
                  </div>

                  {/* Object Fit */}
                  <div>
                    <label className="block font-semibold mb-1">Image Fit</label>
                    <select
                      value={img.object_fit || "cover"}
                      onChange={(e) =>
                        updateImageField(img.id, {
                          object_fit: e.target.value as ObjectFitOption,
                        })
                      }
                      className="w-full h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2"
                    >
                      <option value="cover">Cover (Penuh crop rapi)</option>
                      <option value="contain">Contain (Utuh tanpa crop)</option>
                    </select>
                  </div>

                  {/* Object Position */}
                  <div>
                    <label className="block font-semibold mb-1">Fokus Posisi Foto</label>
                    <select
                      value={img.object_position || "center"}
                      onChange={(e) =>
                        updateImageField(img.id, {
                          object_position: e.target.value as ObjectPositionOption,
                        })
                      }
                      className="w-full h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2"
                    >
                      <option value="center">Center (Tengah)</option>
                      <option value="top">Top (Atas)</option>
                      <option value="bottom">Bottom (Bawah)</option>
                      <option value="left">Left (Kiri)</option>
                      <option value="right">Right (Kanan)</option>
                    </select>
                  </div>

                  {/* Border */}
                  <div>
                    <label className="block font-semibold mb-1">Garis Tepi (Border)</label>
                    <select
                      value={img.border || "subtle"}
                      onChange={(e) =>
                        updateImageField(img.id, {
                          border: e.target.value as BorderOption,
                        })
                      }
                      className="w-full h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2"
                    >
                      <option value="none">Tanpa Border</option>
                      <option value="subtle">Border Halus Abu</option>
                      <option value="accent">Border Aksen Biru</option>
                      <option value="white">Frame Putih Kontras</option>
                    </select>
                  </div>

                  {/* Shadow */}
                  <div>
                    <label className="block font-semibold mb-1">Efek Bayangan (Shadow)</label>
                    <select
                      value={img.shadow || "md"}
                      onChange={(e) =>
                        updateImageField(img.id, {
                          shadow: e.target.value as ShadowOption,
                        })
                      }
                      className="w-full h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs px-2"
                    >
                      <option value="none">Tanpa Bayangan</option>
                      <option value="sm">Halus (sm)</option>
                      <option value="md">Sedang (md)</option>
                      <option value="lg">Tegas (lg)</option>
                      <option value="xl">Mewah / Floating (xl)</option>
                    </select>
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="block font-semibold mb-1">Keterangan Foto (Caption)</label>
                    <Input
                      value={img.caption || ""}
                      onChange={(e) => updateImageField(img.id, { caption: e.target.value })}
                      placeholder="Keterangan teks di bawah foto..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

