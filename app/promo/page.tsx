import Link from "next/link";
import { getProductsAction } from "@/actions/product";
import { ProductCard } from "@/components/shared/ProductCard";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";

export default async function PromoPage() {
  const products = await getProductsAction({}).catch(() => []);
  const discounted = (products ?? []).map((product) => toStorefrontProduct(product as StoreProduct)).filter((product) => product.originalPrice != null);
  return <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="mb-2 text-3xl font-bold">Promo</h1>
    <p className="mb-8 text-muted-foreground">Produk dengan harga diskon yang tersedia saat ini.</p>
    {discounted.length ? <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{discounted.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="rounded-2xl border p-8 text-center"><p className="mb-4 text-muted-foreground">Belum ada produk promo.</p><Link className="text-primary hover:underline" href="/products">Lihat semua produk</Link></div>}
  </main>;
}
