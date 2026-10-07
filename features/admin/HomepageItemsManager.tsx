"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Pencil, Plus, Trash, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteHomepageItemAction, getAdminHomepageItemsAction, saveHomepageItemAction } from "@/actions/admin";

type FAQ = { id: string; question: string; answer: string; display_order: number; is_active: boolean };
type Testimonial = { id: string; name: string; role: string | null; content: string; rating: number | null; display_order: number; is_active: boolean };
type Item = FAQ | Testimonial;

export function HomepageItemsManager({ initialFaqs, initialTestimonials }: { initialFaqs: FAQ[]; initialTestimonials: Testimonial[] }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [editing, setEditing] = useState<{ type: "faq" | "testimonial"; item?: Item } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const refresh = async () => { const data = await getAdminHomepageItemsAction(); setFaqs(data.faqs as FAQ[]); setTestimonials(data.testimonials as Testimonial[]); };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); data.set("type", editing!.type);
    setError(""); setNotice("");
    startTransition(async () => {
      try { await saveHomepageItemAction(data); await refresh(); setEditing(null); setNotice("Konten berhasil disimpan."); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Konten gagal disimpan."); }
    });
  };
  const remove = (type: "faq" | "testimonial", item: Item) => {
    if (!window.confirm("Hapus konten ini dari website?")) return;
    startTransition(async () => { try { await deleteHomepageItemAction(type, item.id); await refresh(); setNotice("Konten berhasil dihapus."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Konten gagal dihapus."); } });
  };
  const list = (type: "faq" | "testimonial", items: Item[], title: string, label: (item: Item) => string, desc: (item: Item) => string) => <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{title}</h2><p className="text-sm text-muted-foreground">Kelola konten yang tampil di bagian halaman depan.</p></div><Button onClick={() => setEditing({ type })}><Plus className="mr-2 size-4" />Tambah</Button></div>
    <div className="grid gap-3 md:grid-cols-2">{items.map((item) => <article key={item.id} className="min-w-0 rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{label(item)}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${item.is_active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{item.is_active ? "Tayang" : "Disembunyikan"}</span></div><p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{desc(item)}</p></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => setEditing({ type, item })}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label="Hapus" disabled={busy} onClick={() => remove(type, item)}><Trash className="size-4 text-destructive" /></Button></div></div></article>)}{!items.length && <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada konten.</p>}</div>
  </section>;
  const editingFaq = editing?.item && "question" in editing.item ? editing.item : null;
  const editingTestimonial = editing?.item && "name" in editing.item ? editing.item : null;

  return <div className="space-y-6">
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}{notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {list("faq", faqs, "FAQ", (item) => (item as FAQ).question, (item) => (item as FAQ).answer)}
    {list("testimonial", testimonials, "Testimoni pelanggan", (item) => (item as Testimonial).name, (item) => (item as Testimonial).content)}
    {editing && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="homepage-item-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between"><h2 id="homepage-item-title" className="text-xl font-bold">{editing.item ? "Edit" : "Tambah"} {editing.type === "faq" ? "FAQ" : "testimoni"}</h2><Button variant="ghost" size="icon-sm" onClick={() => setEditing(null)} aria-label="Tutup"><X className="size-4" /></Button></div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">{editing.item && <input type="hidden" name="id" value={editing.item.id} />}
        {editing.type === "faq" ? <><label className="space-y-1 text-sm sm:col-span-2">Pertanyaan<Input name="question" defaultValue={editingFaq?.question ?? ""} required /></label><label className="space-y-1 text-sm sm:col-span-2">Jawaban<textarea name="answer" defaultValue={editingFaq?.answer ?? ""} required className="min-h-32 w-full rounded-lg border border-input bg-background p-3" /></label></> : <><label className="space-y-1 text-sm">Nama pelanggan<Input name="name" defaultValue={editingTestimonial?.name ?? ""} required /></label><label className="space-y-1 text-sm">Peran/keterangan<Input name="role" defaultValue={editingTestimonial?.role ?? ""} placeholder="Contoh: Pembeli laptop" /></label><label className="space-y-1 text-sm sm:col-span-2">Ulasan<textarea name="content" defaultValue={editingTestimonial?.content ?? ""} required className="min-h-28 w-full rounded-lg border border-input bg-background p-3" /></label><label className="space-y-1 text-sm">Rating<select name="rating" defaultValue={editingTestimonial?.rating ?? 5} className="h-10 w-full rounded-lg border bg-background px-3">{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} bintang</option>)}</select></label></>}
        <label className="space-y-1 text-sm">Urutan tampil<Input name="display_order" type="number" min="0" defaultValue={editingFaq?.display_order ?? editingTestimonial?.display_order ?? 0} /></label>
        <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="is_active" defaultChecked={editingFaq?.is_active ?? editingTestimonial?.is_active ?? true} />Tampilkan di halaman depan</label>
        {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Batal</Button><Button disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></div>
      </form>
    </section></div>}
  </div>;
}
