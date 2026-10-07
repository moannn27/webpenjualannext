import type { Product } from "@/store/useProductStore";

export type StoreProduct = {
  id: string;
  name: string;
  sku?: string | null;
  price: number | string;
  discount_price?: number | string | null;
  stock: number;
  status?: string;
  is_best_seller?: boolean;
  categories?: { name: string } | null;
  brands?: { name: string } | null;
  product_images?: { url: string; is_primary: boolean }[];
};

export function toStorefrontProduct(row: StoreProduct): Product {
  const discount = row.discount_price == null ? null : Number(row.discount_price);
  return {
    id: row.id,
    name: row.name,
    sku: row.sku ?? "",
    price: discount ?? Number(row.price),
    originalPrice: discount === null ? null : Number(row.price),
    stock: row.stock,
    status: row.status ?? "published",
    isBestSeller: row.is_best_seller ?? false,
    category: row.categories?.name ?? "",
    brand: row.brands?.name ?? "",
    image: row.product_images?.find((image) => image.is_primary)?.url ?? row.product_images?.[0]?.url ?? "",
    badges: discount === null ? [] : ["Sale"],
  };
}
