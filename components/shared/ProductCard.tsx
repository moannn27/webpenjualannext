"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart, GitCompareArrows, Sparkles, Flame } from "lucide-react";
import { type Product } from "@/store/useProductStore";
import { useAddToCart } from "@/features/cart/useAddToCart";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlistAction } from "@/actions/wishlist";
import { useProductCompareStore } from "@/store/useProductCompareStore";
import { collectLaptopSpecifications } from "@/lib/product-specifications";
import { toast } from "@/store/useToastStore";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  badgeContext?: "new" | "bestseller" | "promo" | "all";
}

export function ProductCard({ product, badgeContext = "all" }: ProductCardProps) {
  const { addToCart, loadingProductId } = useAddToCart();
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const compareIds = useProductCompareStore((state) => state.ids);
  const toggleCompare = useProductCompareStore((state) => state.toggle);
  const compareSelected = compareIds.includes(product.id);
  const payablePrice = product.discountPrice ?? product.price;
  const regularPrice = product.discountPrice != null ? product.price : product.originalPrice;
  const isOutOfStock = (product.stock ?? 0) <= 0;
  const discountPercent =
    regularPrice != null && regularPrice > payablePrice
      ? Math.round(((regularPrice - payablePrice) / regularPrice) * 100)
      : null;

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await toggleWishlistAction(product.id);
      setSaved(result.action === "added");
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") router.push("/login");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Specs extraction
  const specs = collectLaptopSpecifications(product.specifications);
  const detectedStorage = specs.Storage || product.name.match(/\b(128\s?GB|256\s?GB|512\s?GB|1\s?TB|2\s?TB)\b/i)?.[0];
  const detectedRam = specs.RAM || product.name.match(/\b(4\s?GB|8\s?GB|16\s?GB|32\s?GB|64\s?GB)\s*(?:RAM)?\b/i)?.[0];
  const specsSummary = [product.brand, detectedRam, detectedStorage].filter(Boolean).join(" • ");

  const rawIsNew = Boolean(
    product.isNewArrival ||
    product.badges?.includes("Baru") ||
    product.badges?.includes("Terbaru")
  );
  const rawIsBestSeller = Boolean(
    product.isBestSeller ||
    product.badges?.includes("Best Seller") ||
    product.badges?.includes("Terlaris")
  );

  // In dedicated carousels, prioritize the section's featured theme; in catalog/search show both if applicable
  const isNew = badgeContext === "bestseller" ? false : rawIsNew;
  const isBestSeller = badgeContext === "new" ? false : rawIsBestSeller;

  return (
    <div className="group relative flex flex-col h-full overflow-hidden rounded-2xl border border-slate-200/90 bg-card p-3 sm:p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 dark:border-white/10 dark:bg-card dark:hover:border-primary/50">
      {/* 1. Image Container */}
      <div className="relative aspect-square w-full rounded-xl bg-slate-50 dark:bg-white/[0.03] p-3 sm:p-4 flex items-center justify-center overflow-hidden border border-slate-100/80 dark:border-white/5 transition-colors duration-300 group-hover:bg-slate-100/60 dark:group-hover:bg-white/[0.06]">
        {/* Micro Badges at Top-Left (flex-wrap with max-w so NEVER colliding with wishlist button) */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-42px)] pointer-events-none">
          {isOutOfStock && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-600 text-white shadow-2xs tracking-wider uppercase">
              Habis
            </span>
          )}

          {product.discountPrice != null && !isOutOfStock && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-rose-500 text-white shadow-2xs">
              SALE
            </span>
          )}

          {isNew && (
            <span
              title="Produk Terbaru"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-blue-600 text-white shadow-2xs tracking-wide"
            >
              <Sparkles className="size-2.5" />
              Baru
            </span>
          )}

          {isBestSeller && (
            <span
              title="Produk Terlaris"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-500 text-slate-950 shadow-2xs tracking-wide"
            >
              <Flame className="size-2.5" />
              Terlaris
            </span>
          )}
        </div>

        {/* Top-Right: Wishlist Action (isolated, touch friendly on mobile/tablet) */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <button
            type="button"
            onClick={toggleWishlist}
            aria-pressed={saved}
            aria-label={saved ? "Hapus dari wishlist" : "Tambah ke wishlist"}
            title={saved ? "Hapus dari wishlist" : "Tambah ke wishlist"}
            className="size-7 sm:size-8 rounded-full bg-white/95 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200/70 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 shadow-2xs cursor-pointer"
          >
            <Heart className={`size-3.5 sm:size-4 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        </div>

        {/* High-res Centered Cutout Product Image */}
        <Link
          href={`/product/${product.id}`}
          className="relative w-full h-full flex items-center justify-center cursor-pointer"
        >
          <Image
            src={product.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
      </div>

      {/* 2. Product Details */}
      <div className="flex flex-col flex-1 pt-3">
        {/* Brand & Category micro meta */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <span className="truncate">{product.brand || "Official"}</span>
          {product.category && (
            <>
              <span className="text-slate-300 dark:text-slate-600 shrink-0">•</span>
              <span className="font-normal text-muted-foreground normal-case truncate">{product.category}</span>
            </>
          )}
        </div>

        {/* Title */}
        <Link href={`/product/${product.id}`} className="block group/title mt-1">
          <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 min-h-[2.6rem] sm:min-h-[2.85rem] leading-snug group-hover/title:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Subtitle / Specs */}
        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
          {specsSummary || "Garansi Resmi Distributor"}
        </p>

        {/* Price & Action Row (pinned to bottom with mt-auto) */}
        <div className="mt-auto pt-3 border-t border-border/70 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {regularPrice != null && regularPrice > payablePrice && (
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[11px] text-muted-foreground line-through tabular-nums">
                  {formatPrice(regularPrice)}
                </span>
                {discountPercent ? (
                  <span className="rounded bg-rose-500/10 px-1 py-0.2 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    -{discountPercent}%
                  </span>
                ) : null}
              </div>
            )}
            <span className="font-bold text-base sm:text-lg text-foreground tracking-tight tabular-nums">
              {formatPrice(payablePrice)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Compare Toggle */}
            <button
              type="button"
              onClick={() => toggleCompare(product.id)}
              disabled={!compareSelected && compareIds.length >= 3}
              aria-pressed={compareSelected}
              title={compareSelected ? "Hapus perbandingan" : "Bandingkan produk"}
              className={cn(
                "size-8 sm:size-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer",
                compareSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <GitCompareArrows className="size-4" />
            </button>

            {/* Quick Add To Cart Button */}
            <button
              type="button"
              disabled={loadingProductId === product.id}
              onClick={() => {
                if (isOutOfStock) {
                  toast.error(
                    "Barang Kosong / Stok Habis",
                    `Maaf, produk "${product.name}" sedang kosong dan belum dapat ditambahkan ke keranjang.`
                  );
                  return;
                }
                addToCart(product.id, product.name);
              }}
              aria-label={isOutOfStock ? `Stok ${product.name} habis` : `Tambah ${product.name} ke keranjang`}
              title={isOutOfStock ? "Stok habis" : "Tambah ke keranjang"}
              className={cn(
                "size-8 sm:size-9 rounded-xl flex items-center justify-center font-medium transition-all shadow-xs cursor-pointer",
                isOutOfStock
                  ? "bg-muted text-muted-foreground border border-border/60 cursor-not-allowed opacity-60"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-primary/20"
              )}
            >
              <ShoppingCart className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle bottom gradient accent bar on hover */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}
