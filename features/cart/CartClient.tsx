"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Minus, ArrowRight, Package, ShieldCheck, PackageCheck, Headphones, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateCartQuantityAction, removeFromCartAction, syncCartAction } from "@/actions/cart";
import { type CartData } from "@/types/cart";
import { getMasterProductById } from "@/constants/products";
import { useCartStore, type StoredCartItem } from "@/store/useCartStore";
import { formatCartItemToStored } from "@/lib/cart-utils";
import { CheckoutProgressHeader } from "@/components/checkout/CheckoutProgressHeader";
import { cn } from "@/lib/utils";

export function CartClient({
  initialCart,
  currentUserId,
}: {
  initialCart: CartData | null;
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState("");

  const items = useCartStore((state) => state.items);
  const updateStoreQuantity = useCartStore((state) => state.updateQuantity);
  const removeStoreItem = useCartStore((state) => state.removeItem);
  const getSubtotal = useCartStore((state) => state.getSubtotal);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  // MUST use mounted state inside useEffect before reading localStorage to prevent Next.js Hydration Mismatch errors
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      try {
        const serverCartItems: StoredCartItem[] = (initialCart?.cart_items || []).map((it) =>
          formatCartItemToStored(it as Parameters<typeof formatCartItemToStored>[0])
        );

        const activeUserId = currentUserId || null;
        if (activeUserId) {
          useCartStore.getState().syncWithUser(activeUserId, serverCartItems);
        } else {
          useCartStore.getState().clearCart();
        }
      } catch (e) {
        console.error("Failed to seed cart store", e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [initialCart, currentUserId]);

  const updateQuantity = async (itemId: string, productId: string, currentQ: number, delta: number) => {
    const newQ = currentQ + delta;
    if (newQ <= 0) {
      removeItem(itemId);
      return;
    }

    setLoadingId(itemId);
    try {
      updateStoreQuantity(itemId, newQ);
      await updateCartQuantityAction(
        itemId,
        productId,
        newQ,
        items.find((item) => item.id === itemId)?.variantId ?? null
      ).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui jumlah produk.");
    } finally {
      setLoadingId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setLoadingId(itemId);
    try {
      removeStoreItem(itemId);
      await removeFromCartAction(itemId).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus produk.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleProceedToCheckout = async () => {
    if (cartItems.length === 0) return;
    setIsCheckingOut(true);
    try {
      const payload = cartItems.map((it) => ({
        productId: it.productId || it.id,
        variantId: it.variantId ?? null,
        quantity: it.quantity,
      }));
      const res = await syncCartAction(payload);
      if (res.success && res.cart?.cart_items) {
        const seeded: StoredCartItem[] = res.cart.cart_items.map((it: Parameters<typeof formatCartItemToStored>[0]) =>
          formatCartItemToStored(it)
        );
        useCartStore.getState().setCartItems(seeded, currentUserId || null);
      }
      router.push("/checkout");
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        router.push("/login?redirect=/checkout");
      } else {
        router.push("/checkout");
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  const cartItems = mounted ? items : [];
  const subtotal = mounted ? getSubtotal() : 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
      {/* 3-Step Checkout Progress Header */}
      <CheckoutProgressHeader currentStep={1} />

      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-8">
        Keranjang Belanja
      </h1>
      {error && <p role="alert" className="mb-6 text-sm text-destructive">{error}</p>}

      {!mounted ? (
        <div className="py-24 bg-card rounded-[32px] border text-center text-muted-foreground animate-pulse">
          Memuat keranjang belanja...
        </div>
      ) : cartItems.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-[32px] border shadow-xs animate-in fade-in duration-300">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-4">
            <Package className="size-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Keranjangmu masih kosong</h2>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-sm">
            Yuk, jelajahi katalog kami dan temukan laptop atau perangkat yang kamu butuhkan.
          </p>
          <Button render={<Link href="/products" />} size="lg" className="rounded-full px-8 shadow-sm active:scale-95 transition-transform">
            Lihat Katalog Produk
          </Button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-8 animate-in fade-in duration-300">
          {/* Cart Items List */}
          <div className="flex-1 space-y-4">
            {cartItems.map((item) => {
              const master = getMasterProductById(item.productId || item.id);
              const isVariantItem = Boolean(item.variantId);
              const imageUrl = isVariantItem ? item.image : master?.image || item.image;
              const price = isVariantItem ? Number(item.price) : master ? Number(master.discountPrice ?? master.price) : Number(item.price);
              const itemStock = isVariantItem ? item.stock : master?.stock ?? item.stock ?? 10;
              const isUpdating = loadingId === item.id;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group grid w-full grid-cols-[72px_minmax(0,1fr)] items-center gap-x-4 gap-y-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:gap-x-5 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-500/30",
                    isUpdating && "opacity-50"
                  )}
                >
                  {/* Thumbnail Box */}
                  <Link
                    href={`/product/${master?.id || item.productId || item.id}`}
                    className="relative size-[72px] shrink-0 overflow-hidden rounded-xl bg-muted/30 sm:size-[88px] border border-border/60"
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={item.variantLabel ? `${item.name} - ${item.variantLabel}` : item.name}
                        fill
                        sizes="(max-width: 640px) 72px, 88px"
                        className="object-contain rounded-xl p-1 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="grid size-full place-items-center text-muted-foreground">
                        <Package className="size-7" aria-hidden="true" />
                        <span className="sr-only">Foto produk belum tersedia</span>
                      </span>
                    )}
                  </Link>

                  {/* Details */}
                  <div className="min-w-0 text-left">
                    <Link
                      href={`/product/${master?.id || item.productId || item.id}`}
                      className="line-clamp-2 font-semibold text-base transition-colors hover:text-primary sm:text-lg"
                    >
                      {item.name || master?.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground font-medium">
                      {master?.brand || master?.category || item.category || "Laptop & Komputer"}
                    </p>
                    {item.variantLabel && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Varian: <span className="font-semibold text-foreground/80">{item.variantLabel}</span>
                      </p>
                    )}
                    {item.variantSku && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        SKU: <span className="font-mono font-medium text-foreground/80">{item.variantSku}</span>
                      </p>
                    )}
                  </div>

                  {/* Controls & Price */}
                  <div className="col-span-2 grid grid-cols-[minmax(96px,1fr)_auto_auto] items-center gap-3 sm:col-span-1 sm:flex sm:gap-4">
                    <div className="flex w-fit items-center rounded-full border border-border bg-background p-1 shadow-2xs">
                      <button
                        type="button"
                        aria-label={`Kurangi ${item.name}`}
                        disabled={isUpdating}
                        onClick={() => updateQuantity(item.id, item.productId, item.quantity, -1)}
                        className="p-1 rounded-full text-muted-foreground hover:bg-muted active:scale-95 transition-transform cursor-pointer"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Tambah ${item.name}`}
                        disabled={isUpdating || item.quantity >= itemStock}
                        onClick={() => updateQuantity(item.id, item.productId, item.quantity, 1)}
                        className="p-1 rounded-full text-muted-foreground hover:bg-muted active:scale-95 transition-transform cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="min-w-[104px] whitespace-nowrap text-right text-sm font-bold sm:text-base tabular-nums">
                      {formatPrice(price * item.quantity)}
                    </div>

                    <button
                      type="button"
                      aria-label={`Hapus ${item.name}`}
                      disabled={isUpdating}
                      onClick={() => removeItem(item.id)}
                      className="p-2 rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors active:scale-95 cursor-pointer"
                      title="Hapus dari keranjang"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Summary Sidebar */}
          <aside className="w-full shrink-0 lg:w-[380px]">
            <div className="bg-card p-6 sm:p-7 rounded-[28px] border border-border sticky top-24 shadow-xs">
              <h2 className="text-xl font-bold mb-5 tracking-tight">Ringkasan keranjang</h2>

              <div className="space-y-3.5 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ongkos Kirim</span>
                  <span className="text-right text-xs font-medium text-muted-foreground">Dihitung saat checkout</span>
                </div>
                <div className="border-t border-border pt-3.5 flex justify-between text-base font-bold">
                  <span>Total Tagihan</span>
                  <span className="text-primary tabular-nums">{formatPrice(subtotal)}</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={isCheckingOut || cartItems.length === 0}
                size="lg"
                className="w-full rounded-xl h-12 text-sm font-semibold shadow-sm active:scale-95 transition-transform cursor-pointer"
              >
                {isCheckingOut ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Menyiapkan checkout...
                  </>
                ) : (
                  <>
                    Lanjut ke checkout <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Compact Trust Badges */}
              <div className="mt-6 pt-5 border-t border-border/80 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-7.5 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Garansi Resmi 100%</p>
                    <p className="text-[11px] text-muted-foreground">Produk asli distributor resmi bergaransi.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex size-7.5 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <PackageCheck className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Packing Aman &amp; Asuransi</p>
                    <p className="text-[11px] text-muted-foreground">Perlindungan ekstra bubble wrap &amp; pengiriman aman.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex size-7.5 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                    <Headphones className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Layanan Bantuan 24/7</p>
                    <p className="text-[11px] text-muted-foreground">Bantuan cepat via customer service WhatsApp resmi.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
