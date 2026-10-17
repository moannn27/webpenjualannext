"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart, Heart, GitCompareArrows } from "lucide-react";
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
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, loadingProductId } = useAddToCart();
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const compareIds = useProductCompareStore((state) => state.ids);
  const toggleCompare = useProductCompareStore((state) => state.toggle);
  const compareSelected = compareIds.includes(product.id);
  const payablePrice = product.discountPrice ?? product.price;
  const regularPrice = product.discountPrice != null ? product.price : product.originalPrice;
  const isOutOfStock = (product.stock ?? 0) <= 0;

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

  const categoryBadge = product.category || product.brand || "GEAR";

  return (
    <div className="group flex flex-col transition-all duration-300">
      {/* 1. Image Container (Clean soft grey rounded square from reference image) */}
      <div className="relative aspect-square w-full rounded-2xl bg-[#F6F7F9] dark:bg-white/5 p-5 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:bg-[#EFF1F5] dark:group-hover:bg-white/10">
        {/* Micro Pill Badge at Top-Left */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 pointer-events-none">
          {isOutOfStock ? (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-600 text-white shadow-2xs tracking-wider uppercase">
              Habis
            </span>
          ) : (
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-white/90 dark:bg-black/50 text-slate-500 dark:text-slate-400 backdrop-blur-xs shadow-2xs">
              {categoryBadge}
            </span>
          )}
          {product.discountPrice != null && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white shadow-2xs">
              SALE
            </span>
          )}
        </div>

        {/* Wishlist Button at Top-Right */}
        <button
          type="button"
          onClick={toggleWishlist}
          aria-pressed={saved}
          className="absolute top-3 right-3 z-10 size-8 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xs flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-2xs cursor-pointer"
        >
          <Heart className={`size-4 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
          <span className="sr-only">{saved ? "Hapus dari wishlist" : "Tambah ke wishlist"}</span>
        </button>

        {/* High-res Centered Cutout Product Image */}
        <Link
          href={`/product/${product.id}`}
          className="relative w-full h-full flex items-center justify-center cursor-pointer"
        >
          <Image
            src={product.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
      </div>

      {/* 2. Product Details Below Image (Clean Minimalist Typography from reference) */}
      <div className="flex flex-col flex-1 pt-3">
        {/* Title */}
        <Link href={`/product/${product.id}`} className="block">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Subtitle / Specs */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
          {specsSummary || product.category || "Garansi Resmi"}
        </p>

        {/* Price & Action Row */}
        <div className="mt-2 pt-1 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tabular-nums">
              {formatPrice(payablePrice)}
            </span>
            {regularPrice != null && regularPrice > payablePrice && (
              <span className="text-[11px] text-slate-400 line-through tabular-nums">
                {formatPrice(regularPrice)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Compare Toggle */}
            <button
              type="button"
              onClick={() => toggleCompare(product.id)}
              disabled={!compareSelected && compareIds.length >= 3}
              aria-pressed={compareSelected}
              title={compareSelected ? "Hapus perbandingan" : "Bandingkan produk"}
              className={`size-8 rounded-full flex items-center justify-center transition-all ${
                compareSelected
                  ? "bg-primary text-white"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              <GitCompareArrows className="size-3.5" />
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
                "size-8 sm:size-9 rounded-full flex items-center justify-center transition-all shadow-xs cursor-pointer",
                isOutOfStock
                  ? "bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed opacity-60"
                  : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 active:scale-95 hover:bg-black dark:hover:bg-slate-100"
              )}
            >
              <ShoppingCart className="size-3.5 sm:size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
