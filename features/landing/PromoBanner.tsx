"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingCart, 
  Star, 
  Heart, 
  ArrowRight,
  Tag,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/store/useProductStore";
import { useAddToCart } from "@/features/cart/useAddToCart";
import { toggleWishlistAction } from "@/actions/wishlist";

type LandingPromo = {
  title: string;
  headline: string;
  description: string;
  button_label: string;
  image_url: string;
  target_url: string | null;
};

interface PromoBannerProps {
  banner?: LandingPromo;
  sectionTitle?: string;
  sectionSubtitle?: string;
  products?: Product[];
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export function PromoBanner({
  banner,
  sectionTitle,
  sectionSubtitle,
  products = [],
}: PromoBannerProps) {
  const router = useRouter();
  const { addToCart, loadingProductId } = useAddToCart();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [savedProducts, setSavedProducts] = useState<Record<string, boolean>>({});
  const [fadeState, setFadeState] = useState<"visible" | "fading">("visible");

  const title = banner?.headline || "Temukan promo pilihan";
  const description =
    banner?.description ||
    sectionSubtitle ||
    "Lihat penawaran dan produk pilihan dari Next Solution.";
  const image = banner?.image_url;
  const hasMultiple = products.length > 1;

  // Auto rotation if multiple promo products exist
  const changeIndex = useCallback(
    (newIndex: number) => {
      setFadeState("fading");
      setTimeout(() => {
        setCurrentIndex(newIndex);
        setFadeState("visible");
      }, 150);
    },
    []
  );

  const goToNext = useCallback(() => {
    if (!products.length) return;
    const nextIdx = (currentIndex + 1) % products.length;
    changeIndex(nextIdx);
  }, [currentIndex, products.length, changeIndex]);

  const goToPrev = useCallback(() => {
    if (!products.length) return;
    const prevIdx = (currentIndex - 1 + products.length) % products.length;
    changeIndex(prevIdx);
  }, [currentIndex, products.length, changeIndex]);

  useEffect(() => {
    if (products.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      goToNext();
    }, 4500);
    return () => clearInterval(timer);
  }, [products.length, isPaused, goToNext]);

  // Current active product
  const activeProduct = products[currentIndex];

  const payablePrice = activeProduct
    ? activeProduct.discountPrice ?? activeProduct.price
    : 0;
  const regularPrice = activeProduct
    ? activeProduct.discountPrice != null
      ? activeProduct.price
      : activeProduct.originalPrice
    : null;

  const discountPct =
    regularPrice && regularPrice > payablePrice
      ? Math.round(((regularPrice - payablePrice) / regularPrice) * 100)
      : null;

  const savingAmount =
    regularPrice && regularPrice > payablePrice
      ? regularPrice - payablePrice
      : null;

