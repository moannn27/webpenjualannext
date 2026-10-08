"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getAdminProductOptionsAction, saveStorefrontSettingsAction } from "@/actions/admin";
import { DEFAULT_STOREFRONT_SETTINGS, normalizeStorefrontSettings, type StorefrontSettings } from "@/lib/storefront-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const names: Record<string, string> = { categories: "Kategori", bestsellers: "Produk terlaris", promo: "Banner promo", newArrivals: "Produk terbaru", brands: "Brand", whyUs: "Keunggulan toko", testimonials: "Testimoni", faq: "FAQ" };

export function StorefrontSettingsManager({ initialSettings }: { initialSettings: unknown }) {
  const [settings, setSettings] = useState<StorefrontSettings>(() => normalizeStorefrontSettings(initialSettings ?? DEFAULT_STOREFRONT_SETTINGS));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const [products, setProducts] = useState<{id: string; name: string; brand: string; category: string}[]>([]);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const router = useRouter();
  useEffect(() => {
    getAdminProductOptionsAction()
      .then((rows) => setProducts(rows.map((product) => ({ id: product.id, name: product.name, brand: product.brands?.[0]?.name ?? "", category: product.categories?.[0]?.name ?? "" }))))
      .catch(() => setProducts([]));
  }, []);
  const updateSection = (key: string, field: "visible" | "title" | "subtitle" | "productIds", value: string | boolean | string[]) => setSettings((current) => ({ ...current, sections: { ...current.sections, [key]: { ...current.sections[key], [field]: value } } }));
  const updateStore = (field: Exclude<keyof StorefrontSettings["store"], "branches">, value: string) => setSettings((current) => ({ ...current, store: { ...current.store, [field]: value } }));
  const updateCatalogPageSize = (value: number) => setSettings((current) => ({ ...current, admin: { ...current.admin, catalogPageSize: value } }));
  const updateBranch = (id: string, field: "name" | "address" | "maps_url", value: string) => setSettings((current) => ({ ...current, store: { ...current.store, branches: current.store.branches.map((branch) => branch.id === id ? { ...branch, [field]: value } : branch) } }));
  const addBranch = () => setSettings((current) => ({ ...current, store: { ...current.store, branches: [...current.store.branches, { id: crypto.randomUUID(), name: "", address: "", maps_url: "" }] } }));
  const removeBranch = (id: string) => setSettings((current) => ({ ...current, store: { ...current.store, branches: current.store.branches.filter((branch) => branch.id !== id) } }));
  const save = () => {
    setError(""); setNotice("");
    startTransition(async () => {
      try { await saveStorefrontSettingsAction(settings); setNotice("Pengaturan halaman depan berhasil disimpan."); router.refresh(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Pengaturan gagal disimpan."); }
    });
  };
  return <section className="space-y-6 rounded-2xl border bg-card p-5 sm:p-6">
    <div><h2 className="text-xl font-semibold">Bagian halaman depan</h2><p className="mt-1 text-sm text-muted-foreground">Atur judul, deskripsi, dan bagian yang ditampilkan.</p></div>
    <div className="grid gap-4 lg:grid-cols-2">{Object.entries(settings.sections).map(([key, section]) => <article key={key} className="min-w-0 space-y-3 rounded-xl border bg-background p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{names[key] ?? key}</h3><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={section.visible} onChange={(event) => updateSection(key, "visible", event.target.checked)} />Tampilkan</label></div>
      <label className="block space-y-1 text-sm">Judul<Input value={section.title} onChange={(event) => updateSection(key, "title", event.target.value)} maxLength={100} /></label>
      <label className="block space-y-1 text-sm">Deskripsi singkat<Input value={section.subtitle} onChange={(event) => updateSection(key, "subtitle", event.target.value)} maxLength={180} /></label>
      {["bestsellers", "newArrivals", "promo"].includes(key) && <fieldset className="space-y-3 border-t pt-3"><div className="flex items-center justify-between gap-3"><legend className="text-sm font-medium">Pilih produk</legend><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{(section.productIds ?? []).length}/8 dipilih</span></div><p className="text-xs text-muted-foreground">Kosongkan pilihan untuk menampilkan produk otomatis. Cari berdasarkan nama produk, brand, atau kategori.</p><Input aria-label={`Cari produk untuk ${names[key] ?? key}`} value={productSearch[key] ?? ""} onChange={(event) => setProductSearch((current) => ({ ...current, [key]: event.target.value }))} placeholder="Cari nama produk, brand, kategori..." /><div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border bg-card p-2">{products.filter((product) => `${product.name} ${product.brand} ${product.category}`.toLocaleLowerCase("id-ID").includes((productSearch[key] ?? "").trim().toLocaleLowerCase("id-ID"))).map((product) => { const selected = section.productIds ?? []; const checked = selected.includes(product.id); return <label key={product.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"><input className="mt-0.5" type="checkbox" checked={checked} disabled={!checked && selected.length >= 8} onChange={(event) => updateSection(key, "productIds", event.target.checked ? [...selected, product.id].slice(0, 8) : selected.filter((id) => id !== product.id))} /><span className="min-w-0"><span className="block truncate font-medium">{product.name}</span><span className="block truncate text-xs text-muted-foreground">{[product.brand, product.category].filter(Boolean).join(" · ") || "Tanpa brand/kategori"}</span></span></label>; })}{!products.length && <p className="p-2 text-xs text-muted-foreground">Belum ada produk terbit yang dapat dipilih.</p>}{products.length > 0 && !products.some((product) => `${product.name} ${product.brand} ${product.category}`.toLocaleLowerCase("id-ID").includes((productSearch[key] ?? "").trim().toLocaleLowerCase("id-ID"))) && <p className="p-2 text-xs text-muted-foreground">Tidak ada produk yang cocok dengan pencarian.</p>}</div></fieldset>}
    </article>)}</div>
    <div className="space-y-4 border-t pt-5"><div><h2 className="text-xl font-semibold">Informasi toko dan footer</h2><p className="mt-1 text-sm text-muted-foreground">Alamat dan kontak ini akan tampil di bagian bawah website.</p></div>
      <label className="block space-y-1 text-sm">Deskripsi toko<textarea value={settings.store.description} onChange={(event) => updateStore("description", event.target.value)} maxLength={300} className="min-h-20 w-full rounded-lg border border-input bg-background p-3" /></label>
      <label className="block space-y-1 text-sm">Alamat toko<textarea value={settings.store.address} onChange={(event) => updateStore("address", event.target.value)} maxLength={400} placeholder="Alamat lengkap toko" className="min-h-20 w-full rounded-lg border border-input bg-background p-3" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Email toko<Input type="email" value={settings.store.email} onChange={(event) => updateStore("email", event.target.value)} /></label><label className="space-y-1 text-sm">Nomor telepon<Input value={settings.store.phone} onChange={(event) => updateStore("phone", event.target.value)} /></label><label className="space-y-1 text-sm">WhatsApp admin untuk konfirmasi pembayaran<Input type="tel" inputMode="tel" value={settings.store.whatsapp} onChange={(event) => updateStore("whatsapp", event.target.value)} placeholder="6281234567890" /><span className="block text-xs text-muted-foreground">Gunakan kode negara tanpa tanda +, contoh 6281234567890. Nomor ini dipakai untuk konfirmasi pesanan dan pickup.</span></label><label className="space-y-1 text-sm">Teks hak cipta<Input value={settings.store.copyright} onChange={(event) => updateStore("copyright", event.target.value)} maxLength={120} /></label></div>
      <div className="space-y-3 border-t pt-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Cabang toko</h3><p className="text-sm text-muted-foreground">Setiap lokasi bisa memiliki tombol Google Maps.</p></div><Button type="button" variant="outline" onClick={addBranch}>Tambah cabang</Button></div>
        {settings.store.branches.map((branch, index) => <article key={branch.id} className="grid min-w-0 gap-3 rounded-xl border bg-background p-4 sm:grid-cols-2"><div className="flex items-center justify-between gap-2 sm:col-span-2"><h4 className="font-medium">Cabang {index + 1}</h4><Button type="button" variant="ghost" size="sm" onClick={() => removeBranch(branch.id)}>Hapus cabang</Button></div><label className="space-y-1 text-sm">Nama cabang<Input value={branch.name} onChange={(event) => updateBranch(branch.id, "name", event.target.value)} placeholder="Next Solution Jakarta Selatan" /></label><label className="space-y-1 text-sm">Alamat lengkap<Input value={branch.address} onChange={(event) => updateBranch(branch.id, "address", event.target.value)} placeholder="Jalan, kota, kode pos" /></label><label className="space-y-1 text-sm sm:col-span-2">Link Google Maps<Input type="url" value={branch.maps_url} onChange={(event) => updateBranch(branch.id, "maps_url", event.target.value)} placeholder="https://maps.google.com/..." /></label></article>)}
        {!settings.store.branches.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Belum ada cabang yang ditampilkan.</p>}
      </div>
    </div>
    <div className="space-y-2 border-t pt-5"><div><h2 className="text-xl font-semibold">Pengaturan katalog admin</h2><p className="text-sm text-muted-foreground">Hanya super admin yang bisa mengubah banyaknya produk per halaman katalog.</p></div><label className="block max-w-sm space-y-1 text-sm">Produk per halaman<select value={settings.admin.catalogPageSize} onChange={(event) => updateCatalogPageSize(Number(event.target.value))} className="h-10 w-full rounded-lg border border-input bg-background px-3"><option value={24}>24 produk</option><option value={48}>48 produk</option><option value={100}>100 produk</option><option value={200}>200 produk</option></select></label></div>
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}{notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <div className="flex flex-wrap gap-3"><Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan pengaturan halaman depan"}</Button><Button type="button" variant="outline" onClick={() => setSettings(DEFAULT_STOREFRONT_SETTINGS)}>Kembalikan default</Button></div>
  </section>;
}
