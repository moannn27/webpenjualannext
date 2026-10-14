"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

export function MobileStickyCartBar() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const items = useCartStore((state) => state.items);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const subtotal = useCartStore((state) => state.getSubtotal());

  if (!mounted) return null;

  // Hide on /cart and /checkout routes
  if (pathname.startsWith("/cart") || pathname.startsWith("/checkout") || pathname.startsWith("/admin")) {
    return null;
  }

  // Visible when cart has items
  const effectiveCount = totalItems || items.length;
  if (effectiveCount <= 0) return null;

  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(subtotal);

  return (
    <aside
      aria-label="Keranjang belanja cepat"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/80 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300"
    >
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <ShoppingCart className="size-4.5" />
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {effectiveCount}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground leading-tight">Total Keranjang</p>
            <p className="text-sm font-bold text-foreground tabular-nums truncate">
              {subtotal > 0 ? formattedPrice : `${effectiveCount} Barang`}
            </p>
          </div>
        </div>

        <Link
          href="/checkout"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition-transform active:scale-95 hover:bg-primary/90 shrink-0 cursor-pointer"
        >
          <span>Checkout Sekarang</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </aside>
  );
}

