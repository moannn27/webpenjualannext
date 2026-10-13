"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { toast } from "@/store/useToastStore";

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

  // Touch and wheel swipe state
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const lastWheelTime = useRef<number>(0);
  const pillTrackRef = useRef<HTMLDivElement>(null);

  const title = banner?.headline || "Temukan promo pilihan";
  const description =
    banner?.description ||
    sectionSubtitle ||
    "Lihat penawaran dan produk pilihan dari Next Solution.";
  const image = banner?.image_url;
  const hasMultiple = products.length > 1;

  // Change index with smooth fade transition
  // NEVER call scrollIntoView or window scroll!
  const changeIndex = useCallback(
    (newIndex: number, userClicked = false) => {
      setFadeState("fading");
      setTimeout(() => {
        setCurrentIndex(newIndex);
        setFadeState("visible");
      }, 140);

      // If user specifically clicked, scroll ONLY inside the horizontal pill track
      if (userClicked && pillTrackRef.current) {
        const track = pillTrackRef.current;
        const targetPill = track.querySelector(`[data-index="${newIndex}"]`) as HTMLElement | null;
        if (targetPill) {
          const targetLeft = targetPill.offsetLeft - track.offsetLeft - (track.clientWidth / 2) + (targetPill.clientWidth / 2);
          track.scrollTo({ left: targetLeft, behavior: "smooth" });
        }
      }
    },
    []
  );

  const goToNext = useCallback(() => {
    if (!products.length) return;
    const nextIdx = (currentIndex + 1) % products.length;
    changeIndex(nextIdx, false);
  }, [currentIndex, products.length, changeIndex]);

  const goToPrev = useCallback(() => {
    if (!products.length) return;
    const prevIdx = (currentIndex - 1 + products.length) % products.length;
    changeIndex(prevIdx, false);
  }, [currentIndex, products.length, changeIndex]);

  // Auto rotation every 4.5 seconds (paused on hover / touch)
  useEffect(() => {
    if (products.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      goToNext();
    }, 4500);
    return () => clearInterval(timer);
  }, [products.length, isPaused, goToNext]);

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null) {
      if (touchDeltaX.current < -40) {
        goToNext();
      } else if (touchDeltaX.current > 40) {
        goToPrev();
      }
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setIsPaused(false);
  };

  // Horizontal trackpad / wheel scroll
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 25 || (e.shiftKey && Math.abs(e.deltaY) > 25)) {
      const now = Date.now();
      if (now - lastWheelTime.current > 380) {
        lastWheelTime.current = now;
        if (e.deltaX > 0 || (e.shiftKey && e.deltaY > 0)) {
          goToNext();
        } else {
          goToPrev();
        }
      }
    }
  };

  // Safe active product
  const safeIndex = products.length ? (currentIndex % products.length + products.length) % products.length : 0;
  const activeProduct = products[safeIndex];

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
      {/* Rich Multi-Layer Glowing Gradient Container */}
      <div className="relative overflow-hidden rounded-[28px] border border-blue-400/30 bg-gradient-to-br from-[#071d49] via-[#0f3470] to-[#06142e] text-primary-foreground shadow-[0_24px_60px_-15px_rgba(7,29,73,0.5)] sm:rounded-[34px]">
        {/* Dynamic ambient glowing light orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Cyan glow top-left */}
          <div className="absolute -top-32 -left-32 size-[420px] rounded-full bg-cyan-400/25 blur-[100px] animate-pulse" />
          {/* Indigo/purple glow bottom-right */}
          <div className="absolute -bottom-32 -right-32 size-[450px] rounded-full bg-indigo-500/30 blur-[110px]" />
          {/* Subtle warm amber aura center-right */}
          <div className="absolute top-1/4 right-1/3 size-[300px] rounded-full bg-amber-400/15 blur-[95px]" />

          {/* Futuristic subtle tech grid pattern overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff20_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />

          {/* Elegant diagonal sheen beam */}
          <div className="absolute -inset-y-1/2 -right-1/4 w-2/3 rotate-12 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent blur-md" />

          {/* Banner image background if available */}
          {image && (
            <Image
              src={image}
              alt={banner?.title || "Promo"}
              fill
              sizes="100vw"
              className="object-cover opacity-15 mix-blend-overlay"
            />
          )}
        </div>

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:grid-cols-12 lg:gap-10 lg:p-12 xl:p-14">
          {/* Left Side: Headline & Promo Description */}
          <div className="flex flex-col items-start justify-center lg:col-span-7 xl:col-span-7">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3.5 py-1 text-xs font-semibold backdrop-blur-md shadow-xs sm:mb-4 sm:text-sm">
              <Sparkles className="size-3.5 text-amber-300" />
              {sectionTitle || banner?.title || "Promo Pilihan"}
            </span>

            <h2 className="mb-3 text-3xl font-extrabold tracking-tight sm:mb-5 sm:text-4xl lg:text-5xl bg-gradient-to-r from-white via-white to-blue-100 bg-clip-text text-transparent">
              {title}
            </h2>

            <p className="mb-6 max-w-xl text-base font-light text-blue-100/90 sm:mb-8 sm:text-lg leading-relaxed">
              {description}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                render={<Link href={banner?.target_url || "/promo"} />}
                size="lg"
                className="rounded-full bg-white px-8 font-bold text-primary shadow-xl hover:bg-white/95 hover:scale-105 active:scale-95 transition-all duration-200"
                aria-label={banner?.button_label || "Lihat penawaran promo"}
              >
                {banner?.button_label || "Lihat promo"}
              </Button>

              {hasMultiple && (
                <span className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs text-white backdrop-blur-xs sm:inline-flex">
                  <Tag className="size-3 text-amber-300" />
                  {products.length} Pilihan Unggulan & Best Seller
                </span>
              )}
            </div>
          </div>

          {/* Right Side: Product Spotlight Card */}
          <div className="flex w-full flex-col items-center justify-center lg:col-span-5 lg:items-end xl:col-span-5">
            {activeProduct ? (
              <div
                className="w-full max-w-sm sm:max-w-md lg:max-w-[360px] xl:max-w-[380px]"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
              >
                {/* Spotlight Card */}
                <div
                  className={`relative flex flex-col rounded-[24px] border border-white/30 bg-card/95 p-4 text-card-foreground shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 ease-out sm:p-5 ${
                    fadeState === "fading"
                      ? "opacity-50 scale-[0.98] translate-y-1"
                      : "opacity-100 scale-100 translate-y-0"
                  }`}
                >
                  {/* Top Bar of the Card: Badges & Carousel Controls */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {discountPct ? (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                            Sale
                          </span>
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            Hemat {discountPct}%
                          </span>
                        </>
                      ) : null}
                      {activeProduct.isBestSeller && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                          <Star className="size-3 fill-white" />
                          Best Seller
                        </span>
                      )}
                      {activeProduct.isNewArrival && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                          <Sparkles className="size-3" />
                          Terbaru
                        </span>
                      )}
                      {!discountPct && !activeProduct.isBestSeller && !activeProduct.isNewArrival && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                          Pilihan
                        </span>
                      )}
                    </div>

                    {/* Next / Prev Controls on the Card */}
                    {hasMultiple && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                          {safeIndex + 1} / {products.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={goToPrev}
                            aria-label="Produk spotlight sebelumnya"
                            className="inline-flex size-6 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted shadow-2xs active:scale-95"
                          >
                            <ChevronLeft className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={goToNext}
                            aria-label="Produk spotlight berikutnya"
                            className="inline-flex size-6 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted shadow-2xs active:scale-95"
                          >
                            <ChevronRight className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Image Area */}
                  <div className="group/img relative mb-3 flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-white p-3 shadow-inner">
                    {/* Wishlist Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleWishlist(activeProduct.id)}
                      aria-label="Simpan ke wishlist"
                      className="absolute top-2.5 right-2.5 z-10 rounded-full bg-white/90 p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-white hover:text-destructive active:scale-95"
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
                        className="object-contain p-2 transition-transform duration-500 ease-out group-hover/img:scale-108"
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
                        onClick={() => {
                          if ((activeProduct.stock ?? 0) <= 0) {
                            toast.error(
                              "Barang Kosong / Stok Habis",
                              `Maaf, produk "${activeProduct.name}" sedang kosong dan belum dapat dipesan.`
                            );
                            return;
                          }
                          addToCart(activeProduct.id, activeProduct.name);
                        }}
                        disabled={loadingProductId === activeProduct.id}
                        className={`w-full gap-1.5 rounded-xl text-xs font-semibold sm:text-sm ${
                          (activeProduct.stock ?? 0) <= 0
                            ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed opacity-70"
                            : ""
                        }`}
                      >
                        <ShoppingCart className="size-4" />
                        <span>
                          {loadingProductId === activeProduct.id
                            ? "Menambah..."
                            : (activeProduct.stock ?? 0) <= 0
                            ? "Habis"
                            : "Beli"}
                        </span>
                      </Button>

                      <Button
                        render={<Link href={`/product/${activeProduct.id}`} />}
                        variant="outline"
                        className="w-full gap-1 rounded-xl text-xs font-semibold sm:text-sm hover:border-primary"
                      >
                        <span>Detail</span>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Horizontal Scrollable Product Selector Pills & Dot Pagination */}
                {hasMultiple && (
                  <div className="mt-4 flex flex-col items-center gap-2.5">
                    {/* Horizontal scrollable pills */}
                    <div 
                      ref={pillTrackRef}
                      className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x"
                    >
                      {products.map((p, idx) => {
                        const isCurrent = safeIndex === idx;
                        return (
                          <button
                            key={p.id}
                            data-index={idx}
                            type="button"
                            onClick={() => changeIndex(idx, true)}
                            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] transition-all snap-center ${
                              isCurrent
                                ? "bg-white text-primary font-extrabold shadow-lg scale-105"
                                : "bg-white/15 text-white/90 hover:bg-white/30 backdrop-blur-sm font-medium"
                            }`}
                          >
                            {p.isBestSeller && <Star className="size-2.5 fill-amber-300 text-amber-300 shrink-0" />}
                            {!p.isBestSeller && p.discountPrice != null && <Tag className="size-2.5 text-rose-300 shrink-0" />}
                            <span className="max-w-[85px] truncate">{p.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Dot Pagination */}
                    <div className="flex items-center justify-center gap-1.5">
                      {products.map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => changeIndex(idx, true)}
                          aria-label={`Tampilkan produk spotlight ke-${idx + 1}`}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            safeIndex === idx
                              ? "w-5 bg-white shadow-xs"
                              : "w-1.5 bg-white/40 hover:bg-white/70"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback when no promo product exists */
              <div className="flex w-full max-w-sm flex-col items-center justify-center rounded-[24px] border border-white/20 bg-white/10 p-6 text-center text-primary-foreground backdrop-blur-md">
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
