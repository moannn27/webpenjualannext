"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Edit,
  ImagePlus,
  Plus,
  Trash,
  Layers,
  Sparkles,
  ExternalLink,
  HelpCircle,
  Eye,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteLandingBannerAction,
  saveLandingBannerAction,
  uploadAdminImageAction,
} from "@/actions/admin";
import { prepareImageUpload } from "@/features/admin/prepare-image-upload";

type Banner = {
  id: string;
  placement: "hero" | "promo";
  title: string;
  subtitle: string | null;
  headline: string;
  description: string;
  button_label: string;
  image_url: string;
  target_url: string | null;
  display_order: number;
  is_active: boolean;
};

type Draft = Omit<Banner, "id"> & { id?: string };

const emptyDraft = (placement: "hero" | "promo"): Draft => ({
  id: undefined,
  placement,
  title: "",
  subtitle: "",
  headline: "",
  description: "",
  button_label: "Lihat produk",
  image_url: "",
  target_url: "/products",
  display_order: 0,
  is_active: true,
});

const PRESET_URLS = [
  { label: "🛍️ Semua Produk", url: "/products", defaultBtn: "Lihat Semua Produk" },
  { label: "💻 Laptop", url: "/products?category=laptops", defaultBtn: "Beli Laptop" },
  { label: "🖥️ Komputer PC", url: "/products?category=pc", defaultBtn: "Lihat PC Desktop" },
  { label: "🏷️ Promo & Voucher", url: "/promo", defaultBtn: "Cek Promo Sekarang" },
  { label: "🏠 Beranda (Home)", url: "/", defaultBtn: "Mulai Belanja" },
];

