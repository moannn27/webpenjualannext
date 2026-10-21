"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Star,
  ShieldCheck,
  Truck,
  ArrowLeft,
  Heart,
  Share2,
  Plus,
  Minus,
  Store,
  Headphones,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { addToCartAction } from "@/actions/cart";
import { toggleWishlistAction } from "@/actions/wishlist";
import { emitCartUpdated } from "@/lib/cart-events";
import { toast } from "@/store/useToastStore";
import { useCartStore } from "@/store/useCartStore";

interface ProductDetailData {
  id: string;
  name: string;
  image?: string | null;
  brands?: { name: string } | null;
  brand?: string;
  rating?: number;
  reviews?: number;
  discount_price?: number | null;
  price: number;
  stock: number;
  description?: string | null;
  product_images?: { id: string; url: string; alt_text?: string | null; is_primary?: boolean }[];
  product_specifications?: { id: string; key: string; value: string; display_order?: number }[];
  product_variants?: { id: string; sku: string | null; color: string; ram: string; storage: string; price: number | null; discount_price: number | null; stock: number; image_url?: string | null }[];
}

interface ProductReview {
  id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  users?: { full_name?: string | null } | null;
}

interface ProductDetailProps {
  product: ProductDetailData;
  reviews?: ProductReview[];
  initialCartQuantities?: { variant_id: string | null; quantity: number }[];
}

