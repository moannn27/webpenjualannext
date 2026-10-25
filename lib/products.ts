import type { Product } from "@/store/useProductStore";
import { getSafeProductImageUrl } from "@/lib/product-gallery";

export type StoreProduct = {
  id: string;
  name: string;
  sku?: string | null;
  price: number | string;
  discount_price?: number | string | null;
  product_specifications?: { id?: string; key: string; value: string; display_order?: number }[];
  stock: number;
  status?: string;
  is_best_seller?: boolean;
  is_new_arrival?: boolean;
  categories?: { name: string } | null;
  brands?: { name: string } | null;
  product_images?: { url: string; is_primary: boolean }[];
};

export function toStorefrontProduct(row: StoreProduct): Product {
  const discount = row.discount_price == null ? null : Number(row.discount_price);
  const badges: string[] = [];
  if (discount !== null) badges.push("Sale");
  if (row.is_best_seller) badges.push("Best Seller");
  if (row.is_new_arrival) badges.push("Baru");

  return {
    id: row.id,
    name: row.name,
    sku: row.sku ?? "",
    price: Number(row.price),
    discountPrice: discount,
    originalPrice: discount === null ? null : Number(row.price),
    stock: row.stock,
    status: row.status ?? "published",
    isBestSeller: Boolean(row.is_best_seller),
    isNewArrival: Boolean(row.is_new_arrival),
    category: row.categories?.name ?? "",
    brand: row.brands?.name ?? "",
    image: getSafeProductImageUrl(row.product_images),
    specifications: row.product_specifications ?? [],
    badges,
  };
}
