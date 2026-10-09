"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bulkImportAdminProductsAction } from "@/actions/admin";
import { productImportHeaders, type ImportedProduct } from "@/lib/admin-product-import";

const sample = [
  "Contoh Laptop,DEMO-001,Laptop contoh untuk template,10000000,,0,Laptops,Lenovo,published,false,true,https://example.com/laptop.jpg,Prosesor: Intel Core i5; Layar: 14 inci,Abu-abu,16 GB,512 GB,DEMO-001-GRY,10000000,,3",
  "Contoh Laptop,DEMO-001,Laptop contoh untuk template,10000000,,0,Laptops,Lenovo,published,false,true,https://example.com/laptop.jpg,Prosesor: Intel Core i5; Layar: 14 inci,Hitam,16 GB,1 TB,DEMO-001-BLK,10500000,,2",
].join("\n");

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
  const variantCount = products.reduce((count, product) => count + product.variants.length, 0);

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setError(""); setNotice(""); setProducts([]); setFileName(file.name);
    const form = new FormData(); form.set("file", file);
    try {
      const response = await fetch("/api/admin/products/import/preview", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "File gagal dibaca.");
      setProducts(result.products); setNotice(`File siap: ${result.summary.productCount} produk dan ${result.summary.variantCount} varian.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "File gagal dibaca."); }
  };

  const importProducts = () => startTransition(async () => {
    setError("");
    try {
      const result = await bulkImportAdminProductsAction(products);
      await onImported(); setNotice(`${result.count} produk berhasil diimpor.`); setProducts([]); setFileName("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impor produk gagal."); }
  });

  return <>
    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { setOpen(true); setError(""); }}><FileUp className="mr-2 size-4" />Upload produk massal</Button>
    {open && <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="bulk-import-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-3xl space-y-4 overflow-y-auto rounded-2xl bg-card p-5 shadow-xl sm:p-6">
        <div><h2 id="bulk-import-title" className="text-xl font-bold">Upload produk massal</h2><p className="mt-1 text-sm text-muted-foreground">Isi satu template yang sama, lalu preview dan periksa data sebelum disimpan.</p></div>
        <div className="rounded-xl border bg-muted/30 p-4 text-sm"><p className="font-semibold">Format yang didukung</p><p className="mt-1 text-muted-foreground">Excel (.xlsx), CSV, Word (.docx), dan PDF. Excel memakai sheet pertama. Word/PDF harus memakai satu tabel dengan baris header template; PDF perlu tabel bergaris berisi teks yang bisa diseleksi, bukan hasil scan.</p><p className="mt-2 text-muted-foreground">Setiap baris adalah satu produk atau satu varian. Ulangi identitas produk di setiap baris variannya; isi SKU produk yang sama agar baris digabung. Kategori dan brand harus sudah tersedia di toko. Foto menggunakan URL HTTPS. Kolom spesifikasi memakai format `Prosesor: Intel; RAM: 16 GB`.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={downloadTemplate}><Download className="mr-2 size-4" />Unduh template CSV</Button></div>
        <input ref={input} type="file" accept=".xlsx,.csv,.docx,.pdf" className="sr-only" onChange={(event) => { void chooseFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <FileUp className="mr-2 size-4" />}Pilih file</Button>{fileName && <span className="max-w-full truncate text-sm text-muted-foreground">{fileName}</span>}</div>
        {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {products.length > 0 && <div className="space-y-3"><div className="flex flex-wrap gap-2"><Badge>{products.length} produk</Badge><Badge variant="secondary">{variantCount} varian</Badge></div><div className="max-h-64 overflow-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-2">Produk</th><th className="p-2">Brand / kategori</th><th className="p-2">Varian</th><th className="p-2">Stok</th></tr></thead><tbody>{products.slice(0, 50).map((product, index) => <tr key={`${product.sku}-${index}`} className="border-t"><td className="p-2"><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku || "Tanpa SKU"}</p></td><td className="p-2">{product.brand}<p className="text-xs text-muted-foreground">{product.category}</p></td><td className="p-2">{product.variants.length || "—"}</td><td className="p-2">{product.variants.length ? product.variants.reduce((sum, variant) => sum + variant.stock, 0) : product.stock}</td></tr>)}</tbody></table>{products.length > 50 && <p className="p-2 text-xs text-muted-foreground">Menampilkan 50 dari {products.length} produk.</p>}</div><p className="text-xs text-muted-foreground">Impor hanya menambahkan produk baru. Jika ada kesalahan validasi, data tidak disimpan sebagian.</p></div>}
        <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Tutup</Button><Button type="button" disabled={busy || products.length === 0} onClick={importProducts}>{busy && <LoaderCircle className="mr-2 size-4 animate-spin" />}{busy ? "Mengimpor..." : "Konfirmasi impor"}</Button></div>
      </section>
    </div>}
  </>;
}
