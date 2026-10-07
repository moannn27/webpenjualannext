"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Product } from "@/store/useProductStore";
import { useAddToCart } from "@/features/cart/useAddToCart";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlistAction } from "@/actions/wishlist";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, loadingProductId } = useAddToCart();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const toggleWishlist = async () => {
    try {
      const result = await toggleWishlistAction(product.id);
      setSaved(result.action === "added");
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") router.push("/login");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
      <button onClick={toggleWishlist} aria-pressed={saved} className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm text-muted-foreground hover:text-destructive hover:bg-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
        <Heart className={`h-5 w-5 ${saved ? "fill-destructive text-destructive" : ""}`} />
        <span className="sr-only">{saved ? "Remove from wishlist" : "Add to wishlist"}</span>
      </button>

      {/* Image */}
      <Link href={`/product/${product.id}`} className="relative aspect-square mb-6 overflow-hidden rounded-[16px] bg-white flex items-center justify-center">
        <Image
          src={product.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"}
          alt={product.name}
          fill
          sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-contain p-4 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
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
          <Button size="icon" disabled={loadingProductId === product.id} className="rounded-full h-10 w-10 z-10" onClick={() => addToCart(product.id)}>
            <ShoppingCart className="h-4 w-4" />
            <span className="sr-only">Add to cart</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
