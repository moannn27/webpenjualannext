"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateCartQuantityAction, removeFromCartAction } from "@/actions/cart";
import { type CartData, type CartItem } from "@/types/cart";

export function CartClient({ initialCart }: { initialCart: CartData | null }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCart?.cart_items ?? []);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;

  const updateQuantity = async (itemId: string, productId: string, currentQ: number, delta: number) => {
    const newQ = currentQ + delta;
    if (newQ <= 0) return;
    
    setLoadingId(itemId);
    try {
      await updateCartQuantityAction(itemId, productId, newQ, cartItems.find((item) => item.id === itemId)?.variant_id ?? null);
      setCartItems((prev) => prev.map(item => item.id === itemId ? { ...item, quantity: newQ } : item));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal memperbarui jumlah produk.");
    } finally {
      setLoadingId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setLoadingId(itemId);
    try {
      await removeFromCartAction(itemId);
      setCartItems((prev) => prev.filter(item => item.id !== itemId));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal menghapus produk.");
    } finally {
      setLoadingId(null);
    }
  };

  const subtotal = cartItems.reduce((acc, item) => {
    const price = item.product_variants?.discount_price ?? item.product_variants?.price ?? item.products.discount_price ?? item.products.price;
    return acc + price * item.quantity;
  }, 0);
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-12">
        Keranjang Belanja
      </h1>
      {error && <p role="alert" className="mb-6 text-sm text-destructive">{error}</p>}

      {cartItems.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-[32px] border">
          <h2 className="text-2xl font-bold mb-4">Keranjangmu masih kosong</h2>
          <p className="text-muted-foreground mb-8">Yuk, cari produk yang kamu butuhkan.</p>
          <Button render={<Link href="/products" />} size="lg" className="rounded-full">
            Lihat produk
          </Button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-8">
          <div className="flex-1 space-y-6">
            {cartItems.map((item) => {
              const product = item.products;
              const variant = item.product_variants;
              const price = variant?.discount_price ?? variant?.price ?? product.discount_price ?? product.price;
              const itemStock = variant?.stock ?? product.stock ?? Infinity;
              const variantLabel = variant ? [variant.color, variant.ram && `RAM ${variant.ram}`, variant.storage].filter(Boolean).join(" · ") : "";
              const isUpdating = loadingId === item.id;
              const specifications = [...(product.product_specifications ?? [])]
                .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                .slice(0, 3);
              const extraSpecs = Math.max(0, (product.product_specifications?.length ?? 0) - specifications.length);
              const imageUrl = product.image || product.product_images?.find((image) => image.is_primary)?.url || product.product_images?.[0]?.url;
              
              return (
                <div key={item.id} className={`grid w-full grid-cols-[72px_minmax(0,1fr)] items-center gap-x-4 gap-y-4 rounded-[24px] border border-border bg-card p-4 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:gap-x-5 sm:p-6 ${isUpdating ? 'opacity-50' : ''}`}>
                  <Link href={`/product/${product.id}`} className="relative size-[72px] shrink-0 overflow-hidden rounded-xl bg-muted/50 sm:size-[88px]">
                    {imageUrl ? <Image src={imageUrl} alt={product.name} fill sizes="(max-width: 640px) 72px, 88px" className="object-contain p-2 mix-blend-multiply" /> : <span className="grid size-full place-items-center text-muted-foreground"><Package className="size-7" aria-hidden="true" /><span className="sr-only">Foto produk belum tersedia</span></span>}
                  </Link>
                  <div className="min-w-0 text-left">
                    <Link href={`/product/${product.id}`} className="line-clamp-2 font-semibold text-base transition-colors hover:text-primary sm:text-lg">
                      {product.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted-foreground">{product.brands?.name || 'Brand'}</p>
                    {variantLabel && <p className="mt-1 text-sm text-muted-foreground">Varian: {variantLabel}</p>}
                    {specifications.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      {specifications.map((specification, index) => <li key={`${specification.key}-${index}`} className="min-w-0 max-w-full truncate rounded-md bg-muted px-2 py-1"><span className="font-medium text-foreground">{specification.key}:</span> {specification.value}</li>)}
                      {extraSpecs > 0 && <li className="rounded-md bg-muted px-2 py-1">+{extraSpecs} spek</li>}
                    </ul>}
                  </div>
                  <div className="col-span-2 grid grid-cols-[minmax(96px,1fr)_auto_auto] items-center gap-3 sm:col-span-1 sm:flex sm:gap-4">
                    <div className="flex w-fit items-center rounded-full border border-border bg-background p-1">
                      <button type="button" aria-label={`Kurangi ${product.name}`} disabled={isUpdating} onClick={() => updateQuantity(item.id, product.id, item.quantity, -1)} className="p-1 hover:bg-muted rounded-full">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button type="button" aria-label={`Tambah ${product.name}`} disabled={isUpdating || item.quantity >= itemStock} onClick={() => updateQuantity(item.id, product.id, item.quantity, 1)} className="p-1 hover:bg-muted rounded-full">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="min-w-[104px] whitespace-nowrap text-right text-sm font-bold sm:text-base">
                      {formatPrice(price * item.quantity)}
                    </div>
                    <button type="button" aria-label={`Hapus ${product.name}`} disabled={isUpdating} onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="w-full shrink-0 lg:w-[400px]">
            <div className="bg-card p-8 rounded-[32px] border border-border sticky top-24">
              <h2 className="text-2xl font-bold mb-6">Ringkasan keranjang</h2>
              
              <div className="space-y-4 mb-8 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ongkir</span>
                  <span className="text-right text-xs font-medium text-muted-foreground">Dihitung saat checkout</span>
                </div>
                <div className="border-t pt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
              </div>

              <Button render={<Link href="/checkout" />} size="lg" className="w-full rounded-full h-14 text-lg">
                Lanjut ke checkout <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
