import { getMasterProductById } from "@/constants/products";
import { type StoredCartItem } from "@/store/useCartStore";
import { getSafeProductImageUrl, isKnownPromotionalArtwork, isValidProductImageUrl } from "@/lib/product-gallery";

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
    product_variant_images?: { id: string; url: string; display_order?: number }[];
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

  const variantGallery = variant?.product_variant_images?.slice().sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const primaryImage = variantGallery?.find((image) => isValidProductImageUrl(image.url) && !isKnownPromotionalArtwork(image.url))?.url
    ?? (variant?.image_url && isValidProductImageUrl(variant.image_url) && !isKnownPromotionalArtwork(variant.image_url)
      ? variant.image_url
      : null)
    ?? getSafeProductImageUrl(product?.product_images, product?.image || master?.image);

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

