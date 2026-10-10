import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getBrandsAction } from "@/actions/catalog";

export const metadata: Metadata = {
  title: "Daftar Brand Produk",
  description: "Jelajahi berbagai pilihan brand komputer, laptop, dan aksesoris yang tersedia di Next Solution Store.",
  alternates: {
    canonical: "/brands",
  },
  openGraph: {
    title: "Daftar Brand Produk | Next Solution Store",
    description: "Jelajahi berbagai pilihan brand komputer, laptop, dan aksesoris yang tersedia di Next Solution Store.",
    url: "/brands",
  },
};

export default async function BrandsPage() {
  const brands = await getBrandsAction().catch(() => []);
  return <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="mb-2 text-3xl font-bold">Semua Brand</h1>
    <p className="mb-8 text-muted-foreground">Pilih brand untuk melihat produknya.</p>
    {brands.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{brands.map((brand) =>
      <Link key={brand.id} href={`/products?brand=${brand.id}`} className="group flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
        <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white p-2 text-xl font-bold text-primary" aria-hidden="true">
          {brand.logo_url ? <Image src={brand.logo_url} alt="" fill sizes="64px" unoptimized className="object-contain p-2" /> : brand.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 truncate font-semibold group-hover:text-primary">{brand.name}</span>
      </Link>
    )}</div> : <p className="rounded-2xl border p-8 text-muted-foreground">Belum ada brand yang tersedia.</p>}
  </main>;
}
