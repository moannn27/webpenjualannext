"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star, ShieldCheck, Truck, ArrowLeft, Heart, Share2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { addToCartAction } from "@/actions/cart";

interface ProductDetailProps {
  product: any;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"specs" | "reviews">("specs");
  const [loading, setLoading] = useState(false);

  const increment = () => setQuantity(prev => prev + 1);
  const decrement = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      await addToCartAction(product.id, quantity);
      router.push("/cart");
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        router.push("/login");
      } else {
        alert("Failed to add to cart: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const productPrice = product.discount_price || product.price;

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb & Back */}
      <div className="mb-8 flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/products" className="hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
        
        {/* Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square w-full bg-muted/30 rounded-[32px] overflow-hidden border border-border flex items-center justify-center p-8 group cursor-zoom-in">
            <Image
              src={product.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"}
              alt={product.name}
              fill
              className="object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-125"
            />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[product.image, product.image, product.image].map((img, idx) => (
              <button key={idx} className="relative w-24 h-24 rounded-2xl bg-muted/30 overflow-hidden border-2 border-transparent hover:border-primary shrink-0 focus-visible:outline-none focus-visible:border-primary transition-colors">
                <Image src={img || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"} alt="" fill className="object-cover mix-blend-multiply p-2" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted-foreground font-medium uppercase tracking-wider text-sm">{product.brands?.name || product.brand}</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Heart className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {product.name}
          </h1>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              <Star className="h-4 w-4 fill-primary" />
              <span>{product.rating || "5.0"}</span>
            </div>
            <span className="text-muted-foreground text-sm hover:underline cursor-pointer">
              Read {product.reviews || 0} reviews
            </span>
          </div>

          <div className="text-4xl font-bold text-foreground mb-8">
            ${productPrice}
            {product.discount_price && (
              <span className="ml-4 text-2xl text-muted-foreground line-through font-normal">
                ${product.price}
              </span>
            )}
          </div>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {product.description || "Experience the ultimate performance with the all-new architecture. Designed for those who demand the best in computing power, stunning visuals, and all-day battery life."}
          </p>

          <div className="space-y-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="font-semibold w-24">Quantity</div>
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
                {product.stock > 0 ? `${product.stock} pieces available` : "Out of stock"}
              </span>
            </div>
          </div>

          <Button disabled={loading || product.stock <= 0} onClick={handleAddToCart} size="lg" className="rounded-full w-full h-14 text-lg mb-8">
            {loading ? "Adding..." : `Add to Cart - $${(productPrice * quantity).toLocaleString()}`}
          </Button>

          <div className="grid grid-cols-2 gap-4 border-t pt-8">
            <div className="flex items-start gap-3">
              <Truck className="h-6 w-6 text-primary shrink-0" />
              <div>
                <h4 className="font-medium text-foreground">Free Delivery</h4>
                <p className="text-sm text-muted-foreground mt-1">Enter your postal code for Delivery Availability</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
              <div>
                <h4 className="font-medium text-foreground">Return Delivery</h4>
                <p className="text-sm text-muted-foreground mt-1">Free 30 Days Delivery Returns. Details</p>
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
            Specifications
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={cn(
              "pb-4 text-lg font-medium transition-colors border-b-2",
              activeTab === "reviews" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Reviews ({product.reviews || 0})
          </button>
        </div>

        <div className="min-h-[300px]">
          {activeTab === "specs" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 max-w-4xl">
              {[
                { label: "Processor", value: "Apple M3 Max" },
                { label: "Memory", value: "36GB Unified Memory" },
                { label: "Storage", value: "1TB SSD" },
                { label: "Display", value: "16.2-inch Liquid Retina XDR" },
                { label: "Graphics", value: "30-core GPU" },
                { label: "Operating System", value: "macOS Sonoma" },
              ].map((spec, i) => (
                <div key={i} className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground">{spec.label}</span>
                  <span className="font-medium text-foreground">{spec.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8 max-w-4xl">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted overflow-hidden relative shrink-0">
                    <Image src={`https://i.pravatar.cc/150?u=${i}`} alt="User" fill className="object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">User {i + 1}</h4>
                      <div className="flex">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Posted on Oct 24, 2024</p>
                    <p className="text-foreground">Absolutely amazing product! The build quality is top-notch and the performance exceeds my expectations. Would definitely buy again.</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full sm:w-auto">Load More Reviews</Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
