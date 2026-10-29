export interface ProductGallerySourceImage {
  id: string;
  url: string;
  alt_text?: string | null;
  is_primary?: boolean;
  display_order?: number;
}

export interface VariantGallerySource {
  id: string;
  color?: string | null;
  ram?: string | null;
  storage?: string | null;
  image_url?: string | null;
  product_variant_images?: { id: string; url: string; display_order?: number }[];
}

export function getSelectedProductVariant<T extends { id: string }>(variants: T[], selectedId: string): T | null {
  return variants.find((variant) => variant.id === selectedId) ?? variants[0] ?? null;
}

export function getOptionCapacity(str?: string | null): string {
  if (!str) return "";
  const match = str.match(/(\d+\s*(?:gb|tb))/i);
  return match ? match[1].toLowerCase().replace(/\s+/g, "") : str.toLowerCase().trim();
}

export function getVariantForAvailableOption<
  T extends { color?: string | null; ram?: string | null; storage?: string | null },
>(
  variants: T[],
  current: T | null | undefined,
  key: "color" | "ram" | "storage",
  value: string,
): T | null {
  const otherKeys = (["color", "ram", "storage"] as const).filter((option) => option !== key);
  const exact = variants.find((variant) => variant[key] === value && otherKeys.every((option) => variant[option] === current?.[option]))
    ?? variants.find((variant) => variant[key] === value);
  if (exact) return exact;

  const targetCap = getOptionCapacity(value);
  return variants.find((variant) => getOptionCapacity(variant[key]) === targetCap && otherKeys.every((option) => variant[option] === current?.[option]))
    ?? variants.find((variant) => getOptionCapacity(variant[key]) === targetCap)
    ?? null;
}

export function getSpecificationsForVariant<T extends { key: string; value: string }>(
  specifications: T[],
  variant?: Pick<VariantGallerySource, "ram" | "storage"> | null,
): T[] {
  return specifications.map((specification) => ({
    ...specification,
    value: specification.key.toLowerCase().includes("ram") || specification.key.toLowerCase().includes("memory")
      ? variant?.ram || specification.value
      : specification.key.toLowerCase().includes("storage") || specification.key.toLowerCase().includes("penyimpanan")
        ? variant?.storage || specification.value
        : specification.value,
  }));
}

export function isKnownPromotionalArtwork(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const fileName = new URL(url, "https://local.invalid").pathname.split("/").pop()?.toLowerCase() ?? "";
    return /^official-acer-aspire-lite-(silver|gray|pink)\.webp$/.test(fileName);
  } catch {
    return false;
  }
}

export function isValidProductImageUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  const url = value.trim();
  if (url.startsWith("/")) return !url.startsWith("//");
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export function getSafeProductImageUrl(
  images: { url: string; is_primary?: boolean | null }[] | null | undefined,
  fallback?: string | null,
): string {
  const usable = (images ?? []).filter((image) => isValidProductImageUrl(image.url) && !isKnownPromotionalArtwork(image.url));
  return usable.find((image) => image.is_primary)?.url
    ?? usable[0]?.url
    ?? (fallback && isValidProductImageUrl(fallback) && !isKnownPromotionalArtwork(fallback) ? fallback : "/product-image-unavailable.svg");
}

export function getProductGalleryImages(
  productImages: ProductGallerySourceImage[],
  productName: string,
  selectedVariant?: VariantGallerySource | null,
) {
  const variantImages = selectedVariant?.product_variant_images
    ?.slice()
    .filter((image) => isValidProductImageUrl(image.url) && !isKnownPromotionalArtwork(image.url))
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)) ?? [];
  const urls = variantImages.length
    ? variantImages.map((image) => ({ id: image.id, url: image.url }))
    : selectedVariant?.image_url && isValidProductImageUrl(selectedVariant.image_url) && !isKnownPromotionalArtwork(selectedVariant.image_url)
      ? [{ id: `variant-${selectedVariant.id}`, url: selectedVariant.image_url }]
      : [];
  const variantLabel = [selectedVariant?.color, selectedVariant?.ram, selectedVariant?.storage].filter(Boolean).join(" ");
  if (urls.length) {
    return urls.map((image, index) => ({
      ...image,
      alt_text: `${productName}${variantLabel ? ` - ${variantLabel}` : ""}`,
      is_primary: index === 0,
      variantIds: [selectedVariant!.id],
    }));
  }
  return productImages
    .filter((image) => isValidProductImageUrl(image.url) && !isKnownPromotionalArtwork(image.url))
    .slice()
    .sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) || (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((image) => ({ ...image, variantIds: [] as string[] }));
}

export function getAllProductGalleryImages(
  productImages: ProductGallerySourceImage[],
  productName: string,
  variants?: VariantGallerySource[] | null,
): (ProductGallerySourceImage & { variantIds: string[] })[] {
  const mapByUrl = new Map<string, ProductGallerySourceImage & { variantIds: string[] }>();

  // 1. Process parent product images first (Foto Produk umum)
  const parentList = (productImages ?? [])
    .filter((img) => isValidProductImageUrl(img.url) && !isKnownPromotionalArtwork(img.url))
    .sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) || (a.display_order ?? 0) - (b.display_order ?? 0));

  for (const img of parentList) {
    if (!mapByUrl.has(img.url)) {
      mapByUrl.set(img.url, {
        id: img.id,
        url: img.url,
        alt_text: img.alt_text || productName,
        is_primary: Boolean(img.is_primary),
        display_order: img.display_order ?? 0,
        variantIds: [],
      });
    }
  }

  // 2. Process all variant images across all variants (Galeri Varian)
  for (const variant of variants ?? []) {
    const variantLabel = [variant.color, variant.ram, variant.storage].filter(Boolean).join(" ");
    const vImages = (variant.product_variant_images ?? [])
      .filter((img) => isValidProductImageUrl(img.url) && !isKnownPromotionalArtwork(img.url))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const vUrls: { id?: string; url: string; display_order?: number }[] = [...vImages];
    if (
      variant.image_url &&
      isValidProductImageUrl(variant.image_url) &&
      !isKnownPromotionalArtwork(variant.image_url) &&
      !vUrls.some((img) => img.url === variant.image_url)
    ) {
      vUrls.push({ id: `variant-${variant.id}`, url: variant.image_url, display_order: 0 });
    }

    for (const vImg of vUrls) {
      if (mapByUrl.has(vImg.url)) {
        const existing = mapByUrl.get(vImg.url)!;
        if (!existing.variantIds.includes(variant.id)) {
          existing.variantIds.push(variant.id);
        }
      } else {
        mapByUrl.set(vImg.url, {
          id: vImg.id || `variant-${variant.id}-${mapByUrl.size}`,
          url: vImg.url,
          alt_text: `${productName}${variantLabel ? ` - ${variantLabel}` : ""}`,
          is_primary: mapByUrl.size === 0,
          display_order: 100 + (vImg.display_order ?? mapByUrl.size),
          variantIds: [variant.id],
        });
      }
    }
  }

  return Array.from(mapByUrl.values());
}
