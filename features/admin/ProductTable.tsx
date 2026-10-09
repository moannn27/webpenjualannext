"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash } from "lucide-react";
import { ProductImagePicker } from "@/features/admin/ProductImagePicker";
import { deleteAdminProductAction, getAdminProductsAction, saveAdminProductAction } from "@/actions/admin";
import { ProductBulkImporter } from "@/features/admin/ProductBulkImporter";

type AdminProduct = {
  id: string; name: string; description: string; sku: string | null; price: number; discount_price: number | null;
  stock: number; status: string; is_best_seller?: boolean; is_new_arrival?: boolean; categories?: { name: string } | null; brands?: { name: string } | null;
  product_images?: { url: string; is_primary: boolean }[];
  product_specifications?: { key: string; value: string; display_order?: number }[];
  product_variants?: Variant[];
};
type Option = { id: string; name: string };
type Specification = { key: string; value: string };
type Variant = { id?: string; sku?: string | null; color: string; ram: string; storage: string; price: number | null; discount_price: number | null; stock: number };

export function ProductTable({ initialProducts, categories, brands, initialSearch = "" }: { initialProducts: AdminProduct[]; categories: Option[]; brands: Option[]; initialSearch?: string }) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState(initialSearch);
  const [editing, setEditing] = useState<AdminProduct | null | false>(false);
  const [error, setError] = useState("");
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [discountEnabled, setDiscountEnabled] = useState(false);
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
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><ProductBulkImporter onImported={refresh} /><Button className="w-full sm:w-auto" onClick={() => { setError(""); setSpecifications([]); setVariants([]); setDiscountEnabled(false); setEditing(null); }}><Plus className="mr-2 size-4" />Tambah produk</Button></div>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table className="min-w-[760px]"><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>SKU</TableHead><TableHead>Kategori</TableHead><TableHead>Stok</TableHead><TableHead>Harga</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>{visible.map((product) => <TableRow key={product.id}>
          <TableCell className="font-medium">{product.name}</TableCell><TableCell>{product.sku || "—"}</TableCell><TableCell>{product.categories?.name || "—"}</TableCell><TableCell>{product.stock}</TableCell><TableCell>Rp {Number(product.discount_price ?? product.price).toLocaleString("id-ID")}</TableCell>
          <TableCell><Badge variant={product.status === "published" ? "default" : "secondary"}>{product.status}</Badge></TableCell>
      <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon-sm" aria-label={`Edit ${product.name}`} onClick={() => { setError(""); setSpecifications((product.product_specifications ?? []).map(({ key, value }) => ({ key, value }))); setVariants((product.product_variants ?? []).map((variant) => ({ ...variant }))); setDiscountEnabled(product.discount_price != null); setEditing(product); }}><Edit className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label={`Hapus ${product.name}`} disabled={busy} onClick={() => remove(product)}><Trash className="size-4 text-destructive" /></Button></div></TableCell>
        </TableRow>)}{!visible.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{products.length ? "Produk tidak ditemukan." : "Belum ada produk. Tambahkan produk pertama."}</TableCell></TableRow>}</TableBody>
      </Table>
    </div>

    {editing !== false && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-xl sm:p-6">
        <h3 id="product-dialog-title" className="mb-5 text-xl font-bold">{editing ? "Edit produk" : "Tambah produk"}</h3>
        <form action={save} className="grid gap-4 sm:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <input type="hidden" name="specifications" value={JSON.stringify(specifications)} />
          <input type="hidden" name="variants" value={JSON.stringify(variants)} />
          <label className="space-y-1 text-sm">Nama<Input name="name" required minLength={2} defaultValue={editing?.name ?? ""} /></label>
          <label className="space-y-1 text-sm">SKU<Input name="sku" defaultValue={editing?.sku ?? ""} /></label>
          <label className="space-y-1 text-sm">Harga resmi<span className="flex h-9 items-center overflow-hidden rounded-lg border border-input bg-background"><span className="border-r px-3 text-muted-foreground">Rp</span><input className="h-full min-w-0 flex-1 bg-transparent px-3 outline-none" name="price" type="number" min="0" step="1" required defaultValue={editing?.price ?? ""} /></span></label>
          <div className="space-y-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="discount_enabled" checked={discountEnabled} onChange={(event) => setDiscountEnabled(event.target.checked)} />Pakai harga diskon</label><label className={`block space-y-1 text-sm ${!discountEnabled ? "text-muted-foreground" : ""}`}>Harga diskon <span className="flex h-9 items-center overflow-hidden rounded-lg border border-input bg-background"><span className="border-r px-3 text-muted-foreground">Rp</span><input className="h-full min-w-0 flex-1 bg-transparent px-3 outline-none disabled:cursor-not-allowed disabled:opacity-50" name="discount_price" type="number" min="0" step="1" defaultValue={editing?.discount_price ?? ""} disabled={!discountEnabled} /></span></label><p className="text-xs text-muted-foreground">Jika dicentang, harga diskon ditampilkan sebagai harga jual dan harga resmi akan dicoret.</p></div>
          {variants.length ? <div className="space-y-1 text-sm">Total stok varian<span className="flex h-9 items-center rounded-lg border border-input bg-muted px-3 font-semibold">{variants.reduce((sum, variant) => sum + variant.stock, 0)} unit</span><input type="hidden" name="stock" value={variants.reduce((sum, variant) => sum + variant.stock, 0)} /></div> : <label className="space-y-1 text-sm">Stok<Input name="stock" type="number" min="0" step="1" required defaultValue={editing?.stock ?? 0} /></label>}
          <label className="space-y-1 text-sm">Status<select name="status" defaultValue={editing?.status ?? "published"} className="h-9 w-full rounded-lg border border-input bg-background px-2"><option value="published">Terbit</option><option value="draft">Draft</option><option value="archived">Arsip</option></select></label>
          <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="is_best_seller" defaultChecked={editing?.is_best_seller ?? false} />Tampilkan sebagai best seller</label>
          <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="is_new_arrival" defaultChecked={editing?.is_new_arrival ?? false} />Tampilkan sebagai produk terbaru</label>
          <label className="space-y-1 text-sm">Kategori<select name="category_id" required defaultValue={categories.find((option) => option.name === editing?.categories?.name)?.id ?? ""} className="h-9 w-full rounded-lg border border-input bg-background px-2"><option value="">Pilih kategori</option>{categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
          <label className="space-y-1 text-sm">Brand<select name="brand_id" required defaultValue={brands.find((option) => option.name === editing?.brands?.name)?.id ?? ""} className="h-9 w-full rounded-lg border border-input bg-background px-2"><option value="">Pilih brand</option>{brands.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
          <label className="space-y-1 text-sm sm:col-span-2">Deskripsi produk<textarea name="description" required minLength={3} defaultValue={editing?.description ?? ""} placeholder="Jelaskan manfaat, kondisi, dan informasi penting produk..." className="min-h-28 w-full rounded-lg border border-input bg-background p-3" /></label>
          <section className="space-y-3 rounded-xl border p-4 sm:col-span-2"><div><h4 className="font-semibold">Spesifikasi produk</h4><p className="text-xs text-muted-foreground">Tambahkan detail seperti prosesor, RAM, kapasitas, ukuran, atau bahan. Baris kosong akan diabaikan.</p></div>{specifications.map((specification, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><Input aria-label={`Nama spesifikasi ${index + 1}`} placeholder="Contoh: RAM" value={specification.key} onChange={(event) => setSpecifications((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item))} /><Input aria-label={`Nilai spesifikasi ${index + 1}`} placeholder="Contoh: 16 GB" value={specification.value} onChange={(event) => setSpecifications((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} /><Button type="button" variant="outline" aria-label={`Hapus spesifikasi ${index + 1}`} onClick={() => setSpecifications((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</Button></div>)}<Button type="button" variant="outline" onClick={() => setSpecifications((current) => [...current, { key: "", value: "" }])}><Plus className="mr-2 size-4" />Tambah spesifikasi</Button></section>
          <section className="space-y-3 rounded-xl border p-4 sm:col-span-2">
            <div><h4 className="font-semibold">Varian produk</h4><p className="text-xs text-muted-foreground">Atur warna, RAM, storage, SKU, harga opsional, dan stok tiap kombinasi.</p></div>
            {variants.map((variant, index) => <div key={variant.id ?? `variant-${index}`} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input aria-label={`Warna varian ${index + 1}`} placeholder="Warna" value={variant.color} onChange={(event) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item))} />
              <Input aria-label={`RAM varian ${index + 1}`} placeholder="RAM, contoh 16 GB" value={variant.ram} onChange={(event) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ram: event.target.value } : item))} />
              <Input aria-label={`Storage varian ${index + 1}`} placeholder="Storage, contoh 512 GB" value={variant.storage} onChange={(event) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, storage: event.target.value } : item))} />
              <Input aria-label={`SKU varian ${index + 1}`} placeholder="SKU varian (opsional)" value={variant.sku ?? ""} onChange={(event) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item))} />
              <Input aria-label={`Harga varian ${index + 1}`} placeholder="Harga ikut produk" type="number" min="0" value={variant.price ?? ""} onChange={(event) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value ? Number(event.target.value) : null } : item))} />
              <Input aria-label={`Harga diskon varian ${index + 1}`} placeholder="Diskon varian opsional" type="number" min="0" value={variant.discount_price ?? ""} onChange={(event) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, discount_price: event.target.value ? Number(event.target.value) : null } : item))} />
              <Input aria-label={`Stok varian ${index + 1}`} placeholder="Stok" type="number" min="0" value={variant.stock} onChange={(event) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, stock: Number(event.target.value) } : item))} />
              <Button type="button" variant="outline" onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Hapus varian</Button>
            </div>)}
            <Button type="button" variant="outline" onClick={() => setVariants((current) => [...current, { color: "", ram: "", storage: "", price: null, discount_price: null, stock: 0 }])}><Plus className="mr-2 size-4" />Tambah varian</Button>
          </section>
          <ProductImagePicker key={editing?.id ?? "new-product"} initialImages={editing?.product_images ?? []} />
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEditing(false)}>Batal</Button><Button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></div>
        </form>
      </section>
    </div>}
  </div>;
}
