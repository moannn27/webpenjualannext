import Link from "next/link";
import { getCategoriesAction } from "@/actions/catalog";

export default async function CategoriesPage() {
  const categories = await getCategoriesAction().catch(() => []);
  return <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="mb-2 text-3xl font-bold">Semua Kategori</h1>
    <p className="mb-8 text-muted-foreground">Jelajahi produk berdasarkan kategori.</p>
    {categories.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{categories.map((category) =>
      <Link key={category.id} href={`/products?category=${category.id}`} className="rounded-2xl border border-border bg-card p-6 font-semibold transition-colors hover:border-primary">{category.name}</Link>
    )}</div> : <p className="rounded-2xl border p-8 text-muted-foreground">Belum ada kategori yang tersedia.</p>}
  </main>;
}
