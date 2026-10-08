"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit, ImagePlus, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteLandingBannerAction, saveLandingBannerAction, uploadAdminImageAction } from "@/actions/admin";
import { prepareImageUpload } from "@/features/admin/prepare-image-upload";

type Banner = {
  id: string; placement: "hero" | "promo"; title: string; subtitle: string | null; headline: string;
  description: string; button_label: string; image_url: string; target_url: string | null;
  display_order: number; is_active: boolean;
};
type Draft = Omit<Banner, "id"> & { id?: string };
const emptyDraft = (placement: "hero" | "promo"): Draft => ({ id: undefined, placement, title: "", subtitle: "", headline: "", description: "", button_label: "Lihat produk", image_url: "", target_url: "/products", display_order: 0, is_active: true });

export function LandingContentManager({ initialBanners }: { initialBanners: Banner[] }) {
  const banners = initialBanners;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => current ? { ...current, [key]: value } : current);

  const save = () => {
    if (!draft) return;
    const form = new FormData();
    for (const [key, value] of Object.entries(draft)) if (value !== undefined && value !== null) form.set(key, String(value));
    if (draft.is_active) form.set("is_active", "on");
    setError(""); setNotice("");
    startTransition(async () => {
      try {
        await saveLandingBannerAction(form);
        setNotice("Konten berhasil disimpan.");
        setDraft(null);
        router.refresh();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Konten gagal disimpan."); }
    });
  };

  const upload = async (file: File) => {
    const form = new FormData(); form.set("file", await prepareImageUpload(file)); form.set("bucket", "banners");
    setError("");
    try { const result = await uploadAdminImageAction(form); update("image_url", result.url); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Upload gambar gagal."); }
  };

  const remove = (banner: Banner) => {
    if (!window.confirm(`Hapus konten “${banner.title}”?`)) return;
    startTransition(async () => {
      try {
        await deleteLandingBannerAction(banner.id);
        router.refresh();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Konten gagal dihapus."); }
    });
  };

  const sections: { key: "hero" | "promo"; title: string; description: string }[] = [
    { key: "hero", title: "Carousel utama", description: "Slide besar di bagian paling atas landing page." },
    { key: "promo", title: "Banner promo", description: "Banner promo di antara bagian produk." },
  ];

  return <div className="space-y-10">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
    {sections.map((section) => <section key={section.key} className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">{section.title}</h2><p className="text-sm text-muted-foreground">{section.description}</p></div><Button onClick={() => { setError(""); setDraft(emptyDraft(section.key)); }}><Plus className="mr-2 size-4" />Tambah konten</Button></div>
      <div className="grid gap-4 md:grid-cols-2">{banners.filter((banner) => banner.placement === section.key).map((banner) => <article key={banner.id} className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative h-44 bg-muted">{banner.image_url && <Image src={banner.image_url} alt={banner.title} fill unoptimized className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />}</div>
        <div className="flex items-start justify-between gap-4 p-4"><div><p className="text-xs uppercase text-muted-foreground">{banner.is_active ? "Aktif" : "Nonaktif"} · Urutan {banner.display_order}</p><h3 className="mt-1 font-semibold">{banner.title}</h3><p className="text-sm text-muted-foreground">{banner.headline}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Edit ${banner.title}`} onClick={() => setDraft({ ...banner })}><Edit className="size-4" /></Button><Button variant="ghost" size="icon" aria-label={`Hapus ${banner.title}`} disabled={busy} onClick={() => remove(banner)}><Trash className="size-4 text-destructive" /></Button></div></div>
      </article>)}{!banners.some((banner) => banner.placement === section.key) && <p className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">Belum ada konten. Tambahkan gambar dan teks untuk menampilkannya.</p>}</div>
    </section>)}

    {draft && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="banner-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
      <h2 id="banner-title" className="mb-5 text-xl font-bold">{draft.id ? "Edit konten" : "Tambah konten"} · {draft.placement === "hero" ? "Carousel" : "Promo"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">Nama internal<Input value={draft.title} onChange={(event) => update("title", event.target.value)} required /></label>
        <label className="space-y-1 text-sm">Subtitle<Input value={draft.subtitle ?? ""} onChange={(event) => update("subtitle", event.target.value)} /></label>
        <label className="space-y-1 text-sm sm:col-span-2">Headline<Input value={draft.headline} onChange={(event) => update("headline", event.target.value)} required /></label>
        <label className="space-y-1 text-sm sm:col-span-2">Deskripsi<textarea value={draft.description} onChange={(event) => update("description", event.target.value)} required className="min-h-24 w-full rounded-lg border border-input bg-background p-2" /></label>
        <label className="space-y-1 text-sm">Teks tombol<Input value={draft.button_label} onChange={(event) => update("button_label", event.target.value)} required /></label>
        <label className="space-y-1 text-sm">Tautan tombol (lokal)<Input value={draft.target_url ?? ""} onChange={(event) => update("target_url", event.target.value)} placeholder="/products" /></label>
        <label className="space-y-1 text-sm">Urutan tampil<Input type="number" min="0" step="1" value={draft.display_order} onChange={(event) => update("display_order", Number(event.target.value))} /></label>
        <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={draft.is_active} onChange={(event) => update("is_active", event.target.checked)} />Tampilkan di landing page</label>
        <div className="space-y-2 sm:col-span-2"><label className="block text-sm">Gambar latar (HTTPS)<Input value={draft.image_url} onChange={(event) => update("image_url", event.target.value)} placeholder="https://..." /></label><label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary"><ImagePlus className="size-4" />Upload gambar<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label><p className="text-xs text-muted-foreground">JPG, PNG, WebP, atau AVIF hingga 15 MB; akan dioptimalkan sebelum disimpan.</p>{draft.image_url && <div className="relative h-44 overflow-hidden rounded-xl border bg-muted"><Image src={draft.image_url} alt="Pratinjau gambar banner" fill unoptimized sizes="(min-width: 768px) 672px, 100vw" className="object-cover"/><div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent p-5 text-white"><p className="text-xs">{draft.subtitle}</p><p className="mt-2 text-lg font-bold">{draft.headline || "Pratinjau judul banner"}</p></div></div>}</div>
        {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="outline" onClick={() => setDraft(null)}>Batal</Button><Button disabled={busy} onClick={save}>{busy ? "Menyimpan..." : "Simpan"}</Button></div>
      </div>
    </section></div>}
  </div>;
}
