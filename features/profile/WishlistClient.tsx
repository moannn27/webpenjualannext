"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { toggleWishlistAction } from "@/actions/wishlist";
import { Button } from "@/components/ui/button";

type WishlistItem = {
  id: string;
  product_id: string;
  products?: { id: string; name: string; price: number; discount_price?: number | null; brands?: { name: string } | null } | null;
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
      return <article key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <Link href={`/product/${product.id}`} className="min-w-0 flex-1">
          <p className="truncate font-semibold hover:text-primary">{product.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{product.brands?.name ?? ""}</p>
          <p className="mt-3 font-bold">Rp {Number(product.discount_price ?? product.price).toLocaleString("id-ID")}</p>
        </Link>
        <Button variant="ghost" size="icon" aria-label={`Hapus ${product.name} dari wishlist`} disabled={busyId === item.product_id} onClick={() => remove(item.product_id)}>
          {busyId === item.product_id ? <Heart className="size-5 animate-pulse" /> : <Trash2 className="size-5 text-destructive" />}
        </Button>
      </article>;
    })}</div> : <div className="rounded-2xl border border-border py-16 text-center"><Heart className="mx-auto mb-4 size-10 text-muted-foreground" /><p className="mb-5 text-muted-foreground">Wishlist kamu masih kosong.</p><Button render={<Link href="/products" />}>Jelajahi produk</Button></div>}
  </main>;
}
