"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bulkImportAdminProductsAction } from "@/actions/admin";
import { hasConfirmedImportPriceMapping, isValidImportPrices, productImportHeaders, type ImportedProduct } from "@/lib/admin-product-import";

const sample = "Contoh Laptop,DEMO-001,Laptop contoh,10000000,,0,Laptops,Lenovo,published,false,true,https://example.com/laptop.jpg,Processor: Intel Core i5,,,,,,,";
function downloadTemplate() {
  const csv = [productImportHeaders.join(","), sample].join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "template-produk-next-solution.csv"; anchor.click(); URL.revokeObjectURL(url);
}

export function ProductBulkImporter({ onImported }: { onImported: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ImportedProduct[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const update = (index: number, patch: Partial<ImportedProduct>) => setProducts((current) => current.map((product, row) => row === index ? { ...product, ...patch } : product));
  const importable = products.filter((product) => product.importAction !== 'skip');
  const ready = importable.length > 0 && importable.every((product) => !product.errors?.length && product.name && product.description && product.category && product.brand && isValidImportPrices(product.price, product.discount_price) && hasConfirmedImportPriceMapping(product));

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setError(""); setNotice(""); setProducts([]); setFileName(file.name);
    if (file.size < 1 || file.size > 10 * 1024 * 1024) { setError("Ukuran file harus antara 1 byte dan 10 MB."); return; }
    const form = new FormData(); form.set("file", file);
    try {
      const response = await fetch("/api/admin/products/import/preview", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "File gagal dibaca.");
      setProducts(result.products); setNotice(`Preview: ${result.summary.productCount} produk; periksa mapping, harga, dan konflik sebelum impor.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "File gagal dibaca."); }
  };
  const importProducts = () => startTransition(async () => {
    setError("");
    try {
      const result = await bulkImportAdminProductsAction(importable);
      await onImported(); setNotice(`${result.count} produk berhasil diproses.`); setProducts([]); setFileName("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impor produk gagal."); }
  });

  return <>
    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setOpen(true); setError(""); }}><FileUp className="mr-2 size-4" />Upload produk massal</Button>
    {open && <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="bulk-import-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-5xl space-y-4 overflow-y-auto rounded-2xl bg-card p-5 shadow-xl sm:p-6">
        <div><h2 id="bulk-import-title" className="text-xl font-bold">Upload produk massal</h2><p className="mt-1 text-sm text-muted-foreground">Template lama tetap didukung. Parser vendor aktif saat ini: Lenovo; ASUS, Acer, dan HP belum divalidasi.</p></div>
        <div className="rounded-xl border bg-muted/30 p-4 text-sm"><p className="font-semibold">Format dan batas</p><p className="mt-1 text-muted-foreground">XLSX (semua sheet), CSV, DOCX (semua tabel), PDF (tabel yang dapat diekstrak, bukan hasil scan). Maksimal 10 MB, 2.000 baris, 500 produk, 50 varian dan 50 spesifikasi per produk. Toko harus sudah memiliki brand dan kategori yang dipilih.</p><p className="mt-2 text-muted-foreground">Untuk Lenovo, TYPE/MTM dan kolom harga ditampilkan sebagai kandidat. Harga belum dipakai sampai admin memilih dan mengonfirmasi nilai sumber.</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={downloadTemplate}><Download className="mr-2 size-4" />Unduh template CSV lama</Button></div>
        <input ref={input} type="file" accept=".xlsx,.csv,.docx,.pdf" className="sr-only" onChange={(event) => { void chooseFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <FileUp className="mr-2 size-4" />}Pilih file</Button>{fileName && <span className="max-w-full truncate text-sm text-muted-foreground">{fileName}</span>}</div>
        {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {products.length > 0 && <div className="space-y-3"><div className="flex flex-wrap gap-2"><Badge>{products.length} produk terdeteksi</Badge><Badge variant="secondary">{importable.length} dipilih untuk impor</Badge></div><div className="max-h-[55vh] space-y-3 overflow-auto">
          {products.map((product, index) => <article key={`${product.sku}-${index}`} className="space-y-3 rounded-xl border p-3">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{product.name} <span className="font-normal text-muted-foreground">· {product.sku || 'SKU kosong'}</span></p><p className="text-xs text-muted-foreground">Baris sumber {product.sourceRow ?? 'template'} · {product.specifications.length} spesifikasi</p></div><label className="text-sm">Tindakan <select className="ml-2 rounded-md border bg-background p-1" value={product.importAction ?? 'create'} onChange={(event) => update(index, { importAction: event.target.value as ImportedProduct['importAction'] })}><option value="create" disabled={product.duplicateInDatabase}>Produk baru</option><option value="update" disabled={!product.targetProductId}>Update produk cocok</option><option value="skip">Lewati</option></select></label></div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs">Nama<input className="mt-1 w-full rounded border bg-background p-2 text-sm" value={product.name} onChange={(event) => update(index, { name: event.target.value })} /></label><label className="text-xs">SKU / MTM<input className="mt-1 w-full rounded border bg-background p-2 text-sm" value={product.sku} onChange={(event) => update(index, { sku: event.target.value })} /></label><label className="text-xs">Brand<input className="mt-1 w-full rounded border bg-background p-2 text-sm" value={product.brand} onChange={(event) => update(index, { brand: event.target.value })} /></label><label className="text-xs">Kategori<input className="mt-1 w-full rounded border bg-background p-2 text-sm" value={product.category} onChange={(event) => update(index, { category: event.target.value })} /></label></div>
            <label className="block text-xs">Deskripsi<textarea className="mt-1 w-full rounded border bg-background p-2 text-sm" rows={2} value={product.description} onChange={(event) => update(index, { description: event.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/40 p-2"><p className="mb-1 text-xs font-semibold">Harga User / SRP (utama)</p>{product.priceCandidates?.map((candidate, candidateIndex) => <label key={`${candidate.column}-${candidateIndex}`} className="mb-1 flex items-center gap-1 text-xs"><input type="radio" name={`price-${index}`} checked={product.selectedPriceColumn === candidate.column} onChange={() => update(index, { price: candidate.amount ?? -1, selectedPriceColumn: candidate.column, priceConfirmed: false })} />{candidate.column}: <b>{candidate.raw}</b></label>)}{!product.priceCandidates?.length && <p className="text-xs text-destructive">Harga User/SRP tidak ditemukan.</p>}<label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={product.priceConfirmed ?? false} disabled={!product.selectedPriceColumn || product.price <= 0} onChange={(event) => update(index, { priceConfirmed: event.target.checked })} />Saya mengonfirmasi harga utama ini</label><p className="mt-1 text-xs">Harga utama: Rp {Number(product.price).toLocaleString('id-ID')}</p></div>
              <div className="rounded-lg bg-muted/40 p-2"><p className="mb-1 text-xs font-semibold">Harga Promo / Discount (opsional)</p>{product.discountCandidates?.map((candidate, candidateIndex) => <label key={`${candidate.column}-${candidateIndex}`} className="mb-1 flex items-center gap-1 text-xs"><input type="radio" name={`promo-${index}`} checked={product.selectedDiscountColumn === candidate.column} onChange={() => update(index, { discount_price: candidate.amount, selectedDiscountColumn: candidate.column, discountPriceConfirmed: false })} />{candidate.column}: <b>{candidate.raw}</b></label>)}<label className="mb-1 flex items-center gap-1 text-xs"><input type="radio" name={`promo-${index}`} checked={product.selectedDiscountColumn === 'none'} onChange={() => update(index, { discount_price: null, selectedDiscountColumn: 'none', discountPriceConfirmed: false })} />Tidak ada harga promo</label><label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={product.discountPriceConfirmed ?? false} disabled={!product.selectedDiscountColumn || (product.selectedDiscountColumn !== 'none' && (!product.discount_price || product.discount_price <= 0 || product.discount_price >= product.price))} onChange={(event) => update(index, { discountPriceConfirmed: event.target.checked })} />Saya mengonfirmasi {product.selectedDiscountColumn === 'none' ? 'tanpa promo' : 'harga promo ini'}</label><p className="mt-1 text-xs">Harga promo: {product.discount_price == null ? 'tidak ada' : `Rp ${Number(product.discount_price).toLocaleString('id-ID')}`}</p>{product.discountCandidates?.some((candidate) => candidate.amount === null || candidate.amount <= 0 || candidate.amount >= product.price) && product.selectedDiscountColumn !== 'none' && <p className="text-xs text-destructive">Harga promo harus lebih besar dari nol dan lebih rendah dari harga utama.</p>}</div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs"><span>Harga terpilih: {product.price}</span><span>Spesifikasi: {product.specifications.map((spec) => `${spec.key}: ${spec.value}`).join(' · ') || 'tidak terbaca'}</span></div>
            {product.warnings?.map((warning, i) => <p key={`w${i}`} className="text-xs text-amber-700">Peringatan: {warning}</p>)}{product.errors?.map((message, i) => <p key={`e${i}`} className="text-xs text-destructive">Error: {message}</p>)}{product.duplicateInDatabase && <p className="text-xs text-amber-700">SKU cocok dengan produk di database; pilih update atau lewati.</p>}{product.duplicateInFile && <p className="text-xs text-amber-700">SKU muncul lebih dari sekali di file; baris duplikat perlu dilewati.</p>}
          </article>)}
        </div><p className="text-xs text-muted-foreground">Kategori/brand harus cocok dengan data toko. Produk tanpa gambar tetap valid. Bila satu produk gagal validasi database, transaksi RPC membatalkan seluruh batch.</p></div>}
        <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Tutup</Button><Button type="button" disabled={busy || !ready} onClick={importProducts}>{busy && <LoaderCircle className="mr-2 size-4 animate-spin" />}{busy ? "Mengimpor..." : "Konfirmasi impor"}</Button></div>
      </section>
    </div>}
  </>;
}
