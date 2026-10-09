"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star, ShieldCheck, Truck, ArrowLeft, Heart, Share2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { addToCartAction } from "@/actions/cart";
import { toggleWishlistAction } from "@/actions/wishlist";
import { submitReviewAction } from "@/actions/review";
import { Input } from "@/components/ui/input";

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
}

export function ProductDetail({ product, reviews = [] }: ProductDetailProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"specs" | "reviews">("specs");
  const [loading, setLoading] = useState(false);
  const images = product.product_images?.length ? product.product_images : [{ id: product.id, url: product.image ?? "", alt_text: product.name }];
  const [activeImage, setActiveImage] = useState(images[0]?.url ?? "");
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const reviewCount = reviews.length;
  const averageRating = reviewCount ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1) : "—";

  const increment = () => setQuantity(prev => Math.min(product.stock, prev + 1));
  const decrement = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      await addToCartAction(product.id, quantity);
      router.push("/cart");
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        router.push(`/login?redirect=/product/${product.id}`);
      } else {
        setFeedback(error instanceof Error ? error.message : "Produk gagal dimasukkan ke keranjang.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else { await navigator.clipboard.writeText(url); setFeedback("Tautan produk disalin."); }
    } catch { setFeedback("Tautan produk tidak dapat dibagikan."); }
  };

  const handleWishlist = async () => {
    try {
      const result = await toggleWishlistAction(product.id);
      setSaved(result.action === "added");
      setFeedback(result.action === "added" ? "Ditambahkan ke wishlist." : "Dihapus dari wishlist.");
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") router.push(`/login?redirect=/product/${product.id}`);
      else setFeedback("Wishlist gagal diperbarui.");
    }
  };

  const handleReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReviewLoading(true);
    setReviewError("");
    const formData = new FormData(event.currentTarget);
    formData.set("productId", product.id);
    try {
      await submitReviewAction(formData);
      setFeedback("Ulasan berhasil dikirim.");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") router.push(`/login?redirect=/product/${product.id}`);
      else setReviewError(error instanceof Error ? error.message : "Ulasan gagal dikirim.");
    } finally { setReviewLoading(false); }
  };

  const productPrice = product.discount_price ?? product.price;
  const formatPrice = (price: number) => `Rp ${Number(price).toLocaleString("id-ID")}`;

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
              className="object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-125"
            />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {images.map((image) => (
              <button key={image.id} type="button" onClick={() => setActiveImage(image.url)} aria-label={`Tampilkan gambar ${image.alt_text || product.name}`} className={`relative w-24 h-24 rounded-2xl bg-muted/30 overflow-hidden border-2 ${activeImage === image.url ? "border-primary" : "border-transparent"} hover:border-primary shrink-0 focus-visible:outline-none focus-visible:border-primary transition-colors`}>
                {image.url && <Image src={image.url} alt={image.alt_text || product.name} fill className="object-cover mix-blend-multiply p-2" />}
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
            {product.discount_price && (
              <span className="ml-4 text-2xl text-muted-foreground line-through font-normal">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {product.description || "Rasakan performa optimal dengan arsitektur terkini. Dirancang untuk memenuhi kebutuhan komputasi harian, grafis tajam, dan daya tahan maksimal."}
          </p>

          <div className="space-y-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="font-semibold w-24">Jumlah</div>
              <div className="flex items-center border border-border rounded-full p-1 bg-card">
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={decrement}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={increment}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground ml-4">
                {product.stock > 0 ? `${product.stock} unit tersedia` : "Stok habis"}
              </span>
            </div>
          </div>

          <Button disabled={loading || product.stock <= 0} onClick={handleAddToCart} size="lg" className="rounded-full w-full h-14 text-lg mb-8">
            {loading ? "Menambahkan..." : `Tambah ke Keranjang — ${formatPrice(productPrice * quantity)}`}
          </Button>

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
            <div className="space-y-8 max-w-4xl">
              {reviews.length ? reviews.map((review) => (
                <article key={review.id} className="border-b border-border pb-6">
                  <div className="mb-2 flex items-center gap-2"><h4 className="font-semibold">{review.users?.full_name || "Pelanggan"}</h4><div className="flex" aria-label={`${review.rating} dari 5 bintang`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-3 ${index < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />)}</div></div>
                  <p className="mb-2 text-sm text-muted-foreground">{new Date(review.created_at).toLocaleDateString("id-ID")}</p>
                  <p>{review.comment || "Tidak ada komentar."}</p>
                </article>
              )) : <p className="text-muted-foreground">Belum ada ulasan. Jadilah yang pertama.</p>}
              <form onSubmit={handleReview} className="max-w-xl space-y-3 rounded-2xl border border-border p-5">
                <h3 className="font-semibold">Tulis ulasan</h3>
                <label className="block text-sm">Rating<select name="rating" defaultValue="5" className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3"><option value="5">5 - Sangat bagus</option><option value="4">4 - Bagus</option><option value="3">3 - Cukup</option><option value="2">2 - Kurang</option><option value="1">1 - Buruk</option></select></label>
                <Input name="comment" placeholder="Ceritakan pengalamanmu" required minLength={3} />
                {reviewError && <p role="alert" className="text-sm text-destructive">{reviewError}</p>}
                <Button type="submit" disabled={reviewLoading}>{reviewLoading ? "Mengirim..." : "Kirim ulasan"}</Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
