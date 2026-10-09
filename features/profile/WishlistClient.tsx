"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Package, Trash2 } from "lucide-react";
import { toggleWishlistAction } from "@/actions/wishlist";
import { Button } from "@/components/ui/button";

type WishlistItem = {
  id: string;
  product_id: string;
  products?: {
    id: string;
    name: string;
    price: number;
    discount_price?: number | null;
    image?: string | null;
    product_images?: { url: string; is_primary?: boolean }[];
    product_specifications?: { key: string; value: string; display_order?: number | null }[];
    brands?: { name: string } | null;
  } | null;
};

export function WishlistClient({ initialWishlist }: { initialWishlist: WishlistItem[] }) {
  const [items, setItems] = useState(initialWishlist);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(productId: string) {
    setBusyId(productId);
    setError("");
    try {
      await toggleWishlistAction(productId);
      setItems((current) => current.filter((item) => item.product_id !== productId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memperbarui wishlist.");
    } finally {
      setBusyId(null);
    }
  }

  return <main className="container mx-auto min-h-[60vh] px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="mb-2 text-3xl font-bold">Wishlist</h1>
    <p className="mb-8 text-muted-foreground">Produk yang kamu simpan.</p>
    {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
    {items.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => {
      const product = item.products;
      if (!product) return null;
      const images = [...(product.product_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
      const imageUrl = product.image || images[0]?.url;
      const specifications = [...(product.product_specifications ?? [])]
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .slice(0, 3);
      const extraSpecs = Math.max(0, (product.product_specifications?.length ?? 0) - specifications.length);
      return <article key={item.id} className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:gap-4 sm:p-5">
        <Link href={`/product/${product.id}`} aria-label={`Lihat ${product.name}`} className="relative grid size-[72px] place-items-center overflow-hidden rounded-xl bg-muted sm:size-[88px]">
          {imageUrl ? <Image src={imageUrl} alt={product.name} fill sizes="(max-width: 640px) 72px, 88px" className="object-contain p-2 mix-blend-multiply" /> : <Package className="size-7 text-muted-foreground" aria-hidden="true" />}
        </Link>
        <Link href={`/product/${product.id}`} className="min-w-0 pt-0.5">
          <span className="line-clamp-2 font-semibold hover:text-primary">{product.name}</span>
          {product.brands?.name && <span className="mt-1 block text-sm text-muted-foreground">{product.brands.name}</span>}
          <span className="mt-2 block font-bold">Rp {Number(product.discount_price ?? product.price).toLocaleString("id-ID")}</span>
          {specifications.length > 0 && <span className="mt-2 flex flex-wrap gap-1.5">
            {specifications.map((specification, index) => <span key={`${specification.key}-${index}`} className="min-w-0 max-w-full truncate rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">{specification.key}:</span> {specification.value}</span>)}
            {extraSpecs > 0 && <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">+{extraSpecs} spek</span>}
          </span>}
        </Link>
        <Button variant="ghost" size="icon" aria-label={`Hapus ${product.name} dari wishlist`} disabled={busyId === item.product_id} onClick={() => remove(item.product_id)}>
          {busyId === item.product_id ? <Heart className="size-5 animate-pulse" /> : <Trash2 className="size-5 text-destructive" />}
        </Button>
      </article>;
    })}</div> : <div className="rounded-2xl border border-border py-16 text-center"><Heart className="mx-auto mb-4 size-10 text-muted-foreground" /><p className="mb-5 text-muted-foreground">Wishlist kamu masih kosong.</p><Button render={<Link href="/products" />}>Jelajahi produk</Button></div>}
  </main>;
}
