import { create } from "zustand";

export interface ShareProductPayload {
  id: string;
  name: string;
  price?: number | null;
  formattedPrice?: string;
  image?: string | null;
  brand?: string | null;
  specs?: string | null;
  url?: string;
}

interface ShareState {
  isOpen: boolean;
  product: ShareProductPayload | null;
  openShare: (product: ShareProductPayload) => void;
  closeShare: () => void;
}

export const useShareStore = create<ShareState>((set) => ({
  isOpen: false,
  product: null,
  openShare: (product) => set({ isOpen: true, product }),
  closeShare: () => set({ isOpen: false, product: null }),
}));

/**
 * Pemicu global untuk membuka modal bagikan produk.
 * Dapat dipanggil dari kartu produk (katalog), detail produk, atau promo.
 *
 * Contoh:
 * ```ts
 * shareProduct({
 *   id: product.id,
 *   name: product.name,
 *   price: product.price,
 *   image: product.image,
 *   brand: product.brand,
 * });
 * ```
 */
export function shareProduct(product: ShareProductPayload) {
  useShareStore.getState().openShare(product);
}

