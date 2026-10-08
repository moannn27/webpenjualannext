"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, Trash } from "lucide-react";
import { uploadAdminImageAction } from "@/actions/admin";
import { prepareImageUpload } from "@/features/admin/prepare-image-upload";

export function ProductImagePicker({ initialImages }: { initialImages: { url: string; is_primary: boolean }[] }) {
  const [urls, setUrls] = useState(initialImages.slice().sort((a, b) => Number(b.is_primary) - Number(a.is_primary)).map((image) => image.url));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setError("");
    try {
      for (const file of Array.from(files).slice(0, 8 - urls.length)) {
        const form = new FormData(); form.set("file", await prepareImageUpload(file)); form.set("bucket", "products");
        const result = await uploadAdminImageAction(form); setUrls((current) => [...current, result.url]);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload foto gagal."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-xl border p-4 sm:col-span-2">
    <input type="hidden" name="image_urls" value={JSON.stringify(urls)} />
    <div><h4 className="font-semibold">Foto produk</h4><p className="text-xs text-muted-foreground">Upload hingga 8 foto. Foto pertama menjadi foto utama dan otomatis dioptimalkan.</p></div>
    <div className="flex flex-wrap gap-3">{urls.map((url, index) => <div key={`${url}-${index}`} className="group relative size-24 overflow-hidden rounded-lg border bg-muted"><Image src={url} alt={`Foto produk ${index + 1}`} fill unoptimized sizes="96px" className="object-cover"/><span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] text-white">{index === 0 ? "Utama" : `Foto ${index + 1}`}</span><button type="button" aria-label={`Hapus foto ${index + 1}`} onClick={() => setUrls((items) => items.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"><Trash className="size-3"/></button></div>)}<label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-primary"><ImagePlus className="size-5"/>{busy ? "Upload…" : "Tambah foto"}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={busy || urls.length >= 8} onChange={(event) => { void upload(event.target.files); event.currentTarget.value = ""; }}/></label></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
