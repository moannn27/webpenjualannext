"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Edit, ImagePlus, Plus, Trash } from "lucide-react";
import { deleteAdminCategoryAction, getAdminCategoriesAction, saveAdminCategoryAction, uploadAdminImageAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prepareImageUpload } from "@/features/admin/prepare-image-upload";

type Category = { id: string; name: string; description: string | null; image_url: string | null };

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [editing, setEditing] = useState<Category | null | false>(false);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const refresh = async () => setCategories(await getAdminCategoriesAction());
  const save = (data: FormData) => {
    data.set("image_url", imageUrl);
    setError("");
    startTransition(async () => {
      try { await saveAdminCategoryAction(data); await refresh(); setEditing(false); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Kategori gagal disimpan."); }
    });
  };
  const remove = (category: Category) => {
    if (!window.confirm(`Hapus kategori “${category.name}”?`)) return;
    startTransition(async () => {
      try { await deleteAdminCategoryAction(category.id); await refresh(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Kategori gagal dihapus. Pastikan tidak ada produk yang memakai kategori ini."); }
    });
  };
  const upload = async (file: File) => {
    const data = new FormData(); data.set("file", await prepareImageUpload(file)); data.set("bucket", "products");
    try { const result = await uploadAdminImageAction(data); setImageUrl(result.url); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Upload gambar gagal."); }
  };

  return <div className="space-y-4">
    <div className="flex justify-end"><Button onClick={() => { setEditing(null); setImageUrl(""); setError(""); }}><Plus className="mr-2 size-4" />Tambah kategori</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => <article key={category.id} className="overflow-hidden rounded-xl border bg-card">
      <div className="relative h-44 bg-muted">{category.image_url && <Image src={category.image_url} alt={category.name} fill unoptimized className="object-cover" sizes="(min-width: 1024px) 33vw, 50vw" />}</div>
      <div className="flex items-start justify-between gap-3 p-4"><div><h3 className="font-semibold">{category.name}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{category.description || "Belum ada deskripsi."}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon-sm" aria-label={`Edit ${category.name}`} onClick={() => { setEditing(category); setImageUrl(category.image_url || ""); setError(""); }}><Edit className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label={`Hapus ${category.name}`} disabled={busy} onClick={() => remove(category)}><Trash className="size-4 text-destructive" /></Button></div></div>
    </article>)}{!categories.length && <p className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">Belum ada kategori.</p>}</div>
    {editing !== false && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="category-title" className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl">
      <h3 id="category-title" className="mb-5 text-xl font-bold">{editing ? "Edit kategori" : "Tambah kategori"}</h3>
      <form action={save} className="space-y-4">{editing && <input type="hidden" name="id" value={editing.id} />}
        <label className="block space-y-1 text-sm">Nama<Input name="name" required minLength={2} defaultValue={editing?.name || ""} /></label>
        <label className="block space-y-1 text-sm">Deskripsi<textarea name="description" defaultValue={editing?.description || ""} className="min-h-20 w-full rounded-lg border border-input bg-background p-2" /></label>
        <label className="block space-y-1 text-sm">URL gambar<Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} type="url" placeholder="https://..." /></label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary"><ImagePlus className="size-4" />Upload gambar<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>
        {imageUrl && <div className="relative h-40 overflow-hidden rounded-xl border bg-muted"><Image src={imageUrl} alt="Pratinjau gambar kategori" fill unoptimized sizes="(min-width: 512px) 448px, 100vw" className="object-cover" /></div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(false)}>Batal</Button><Button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></div>
      </form>
    </section></div>}
  </div>;
}
