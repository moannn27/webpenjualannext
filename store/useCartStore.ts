import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useState, useEffect } from "react";
import { getMasterProductById, type ProductItem } from "@/constants/products";
import { toast } from "@/store/useToastStore";
import { emitCartUpdated } from "@/lib/cart-events";

export interface StoredCartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  quantity: number;
  variantId?: string | null;
  variantLabel?: string | null;
}

interface CartStoreState {
  items: StoredCartItem[];
  addItem: (product: ProductItem, quantity?: number, variantId?: string | null, variantLabel?: string | null) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  /**
   * Security calculation: Re-look up product by ID from master product data
   * to guarantee prices in localStorage are never trusted.
   */
  getSubtotal: () => number;
  getTotalItems: () => number;
}

const customStorage = {
  getItem: (key: string) => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1, variantId = null, variantLabel = null) => {
        // Look up verified master product data
        const master = getMasterProductById(product.id) || product;
        const verifiedPrice = master.discountPrice ?? master.price;

        if (master.stock <= 0) {
          toast.error(
            "Stok Habis / Barang Kosong",
            `Maaf, produk "${master.name}" sedang kosong dan belum dapat dipesan.`
          );
          return;
        }

        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.productId === product.id && item.variantId === variantId
          );

          if (existingIndex > -1) {
            const nextItems = [...state.items];
            const currentItem = nextItems[existingIndex];
            const newQty = Math.min(master.stock, currentItem.quantity + quantity);
            nextItems[existingIndex] = {
              ...currentItem,
              quantity: newQty,
              price: verifiedPrice,
              stock: master.stock,
            };
            return { items: nextItems };
          }

          const newItem: StoredCartItem = {
            id: `${product.id}-${variantId || "default"}`,
            productId: product.id,
            name: master.name,
            price: verifiedPrice,
            category: master.category,
            image: master.image,
            stock: master.stock,
            quantity: Math.min(master.stock, Math.max(1, quantity)),
            variantId,
            variantLabel,
          };

          return { items: [...state.items, newItem] };
        });

        toast.success(
          "Berhasil Ditambahkan",
          `"${master.name}" telah dimasukkan ke keranjang belanja.`
        );
        emitCartUpdated(get().getTotalItems());
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item;
            const master = getMasterProductById(item.productId);
            const maxStock = master ? master.stock : item.stock;
            return {
              ...item,
              quantity: Math.min(maxStock, quantity),
              price: master ? (master.discountPrice ?? master.price) : item.price,
            };
          }),
        }));
        emitCartUpdated(get().getTotalItems());
      },

      removeItem: (id) => {
        const itemToRemove = get().items.find((item) => item.id === id);
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
        if (itemToRemove) {
          toast.info(
            "Produk Dihapus",
            `"${itemToRemove.name}" telah dihapus dari keranjang.`
          );
        }
        emitCartUpdated(get().getTotalItems());
      },

      clearCart: () => {
        set({ items: [] });
      },

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => {
          // Security fix: NEVER trust price values saved in localStorage.
          // Always re-lookup the item's id from the master product data to get the real price.
          const master = getMasterProductById(item.productId || item.id);
          const verifiedPrice = master
            ? Number(master.discountPrice ?? master.price)
            : Number(item.price || 0);

          return sum + verifiedPrice * item.quantity;
        }, 0);
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "next_solution_cart",
      storage: createJSONStorage(() => customStorage),
    }
  )
);

/**
 * Hook to safely read cart with a mounted state inside useEffect
 * to prevent Next.js Hydration Mismatch errors.
 */
export function useMountedCart() {
  const [mounted, setMounted] = useState(false);
  const cart = useCartStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return {
    ...cart,
    mounted,
    items: mounted ? cart.items : [],
    subtotal: mounted ? cart.getSubtotal() : 0,
    totalItems: mounted ? cart.getTotalItems() : 0,
  };
}
