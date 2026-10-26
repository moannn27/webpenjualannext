"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Trash2, ArrowRight, LoaderCircle } from "lucide-react";
import { toggleWishlistAction } from "@/actions/wishlist";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shared/ProductCard";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";

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
    stock?: number;
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

  return (
    <main className="container mx-auto min-h-[60vh] px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
      {/* Outer Card Container */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2028] p-6 sm:p-8 lg:p-10 shadow-sm border border-slate-100 dark:border-white/5">
        {/* Header Bar */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Wishlist Saya
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Daftar produk pilihan yang kamu simpan ({items.length} item tersimpan).
            </p>
          </div>
          {items.length > 0 && (
            <Link
              href="/products"
              className="text-xs sm:text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              Lanjut belanja <ArrowRight className="size-4" />
            </Link>
          )}
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {items.map((item) => {
              const rawProduct = item.products;
              if (!rawProduct) return null;

              const storefrontProduct = toStorefrontProduct({
                ...rawProduct,
                stock: rawProduct.stock ?? 10,
                categories: null,
                brands: rawProduct.brands ?? null,
                product_images: (rawProduct.product_images || []).map((img) => ({
                  url: img.url,
                  is_primary: Boolean(img.is_primary),
                })),
              } as unknown as StoreProduct);

              return (
                <div key={item.id} className="relative group/wishlist flex flex-col">
                  <ProductCard product={storefrontProduct} />
                  {/* Delete Button on top-right */}
                  <button
                    type="button"
                    aria-label={`Hapus ${rawProduct.name} dari wishlist`}
                    disabled={busyId === item.product_id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void remove(item.product_id);
                    }}
                    className="absolute top-2.5 right-2.5 z-20 size-8 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-center transition-all hover:scale-110 cursor-pointer disabled:opacity-50"
                    title="Hapus dari Wishlist"
                  >
                    {busyId === item.product_id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 py-16 text-center">
            <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Heart className="size-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
              Wishlist kamu masih kosong
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              Simpan produk yang kamu incar dengan menekan tombol hati saat menjelajahi katalog.
            </p>
            <Button render={<Link href="/products" />} className="rounded-xl px-6">
              Jelajahi Produk
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
