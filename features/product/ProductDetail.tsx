"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star, ShieldCheck, Truck, ArrowLeft, Heart, Share2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { addToCartAction } from "@/actions/cart";
import { toggleWishlistAction } from "@/actions/wishlist";
import { emitCartUpdated } from "@/lib/cart-events";
import { toast } from "@/store/useToastStore";

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
  product_variants?: { id: string; sku: string | null; color: string; ram: string; storage: string; price: number | null; discount_price: number | null; stock: number }[];
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
  const variants = product.product_variants ?? [];
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
  const images = product.product_images?.length ? product.product_images : [{ id: product.id, url: product.image ?? "", alt_text: product.name }];
  const [activeImage, setActiveImage] = useState(images[0]?.url ?? "");
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

  const formatPrice = (price: number) => `Rp ${Number(price).toLocaleString("id-ID")}`;
  const variantOptions = (key: "color" | "ram" | "storage") => [...new Set(variants.map((variant) => variant[key]).filter(Boolean))];
  const chooseVariant = (key: "color" | "ram" | "storage", value: string) => {
    const current = selectedVariant;
    const otherKeys = (["color", "ram", "storage"] as const).filter((option) => option !== key);
    const exactMatch = variants.find((variant) => variant[key] === value && otherKeys.every((option) => variant[option] === current?.[option]));
    const next = exactMatch ?? variants.find((variant) => variant[key] === value);
    if (next) { setSelectedVariantId(next.id); setQuantity(1); setCartCountAfterAdd(null); setCartError(""); }
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
          <div className="relative aspect-square w-full bg-muted/30 rounded-[32px] overflow-hidden border border-border flex items-center justify-center p-8 group cursor-zoom-in">
            <Image
              src={activeImage || product.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-125"
            />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {images.map((image) => (
              <button key={image.id} type="button" onClick={() => setActiveImage(image.url)} aria-label={`Tampilkan gambar ${image.alt_text || product.name}`} className={`relative w-24 h-24 rounded-2xl bg-muted/30 overflow-hidden border-2 ${activeImage === image.url ? "border-primary" : "border-transparent"} hover:border-primary shrink-0 focus-visible:outline-none focus-visible:border-primary transition-colors`}>
                {image.url && <Image src={image.url} alt={image.alt_text || product.name} fill sizes="96px" className="object-cover mix-blend-multiply p-2" />}
              </button>
            ))}
          </div>
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

          <div className="grid grid-cols-2 gap-4 border-t pt-8">
            <div className="flex items-start gap-3">
              <Truck className="h-6 w-6 text-primary shrink-0" />
              <div>
                <h4 className="font-medium text-foreground">Pengiriman Cepat</h4>
                <p className="text-sm text-muted-foreground mt-1">Bisa diantar kurir atau ambil langsung di toko</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
              <div>
                <h4 className="font-medium text-foreground">Jaminan Produk</h4>
                <p className="text-sm text-muted-foreground mt-1">Produk original dengan garansi resmi dan layanan terpercaya</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 max-w-4xl">
              {product.product_specifications?.length ? [...product.product_specifications].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)).map((spec) => (
                <div key={spec.id} className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground">{spec.key}</span>
                  <span className="font-medium text-foreground">{spec.value}</span>
                </div>
              )) : <p className="text-muted-foreground">Spesifikasi belum tersedia.</p>}
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
    </section>
  );
}
