import { describe, expect, it } from "vitest";
import { getProductGalleryImages, getSafeProductImageUrl, getSelectedProductVariant, getSpecificationsForVariant, getVariantForAvailableOption, isKnownPromotionalArtwork, isValidProductImageUrl } from "@/lib/product-gallery";

describe("product variant gallery", () => {
  const parentImages = [
    { id: "parent-1", url: "https://example.com/parent-1.webp", is_primary: true },
    { id: "parent-2", url: "https://example.com/parent-2.webp", display_order: 1 },
  ];

  it("returns every ordered image for the selected variant", () => {
    const images = getProductGalleryImages(parentImages, "Laptop", {
      id: "variant-a", color: "Grey", product_variant_images: [
        { id: "v2", url: "https://example.com/v2.webp", display_order: 1 },
        { id: "v1", url: "https://example.com/v1.webp", display_order: 0 },
      ],
    });
    expect(images.map((image) => image.url)).toEqual(["https://example.com/v1.webp", "https://example.com/v2.webp"]);
    expect(images[0].variantIds).toEqual(["variant-a"]);
  });

  it("changes gallery when selected variant changes", () => {
    const variantA = { id: "a", image_url: "https://example.com/a.webp" };
    const variantB = { id: "b", image_url: "https://example.com/b.webp" };
    expect(getProductGalleryImages(parentImages, "Laptop", variantA)[0].url).toBe(variantA.image_url);
    expect(getProductGalleryImages(parentImages, "Laptop", variantB)[0].url).toBe(variantB.image_url);
  });

  it("falls back to the parent gallery when the variant has no images", () => {
    expect(getProductGalleryImages(parentImages, "Laptop", { id: "empty" }).map((image) => image.url)).toEqual(parentImages.map((image) => image.url));
  });

  it("filters the known Acer campaign poster and does not substitute another product image", () => {
    const poster = "https://storage.example/products/official-acer-aspire-lite-gray.webp";
    expect(isKnownPromotionalArtwork(poster)).toBe(true);
    expect(getProductGalleryImages([{ id: "poster", url: poster, is_primary: true }], "Aspire Lite", null)).toEqual([]);
    expect(getSafeProductImageUrl([{ url: poster, is_primary: true }])).toBe("/product-image-unavailable.svg");
  });

  it("accepts secure image URLs and local placeholders while rejecting malformed or insecure URLs", () => {
    expect(isValidProductImageUrl("https://cdn.example.com/laptop.webp")).toBe(true);
    expect(isValidProductImageUrl("/product-image-unavailable.svg")).toBe(true);
    expect(isValidProductImageUrl("http://cdn.example.com/laptop.jpg")).toBe(false);
    expect(isValidProductImageUrl("javascript:alert(1)")).toBe(false);
    expect(isValidProductImageUrl("not a url")).toBe(false);
    expect(getProductGalleryImages([
      { id: "broken", url: "https://" },
      { id: "insecure", url: "http://cdn.example.com/poster.jpg" },
    ], "Laptop", null)).toEqual([]);
  });

  it("filters known promotional artwork from a variant gallery and falls back to the parent photo", () => {
    const poster = "https://storage.example/products/official-acer-aspire-lite-gray.webp";
    const images = getProductGalleryImages(parentImages, "Aspire Lite", {
      id: "variant-gray",
      product_variant_images: [{ id: "poster", url: poster, display_order: 0 }],
      image_url: poster,
    });
    expect(images.map((image) => image.url)).toEqual(parentImages.map((image) => image.url));
  });

  it("shows RAM and storage from the chosen variant in product specifications", () => {
    const result = getSpecificationsForVariant([
      { key: "RAM", value: "8GB" },
      { key: "Storage", value: "256GB SSD" },
      { key: "Processor", value: "Intel N4500" },
    ], { ram: "8GB", storage: "512GB SSD" });
    expect(result.map((spec) => spec.value)).toEqual(["8GB", "512GB SSD", "Intel N4500"]);
  });

  it("resolves one selected variant record for displayed SKU, price, stock, and cart variant ID", () => {
    const variants = [
      { id: "fresh-blue", sku: "NX.DT7SN.001", price: 7999000, stock: 2 },
      { id: "lunar-grey", sku: "NX.DFJSN.001", price: 7999000, stock: 3 },
    ];
    expect(getSelectedProductVariant(variants, "lunar-grey")).toEqual(variants[1]);
    expect(getSelectedProductVariant(variants, "missing-id")).toEqual(variants[0]);
  });

  it("never invents an unavailable color, RAM, and storage combination", () => {
    const variants = [
      { id: "blue-8-512", color: "Blue", ram: "8GB", storage: "512GB" },
      { id: "grey-16-1tb", color: "Grey", ram: "16GB", storage: "1TB" },
    ];
    expect(getVariantForAvailableOption(variants, variants[0], "color", "Grey")).toBe(variants[1]);
    expect(getVariantForAvailableOption(variants, variants[0], "storage", "2TB")).toBeNull();
    expect(variants.some((variant) => variant.color === "Grey" && variant.ram === "8GB" && variant.storage === "512GB")).toBe(false);
  });
});