export function LandingContentManager({ initialBanners }: { initialBanners: Banner[] }) {
  const banners = initialBanners;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!draft) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setDraft(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [draft, busy]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const save = () => {
    if (!draft) return;
    const form = new FormData();
    for (const [key, value] of Object.entries(draft)) {
      if (value !== undefined && value !== null) form.set(key, String(value));
    }
    if (draft.is_active) form.set("is_active", "on");
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        await saveLandingBannerAction(form);
        setNotice("Konten berhasil disimpan.");
        setDraft(null);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Konten gagal disimpan.");
      }
    });
  };

  const upload = async (file: File) => {
    const form = new FormData();
    form.set("file", await prepareImageUpload(file));
    form.set("bucket", "banners");
    setError("");
    try {
      const result = await uploadAdminImageAction(form);
      update("image_url", result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload gambar gagal.");
    }
  };

  const remove = (banner: Banner) => {
    if (!window.confirm(`Hapus konten “${banner.title}”?`)) return;
    startTransition(async () => {
      try {
        await deleteLandingBannerAction(banner.id);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Konten gagal dihapus.");
      }
    });
  };

  const sections: {
    key: "hero" | "promo";
    title: string;
    description: string;
    icon: typeof Layers;
    badge: string;
  }[] = [
    {
      key: "hero",
      title: "Carousel Utama (Hero Slider)",
      description:
        "Banner geser (slider) besar di bagian paling atas halaman utama. Ini yang pertama kali dilihat pengunjung saat membuka website.",
      icon: Layers,
      badge: "Bagian Paling Atas (Header Home)",
    },
    {
      key: "promo",
      title: "Banner Promo Khusus (Mid-Page)",
      description:
        "Banner penawaran atau diskon yang muncul di tengah-tengah halaman beranda di antara daftar produk laptop & PC.",
      icon: Sparkles,
      badge: "Bagian Tengah Beranda",
    },
  ];

  return (
    <div className="space-y-10">
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm font-medium text-green-700 dark:text-green-400">
          {notice}
        </p>
      )}

      {sections.map((section) => {
        const SectionIcon = section.icon;
        const sectionBanners = banners.filter((b) => b.placement === section.key);

        return (
          <section key={section.key} className="space-y-4 rounded-xl border bg-muted/15 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <SectionIcon className="size-5 text-primary" />
                  <h2 className="text-xl font-bold tracking-tight">{section.title}</h2>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    {section.badge}
                  </span>
                </div>
                <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground">
                  {section.description}
                </p>
              </div>

              <Button
                onClick={() => {
                  setError("");
                  setDraft(emptyDraft(section.key));
                }}
                className="gap-2 rounded-xl"
              >
                <Plus className="size-4" />
                Tambah {section.key === "hero" ? "Slide Carousel" : "Banner Promo"}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {sectionBanners.map((banner) => (
                <article
                  key={banner.id}
                  className="overflow-hidden rounded-2xl border bg-card shadow-xs transition-shadow hover:shadow-md"
                >
                  <div className="relative h-44 bg-muted">
                    {banner.image_url ? (
                      <Image
                        src={banner.image_url}
                        alt={banner.title}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(min-width: 768px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                        Belum ada gambar
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-white">
                      {banner.subtitle && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/90 bg-primary/80 px-2 py-0.5 rounded w-fit mb-1">
                          {banner.subtitle}
                        </span>
                      )}
                      <h4 className="font-bold text-sm sm:text-base leading-snug line-clamp-1">
                        {banner.headline}
                      </h4>
                      <p className="text-xs text-white/80 line-clamp-1 mt-0.5">
                        {banner.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 p-4 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <span>{banner.title}</span>
                        <span
                          className={`size-2 rounded-full ${
                            banner.is_active ? "bg-emerald-500" : "bg-muted-foreground/50"
                          }`}
                        />
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Tombol: &quot;{banner.button_label}&quot; →{" "}
                        <span className="font-mono text-primary font-medium">
                          {banner.target_url || "/products"}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        Urutan: {banner.display_order} · {banner.is_active ? "Aktif" : "Nonaktif"}
                      </p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${banner.title}`}
                        onClick={() => setDraft({ ...banner })}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus ${banner.title}`}
                        disabled={busy}
                        onClick={() => remove(banner)}
                      >
                        <Trash className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}

              {!sectionBanners.length && (
                <p className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Belum ada konten di bagian ini. Klik tombol{" "}
                  <strong>
                    &quot;Tambah {section.key === "hero" ? "Slide Carousel" : "Banner Promo"}&quot;
                  </strong>{" "}
                  di atas untuk menambahkan gambar dan penawaran.
                </p>
              )}
            </div>
          </section>
        );
      })}

      {/* MODAL TAMBAH / EDIT KONTEN DENGAN PANDUAN LENGKAP & USER-FRIENDLY */}
      {draft && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setDraft(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="banner-title"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-card p-6 sm:p-7 shadow-2xl border border-border"
          >
            {/* Header Modal */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="banner-title" className="text-xl font-bold tracking-tight">
                {draft.id ? "Edit Konten" : "Tambah Konten"} ·{" "}
                {draft.placement === "hero" ? "Carousel Slider Utama" : "Banner Promo Khusus"}
              </h2>
              <button
                type="button"
                onClick={() => !busy && setDraft(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Tutup dialog (Batal)"
                title="Tutup (Esc)"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Kotak Panduan Lokasi & Fungsi Bagian Web */}
            {draft.placement === "hero" ? (
              <div className="mb-5 rounded-2xl border border-blue-500/25 bg-blue-500/10 p-3.5 text-xs text-blue-950 dark:text-blue-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300">
                  <Layers className="size-4 shrink-0 text-blue-600" />
                  <span>📍 Bagian: Carousel / Slider Paling Atas (Hero Banner)</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-blue-950/80 dark:text-blue-200/80">
                  Ini adalah slide banner besar di bagian paling atas halaman beranda (Home). Pengunjung akan melihat ini pertama kali saat membuka website. Bisa menambahkan beberapa slide yang berganti otomatis.
                </p>
              </div>
            ) : (
              <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs text-amber-950 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <Sparkles className="size-4 shrink-0 text-amber-600" />
                  <span>📍 Bagian: Banner Promo Khusus (Tengah Beranda)</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-amber-950/80 dark:text-amber-200/80">
                  Ini adalah banner promosi yang tampil di bagian tengah halaman beranda di antara daftar produk laptop &amp; PC. Sangat cocok untuk diskon gajian, flash sale, atau voucher belanja.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Nama Internal */}
              <div className="space-y-1 text-sm">
                <label className="font-semibold text-xs text-foreground flex items-center gap-1">
                  Nama internal (Catatan Admin)
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  value={draft.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="Contoh: Banner Promo Laptop Gaming Maret"
                  required
                />
                <p className="text-[10.5px] text-muted-foreground">
                  Hanya untuk catatan pengenal admin toko. Tidak ditampilkan ke pembeli.
                </p>
              </div>

              {/* Subtitle */}
              <div className="space-y-1 text-sm">
                <label className="font-semibold text-xs text-foreground">
                  Label Kecil / Subtitle (Opsional)
                </label>
                <Input
                  value={draft.subtitle ?? ""}
                  onChange={(event) => update("subtitle", event.target.value)}
                  placeholder="Contoh: PROMO SPESIAL GAJIAN · DISKON 25%"
                />
                <p className="text-[10.5px] text-muted-foreground">
                  Teks kecil pemanis di atas judul banner.
                </p>
              </div>

              {/* Headline */}
              <div className="space-y-1 text-sm sm:col-span-2">
                <label className="font-semibold text-xs text-foreground flex items-center gap-1">
                  Judul Utama Banner (Headline)
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  value={draft.headline}
                  onChange={(event) => update("headline", event.target.value)}
                  placeholder="Contoh: Laptop Lenovo IdeaPad Slim 3 Generasi Baru"
                  required
                />
                <p className="text-[10.5px] text-muted-foreground">
                  Judul penawaran yang tampil besar dan tebal di banner.
                </p>
              </div>

              {/* Deskripsi */}
              <div className="space-y-1 text-sm sm:col-span-2">
                <label className="font-semibold text-xs text-foreground flex items-center gap-1">
                  Deskripsi Singkat Promo
                  <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={draft.description}
                  onChange={(event) => update("description", event.target.value)}
                  placeholder="Contoh: Performa cepat dengan garansi resmi 2 tahun. Dapatkan gratis mouse wireless dan tas laptop eksklusif!"
                  required
                  className="min-h-20 w-full rounded-xl border border-input bg-background p-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Teks Tombol */}
              <div className="space-y-1 text-sm">
                <label className="font-semibold text-xs text-foreground flex items-center gap-1">
                  Teks Tombol
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  value={draft.button_label}
                  onChange={(event) => update("button_label", event.target.value)}
                  placeholder="Contoh: Lihat Produk / Beli Sekarang"
                  required
                />
                <p className="text-[10.5px] text-muted-foreground">
                  Tulisan pada tombol yang diklik pengunjung.
                </p>
              </div>

              {/* Tautan Tombol (Lokal) & Pilihan Cepat */}
              <div className="space-y-1.5 text-sm sm:col-span-2 rounded-xl border border-border/80 bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="font-semibold text-xs text-foreground flex items-center gap-1">
                    Tautan Tombol (Halaman Tujuan Saat Diklik)
                    <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                    <HelpCircle className="size-3" /> Alamat URL lokal atau eksternal
                  </span>
                </div>

                <Input
                  value={draft.target_url ?? ""}
                  onChange={(event) => update("target_url", event.target.value)}
                  placeholder="/products"
                  className="font-mono text-xs"
                />

                <p className="text-[11px] text-muted-foreground">
                  <strong>Fungsi Tautan:</strong> Saat pengunjung mengklik tombol di banner, website akan langsung membuka halaman ini. Klik pilihan cepat di bawah untuk mengisi otomatis:
                </p>

                {/* Tombol Pilihan Cepat / Preset Tujuan */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_URLS.map((preset) => {
                    const isSelected = draft.target_url === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => {
                          update("target_url", preset.url);
                          if (draft.button_label === "Lihat produk" || !draft.button_label) {
                            update("button_label", preset.defaultBtn);
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                            : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Urutan Tampil */}
              <div className="space-y-1 text-sm">
                <label className="font-semibold text-xs text-foreground">Urutan Tampil</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.display_order}
                  onChange={(event) => update("display_order", Number(event.target.value))}
                />
                <p className="text-[10.5px] text-muted-foreground">
                  Urutan slide (0 tampil pertama, lalu 1, 2, dst).
                </p>
              </div>

              {/* Status Tayang */}
              <div className="flex items-center gap-2 pt-6 text-sm">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(event) => update("is_active", event.target.checked)}
                    className="size-4 rounded accent-primary"
                  />
                  Tampilkan di Landing Page
                </label>
              </div>

              {/* Upload Gambar & Pratinjau Langsung */}
              <div className="space-y-2 sm:col-span-2 pt-2 border-t border-border">
                <label className="block font-semibold text-xs text-foreground">
                  Gambar Latar Banner (HTTPS atau Upload)
                </label>
                <Input
                  value={draft.image_url}
                  onChange={(event) => update("image_url", event.target.value)}
                  placeholder="https://... atau upload file di bawah"
                />

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                    <ImagePlus className="size-4" />
                    Pilih File Gambar dari Komputer
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void upload(file);
                      }}
                    />
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    JPG, PNG, WebP, AVIF hingga 15 MB (rasio 16:9 disarankan)
                  </span>
                </div>

                {/* Pratinjau Tampilan Banner Nyata */}
                <div className="mt-3 space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Eye className="size-3.5" /> Pratinjau Tampilan di Website:
                  </p>
                  <div className="relative h-48 sm:h-52 overflow-hidden rounded-2xl border border-border bg-slate-900 shadow-md">
                    {draft.image_url ? (
                      <Image
                        src={draft.image_url}
                        alt="Pratinjau gambar banner"
                        fill
                        unoptimized
                        sizes="(min-width: 768px) 672px, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center text-xs text-muted-foreground">
                        Belum ada gambar latar
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent p-5 sm:p-6 flex flex-col justify-center text-white space-y-2">
                      {draft.subtitle && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground bg-primary px-2 py-0.5 rounded w-fit">
                          {draft.subtitle}
                        </span>
                      )}
                      <h3 className="text-base sm:text-xl font-black tracking-tight leading-tight max-w-md">
                        {draft.headline || "Judul Utama Banner Akan Tampil Di Sini"}
                      </h3>
                      <p className="text-xs text-white/80 max-w-md line-clamp-2 leading-relaxed">
                        {draft.description || "Deskripsi singkat penawaran atau informasi produk..."}
                      </p>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-sm">
                          {draft.button_label || "Lihat Produk"}
                          <ExternalLink className="size-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-xs font-medium text-destructive sm:col-span-2">
                  {error}
                </p>
              )}

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-2 sm:col-span-2 pt-3 border-t border-border">
                <Button variant="outline" onClick={() => setDraft(null)} className="rounded-xl">
                  Batal
                </Button>
                <Button disabled={busy} onClick={save} className="rounded-xl gap-2 font-semibold">
                  <CheckCircle2 className="size-4" />
                  {busy ? "Menyimpan..." : "Simpan Konten"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
