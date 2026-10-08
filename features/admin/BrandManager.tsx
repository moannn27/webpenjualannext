"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Pencil, Plus, Trash } from "lucide-react";
import { deleteAdminBrandAction, getAdminBrandsAction, saveAdminBrandAction, uploadAdminImageAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prepareImageUpload } from "@/features/admin/prepare-image-upload";

type Brand = { id: string; name: string; slug: string; logo_url: string | null };
type Draft = { id?: string; name: string; logo_url: string };

export function BrandManager({ initialBrands }: { initialBrands: Brand[] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logoScale, setLogoScale] = useState(100);
  const [busy, startTransition] = useTransition();
  const refresh = async () => setBrands(await getAdminBrandsAction());
  const save = () => {
    if (!draft) return;
    const data = new FormData(); if (draft.id) data.set("id", draft.id); data.set("name", draft.name); data.set("logo_url", draft.logo_url);
    setError("");
    startTransition(async () => { try { await saveAdminBrandAction(data); await refresh(); setDraft(null); setNotice("Brand berhasil disimpan."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Brand gagal disimpan."); } });
  };
  const upload = async (file: File) => {
    try { const data = new FormData(); data.set("file", await prepareImageUpload(file)); data.set("bucket", "brands"); const result = await uploadAdminImageAction(data); setDraft((current) => current ? { ...current, logo_url: result.url } : current); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Upload logo gagal."); }
  };
  const remove = (brand: Brand) => {
    if (!window.confirm(`Hapus brand ${brand.name}? Produk yang masih memakai brand ini bisa membuat penghapusan ditolak.`)) return;
    startTransition(async () => { try { await deleteAdminBrandAction(brand.id); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Brand gagal dihapus."); } });
  };
  return <div className="space-y-4">
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}{notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <div className="flex justify-end"><Button onClick={() => { setError(""); setLogoScale(100); setDraft({ name: "", logo_url: "" }); }}><Plus className="mr-2 size-4" />Tambah brand</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{brands.map((brand) => <article key={brand.id} className="flex min-w-0 items-center gap-4 rounded-2xl border bg-card p-4"><div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-2">{brand.logo_url ? <Image src={brand.logo_url} alt={`${brand.name} logo`} width={64} height={64} unoptimized className="size-full object-contain" /> : <span className="font-bold text-primary">{brand.name.slice(0, 1)}</span>}</div><div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{brand.name}</h2><p className="text-xs text-muted-foreground">{brand.logo_url ? "Logo tersedia" : "Belum ada logo"}</p></div><Button variant="ghost" size="icon-sm" aria-label={`Edit ${brand.name}`} onClick={() => { setDraft({ id: brand.id, name: brand.name, logo_url: brand.logo_url || "" }); setError(""); }}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label={`Hapus ${brand.name}`} disabled={busy} onClick={() => remove(brand)}><Trash className="size-4 text-destructive" /></Button></article>)}{!brands.length && <p className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">Belum ada brand.</p>}</div>
    {draft && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="brand-dialog-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-card p-5 sm:p-6 shadow-xl"><h2 id="brand-dialog-title" className="text-xl font-bold">{draft.id ? "Edit brand" : "Tambah brand"}</h2><label className="block space-y-1 text-sm">Nama brand<Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label><label className="block space-y-1 text-sm">URL logo<Input type="url" value={draft.logo_url} onChange={(event) => setDraft({ ...draft, logo_url: event.target.value })} placeholder="https://..." /></label><label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary"><ImagePlus className="size-4" />Upload logo<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label><p className="text-xs text-muted-foreground">Gambar JPG, PNG, WebP, atau AVIF hingga 15 MB; akan dioptimalkan sebelum disimpan.</p>{draft.logo_url && <><div className="grid h-40 w-full place-items-center overflow-hidden rounded-xl border bg-white p-3"><Image src={draft.logo_url} alt={`Pratinjau logo ${draft.name || "brand"}`} width={400} height={240} unoptimized className="max-h-full max-w-full object-contain" style={{ transform: `scale(${logoScale / 100})` }} /></div><label className="block space-y-1 text-xs">Ukuran logo <span className="font-medium">{logoScale}%</span><input aria-label="Ukuran logo" className="w-full accent-primary" type="range" min="40" max="140" step="5" value={logoScale} onChange={(event) => setLogoScale(Number(event.target.value))} /></label></>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDraft(null)}>Batal</Button><Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></div></section></div>}
  </div>;
}
