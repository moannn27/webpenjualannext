"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/actions/cart";
import { emitCartUpdated } from "@/lib/cart-events";
import { toast } from "@/store/useToastStore";

export function useAddToCart() {
  const router = useRouter();
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

  const addToCart = async (productId: string, productName?: string) => {
    setLoadingProductId(productId);
    try {
      const result = await addToCartAction(productId, 1);
      emitCartUpdated(result.cartCount);
      toast.success(
        "Berhasil Ditambahkan",
        productName
          ? `"${productName}" telah dimasukkan ke keranjang belanja.`
          : "Produk berhasil ditambahkan ke keranjang belanja."
      );
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        toast.warning(
          "Silakan Masuk Terlebih Dahulu",
          "Anda perlu login untuk menambahkan produk ke keranjang."
        );
        router.push("/login");
      } else {
        const rawMsg = error instanceof Error ? error.message : "Gagal menambahkan ke keranjang.";
        const lower = rawMsg.toLowerCase();

        if (
          lower.includes("pilih warna") ||
          lower.includes("spesifikasi") ||
          lower.includes("pilih varian")
        ) {
          toast.info(
            "Pilih Varian Produk",
            "Produk ini memiliki pilihan warna/spesifikasi. Silakan pilih terlebih dahulu di halaman produk."
          );
          router.push(`/product/${productId}`);
        } else if (
          lower.includes("stok") ||
          lower.includes("tidak tersedia") ||
          lower.includes("habis") ||
          lower.includes("kosong")
        ) {
          toast.error(
            "Stok Habis / Barang Kosong",
            productName
              ? `Maaf, stok produk "${productName}" sedang kosong dan tidak dapat dipesan.`
              : "Maaf, produk ini sedang kosong dan belum dapat ditambahkan ke keranjang."
          );
        } else {
          toast.error("Gagal Menambahkan", rawMsg);
        }
      }
    } finally {
      setLoadingProductId(null);
    }
  };

  return { addToCart, loadingProductId };
}
