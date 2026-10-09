"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/actions/cart";
import { emitCartUpdated } from "@/lib/cart-events";

export function useAddToCart() {
  const router = useRouter();
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

  const addToCart = async (productId: string) => {
    setLoadingProductId(productId);
    try {
      const result = await addToCartAction(productId, 1);
      emitCartUpdated(result.cartCount);
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        router.push("/login");
      } else {
        alert("Failed to add to cart");
      }
    } finally {
      setLoadingProductId(null);
    }
  };

  return { addToCart, loadingProductId };
}
