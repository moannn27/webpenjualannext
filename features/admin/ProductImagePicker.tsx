"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash } from "lucide-react";
import { uploadAdminImageAction } from "@/actions/admin";
import { prepareImageUpload } from "@/features/admin/prepare-image-upload";
import { Button } from "@/components/ui/button";

type GalleryImage = { url: string; is_primary?: boolean; display_order?: number };

export function ProductImagePicker({
  initialImages,
  onChange,
  title = "Foto produk",
  maxImages = 8,
}: {
  initialImages: GalleryImage[];
  onChange?: (urls: string[]) => void;
  title?: string;
  maxImages?: number;
}) {
  const [urls, setUrls] = useState(initialImages.slice().sort((a, b) =>
    a.display_order !== undefined && b.display_order !== undefined
      ? a.display_order - b.display_order
      : Number(b.is_primary) - Number(a.is_primary)
  ).map((image) => image.url));
  const [directUrl, setDirectUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (next: string[]) => {
    setUrls(next);
    onChange?.(next);
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (urls.length >= maxImages) { setError(`Maksimal ${maxImages} foto.`); return; }
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files).slice(0, maxImages - urls.length)) {
        const form = new FormData();
        form.set("file", await prepareImageUpload(file));
        form.set("bucket", "products");
        const result = await uploadAdminImageAction(form);
        setUrls((current) => {
          const next = [...current, result.url];
          onChange?.(next);
          return next;
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload foto gagal.");
    } finally {
      setBusy(false);
    }
  };

  const addDirectUrl = () => {
    const candidate = directUrl.trim();
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error();
    } catch {
      setError("Masukkan URL gambar HTTPS yang valid.");
      return;
    }
    if (urls.includes(candidate)) { setError("URL gambar sudah ada di galeri."); return; }
    if (urls.length >= maxImages) { setError(`Maksimal ${maxImages} foto.`); return; }
    setError("");
    setDirectUrl("");
    update([...urls, candidate]);
  };

  const move = (index: number, offset: number) => {
    const destination = index + offset;
    if (destination < 0 || destination >= urls.length) return;
    const next = [...urls];
    [next[index], next[destination]] = [next[destination], next[index]];
    update(next);
  };

  return (
    <section className="space-y-3 rounded-xl border p-4 sm:col-span-2">
      {onChange ? null : <input type="hidden" name="image_urls" value={JSON.stringify(urls)} />}
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground">Upload atau tambahkan URL HTTPS. Foto pertama menjadi gambar utama; tombol panah mengatur urutan galeri.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {urls.map((url, index) => (
          <div key={`${url}-${index}`} className="group relative size-24 overflow-hidden rounded-lg border bg-muted">
            <Image src={url} alt={`${title} ${index + 1}`} fill unoptimized sizes="96px" className="object-cover" />
            <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] text-white">{index === 0 ? "Utama" : `Foto ${index + 1}`}</span>
            <div className="absolute right-1 top-1 flex gap-1">
              <button type="button" aria-label={`Pindah foto ${index + 1} ke atas`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded-full bg-black/70 p-1 text-white disabled:opacity-40"><ArrowUp className="size-3" /></button>
              <button type="button" aria-label={`Pindah foto ${index + 1} ke bawah`} disabled={index === urls.length - 1} onClick={() => move(index, 1)} className="rounded-full bg-black/70 p-1 text-white disabled:opacity-40"><ArrowDown className="size-3" /></button>
              <button type="button" aria-label={`Hapus foto ${index + 1}`} onClick={() => update(urls.filter((_, imageIndex) => imageIndex !== index))} className="rounded-full bg-black/70 p-1 text-white"><Trash className="size-3" /></button>
            </div>
          </div>
        ))}
        <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-primary">
          <ImagePlus className="size-5" />{busy ? "Upload…" : "Upload foto"}
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={busy || urls.length >= maxImages} onChange={(event) => { void upload(event.target.files); event.currentTarget.value = ""; }} />
        </label>
      </div>
      <div className="flex items-center gap-2 w-full">
        <input
          aria-label={`URL ${title}`}
          type="url"
          value={directUrl}
          onChange={(event) => setDirectUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDirectUrl();
            }
          }}
          placeholder="https://.../gambar.webp"
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 whitespace-nowrap h-9 px-3 cursor-pointer"
          onClick={addDirectUrl}
          disabled={urls.length >= maxImages}
        >
          <Plus className="mr-1 size-4" />
          Tambah URL
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
