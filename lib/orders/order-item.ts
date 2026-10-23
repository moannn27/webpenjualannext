export function getOrderItemSku(input: {
  variantDetails?: Record<string, unknown> | null;
  itemSku?: string | null;
  productSku?: string | null;
}): string | null {
  const variantSku = input.variantDetails?.sku;
  if (typeof variantSku === "string" && variantSku.trim()) return variantSku.trim();
  return input.itemSku?.trim() || input.productSku?.trim() || null;
}
