import { describe, expect, it } from "vitest";
import { findSkuConflict, getVariantGallerySaveBlockReason, parseManualVariants, planVariantGallerySync } from "@/lib/admin-product-variants";

const imageA = "https://images.example.com/laptop-front.webp";
const imageB = "https://images.example.com/laptop-back.webp";

describe("manual product variants", () => {
  it("normalizes new and existing variants with ordered gallery URLs", () => {
    const variants = parseManualVariants([
      { sku: "LAPTOP-GRY-16", color: " Grey ", ram: "16 GB", storage: "512 GB", price: 12000000, discount_price: 11000000, stock: 3, images: [imageA, imageB] },
      { id: "variant-2", sku: "LAPTOP-BLK-8", color: "Black", ram: "8 GB", storage: "256 GB", price: null, discount_price: null, stock: 1, images: [] },
    ], 13000000);

    expect(variants[0]).toMatchObject({ sku: "LAPTOP-GRY-16", color: "Grey", stock: 3, images: [imageA, imageB] });
    expect(variants[1]).toMatchObject({ id: "variant-2", sku: "LAPTOP-BLK-8", images: [] });
  });

  it("rejects duplicate SKUs and duplicate option combinations case-insensitively", () => {
    const base = { color: "Grey", ram: "16 GB", storage: "512 GB", price: null, discount_price: null, stock: 0, images: [] };
    expect(() => parseManualVariants([{ ...base, sku: "SKU-1" }, { ...base, color: "grey", sku: "SKU-2" }], 100)).toThrow(/kombinasi opsi/i);
    expect(() => parseManualVariants([{ ...base, sku: "SKU-1" }, { ...base, ram: "8 GB", sku: "sku-1" }], 100)).toThrow(/SKU varian/i);
  });

  it("detects catalog SKU conflicts case-insensitively while allowing the edited row", () => {
    const rows = [{ id: "saved-1", sku: "LAPTOP-1" }, { id: "saved-2", sku: "VARIANT-2" }];
    expect(findSkuConflict("laptop-1", rows)).toEqual(rows[0]);
    expect(findSkuConflict(" laptop-1 ", rows, "saved-1")).toBeNull();
    expect(findSkuConflict("new-sku", rows)).toBeNull();
  });

  it("rejects invalid discounts, negative stock, and non-HTTPS gallery URLs", () => {
    const base = { sku: "SKU-1", color: "Grey", ram: "8 GB", storage: "256 GB", price: null, discount_price: null, stock: 0, images: [] };
    expect(() => parseManualVariants([{ ...base, discount_price: 100 }], 100)).toThrow(/harga diskon/i);
    expect(() => parseManualVariants([{ ...base, stock: -1 }], 100)).toThrow(/stok varian/i);
    expect(() => parseManualVariants([{ ...base, images: ["http://images.example.com/photo.jpg"] }], 100)).toThrow(/URL HTTPS/i);
  });

  it("plans idempotent gallery additions, ordering, removal, and primary image sync", () => {
    const plan = planVariantGallerySync([
      { id: "image-1", url: imageA, display_order: 4 },
      { id: "image-old", url: "https://images.example.com/old.webp", display_order: 1 },
    ], [imageB, imageA]);
    expect(plan.updates).toEqual([{ id: "image-1", display_order: 1 }]);
    expect(plan.inserts).toEqual([{ url: imageB, display_order: 0 }]);
    expect(plan.deletes).toEqual(["image-old"]);
    expect(plan.primaryImageUrl).toBe(imageB);
    expect(planVariantGallerySync([{ id: "image-1", url: imageA, display_order: 0 }], [imageA]).inserts).toEqual([]);
  });

  it("blocks editing a variant gallery when its saved images failed to load", () => {
    expect(getVariantGallerySaveBlockReason("timeout")).toMatch(/muat ulang data/i);
    expect(getVariantGallerySaveBlockReason(undefined)).toBeNull();
  });
});
