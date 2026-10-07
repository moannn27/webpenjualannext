import Link from "next/link";
import { getBrandsAction } from "@/actions/catalog";

export default async function BrandsPage() {
  const brands = await getBrandsAction().catch(() => []);
  return <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="mb-2 text-3xl font-bold">Semua Brand</h1>
    <p className="mb-8 text-muted-foreground">Pilih brand untuk melihat produknya.</p>
    {brands.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{brands.map((brand) =>
      <Link key={brand.id} href={`/products?brand=${brand.id}`} className="rounded-2xl border border-border bg-card p-6 font-semibold transition-colors hover:border-primary">{brand.name}</Link>
    )}</div> : <p className="rounded-2xl border p-8 text-muted-foreground">Belum ada brand yang tersedia.</p>}
  </main>;
}