export function ProductDetail({ product, reviews = [], initialCartQuantities = [] }: ProductDetailProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const variants = useMemo(() => product.product_variants ?? [], [product.product_variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0] ?? null;
  const availableStock = selectedVariant?.stock ?? product.stock;
  const [cartQuantityByVariant, setCartQuantityByVariant] = useState<Record<string, number>>(() => Object.fromEntries(initialCartQuantities.map((item) => [item.variant_id ?? "product", item.quantity])));
  const selectedCartQuantity = cartQuantityByVariant[selectedVariant?.id ?? "product"] ?? 0;
  const remainingStock = Math.max(0, availableStock - selectedCartQuantity);
  const productPrice = selectedVariant?.discount_price ?? selectedVariant?.price ?? product.discount_price ?? product.price;
  const regularPrice = selectedVariant?.price ?? product.price;
  const [activeTab, setActiveTab] = useState<"specs" | "reviews">("specs");
  const [loading, setLoading] = useState(false);
  const [cartCountAfterAdd, setCartCountAfterAdd] = useState<number | null>(null);
  const [cartError, setCartError] = useState("");
  const baseImages = useMemo(() => {
    return product.product_images?.length ? product.product_images : [{ id: product.id, url: product.image ?? "", alt_text: product.name }];
  }, [product.product_images, product.image, product.id, product.name]);

  const images = useMemo(() => {
    const list = [...baseImages];
    for (const v of variants) {
      if (v.image_url && !list.some((img) => img.url === v.image_url)) {
        const variantLabel = [v.color, v.ram, v.storage].filter(Boolean).join(" ");
        list.push({
          id: `variant-${v.id}`,
          url: v.image_url,
          alt_text: `${product.name}${variantLabel ? ` - ${variantLabel}` : ""}`,
          is_primary: false,
        });
      }
    }
    return list;
  }, [baseImages, variants, product.name]);

  const [activeImage, setActiveImage] = useState(() => selectedVariant?.image_url || images[0]?.url || "");

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (url?: string) => {
    const targetUrl = url || activeImage || images[0]?.url;
    const foundIndex = images.findIndex((img) => img.url === targetUrl);
    setLightboxIndex(foundIndex >= 0 ? foundIndex : 0);
    setIsLightboxOpen(true);
  };

  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => {
          const next = (prev + 1) % images.length;
          setActiveImage(images[next]?.url);
          return next;
        });
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => {
          const next = (prev - 1 + images.length) % images.length;
          setActiveImage(images[next]?.url);
          return next;
        });
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen, images]);

  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState("");
  const reviewCount = reviews.length;
  const averageRating = reviewCount ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1) : "—";

  const increment = () => { setCartCountAfterAdd(null); setQuantity(prev => remainingStock > 0 ? Math.min(remainingStock, prev + 1) : prev); };
  const decrement = () => { setCartCountAfterAdd(null); setQuantity(prev => (prev > 1 ? prev - 1 : 1)); };

  const handleAddToCart = async () => {
    setLoading(true);
    setCartCountAfterAdd(null);
    setCartError("");
    setFeedback("");
    try {
      const result = await addToCartAction(product.id, quantity, selectedVariant?.id ?? null);
      setCartCountAfterAdd(result.cartCount);
      setCartQuantityByVariant((current) => ({ ...current, [selectedVariant?.id ?? "product"]: result.itemQuantity }));
      
      if (result.cartItem) {
        useCartStore.getState().addItemDirect(result.cartItem);
      }

      emitCartUpdated(result.cartCount);
      toast.success(
        "Berhasil Ditambahkan",
        `${quantity} unit "${product.name}" berhasil dimasukkan ke keranjang belanja.`
      );
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        toast.warning(
          "Silakan Masuk Terlebih Dahulu",
          "Anda perlu login untuk menambahkan produk ke keranjang."
        );
        router.push(`/login?redirect=/product/${product.id}`);
      } else {
        const rawMsg = error instanceof Error ? error.message : "Produk gagal dimasukkan ke keranjang.";
        const lower = rawMsg.toLowerCase();
        if (lower.includes("stok") || lower.includes("habis") || lower.includes("kosong")) {
          toast.error(
            "Stok Tidak Mencukupi",
            "Jumlah yang diminta melebihi stok yang tersedia saat ini."
          );
        } else {
          toast.error("Gagal Menambahkan", rawMsg);
        }
        setCartError(rawMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.info("Tautan Disalin", "Tautan produk telah disalin ke clipboard.");
        setFeedback("Tautan produk disalin.");
      }
    } catch {
      setFeedback("Tautan produk tidak dapat dibagikan.");
    }
  };

  const handleWishlist = async () => {
    try {
      const result = await toggleWishlistAction(product.id);
      setSaved(result.action === "added");
      if (result.action === "added") {
        toast.success("Wishlist", `"${product.name}" berhasil ditambahkan ke wishlist.`);
        setFeedback("Ditambahkan ke wishlist.");
      } else {
        toast.info("Wishlist", `"${product.name}" dihapus dari wishlist.`);
        setFeedback("Dihapus dari wishlist.");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        toast.warning("Silakan Masuk", "Masuk untuk menyimpan produk ke wishlist.");
        router.push(`/login?redirect=/product/${product.id}`);
      } else {
        toast.error("Gagal Wishlist", "Wishlist gagal diperbarui.");
        setFeedback("Wishlist gagal diperbarui.");
      }
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  const variantOptions = (key: "color" | "ram" | "storage") => [...new Set(variants.map((variant) => variant[key]).filter(Boolean))];
  const chooseVariant = (key: "color" | "ram" | "storage", value: string) => {
    const current = selectedVariant;
    const otherKeys = (["color", "ram", "storage"] as const).filter((option) => option !== key);
    const exactMatch = variants.find((variant) => variant[key] === value && otherKeys.every((option) => variant[option] === current?.[option]));
    const next = exactMatch ?? variants.find((variant) => variant[key] === value);
    if (next) {
      setSelectedVariantId(next.id);
      setQuantity(1);
      setCartCountAfterAdd(null);
      setCartError("");
      if (next.image_url) {
        setActiveImage(next.image_url);
      } else if (key === "color") {
        const norm = value.toLowerCase();
        const matched = images.find(
          (img) => img.alt_text?.toLowerCase().includes(norm) || img.url.toLowerCase().includes(norm)
        );
        if (matched) {
          setActiveImage(matched.url);
        }
      }
    }
  };
  const variantFields = [
    { key: "color", label: "Warna" },
    { key: "ram", label: "RAM" },
    { key: "storage", label: "Storage" },
  ] as const;

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb & Back */}
      <div className="mb-8 flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/products" className="hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
        
        {/* Gallery */}
        <div className="flex flex-col gap-4">
          <div
            onClick={() => openLightbox()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openLightbox();
              }
            }}
            aria-label="Klik untuk memperbesar gambar produk"
            className="relative aspect-square w-full bg-white dark:bg-card/60 rounded-[32px] overflow-hidden border border-border flex items-center justify-center p-6 sm:p-8 group cursor-zoom-in shadow-xs transition-all hover:border-primary/40"
          >
            <Image
              src={activeImage || product.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain transition-transform duration-500 group-hover:scale-105"
            />

            {/* Hover Indicator Badge */}
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-md shadow-xs border border-border/80 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
              <Maximize2 className="size-3.5 text-primary" />
              <span>Perbesar</span>
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {images.map((image, idx) => (
                <button
                  key={image.id || idx}
                  type="button"
                  onClick={() => {
                    setActiveImage(image.url);
                    setLightboxIndex(idx);
                    const matchingVariant = variants.find(
                      (v) => (v.image_url && v.image_url === image.url) ||
                             (v.color && image.alt_text?.toLowerCase().includes(v.color.toLowerCase()))
                    );
                    if (matchingVariant && matchingVariant.id !== selectedVariantId) {
                      setSelectedVariantId(matchingVariant.id);
                      setQuantity(1);
                    }
                  }}
                  aria-label={`Tampilkan gambar ${image.alt_text || product.name}`}
                  className={cn(
                    "relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-card/60 overflow-hidden border-2 shrink-0 transition-all p-1",
                    activeImage === image.url
                      ? "border-primary ring-2 ring-primary/20 scale-102"
                      : "border-border hover:border-primary/50 opacity-75 hover:opacity-100"
                  )}
                >
                  {image.url && (
                    <Image
                      src={image.url}
                      alt={image.alt_text || product.name}
                      fill
                      sizes="96px"
                      className="object-contain p-1.5"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted-foreground font-medium uppercase tracking-wider text-sm">{product.brands?.name || product.brand}</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" aria-label="Bagikan produk" onClick={handleShare} className="rounded-full">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={saved ? "Hapus dari wishlist" : "Tambahkan ke wishlist"} aria-pressed={saved} onClick={handleWishlist} className="rounded-full">
                <Heart className={`h-5 w-5 ${saved ? "fill-destructive text-destructive" : ""}`} />
              </Button>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {product.name}
          </h1>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              <Star className="h-4 w-4 fill-primary" />
              <span>{averageRating}</span>
            </div>
            <button type="button" onClick={() => setActiveTab("reviews")} className="text-muted-foreground text-sm hover:underline">
              Baca {reviewCount} ulasan
            </button>
          </div>
          {feedback && <p role="status" className="mb-4 text-sm text-primary">{feedback}</p>}

          <div className="text-4xl font-bold text-foreground mb-8">
            {formatPrice(productPrice)}
            {productPrice < regularPrice && (
              <span className="ml-4 text-2xl text-muted-foreground line-through font-normal">
                {formatPrice(regularPrice)}
              </span>
            )}
          </div>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {product.description || "Rasakan performa optimal dengan arsitektur terkini. Dirancang untuk memenuhi kebutuhan komputasi harian, grafis tajam, dan daya tahan maksimal."}
          </p>

          <div className="space-y-5 mb-8">
            {variants.length > 0 && (
              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 p-4">
                {variantFields.map(({ key, label }) => {
                  const options = variantOptions(key);
                  if (!options.length) return null;
                  const currentVal = selectedVariant?.[key];
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">{currentVal || "Pilih"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {options.map((option) => {
                          const isSelected = currentVal === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => chooseVariant(key, option)}
                              className={cn(
                                "px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                                  : "border-border bg-card text-foreground hover:bg-muted hover:border-primary/40"
                              )}
                            >
                              {key === "storage" ? `💾 ${option}` : option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {selectedVariant?.sku && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    SKU Varian: <span className="font-mono font-medium text-foreground">{selectedVariant.sku}</span>
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="font-semibold w-24">Jumlah</div>
              <div className="flex items-center border border-border rounded-full p-1 bg-card">
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={decrement}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={increment} disabled={remainingStock <= 0 || quantity >= remainingStock} aria-label="Tambah jumlah">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground ml-4">
                {availableStock > 0 ? (selectedCartQuantity ? `Stok ${availableStock} · ${selectedCartQuantity} di keranjang · ${remainingStock} bisa ditambah` : `${availableStock} unit tersedia` ) : "Varian ini sedang habis"}
              </span>
            </div>
          </div>

          <Button disabled={loading || remainingStock <= 0 || quantity > remainingStock} onClick={handleAddToCart} size="lg" className="rounded-full w-full h-14 text-lg mb-8">
            {loading ? "Menambahkan..." : remainingStock <= 0 ? (selectedCartQuantity > 0 ? "Stok sudah ada di keranjang" : "Stok habis") : `Tambah ke Keranjang — ${formatPrice(productPrice * quantity)}`}
          </Button>
          {cartError && <p role="alert" className="-mt-5 mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{cartError}. Cek jumlah varian ini di <Link href="/cart" className="font-semibold underline">keranjang</Link>.</p>}
          {cartCountAfterAdd !== null && <p role="status" className="-mt-5 mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {quantity} unit berhasil ditambahkan. Total isi keranjang {cartCountAfterAdd} unit. <Link href="/cart" className="font-semibold underline underline-offset-2">Lihat keranjang</Link>
          </p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 border-t border-border/80 pt-6">
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 transition-colors hover:bg-muted/50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground">Bisa Ambil di Tempat</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Pesan online, ambil langsung di toko fisik tanpa antre</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 transition-colors hover:bg-muted/50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground">100% Original & Garansi Resmi</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Barang segel asli dengan jaminan garansi resmi distributor</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 transition-colors hover:bg-muted/50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground">Pengiriman Cepat & Aman</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Packing aman dengan bubble wrap ekstra & opsi asuransi</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 transition-colors hover:bg-muted/50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Headphones className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground">Bantuan Teknisi & CS</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Konsultasi spek atau bantuan klaim dibantu ramah via CS</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-16">
        <div className="flex items-center gap-8 border-b border-border mb-8">
          <button
            onClick={() => setActiveTab("specs")}
            className={cn(
              "pb-4 text-lg font-medium transition-colors border-b-2",
              activeTab === "specs" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Spesifikasi
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={cn(
              "pb-4 text-lg font-medium transition-colors border-b-2",
              activeTab === "reviews" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Ulasan ({reviewCount})
          </button>
        </div>

        <div className="min-h-[300px]">
          {activeTab === "specs" ? (
            <div className="max-w-4xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
              <dl className="divide-y divide-border/60">
                {product.product_specifications?.length ? (
                  [...product.product_specifications]
                    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                    .map((spec, index) => (
                      <div
                        key={spec.id}
                        className={cn(
                          "grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 px-5 py-3.5 text-sm transition-colors",
                          index % 2 === 0 ? "bg-muted/25" : "bg-card hover:bg-muted/10"
                        )}
                      >
                        <dt className="sm:col-span-4 font-medium text-muted-foreground flex items-center">
                          {spec.key}
                        </dt>
                        <dd className="sm:col-span-8 font-semibold text-foreground break-words flex items-center">
                          {spec.value}
                        </dd>
                      </div>
                    ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Spesifikasi belum tersedia untuk produk ini.
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl">
              {reviews.length > 0 ? (
                <>
                  {/* Rating Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-foreground">{averageRating}</span>
                        <span className="text-xs text-muted-foreground">/ 5.0</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`size-4 ${
                                i < Math.round(Number(averageRating) || 5)
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-muted text-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Berdasarkan {reviewCount} ulasan pembeli
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="size-4" />
                      100% Pembelian Terverifikasi
                    </div>
                  </div>

                  {/* List of Verified Reviews */}
                  <div className="space-y-4">
                    {reviews.map((review) => {
                      const initials = (review.users?.full_name || "Pelanggan")
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <article
                          key={review.id}
                          className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-xs text-white">
                                {initials}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-foreground">
                                  {review.users?.full_name || "Pelanggan Terverifikasi"}
                                </h4>
                                <p className="text-[11px] text-muted-foreground">
                                  {new Date(review.created_at).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`size-3.5 ${
                                      i < review.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "fill-muted text-muted"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="size-3" />
                                Terverifikasi
                              </span>
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-light pl-1">
                            {review.comment || "Pembeli tidak menyertakan ulasan tertulis."}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Empty State (When no reviews yet) */
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center space-y-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-foreground">Belum Ada Ulasan Pembeli</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                      Ulasan untuk produk ini hanya dapat diberikan oleh pembeli terverifikasi setelah pesanan diterima dan selesai.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      Sudah membeli produk ini? Berikan ulasan di Pesanan Saya &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Modal Layar Penuh Gambar Produk */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau gambar produk layar penuh"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-md p-4 sm:p-6 select-none animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Header Bar */}
          <div
            className="flex items-center justify-between gap-4 w-full max-w-6xl mx-auto z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-md">
                {product.name}
              </h3>
              {images.length > 1 && (
                <p className="text-xs text-white/60">
                  Gambar {lightboxIndex + 1} dari {images.length}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
              aria-label="Tutup pratinjau"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Main Large Image Display with Prev/Next Controls */}
          <div
            className="relative flex-1 flex items-center justify-center w-full max-w-6xl mx-auto my-2 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const nextIdx = (lightboxIndex - 1 + images.length) % images.length;
                  setLightboxIndex(nextIdx);
                  setActiveImage(images[nextIdx]?.url);
                }}
                className="absolute left-2 sm:left-4 z-20 flex size-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 border border-white/20 active:scale-95 transition-all shadow-lg cursor-pointer"
                aria-label="Gambar sebelumnya"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            <div className="relative w-full h-full max-h-[75vh] flex items-center justify-center p-2">
              <img
                src={images[lightboxIndex]?.url || activeImage || product.image || ""}
                alt={images[lightboxIndex]?.alt_text || product.name}
                className="max-h-[75vh] max-w-[90vw] object-contain rounded-2xl drop-shadow-2xl animate-in zoom-in-95 duration-200"
              />
            </div>

            {images.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const nextIdx = (lightboxIndex + 1) % images.length;
                  setLightboxIndex(nextIdx);
                  setActiveImage(images[nextIdx]?.url);
                }}
                className="absolute right-2 sm:right-4 z-20 flex size-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 border border-white/20 active:scale-95 transition-all shadow-lg cursor-pointer"
                aria-label="Gambar berikutnya"
              >
                <ChevronRight className="size-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {images.length > 1 && (
            <div
              className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 max-w-xl mx-auto scrollbar-thin"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => {
                    setLightboxIndex(idx);
                    setActiveImage(img.url);
                  }}
                  className={cn(
                    "relative size-14 sm:size-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-white/5 cursor-pointer",
                    idx === lightboxIndex
                      ? "border-primary ring-2 ring-primary/40 scale-105"
                      : "border-white/20 hover:border-white/60 opacity-60 hover:opacity-100"
                  )}
                  aria-label={`Pilih gambar ${idx + 1}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt_text || product.name}
                    className="size-full object-contain p-1"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
