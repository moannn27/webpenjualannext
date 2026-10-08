import Link from "next/link";
import { ProductCard } from "@/components/shared/ProductCard";
import type { Product } from "@/store/useProductStore";

type Choice = { id: string; name: string };
type SearchParams = { search?: string; category?: string; brand?: string; promo?: string; sort?: string; page?: string };

function pageHref(params: SearchParams, page: number, basePath: string) {
  const query = new URLSearchParams();
  for (const key of ["search", "category", "brand", "promo", "sort"] as const) {
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
  return <section className="container mx-auto px-4 sm:px-6 lg:px-8">
  <form action={basePath} className="mb-8 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6">
      <input name="search" defaultValue={filters.search} placeholder="Cari nama, SKU, deskripsi..." className="h-10 rounded-lg border bg-background px-3 text-sm lg:col-span-2" />
      <select name="category" defaultValue={filters.category ?? ""} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="">Semua kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select name="brand" defaultValue={filters.brand ?? ""} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="">Semua brand</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select name="sort" defaultValue={filters.sort ?? "newest"} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="newest">Terbaru</option><option value="popular">Terpopuler</option><option value="price-low">Harga terendah</option><option value="price-high">Harga tertinggi</option></select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="promo" value="1" defaultChecked={filters.promo === "1"} />Promo saja</label>
      <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground lg:col-span-6">Terapkan filter</button>
    </form>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>Menampilkan {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} dari {total.toLocaleString("id-ID")} produk</span><span>{pageSize} produk per halaman · diatur super admin</span></div>
    {products.length ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">Produk tidak ditemukan. Ubah filter atau kata kunci.</div>}
    {pageCount > 1 && <nav aria-label="Halaman katalog" className="mt-10 flex items-center justify-center gap-4"><Link aria-disabled={page <= 1} className={`rounded-lg border px-4 py-2 text-sm ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"}`} href={pageHref(filters, Math.max(1, page - 1), basePath)}>Sebelumnya</Link><span className="text-sm text-muted-foreground">Halaman {page} dari {pageCount}</span><Link aria-disabled={page >= pageCount} className={`rounded-lg border px-4 py-2 text-sm ${page >= pageCount ? "pointer-events-none opacity-40" : "hover:bg-muted"}`} href={pageHref(filters, Math.min(pageCount, page + 1), basePath)}>Berikutnya</Link></nav>}
  </section>;
}
