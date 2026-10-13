"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isInView, setIsInView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // Responsive mobile detection for 3D card offset
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // Auto rotation: runs only when banner is in view and not hovered
  useEffect(() => {
    if (products.length <= 1 || isPaused || !isInView) return;
    const timer = setInterval(() => {
      goToNext();
    }, 5000);
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

  // Circular offset calculation for 3-card coverflow
  const getOffset = (idx: number) => {
    if (!products.length) return 0;
    let diff = idx - currentIndex;
    if (diff > products.length / 2) diff -= products.length;
    if (diff < -products.length / 2) diff += products.length;
    return diff;
  };

  // Card horizontal offset based on screen size
  const cardShift = isMobile ? 65 : 145;

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

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:grid-cols-12 lg:gap-8 lg:p-10 xl:p-12">
          {/* Left Side: Headline & Promo Description */}
          <div className="flex flex-col items-start justify-center lg:col-span-4 xl:col-span-4">
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

          {/* Right/Center Side: 3-Card 3D Coverflow Deck (Bayangan Kiri, Tengah Utama, Bayangan Kanan) */}
          <div className="flex w-full flex-col items-center justify-center lg:col-span-8 xl:col-span-8">
            {products.length > 0 ? (
              <div
                className="w-full flex flex-col items-center"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* 3D Coverflow Stage */}
                <div className="relative flex items-center justify-center w-full min-h-[440px] sm:min-h-[470px] lg:min-h-[480px]">
                  {products.map((product, idx) => {
                    const offset = getOffset(idx);
                    // Only render visible items within distance of 2 to save resources
                    if (Math.abs(offset) > 2) return null;

                    const isCenter = offset === 0;
                    const isLeft = offset === -1;
                    const isRight = offset === 1;

                    // Payable & discount calculation
                    const payablePrice = product.discountPrice ?? product.price;
                    const regularPrice = product.discountPrice != null ? product.price : product.originalPrice;
                    const discountPct = regularPrice && regularPrice > payablePrice
                      ? Math.round(((regularPrice - payablePrice) / regularPrice) * 100)
                      : null;
                    const savingAmount = regularPrice && regularPrice > payablePrice
                      ? regularPrice - payablePrice
                      : null;

                    // Motion variant coordinates
                    let targetX = 0;
                    let targetScale = 1;
                    let targetOpacity = 1;
                    let targetZIndex = 30;

                    if (isCenter) {
                      targetX = 0;
                      targetScale = 1;
                      targetOpacity = 1;
                      targetZIndex = 30;
                    } else if (isLeft) {
                      targetX = -cardShift;
                      targetScale = isMobile ? 0.88 : 0.86;
                      targetOpacity = 0.55;
                      targetZIndex = 15;
                    } else if (isRight) {
                      targetX = cardShift;
                      targetScale = isMobile ? 0.88 : 0.86;
                      targetOpacity = 0.55;
                      targetZIndex = 15;
                    } else if (offset === -2) {
                      targetX = -cardShift * 1.8;
                      targetScale = 0.72;
                      targetOpacity = 0;
                      targetZIndex = 5;
                    } else if (offset === 2) {
                      targetX = cardShift * 1.8;
                      targetScale = 0.72;
                      targetOpacity = 0;
                      targetZIndex = 5;
                    }

                    return (
                      <motion.div
                        key={product.id}
                        initial={false}
                        animate={{
                          x: targetX,
                          scale: targetScale,
                          opacity: targetOpacity,
                          zIndex: targetZIndex,
                        }}
                        transition={{
                          duration: 0.6,
                          ease: [0.25, 1, 0.5, 1], // Apple-style smooth decelerating cubic-bezier curve
                        }}
                        style={{
                          willChange: "transform, opacity",
                        }}
                        className={`absolute w-[270px] sm:w-[310px] md:w-[330px] lg:w-[340px] select-none ${
                          !isCenter ? "cursor-pointer" : ""
                        }`}
                        onClick={() => {
                          if (isLeft) goToPrev();
                          if (isRight) goToNext();
                        }}
                      >
                        {/* THE CARD */}
                        <div
                          className={`relative flex flex-col rounded-[24px] border p-4 sm:p-5 shadow-2xl transition-all duration-300 ${
                            isCenter
                              ? "border-white/35 bg-card text-card-foreground shadow-[0_24px_50px_rgba(0,0,0,0.35)]"
                              : "border-white/20 bg-card/80 text-card-foreground/80 hover:opacity-85 hover:border-white/40 shadow-xl"
                          }`}
                        >
                          {/* Top Bar: Badges & Controls */}
                          <div className="mb-2.5 flex items-center justify-between gap-1.5">
                            <div className="flex flex-wrap items-center gap-1">
                              {discountPct ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-xs">
                                  Sale {discountPct}%
                                </span>
                              ) : null}
                              {product.isBestSeller && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950 shadow-xs">
                                  <Star className="size-2.5 fill-slate-950" />
                                  Best Seller
                                </span>
                              )}
                              {product.isNewArrival && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-xs">
                                  <Sparkles className="size-2.5" />
                                  Baru
                                </span>
                              )}
                              {!discountPct && !product.isBestSeller && !product.isNewArrival && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-xs">
                                  Pilihan
                                </span>
                              )}
                            </div>

                            {/* Position pill for side shadow cards */}
                            {isLeft && (
                              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-muted-foreground backdrop-blur-xs">
                                ❮ Sebelumnya
                              </span>
                            )}
                            {isRight && (
                              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-muted-foreground backdrop-blur-xs">
                                Berikutnya ❯
                              </span>
                            )}

                            {/* Counter on Center Card */}
                            {isCenter && hasMultiple && (
                              <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                                {idx + 1}/{products.length}
                              </span>
                            )}
                          </div>

                          {/* Product Image */}
                          <div className="group/img relative mb-3 flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-white p-2.5 shadow-inner">
                            {/* Wishlist Button (only active on center card) */}
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

                            <Link
                              href={`/product/${product.id}`}
                              className="relative flex size-full items-center justify-center"
                              tabIndex={isCenter ? 0 : -1}
                              onClick={(e) => {
                                if (!isCenter) {
                                  e.preventDefault();
                                  if (isLeft) goToPrev();
                                  if (isRight) goToNext();
                                }
                              }}
                            >
                              <Image
                                src={product.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 100vw, 340px"
                                className="object-contain p-2 transition-transform duration-500 ease-out group-hover/img:scale-108"
                              />
                            </Link>
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

                            <Link
                              href={`/product/${product.id}`}
                              className="block"
                              tabIndex={isCenter ? 0 : -1}
                              onClick={(e) => {
                                if (!isCenter) {
                                  e.preventDefault();
                                  if (isLeft) goToPrev();
                                  if (isRight) goToNext();
                                }
                              }}
                            >
                              <h3 className="line-clamp-2 text-sm sm:text-base font-semibold leading-snug hover:text-primary transition-colors">
                                {product.name}
                              </h3>
                            </Link>

                            {/* Price */}
                            <div className="flex flex-col pt-0.5">
                              <span className="text-lg font-bold text-foreground sm:text-xl">
                                {formatPrice(payablePrice)}
                              </span>
                              {regularPrice != null && regularPrice > payablePrice && (
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
                              )}
                            </div>

                            {/* Action Buttons (Center Card only) */}
                            {isCenter ? (
                              <div className="grid grid-cols-2 gap-2 pt-2">
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
                              /* Side shadow card hint */
                              <div className="pt-2 text-center text-[11px] font-semibold text-primary">
                                Klik untuk melihat produk ini →
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
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

                      {/* Dots indicator with generous padding (never cut off) */}
                      <div className="flex items-center gap-1.5 py-1">
                        {products.map((p, idx) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setCurrentIndex(idx)}
                            aria-label={`Tampilkan produk spotlight ke-${idx + 1}`}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              currentIndex === idx
                                ? "w-7 bg-white shadow-md"
                                : "w-2 bg-white/40 hover:bg-white/70"
                            }`}
                          />
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
                      Produk {currentIndex + 1} dari {products.length} · Geser atau klik bayangan untuk mengganti
                    </p>
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
