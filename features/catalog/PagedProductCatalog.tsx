import Link from "next/link";
import { ProductCard } from "@/components/shared/ProductCard";
import type { Product } from "@/store/useProductStore";
import { ProductCompareBar } from "@/features/catalog/ProductCompareBar";
import type { CatalogSearchParams } from "@/lib/catalog-filters";

type Choice = { id: string; name: string };
type SearchParams = CatalogSearchParams;

function pageHref(params: SearchParams, page: number, basePath: string) {
  const query = new URLSearchParams();
  for (const key of ["search", "category", "brand", "promo", "sort", "price_min", "price_max", "processor", "ram", "storage", "gpu", "display", "stock"] as const) {
    const value = params[key];
    if (value) query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  return `${basePath}${query.size ? `?${query.toString()}` : ""}`;
}

export function PagedProductCatalog({ products, total, page, pageSize, categories, brands, filters, basePath = "/products" }: {
  products: Product[]; total: number; page: number; pageSize: number; categories: Choice[]; brands: Choice[]; filters: SearchParams;
  basePath?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return <><section className="container mx-auto px-4 sm:px-6 lg:px-8">
  <form action={basePath} className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border bg-card p-4 font-sans text-sm sm:grid-cols-2 lg:grid-cols-4">
      <input name="search" defaultValue={filters.search} placeholder="Cari nama, SKU, deskripsi..." className="h-10 min-w-0 rounded-lg border bg-background px-3 sm:col-span-2" />
      <select name="category" defaultValue={filters.category ?? ""} className="h-10 min-w-0 rounded-lg border bg-background px-3"><option value="">Semua kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select name="brand" defaultValue={filters.brand ?? ""} className="h-10 min-w-0 rounded-lg border bg-background px-3"><option value="">Semua brand</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <input aria-label="Harga minimum" name="price_min" type="number" min="0" defaultValue={filters.price_min} placeholder="Harga minimum" className="h-10 min-w-0 rounded-lg border bg-background px-3" />
      <input aria-label="Harga maksimum" name="price_max" type="number" min="0" defaultValue={filters.price_max} placeholder="Harga maksimum" className="h-10 min-w-0 rounded-lg border bg-background px-3" />
      <input name="processor" defaultValue={filters.processor} placeholder="Processor (mis. Core i5)" className="h-10 min-w-0 rounded-lg border bg-background px-3" />
      <input name="ram" defaultValue={filters.ram} placeholder="RAM (mis. 16 GB)" className="h-10 min-w-0 rounded-lg border bg-background px-3" />
      <input name="storage" defaultValue={filters.storage} placeholder="Storage (mis. 512 GB)" className="h-10 min-w-0 rounded-lg border bg-background px-3" />
      <input name="gpu" defaultValue={filters.gpu} placeholder="GPU (mis. RTX 4060)" className="h-10 min-w-0 rounded-lg border bg-background px-3" />
      <input name="display" defaultValue={filters.display} placeholder="Ukuran layar (mis. 14)" className="h-10 min-w-0 rounded-lg border bg-background px-3" />
      <select name="stock" defaultValue={filters.stock ?? ""} className="h-10 min-w-0 rounded-lg border bg-background px-3"><option value="">Semua stok</option><option value="in">Tersedia</option><option value="out">Habis</option></select>
      <select name="sort" defaultValue={filters.sort ?? "newest"} className="h-10 min-w-0 rounded-lg border bg-background px-3"><option value="newest">Terbaru</option><option value="popular">Terpopuler</option><option value="price-low">Harga terendah</option><option value="price-high">Harga tertinggi</option></select>
      <label className="relative flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg border font-medium transition-colors">
        <input type="checkbox" name="promo" value="1" defaultChecked={filters.promo === "1"} className="peer sr-only" />
        <span className="flex h-full w-full items-center justify-center bg-background px-4 transition-colors hover:bg-accent peer-checked:bg-primary peer-checked:text-primary-foreground">Promo saja</span>
      </label>
      <button className="h-10 rounded-lg bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90">Terapkan filter</button>
    </form>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>Menampilkan {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} dari {total.toLocaleString("id-ID")} produk</span><span>{pageSize} produk per halaman · diatur super admin</span></div>
    {products.length ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">Produk tidak ditemukan. Ubah filter atau kata kunci.</div>}
    {pageCount > 1 && <nav aria-label="Halaman katalog" className="mt-10 flex items-center justify-center gap-4"><Link aria-disabled={page <= 1} className={`rounded-lg border px-4 py-2 text-sm ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"}`} href={pageHref(filters, Math.max(1, page - 1), basePath)}>Sebelumnya</Link><span className="text-sm text-muted-foreground">Halaman {page} dari {pageCount}</span><Link aria-disabled={page >= pageCount} className={`rounded-lg border px-4 py-2 text-sm ${page >= pageCount ? "pointer-events-none opacity-40" : "hover:bg-muted"}`} href={pageHref(filters, Math.min(pageCount, page + 1), basePath)}>Berikutnya</Link></nav>}
  </section><ProductCompareBar /></>;
}