  const handleToggleWishlist = async (productId: string) => {
    try {
      const res = await toggleWishlistAction(productId);
      setSavedProducts((prev) => ({ ...prev, [productId]: res.action === "added" }));
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        router.push("/login");
      }
    }
  };

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[26px] bg-primary text-primary-foreground shadow-2xl sm:rounded-[32px]">
        {/* Background decorative image with soft gradients */}
        <div className="pointer-events-none absolute inset-0 h-full w-full">
          {image && (
            <Image
              src={image}
              alt={banner?.title || "Promo"}
              fill
              sizes="100vw"
              className="object-cover opacity-15 mix-blend-overlay"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/80 lg:to-primary/60" />
        </div>

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:grid-cols-12 lg:gap-10 lg:p-12 xl:p-14">
          {/* Left Side: Headline & Promo Description */}
          <div className="flex flex-col items-start justify-center lg:col-span-7 xl:col-span-7">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold backdrop-blur-md sm:mb-4 sm:text-sm">
              <Sparkles className="size-3.5 text-amber-300" />
              {sectionTitle || banner?.title || "Promo Pilihan"}
            </span>

            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:mb-5 sm:text-4xl lg:text-5xl">
              {title}
            </h2>

            <p className="mb-6 max-w-xl text-base font-light text-primary-foreground/90 sm:mb-8 sm:text-lg">
              {description}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                render={<Link href={banner?.target_url || "/promo"} />}
                size="lg"
                className="rounded-full bg-white px-8 font-semibold text-primary shadow-lg hover:bg-white/90"
                aria-label={banner?.button_label || "Lihat penawaran promo"}
              >
                {banner?.button_label || "Lihat promo"}
              </Button>

              {hasMultiple && (
                <span className="hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white backdrop-blur-xs sm:inline-flex">
                  <Tag className="size-3 text-amber-300" />
                  {products.length} Produk Pilihan Spesial
                </span>
              )}
            </div>
          </div>

          {/* Right Side: Product Spotlight Card (Muncul Satu per Satu) */}
          <div className="flex w-full flex-col items-center justify-center lg:col-span-5 lg:items-end xl:col-span-5">
            {activeProduct ? (
              <div
                className="w-full max-w-sm sm:max-w-md lg:max-w-[360px] xl:max-w-[380px]"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                {/* Spotlight Card */}
                <div
                  className={`relative flex flex-col rounded-[22px] border border-white/25 bg-card p-4 text-card-foreground shadow-2xl backdrop-blur-md transition-all duration-300 sm:p-5 ${
                    fadeState === "fading" ? "opacity-60 scale-[0.99]" : "opacity-100 scale-100"
                  }`}
                >
                  {/* Top Bar of the Card: Badges & Carousel Controls */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                        Sale
                      </span>
                      {discountPct && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          Hemat {discountPct}%
                        </span>
                      )}
                    </div>

                    {/* Next / Prev Controls on the Card */}
                    {hasMultiple && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                          {currentIndex + 1} / {products.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={goToPrev}
                            aria-label="Produk promo sebelumnya"
                            className="inline-flex size-6 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted shadow-2xs"
                          >
                            <ChevronLeft className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={goToNext}
                            aria-label="Produk promo berikutnya"
                            className="inline-flex size-6 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted shadow-2xs"
                          >
                            <ChevronRight className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Image Area */}
                  <div className="group/img relative mb-3 flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-white p-3">
                    {/* Wishlist Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleWishlist(activeProduct.id)}
                      aria-label="Simpan ke wishlist"
                      className="absolute top-2.5 right-2.5 z-10 rounded-full bg-white/90 p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-white hover:text-destructive"
                    >
                      <Heart
                        className={`size-4 ${
                          savedProducts[activeProduct.id] ? "fill-destructive text-destructive" : ""
                        }`}
                      />
                    </button>

                    <Link
                      href={`/product/${activeProduct.id}`}
                      className="relative flex size-full items-center justify-center"
                    >
                      <Image
                        src={
                          activeProduct.image ||
                          "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"
                        }
                        alt={activeProduct.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 360px"
                        className="object-contain p-2 transition-transform duration-500 ease-out group-hover/img:scale-105"
                      />
                    </Link>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate font-semibold text-primary">
                        {activeProduct.brand || activeProduct.category || "Next Solution"}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-foreground">
                          {activeProduct.rating || "5.0"}
                        </span>
                        <span>({activeProduct.reviews || 0})</span>
                      </div>
                    </div>

                    <Link href={`/product/${activeProduct.id}`} className="block">
                      <h3 className="line-clamp-2 text-base font-semibold leading-snug hover:text-primary transition-colors">
                        {activeProduct.name}
                      </h3>
                    </Link>

                    {/* Price Tag */}
                    <div className="flex flex-col pt-1">
                      <span className="text-xl font-bold text-foreground sm:text-2xl">
                        {formatPrice(payablePrice)}
                      </span>
                      {regularPrice != null && regularPrice > payablePrice && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted-foreground line-through">
                            {formatPrice(regularPrice)}
                          </span>
                          {savingAmount && (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Hemat {formatPrice(savingAmount)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        type="button"
                        onClick={() => addToCart(activeProduct.id)}
                        disabled={loadingProductId === activeProduct.id}
                        className="w-full gap-1.5 rounded-xl text-xs font-semibold sm:text-sm"
                      >
                        <ShoppingCart className="size-4" />
                        <span>
                          {loadingProductId === activeProduct.id ? "Menambah..." : "Beli"}
                        </span>
                      </Button>

                      <Button
                        render={<Link href={`/product/${activeProduct.id}`} />}
                        variant="outline"
                        className="w-full gap-1 rounded-xl text-xs font-semibold sm:text-sm"
                      >
                        <span>Detail</span>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Dot Pagination Below Card */}
                {hasMultiple && (
                  <div className="mt-3.5 flex items-center justify-center gap-1.5">
                    {products.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => changeIndex(idx)}
                        aria-label={`Tampilkan produk promo ke-${idx + 1}`}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          currentIndex === idx
                            ? "w-6 bg-white shadow-xs"
                            : "w-2 bg-white/40 hover:bg-white/70"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Fallback when no promo product exists */
              <div className="flex w-full max-w-sm flex-col items-center justify-center rounded-[22px] border border-white/20 bg-white/10 p-6 text-center text-primary-foreground backdrop-blur-md">
                <Gift className="mb-2 size-10 text-white/80" />
                <h4 className="text-base font-semibold">Produk Promo Pilihan</h4>
                <p className="mt-1 text-xs text-primary-foreground/80">
                  Nantikan deretan produk terbaik dengan penawaran harga spesial dari kami!
                </p>
                <Button
                  render={<Link href="/products" />}
                  size="sm"
                  variant="outline"
                  className="mt-4 rounded-full border-white text-xs font-medium text-white hover:bg-white hover:text-primary"
                >
                  Jelajahi Katalog
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
