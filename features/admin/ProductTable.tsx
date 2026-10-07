"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash } from "lucide-react";
import { deleteAdminProductAction, getAdminProductsAction, saveAdminProductAction } from "@/actions/admin";

type AdminProduct = {
  id: string; name: string; description: string; sku: string | null; price: number; discount_price: number | null;
  stock: number; status: string; is_best_seller?: boolean; categories?: { name: string } | null; brands?: { name: string } | null;
  product_images?: { url: string; is_primary: boolean }[];
};
type Option = { id: string; name: string };

export function ProductTable({ initialProducts, categories, brands, initialSearch = "" }: { initialProducts: AdminProduct[]; categories: Option[]; brands: Option[]; initialSearch?: string }) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState(initialSearch);
  const [editing, setEditing] = useState<AdminProduct | null | false>(false);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  const refresh = async () => setProducts(await getAdminProductsAction());
  const save = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      try { await saveAdminProductAction(formData); await refresh(); setEditing(false); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Produk gagal disimpan."); }
    });
  };
  const remove = (product: AdminProduct) => {
    if (!window.confirm(`Hapus produk “${product.name}”?`)) return;
    setError("");
    startTransition(async () => {
      try { await deleteAdminProductAction(product.id); await refresh(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Produk gagal dihapus."); }
    });
  };

  const visible = products.filter((product) => `${product.name} ${product.sku ?? ""} ${product.brands?.name ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="space-y-4">
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="relative w-full max-w-sm"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Cari produk..." className="w-full bg-background pl-9" /></div>
      <Button className="w-full sm:w-auto" onClick={() => { setError(""); setEditing(null); }}><Plus className="mr-2 size-4" />Tambah produk</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="rounded-md border bg-card">
      <Table><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>SKU</TableHead><TableHead>Kategori</TableHead><TableHead>Stok</TableHead><TableHead>Harga</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>{visible.map((product) => <TableRow key={product.id}>
          <TableCell className="font-medium">{product.name}</TableCell><TableCell>{product.sku || "—"}</TableCell><TableCell>{product.categories?.name || "—"}</TableCell><TableCell>{product.stock}</TableCell><TableCell>Rp {Number(product.discount_price ?? product.price).toLocaleString("id-ID")}</TableCell>
          <TableCell><Badge variant={product.status === "published" ? "default" : "secondary"}>{product.status}</Badge></TableCell>
          <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon-sm" aria-label={`Edit ${product.name}`} onClick={() => { setError(""); setEditing(product); }}><Edit className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label={`Hapus ${product.name}`} disabled={busy} onClick={() => remove(product)}><Trash className="size-4 text-destructive" /></Button></div></TableCell>
        </TableRow>)}{!visible.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{products.length ? "Produk tidak ditemukan." : "Belum ada produk. Tambahkan produk pertama."}</TableCell></TableRow>}</TableBody>
      </Table>
    </div>

    {editing !== false && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <h3 id="product-dialog-title" className="mb-5 text-xl font-bold">{editing ? "Edit produk" : "Tambah produk"}</h3>
        <form action={save} className="grid gap-4 sm:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <label className="space-y-1 text-sm">Nama<Input name="name" required minLength={2} defaultValue={editing?.name ?? ""} /></label>
          <label className="space-y-1 text-sm">SKU<Input name="sku" defaultValue={editing?.sku ?? ""} /></label>
          <label className="space-y-1 text-sm">Harga (Rp)<Input name="price" type="number" min="0" step="1" required defaultValue={editing?.price ?? ""} /></label>
          <label className="space-y-1 text-sm">Harga diskon (opsional)<Input name="discount_price" type="number" min="0" step="1" defaultValue={editing?.discount_price ?? ""} /></label>
          <label className="space-y-1 text-sm">Stok<Input name="stock" type="number" min="0" step="1" required defaultValue={editing?.stock ?? 0} /></label>
          <label className="space-y-1 text-sm">Status<select name="status" defaultValue={editing?.status ?? "published"} className="h-9 w-full rounded-lg border border-input bg-background px-2"><option value="published">Terbit</option><option value="draft">Draft</option><option value="archived">Arsip</option></select></label>
          <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="is_best_seller" defaultChecked={editing?.is_best_seller ?? false} />Tampilkan sebagai best seller</label>
          <label className="space-y-1 text-sm">Kategori<select name="category_id" required defaultValue={categories.find((option) => option.name === editing?.categories?.name)?.id ?? ""} className="h-9 w-full rounded-lg border border-input bg-background px-2"><option value="">Pilih kategori</option>{categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
          <label className="space-y-1 text-sm">Brand<select name="brand_id" required defaultValue={brands.find((option) => option.name === editing?.brands?.name)?.id ?? ""} className="h-9 w-full rounded-lg border border-input bg-background px-2"><option value="">Pilih brand</option>{brands.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
          <label className="space-y-1 text-sm sm:col-span-2">Deskripsi<textarea name="description" required minLength={3} defaultValue={editing?.description ?? ""} className="min-h-24 w-full rounded-lg border border-input bg-background p-2" /></label>
          <label className="space-y-1 text-sm sm:col-span-2">URL gambar utama<Input name="image_url" type="url" defaultValue={editing?.product_images?.find((image) => image.is_primary)?.url ?? editing?.product_images?.[0]?.url ?? ""} /></label>
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEditing(false)}>Batal</Button><Button disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></div>
        </form>
      </section>
    </div>}
  </div>;
}
