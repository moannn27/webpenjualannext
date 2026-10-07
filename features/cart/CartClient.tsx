"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, ArrowRight } from "lucide-react";
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
      await updateCartQuantityAction(itemId, productId, newQ);
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
    const price = item.products.discount_price ?? item.products.price;
    return acc + price * item.quantity;
  }, 0);
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-12">
        Shopping Cart
      </h1>
      {error && <p role="alert" className="mb-6 text-sm text-destructive">{error}</p>}

      {cartItems.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-[32px] border">
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">Looks like you haven&apos;t added anything yet.</p>
          <Button render={<Link href="/products" />} size="lg" className="rounded-full">
            Continue Shopping
          </Button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-8">
          <div className="flex-1 space-y-6">
            {cartItems.map((item) => {
              const product = item.products;
              const price = product.discount_price ?? product.price;
              const isUpdating = loadingId === item.id;
              
              return (
                <div key={item.id} className={`flex flex-col sm:flex-row gap-6 p-6 bg-card rounded-[24px] border border-border items-center ${isUpdating ? 'opacity-50' : ''}`}>
                  <Link href={`/product/${product.id}`} className="relative h-24 w-24 shrink-0 bg-muted/50 rounded-xl overflow-hidden">
                    {/* Fallback to a placeholder if image doesn't exist */}
                    <Image src={product.image || product.product_images?.find((image) => image.is_primary)?.url || product.product_images?.[0]?.url || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"} alt={product.name} fill className="object-contain p-2 mix-blend-multiply" />
                  </Link>
                  <div className="flex-1 text-center sm:text-left">
                    <Link href={`/product/${product.id}`} className="font-semibold text-lg hover:text-primary transition-colors">
                      {product.name}
                    </Link>
                    <p className="text-muted-foreground text-sm">{product.brands?.name || 'Brand'}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center border border-border rounded-full p-1 bg-background">
                      <button type="button" aria-label={`Kurangi ${product.name}`} disabled={isUpdating} onClick={() => updateQuantity(item.id, product.id, item.quantity, -1)} className="p-1 hover:bg-muted rounded-full">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button type="button" aria-label={`Tambah ${product.name}`} disabled={isUpdating || item.quantity >= (product.stock ?? Infinity)} onClick={() => updateQuantity(item.id, product.id, item.quantity, 1)} className="p-1 hover:bg-muted rounded-full">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="font-bold text-lg w-20 text-right">
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

          <aside className="w-full lg:w-[400px] shrink-0">
            <div className="bg-card p-8 rounded-[32px] border border-border sticky top-24">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-8 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">Calculated at checkout</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">Calculated at checkout</span>
                </div>
                <div className="border-t pt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
              </div>

              <Button render={<Link href="/checkout" />} size="lg" className="w-full rounded-full h-14 text-lg">
                Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
