"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash, Info, Layers, Sparkles, SlidersHorizontal } from "lucide-react";
import { ProductImagePicker } from "@/features/admin/ProductImagePicker";
import { deleteAdminProductAction, getAdminProductsAction, saveAdminProductAction } from "@/actions/admin";
import { ProductBulkImporter } from "@/features/admin/ProductBulkImporter";

const SPEC_PRESETS = [
  "Prosesor",
  "Layar",
  "RAM",
  "Penyimpanan",
  "Kartu Grafis",
  "Sistem Operasi",
  "Garansi",
  "Baterai",
  "Bobot",
  "Konektivitas",
];

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
  const [directStock, setDirectStock] = useState<number>(0);
  const [busy, startTransition] = useTransition();

  const updateVariantStock = (index: number, delta: number) => {
    setVariants((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, stock: Math.max(0, (item.stock || 0) + delta) } : item
      )
    );
  };

  const updateVariantField = <K extends keyof Variant>(index: number, field: K, value: Variant[K]) => {
    setVariants((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addSpecPreset = (key: string) => {
    setSpecifications((current) => {
      if (current.some((item) => item.key.toLowerCase() === key.toLowerCase())) {
        return current;
      }
      return [...current, { key, value: "" }];
    });
  };

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
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><ProductBulkImporter onImported={refresh} /><Button className="w-full sm:w-auto" onClick={() => { setError(""); setSpecifications([]); setVariants([]); setDiscountEnabled(false); setDirectStock(0); setEditing(null); }}><Plus className="mr-2 size-4" />Tambah produk</Button></div>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table className="min-w-[760px]"><TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>SKU</TableHead><TableHead>Kategori</TableHead><TableHead>Stok</TableHead><TableHead>Harga</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
        <TableBody>{visible.map((product) => <TableRow key={product.id}>
          <TableCell className="font-medium">{product.name}</TableCell><TableCell>{product.sku || "—"}</TableCell><TableCell>{product.categories?.name || "—"}</TableCell><TableCell>{product.stock}</TableCell><TableCell>Rp {Number(product.discount_price ?? product.price).toLocaleString("id-ID")}</TableCell>
          <TableCell><Badge variant={product.status === "published" ? "default" : "secondary"}>{product.status}</Badge></TableCell>
      <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon-sm" aria-label={`Edit ${product.name}`} onClick={() => { setError(""); setSpecifications((product.product_specifications ?? []).map(({ key, value }) => ({ key, value }))); setVariants((product.product_variants ?? []).map((variant) => ({ ...variant }))); setDiscountEnabled(product.discount_price != null); setDirectStock(product.stock ?? 0); setEditing(product); }}><Edit className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label={`Hapus ${product.name}`} disabled={busy} onClick={() => remove(product)}><Trash className="size-4 text-destructive" /></Button></div></TableCell>
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

          {/* Bagian Stok Produk / Varian */}
          {variants.length ? (
            <div className="space-y-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-sm sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="size-4 text-blue-600 dark:text-blue-400" />
                    Total Stok Varian Terhitung:
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Produk memiliki <strong>{variants.length} varian</strong> aktif. Total stok dihitung otomatis dari akumulasi stok seluruh varian di bawah. Ubah stok langsung pada masing-masing varian dengan tombol (+) atau (-).
                  </p>
                </div>
                <span className="flex h-9 items-center rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-100/60 dark:bg-blue-950/60 px-3.5 text-base font-bold text-blue-700 dark:text-blue-300">
                  {variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)} unit
                </span>
              </div>
              <input type="hidden" name="stock" value={variants.reduce((sum, variant) => sum + (variant.stock || 0), 0)} />
            </div>
          ) : (
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-sm text-foreground">Stok Fisik Produk</label>
                <span className="text-xs text-muted-foreground">Unit siap jual</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="size-9 p-0 font-bold text-base cursor-pointer"
                  onClick={() => setDirectStock((s) => Math.max(0, s - 1))}
                  disabled={directStock <= 0}
                  title="Kurang 1 unit"
                >
                  -
                </Button>
                <Input
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={directStock}
                  onChange={(event) => setDirectStock(Math.max(0, Number(event.target.value)))}
                  className="h-9 w-24 text-center font-bold text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="size-9 p-0 font-bold text-base cursor-pointer"
                  onClick={() => setDirectStock((s) => s + 1)}
                  title="Tambah 1 unit"
                >
                  +
                </Button>
                <div className="flex gap-1 ml-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setDirectStock((s) => s + 5)}
                  >
                    +5
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setDirectStock((s) => s + 10)}
                  >
                    +10
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Gunakan tombol (-) atau (+) untuk menambah atau mengurangi stok dengan cepat.
              </p>
            </div>
          )}

          <label className="space-y-1 text-sm">Status<select name="status" defaultValue={editing?.status ?? "published"} className="h-9 w-full rounded-lg border border-input bg-background px-2"><option value="published">Terbit</option><option value="draft">Draft</option><option value="archived">Arsip</option></select></label>
          <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="is_best_seller" defaultChecked={editing?.is_best_seller ?? false} />Tampilkan sebagai best seller</label>
          <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="is_new_arrival" defaultChecked={editing?.is_new_arrival ?? false} />Tampilkan sebagai produk terbaru</label>
          <label className="space-y-1 text-sm">Kategori<select name="category_id" required defaultValue={categories.find((option) => option.name === editing?.categories?.name)?.id ?? ""} className="h-9 w-full rounded-lg border border-input bg-background px-2"><option value="">Pilih kategori</option>{categories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
          <label className="space-y-1 text-sm">Brand<select name="brand_id" required defaultValue={brands.find((option) => option.name === editing?.brands?.name)?.id ?? ""} className="h-9 w-full rounded-lg border border-input bg-background px-2"><option value="">Pilih brand</option>{brands.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
          <label className="space-y-1 text-sm sm:col-span-2">Deskripsi produk<textarea name="description" required minLength={3} defaultValue={editing?.description ?? ""} placeholder="Jelaskan manfaat, kondisi, dan informasi penting produk..." className="min-h-28 w-full rounded-lg border border-input bg-background p-3" /></label>

          {/* Bagian Spesifikasi Produk */}
          <section className="space-y-3 rounded-xl border p-4 sm:col-span-2">
            <div>
              <h4 className="font-semibold text-base text-foreground flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                Spesifikasi Produk
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tambahkan rincian komponen perangkat keras &amp; spesifikasi teknis produk.
              </p>
            </div>

            {/* Informational Callout: Detail Pengaruh Perubahan */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                <Info className="size-4 text-primary shrink-0" />
                <span>Bagian ini merubah apa saja di website?</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-0.5 leading-relaxed">
                <li>
                  <strong className="text-foreground">Tabel Spesifikasi Teknis:</strong> Tampil lengkap di tab spesifikasi pada halaman detail produk pembeli.
                </li>
                <li>
                  <strong className="text-foreground">Filter Pencarian Katalog:</strong> Otomatis menjadi opsi filter di sidebar katalog (misal: filter Prosesor, Layar, RAM).
                </li>
                <li>
                  <strong className="text-foreground">Fitur Komparasi (Bandingkan):</strong> Digunakan untuk membandingkan spesifikasi head-to-head antar produk.
                </li>
              </ul>
              <p className="text-[11px] text-muted-foreground pt-1 border-t border-primary/10">
                Kolom kiri = <em>Nama Komponen</em> (misal: Prosesor), Kolom kanan = <em>Detail / Nilai</em> (misal: Intel Core i5-13420H). Baris kosong akan diabaikan.
              </p>
            </div>

            {/* Preset Rekomendasi Cepat */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3 text-amber-500" />
                Rekomendasi Cepat (Klik untuk menambah):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SPEC_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addSpecPreset(preset)}
                    className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Rows */}
            <div className="space-y-2 pt-1">
              {specifications.map((specification, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Input
                    aria-label={`Nama spesifikasi ${index + 1}`}
                    placeholder="Contoh: Prosesor"
                    value={specification.key}
                    onChange={(event) =>
                      setSpecifications((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, key: event.target.value } : item
                        )
                      )
                    }
                    className="text-xs h-9"
                  />
                  <Input
                    aria-label={`Nilai spesifikasi ${index + 1}`}
                    placeholder="Contoh: Intel Core i5-13420H"
                    value={specification.value}
                    onChange={(event) =>
                      setSpecifications((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item
                        )
                      )
                    }
                    className="text-xs h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Hapus spesifikasi ${index + 1}`}
                    onClick={() =>
                      setSpecifications((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="size-9 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSpecifications((current) => [...current, { key: "", value: "" }])}
              className="cursor-pointer"
            >
              <Plus className="mr-2 size-4" />
              Tambah Baris Spesifikasi
            </Button>
          </section>

          {/* Bagian Varian Produk */}
          <section className="space-y-3 rounded-xl border p-4 sm:col-span-2">
            <div>
              <h4 className="font-semibold text-base text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                Varian Produk &amp; Manajemen Stok
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Atur variasi warna, RAM, storage, SKU spesifik, harga khusus, dan stok masing-masing kombinasi.
              </p>
            </div>

            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div
                  key={variant.id ?? `variant-${index}`}
                  className="rounded-xl border border-border bg-background p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-bold text-foreground">
                      Varian #{index + 1}
                      {variant.color || variant.ram || variant.storage
                        ? `: ${[variant.color, variant.ram, variant.storage].filter(Boolean).join(" · ")}`
                        : ""}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                      onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash className="mr-1 size-3.5" />
                      Hapus Varian
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-xs font-medium space-y-1">
                      <span>Warna</span>
                      <Input
                        placeholder="Contoh: Luna Grey"
                        value={variant.color}
                        onChange={(e) => updateVariantField(index, "color", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </label>
                    <label className="text-xs font-medium space-y-1">
                      <span>RAM</span>
                      <Input
                        placeholder="Contoh: 16 GB"
                        value={variant.ram}
                        onChange={(e) => updateVariantField(index, "ram", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </label>
                    <label className="text-xs font-medium space-y-1">
                      <span>Penyimpanan (Storage)</span>
                      <Input
                        placeholder="Contoh: 512 GB SSD"
                        value={variant.storage}
                        onChange={(e) => updateVariantField(index, "storage", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </label>
                    <label className="text-xs font-medium space-y-1">
                      <span>SKU Varian (Opsional)</span>
                      <Input
                        placeholder="Contoh: SLIM3-GRY"
                        value={variant.sku ?? ""}
                        onChange={(e) => updateVariantField(index, "sku", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </label>

                    <label className="text-xs font-medium space-y-1">
                      <span>Harga Khusus (Opsional)</span>
                      <Input
                        placeholder="Ikut harga produk"
                        type="number"
                        min="0"
                        value={variant.price ?? ""}
                        onChange={(e) =>
                          updateVariantField(index, "price", e.target.value ? Number(e.target.value) : null)
                        }
                        className="h-8 text-xs"
                      />
                    </label>
                    <label className="text-xs font-medium space-y-1">
                      <span>Harga Diskon (Opsional)</span>
                      <Input
                        placeholder="Ikut diskon produk"
                        type="number"
                        min="0"
                        value={variant.discount_price ?? ""}
                        onChange={(e) =>
                          updateVariantField(index, "discount_price", e.target.value ? Number(e.target.value) : null)
                        }
                        className="h-8 text-xs"
                      />
                    </label>

                    {/* Stepper Stok Varian */}
                    <div className="text-xs font-medium space-y-1 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <span>Stok Varian Ini</span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                          {variant.stock || 0} unit tersedia
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="size-8 p-0 font-bold text-sm cursor-pointer"
                          onClick={() => updateVariantStock(index, -1)}
                          disabled={(variant.stock || 0) <= 0}
                          title="Kurang 1 unit"
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(e) => updateVariantField(index, "stock", Math.max(0, Number(e.target.value)))}
                          className="h-8 w-20 text-center font-bold text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="size-8 p-0 font-bold text-sm cursor-pointer"
                          onClick={() => updateVariantStock(index, 1)}
                          title="Tambah 1 unit"
                        >
                          +
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => updateVariantStock(index, 5)}
                        >
                          +5
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => updateVariantStock(index, 10)}
                        >
                          +10
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setVariants((current) => [
                  ...current,
                  { color: "", ram: "", storage: "", price: null, discount_price: null, stock: 0 },
                ])
              }
              className="cursor-pointer"
            >
              <Plus className="mr-2 size-4" />
              Tambah Varian Baru
            </Button>
          </section>
          <ProductImagePicker key={editing?.id ?? "new-product"} initialImages={editing?.product_images ?? []} />
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEditing(false)}>Batal</Button><Button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></div>
        </form>
      </section>
    </div>}
  </div>;
}
