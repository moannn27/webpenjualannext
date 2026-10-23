import { getMasterProductById } from "@/constants/products";
import { type StoredCartItem } from "@/store/useCartStore";

interface RawCartItem {
  id: string;
  cart_id?: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  products?: {
    id?: string;
    name?: string;
    price?: number;
    discount_price?: number | null;
    stock?: number;
    image?: string | null;
    category?: string | null;
    categories?: { id?: string; name?: string } | null;
    brands?: { id?: string; name?: string } | null;
    product_images?: { id?: string; url: string; alt_text?: string | null; is_primary?: boolean }[];
  } | null;
  product_variants?: {
    id: string;
    sku?: string | null;
    color?: string | null;
    ram?: string | null;
    storage?: string | null;
    price?: number | null;
    discount_price?: number | null;
    stock?: number;
    image_url?: string | null;
  } | null;
}

type CartItemPriceData = Pick<RawCartItem, "product_id" | "products" | "product_variants">;

export function getCartItemUnitPrice(item: CartItemPriceData): number {
  const product = item.products || null;
  const variant = item.product_variants || null;
  const master = getMasterProductById(product?.id || item.product_id);

  return Number(
    variant?.discount_price ??
      variant?.price ??
      product?.discount_price ??
      product?.price ??
      master?.discountPrice ??
      master?.price ??
      0
  );
}

export function getCartItemAvailableStock(item: CartItemPriceData): number | null {
  const product = item.products || null;
  const variant = item.product_variants || null;
  const master = getMasterProductById(product?.id || item.product_id);

  return variant?.stock ?? product?.stock ?? master?.stock ?? null;
}

/**
 * Universal formatter that transforms a database cart_items row
 * into a verified, sanitized StoredCartItem for the client cart store.
 */
export function formatCartItemToStored(it: RawCartItem): StoredCartItem {
  const product = it.products || null;
  const variant = it.product_variants || null;
  const lookupId = product?.id || it.product_id;
  const master = getMasterProductById(lookupId);

  const verifiedPrice = getCartItemUnitPrice(it);
  const availableStock = getCartItemAvailableStock(it) ?? 10;

  const primaryImage =
    variant?.image_url ||
    product?.product_images?.find((img) => img.is_primary)?.url ||
    product?.product_images?.[0]?.url ||
    product?.image ||
    master?.image ||
    "";

  const variantLabel = variant
    ? [variant.color, variant.ram, variant.storage].filter(Boolean).join(" · ")
    : null;

  return {
    id: it.id,
    productId: lookupId,
    name: product?.name || master?.name || "Produk",
    price: verifiedPrice,
    category: master?.category || product?.categories?.name || product?.category || "Produk",
    image: primaryImage,
    stock: availableStock,
    quantity: Math.max(1, it.quantity),
    variantId: it.variant_id ?? null,
    variantLabel,
    variantSku: variant?.sku || null,
  };
}

