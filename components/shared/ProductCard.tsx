"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Product } from "@/store/useProductStore";
import { addToCartAction } from "@/actions/cart";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating if wrapped in a link
    e.stopPropagation();
    setLoading(true);
    try {
      await addToCartAction(product.id, 1);
      // Optional: show a toast success
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        router.push("/login");
      } else {
        alert("Failed to add to cart");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="group relative flex flex-col bg-card rounded-[24px] border border-border p-4 transition-all duration-300 hover:shadow-xl hover:border-primary/20">
      
      {/* Badges */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
        {product.badges?.map((badge) => (
          <span
            key={badge}
            className={`px-3 py-1 text-xs font-semibold rounded-full ${
              badge === "Sale" ? "bg-destructive text-white" : "bg-primary text-white"
            }`}
          >
            {badge}
          </span>
        ))}
      </div>

      {/* Wishlist Button */}
      <button className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm text-muted-foreground hover:text-destructive hover:bg-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
        <Heart className="h-5 w-5" />
        <span className="sr-only">Add to wishlist</span>
      </button>

      {/* Image */}
      <Link href={`/product/${product.id}`} className="relative aspect-square mb-6 overflow-hidden rounded-[16px] bg-muted/30 flex items-center justify-center">
        <Image
          src={product.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"}
          alt={product.name}
          fill
          className="object-contain mix-blend-multiply p-4 transition-transform duration-500 group-hover:scale-110"
        />
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-1 mb-2 text-sm text-muted-foreground">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-medium text-foreground">{product.rating || "5.0"}</span>
          <span>({product.reviews || 0})</span>
        </div>
        
        <Link href={`/product/${product.id}`} className="block mb-1">
          <h3 className="font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mb-4">{product.brand || product.category}</p>
        
        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <Button size="icon" disabled={loading} className="rounded-full h-10 w-10 z-10" onClick={handleAddToCart}>
            <ShoppingCart className="h-4 w-4" />
            <span className="sr-only">Add to cart</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
