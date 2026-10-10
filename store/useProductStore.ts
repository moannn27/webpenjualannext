import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ADMIN_PRODUCTS } from "@/constants/adminDummy";

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: string;
  category: string;
  image: string;
  // Optional storefront fields
  brand?: string;
  discountPrice?: number | null;
  originalPrice?: number | null;
  specifications?: { id?: string; key: string; value: string; display_order?: number }[];
  rating?: number;
  reviews?: number;
  isBestSeller?: boolean;
  badges?: string[];
}

interface ProductState {
  products: Product[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
      // Initialize with dummy data
      products: ADMIN_PRODUCTS,
      addProduct: (product) =>
        set((state) => ({
          products: [
            ...state.products,
            { ...product, id: Math.random().toString(36).substr(2, 9) },
          ],
        })),
      updateProduct: (id, updatedFields) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updatedFields } : p
          ),
        })),
      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),
    }),
    {
      name: "product-storage",
    }
  )
);
