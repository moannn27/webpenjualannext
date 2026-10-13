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
  const [isInView, setIsInView] = useState(false);

  const bannerRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const lastWheelTime = useRef<number>(0);

  const title = banner?.headline || "Temukan promo pilihan";
  const description =
    banner?.description ||
    sectionSubtitle ||
    "Lihat penawaran dan produk pilihan dari Next Solution.";
  const image = banner?.image_url;
  const hasMultiple = products.length > 1;

  // Intersection Observer: only animate when banner is visible on screen
  useEffect(() => {
    const el = bannerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Change index with smooth transition (NEVER touches window scroll)
  const changeIndex = useCallback(
    (newIndex: number) => {
      setFadeState("fading");
      setTimeout(() => {
        setCurrentIndex(newIndex);
        setFadeState("visible");
      }, 140);
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

  // Auto rotation: runs only when in view and user is not hovering
  useEffect(() => {
    if (products.length <= 1 || isPaused || !isInView) return;
    const timer = setInterval(() => {
      goToNext();
    }, 4500);
    return () => clearInterval(timer);
  }, [products.length, isPaused, isInView, goToNext]);

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

  // Horizontal wheel scroll
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

  // Safe active product & next product (bayangan produk berikutnya)
  const safeIndex = products.length ? (currentIndex % products.length + products.length) % products.length : 0;
  const activeProduct = products[safeIndex];

  const nextIndex = products.length > 1 ? (safeIndex + 1) % products.length : null;
  const nextProduct = nextIndex !== null ? products[nextIndex] : null;

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
    <section ref={bannerRef} className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* High-Performance Lightweight Cyber Gradient Container */}
      <div 
        className="relative overflow-hidden rounded-[28px] border border-blue-400/30 bg-[#071d49] text-primary-foreground shadow-[0_24px_60px_-15px_rgba(7,29,73,0.5)] sm:rounded-[34px]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 12% 18%, rgba(34, 211, 238, 0.18) 0%, transparent 45%),
            radial-gradient(circle at 88% 82%, rgba(99, 102, 241, 0.24) 0%, transparent 50%),
            radial-gradient(circle at 55% 45%, rgba(251, 191, 36, 0.10) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08) 1.2px, transparent 1.2px),
            linear-gradient(135deg, #071d49 0%, #0f3470 50%, #06142e 100%)
          `,
          backgroundSize: "100% 100%, 100% 100%, 100% 100%, 24px 24px, 100% 100%",
        }}
      >
        {/* Optional background image overlay if provided */}
        {image && (
          <div className="pointer-events-none absolute inset-0 h-full w-full opacity-15 mix-blend-overlay">
            <Image
              src={image}
              alt={banner?.title || "Promo"}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:grid-cols-12 lg:gap-10 lg:p-12 xl:p-14">
          {/* Left Side: Headline & Promo Description */}
          <div className="flex flex-col items-start justify-center lg:col-span-5 xl:col-span-5">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3.5 py-1 text-xs font-semibold backdrop-blur-xs shadow-xs sm:mb-4 sm:text-sm">
              <Sparkles className="size-3.5 text-amber-300" />
              {sectionTitle || banner?.title || "Promo Pilihan"}
            </span>

            <h2 className="mb-3 text-3xl font-extrabold tracking-tight sm:mb-5 sm:text-4xl lg:text-5xl text-white">
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

          {/* Right Side: 3D Stacked Card Deck (Front Card + Bayangan Produk Berikutnya di Belakang) */}
          <div className="flex w-full flex-col items-center justify-center lg:col-span-7 xl:col-span-7 lg:items-end">
            {activeProduct ? (
              <div
                className="w-full max-w-[370px] sm:max-w-[430px] lg:max-w-[450px]"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
              >
                {/* 3D Stack Deck Container */}
                <div className="relative">
                  {/* BEHIND CARD: Bayangan Produk Berikutnya (Sticks out to the left to fill the middle space) */}
                  {nextProduct && (
                    <div
                      onClick={goToNext}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") goToNext();
                      }}
                      aria-label={`Tampilkan produk berikutnya: ${nextProduct.name}`}
                      className="absolute -left-6 sm:-left-10 lg:-left-12 top-3 sm:top-4 z-0 h-[94%] w-full cursor-pointer select-none rounded-[24px] border border-white/20 bg-card/75 p-4 text-card-foreground shadow-xl transition-all duration-500 ease-out hover:-left-8 sm:hover:-left-12 hover:opacity-90 active:scale-[0.98]"
                      style={{
                        transform: "scale(0.93)",
                        transformOrigin: "right center",
                        willChange: "transform, opacity",
                      }}
                      title="Klik untuk melihat produk berikutnya"
                    >
                      {/* Exposed left preview strip */}
                      <div className="absolute top-4 left-2.5 sm:left-3 flex flex-col items-center gap-1.5 text-primary">
                        <Sparkles className="size-3.5 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground [writing-mode:vertical-lr]">
                          Berikutnya
                        </span>
                      </div>

                      {/* Peeking preview content */}
                      <div className="ml-5 sm:ml-7 flex h-full flex-col justify-between opacity-80">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            Antrean Berikutnya
                          </span>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white p-1 shadow-2xs">
                            <Image
                              src={nextProduct.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"}
                              alt={nextProduct.name}
                              fill
                              sizes="64px"
                              className="object-contain p-1"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-foreground">
                              {nextProduct.name}
                            </p>
                            <p className="text-xs font-semibold text-primary">
                              {formatPrice(nextProduct.discountPrice ?? nextProduct.price)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end text-[11px] font-semibold text-primary">
                          <span>Klik untuk lihat</span>
                          <ArrowRight className="ml-1 size-3" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FRONT CARD: Active Product Spotlight */}
                  <div
                    className={`relative z-10 flex flex-col rounded-[24px] border border-white/30 bg-card p-4 sm:p-5 text-card-foreground shadow-2xl transition-all duration-300 ease-out ${
                      fadeState === "fading"
                        ? "opacity-60 scale-[0.98] translate-x-1"
                        : "opacity-100 scale-100 translate-x-0"
                    }`}
                    style={{ willChange: "transform, opacity" }}
                  >
                    {/* Top Bar: Badges & Navigation Buttons */}
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-950 shadow-xs">
                            <Star className="size-3 fill-slate-950" />
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

                      {/* Slide Indicator & Arrows on the Card */}
                      {hasMultiple && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                            {safeIndex + 1}/{products.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={goToPrev}
                              aria-label="Produk spotlight sebelumnya"
                              className="inline-flex size-6 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted shadow-2xs active:scale-90"
                            >
                              <ChevronLeft className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={goToNext}
                              aria-label="Produk spotlight berikutnya"
                              className="inline-flex size-6 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted shadow-2xs active:scale-90"
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
                </div>

                {/* BOTTOM CONTROLS: Clean, un-clipped, spacious pagination & preview */}
                {hasMultiple && (
                  <div className="mt-5 flex flex-col items-center gap-2.5 px-2 pb-1">
                    {/* Centered Dots & Arrows Bar */}
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={goToPrev}
                        aria-label="Produk sebelumnya"
                        className="inline-flex size-7 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/25 active:scale-90"
                      >
                        <ChevronLeft className="size-4" />
                      </button>

                      {/* Dots indicator with ample padding (never cut off) */}
                      <div className="flex items-center gap-1.5 py-1">
                        {products.map((p, idx) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => changeIndex(idx)}
                            aria-label={`Tampilkan produk spotlight ke-${idx + 1}`}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              safeIndex === idx
                                ? "w-6 bg-white shadow-md"
                                : "w-2 bg-white/40 hover:bg-white/70"
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={goToNext}
                        aria-label="Produk berikutnya"
                        className="inline-flex size-7 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/25 active:scale-90"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>

                    {/* Next Product Preview Badge (Full width, completely visible, never cut off) */}
                    {nextProduct && (
                      <button
                        type="button"
                        onClick={goToNext}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs text-white/90 shadow-2xs backdrop-blur-xs transition-all hover:bg-white/20 active:scale-95"
                      >
                        <span className="text-[11px] font-bold text-amber-300 shrink-0">Berikutnya:</span>
                        <span className="truncate max-w-[170px] font-medium">{nextProduct.name}</span>
                        <ArrowRight className="size-3 shrink-0 text-white/70" />
                      </button>
                    )}
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
