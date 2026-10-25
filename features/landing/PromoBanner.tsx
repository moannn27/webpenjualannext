"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
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
  const [isInView, setIsInView] = useState(false);

  const bannerRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  const title = banner?.headline || "Temukan promo pilihan";
  const description =
    banner?.description ||
    sectionSubtitle ||
    "Lihat penawaran dan produk pilihan dari Next Solution.";
  const image = banner?.image_url;
  const hasMultiple = products.length > 1;

  // Preload all product images to eliminate decoding freeze during animation
  useEffect(() => {
    if (typeof window === "undefined" || !products.length) return;
    products.forEach((p) => {
      if (p.image) {
        const img = new window.Image();
        img.src = p.image;
      }
    });
  }, [products]);

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

  const goToNext = useCallback(() => {
    if (!products.length) return;
    setCurrentIndex((prev) => (prev + 1) % products.length);
  }, [products.length]);

  const goToPrev = useCallback(() => {
    if (!products.length) return;
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  }, [products.length]);

  const goToIndex = (targetIdx: number) => {
    if (targetIdx === currentIndex) return;
    setCurrentIndex(targetIdx);
  };

  // Auto rotation: runs only when banner is in view and not hovered
  useEffect(() => {
    if (products.length <= 1 || isPaused || !isInView) return;
    const timer = setInterval(() => {
      goToNext();
    }, 5500);
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

  // Safe active product index
  const safeIndex = products.length ? (currentIndex % products.length + products.length) % products.length : 0;
  const activeProduct = products[safeIndex];

  // Mathematical circular distance from active card
  const getDistance = (index: number, active: number, total: number) => {
    if (total <= 1) return 0;
    let d = ((index - active) % total + total) % total;
    if (d > total / 2) {
      d -= total;
    } else if (d === total / 2 && index < active) {
      d = -d;
    }
    return d;
  };

  // Hardware-accelerated 3D coverflow styling (transforms & opacity only, 0 layout shifts)
  const getCardStyle = (d: number) => {
    switch (d) {
      case 0:
        return {
          x: "0%",
          scale: 1,
          opacity: 1,
          zIndex: 30,
          pointerEvents: "auto" as const,
        };
      case 1:
        return {
          x: "70%",
          scale: 0.86,
          opacity: 0.58,
          zIndex: 20,
          pointerEvents: "auto" as const,
        };
      case -1:
        return {
          x: "-70%",
          scale: 0.86,
          opacity: 0.58,
          zIndex: 20,
          pointerEvents: "auto" as const,
        };
      case 2:
        return {
          x: "135%",
          scale: 0.72,
          opacity: 0,
          zIndex: 10,
          pointerEvents: "none" as const,
        };
      case -2:
        return {
          x: "-135%",
          scale: 0.72,
          opacity: 0,
          zIndex: 10,
          pointerEvents: "none" as const,
        };
      default:
        return {
          x: d > 0 ? "160%" : "-160%",
          scale: 0.6,
          opacity: 0,
          zIndex: 0,
          pointerEvents: "none" as const,
        };
    }
  };

  return (
    <section ref={bannerRef} className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* High-Performance Lightweight Cyber Gradient Container */}
      <div 
        className="relative overflow-hidden rounded-[28px] border border-blue-400/30 bg-[#071d49] text-primary-foreground shadow-[0_20px_50px_-15px_rgba(7,29,73,0.5)] sm:rounded-[34px]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 12% 18%, rgba(34, 211, 238, 0.16) 0%, transparent 45%),
            radial-gradient(circle at 88% 82%, rgba(99, 102, 241, 0.22) 0%, transparent 50%),
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

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:grid-cols-12 lg:gap-8 lg:p-10 xl:p-12">
          {/* Left Side: Headline & Promo Description */}
          <div className="flex flex-col items-start justify-center lg:col-span-4 xl:col-span-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/90 sm:mb-4 sm:text-sm">
              {sectionTitle || banner?.title || "Promo Pilihan"}
            </p>

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
                className="rounded-full bg-white px-8 font-bold text-blue-900 shadow-xl hover:bg-white/95 hover:scale-105 active:scale-95 transition-all duration-200"
                aria-label={banner?.button_label || "Lihat promo"}
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

          {/* Right/Center Side: 3-Card 3D Stage (Bayangan Kiri, Tengah Utama, Bayangan Kanan) */}
          <div className="flex w-full flex-col items-center justify-center lg:col-span-8 xl:col-span-8">
            {activeProduct ? (
              <div
                className="w-full max-w-[540px] sm:max-w-[600px] lg:max-w-[650px] flex flex-col items-center"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Continuous 3D Coverflow Carousel Stage */}
                <div className="relative flex items-center justify-center w-full min-h-[460px] sm:min-h-[485px] lg:min-h-[495px]">
                  {products.map((product, idx) => {
                    const d = getDistance(idx, safeIndex, products.length);

                    // Keep items within distance [-2, 2] so enter/exit buffers animate seamlessly with 0 DOM bloat
                    if (Math.abs(d) > 2) return null;

                    const isCenter = d === 0;
                    const isSide = Math.abs(d) === 1;
                    const payablePrice = product.discountPrice ?? product.price;
                    const regularPrice =
                      product.discountPrice != null
                        ? product.price
                        : product.originalPrice;
                    const discountPct =
                      regularPrice && regularPrice > payablePrice
                        ? Math.round(((regularPrice - payablePrice) / regularPrice) * 100)
                        : null;
                    const savingAmount =
                      regularPrice && regularPrice > payablePrice
                        ? regularPrice - payablePrice
                        : null;

                    const cardStyle = getCardStyle(d);
                    return (
                      <div
                        key={product.id}
                        style={{
                          transform: `translateX(${cardStyle.x}) scale(${cardStyle.scale})`,
                          opacity: cardStyle.opacity,
                          zIndex: cardStyle.zIndex,
                          pointerEvents: cardStyle.pointerEvents,
                          transition: "transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 520ms cubic-bezier(0.22, 1, 0.36, 1)",
                          willChange: "transform, opacity",
                        }}
                        className="absolute w-[275px] sm:w-[315px] md:w-[330px] select-none"
                      >
                        <div
                          className={`relative flex flex-col rounded-[24px] border bg-card p-4 sm:p-5 text-card-foreground transition-shadow duration-300 ${
                            isCenter
                              ? "border-white/35 shadow-2xl"
                              : "border-white/20 shadow-lg hover:opacity-80"
                          }`}
                        >
                          {/* Transparent click overlay for side cards */}
                          {isSide && (
                            <div
                              className="absolute inset-0 z-30 cursor-pointer rounded-[24px]"
                              title={
                                d < 0
                                  ? `Lihat sebelumnya: ${product.name}`
                                  : `Lihat berikutnya: ${product.name}`
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (d < 0) goToPrev();
                                else goToNext();
                              }}
                            />
                          )}

                          {/* Top Bar: Badges & Counter (Center) or Direction Indicator (Side) */}
                          <div className="mb-2.5 flex items-center justify-between gap-1.5 min-h-[24px]">
                            {isSide ? (
                              <>
                                <span className="rounded-full bg-slate-900/60 dark:bg-white/15 px-2.5 py-0.5 text-[10.5px] font-bold text-white backdrop-blur-xs">
                                  {d < 0 ? "❮ Sebelumnya" : "Berikutnya ❯"}
                                </span>
                                <span className="text-[11px] font-bold text-primary">
                                  {formatPrice(payablePrice)}
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center gap-1">
                                  {discountPct ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-xs">
                                      Sale {discountPct}%
                                    </span>
                                  ) : null}
                                  {product.isBestSeller && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950 shadow-xs">
                                      Best Seller
                                    </span>
                                  )}
                                  {product.isNewArrival && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-xs">
                                      Baru
                                    </span>
                                  )}
                                  {!discountPct && !product.isBestSeller && !product.isNewArrival && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-xs">
                                      Pilihan
                                    </span>
                                  )}
                                </div>

                                {hasMultiple && (
                                  <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                                    {safeIndex + 1}/{products.length}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Product Image Area */}
                          <div className="group/img relative mb-3 flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-white p-2.5 shadow-inner">
                            {isCenter && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleWishlist(product.id);
                                }}
                                aria-label="Simpan ke wishlist"
                                className="absolute top-2 right-2 z-10 rounded-full bg-white/90 p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-white hover:text-destructive active:scale-95"
                              >
                                <Heart
                                  className={`size-3.5 ${
                                    savedProducts[product.id] ? "fill-destructive text-destructive" : ""
                                  }`}
                                />
                              </button>
                            )}

                            <div className="relative flex size-full items-center justify-center">
                              <Image
                                src={product.image || "/product-image-unavailable.svg"}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 100vw, 340px"
                                className={`object-contain p-2 ${
                                  isCenter ? "transition-transform duration-500 ease-out group-hover/img:scale-108" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {/* Product Details */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="truncate font-semibold text-primary">
                                {product.brand || product.category || "Next Solution"}
                              </span>
                              <div className="flex shrink-0 items-center gap-1">
                                <Star className="size-3 fill-amber-400 text-amber-400" />
                                <span className="font-semibold text-foreground">
                                  {product.rating || "5.0"}
                                </span>
                              </div>
                            </div>

                            <h3 className="line-clamp-2 text-sm sm:text-base font-semibold leading-snug text-foreground">
                              {product.name}
                            </h3>

                            {/* Price Tag */}
                            <div className="flex flex-col pt-0.5">
                              <span className="text-lg font-bold text-foreground sm:text-xl">
                                {formatPrice(payablePrice)}
                              </span>
                              {regularPrice != null && regularPrice > payablePrice ? (
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="text-muted-foreground line-through">
                                    {formatPrice(regularPrice)}
                                  </span>
                                  {savingAmount && (
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      Hemat {formatPrice(savingAmount)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="h-[18px]" />
                              )}
                            </div>

                            {/* Action Buttons (Center) or Tap Hint (Side) */}
                            <div className="pt-2">
                              {isCenter ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if ((product.stock ?? 0) <= 0) {
                                        toast.error(
                                          "Barang Kosong / Stok Habis",
                                          `Maaf, produk "${product.name}" sedang kosong dan belum dapat dipesan.`
                                        );
                                        return;
                                      }
                                      addToCart(product.id, product.name);
                                    }}
                                    disabled={loadingProductId === product.id}
                                    className={`w-full gap-1 rounded-xl text-xs font-semibold ${
                                      (product.stock ?? 0) <= 0
                                        ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed opacity-70"
                                        : ""
                                    }`}
                                  >
                                    <ShoppingCart className="size-3.5" />
                                    <span>
                                      {loadingProductId === product.id
                                        ? "Menambah..."
                                        : (product.stock ?? 0) <= 0
                                        ? "Habis"
                                        : "Beli"}
                                    </span>
                                  </Button>

                                  <Button
                                    render={<Link href={`/product/${product.id}`} />}
                                    variant="outline"
                                    className="w-full gap-1 rounded-xl text-xs font-semibold hover:border-primary"
                                  >
                                    <span>Detail</span>
                                    <ArrowRight className="size-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 py-2 text-xs font-semibold text-primary">
                                  <span>Klik untuk pilih produk</span>
                                  <ArrowRight className="size-3" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* BOTTOM CONTROLS: Clean, un-clipped, centered pagination */}
                {hasMultiple && (
                  <div className="mt-4 flex flex-col items-center gap-2.5 px-2 pb-1">
                    {/* Centered Dots & Arrows Bar */}
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={goToPrev}
                        aria-label="Produk sebelumnya"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-all hover:bg-white/25 active:scale-90 shadow-sm"
                      >
                        <ChevronLeft className="size-4" />
                      </button>

                      {/* Dots indicator with generous touch targets */}
                      <div className="flex items-center gap-1 py-1">
                        {products.map((p, idx) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => goToIndex(idx)}
                            aria-label={`Tampilkan produk spotlight ke-${idx + 1}`}
                            className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center p-1 cursor-pointer"
                          >
                            <span
                              className={`h-2 rounded-full transition-all duration-300 ${
                                safeIndex === idx
                                  ? "w-7 bg-white shadow-md"
                                  : "w-2 bg-white/40 hover:bg-white/70"
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={goToNext}
                        aria-label="Produk berikutnya"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-all hover:bg-white/25 active:scale-90 shadow-sm"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>

                    {/* Status hint text */}
                    <p className="text-[11px] font-medium text-blue-200/80">
                      Produk {safeIndex + 1} dari {products.length} · Geser atau klik bayangan kiri/kanan untuk berganti
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback when no promo product exists */
              <div className="flex w-full max-w-sm flex-col items-center justify-center rounded-[24px] border border-white/20 bg-white/10 p-6 text-center text-primary-foreground backdrop-blur-md">
                <Gift className="mb-2 size-10 text-white/80" />
                <h3 className="text-base font-semibold">Produk Promo Pilihan</h3>
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
