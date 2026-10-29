import { describe, expect, it } from "vitest";
import {
  getAllProductGalleryImages,
  getOptionCapacity,
  getProductGalleryImages,
  getSafeProductImageUrl,
  getSelectedProductVariant,
  getSpecificationsForVariant,
  getVariantForAvailableOption,
  isKnownPromotionalArtwork,
  isValidProductImageUrl,
} from "@/lib/product-gallery";

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

  it("normalizes storage and ram capacities to match equivalent variant specs", () => {
    expect(getOptionCapacity("512GB SSD")).toBe("512gb");
    expect(getOptionCapacity("512GB SSD M.2")).toBe("512gb");
    expect(getOptionCapacity("512GB 2280 PCIE G4")).toBe("512gb");
    expect(getOptionCapacity("1TB SSD")).toBe("1tb");
    expect(getOptionCapacity("16GB DDR5 5600")).toBe("16gb");

    const variants = [
      { id: "v-f16", color: "Jaeger Gray", ram: "16GB", storage: "512GB SSD M.2" },
    ];
    // Matching 512GB SSD selects the equivalent 512GB SSD M.2 variant without duplicate buttons
    expect(getVariantForAvailableOption(variants, null, "storage", "512GB SSD")).toEqual(variants[0]);
  });

  describe("getAllProductGalleryImages", () => {
    it("returns all product images and variant gallery images combined for the storefront thumbnail strip", () => {
      const parentImages = [
        { id: "p1", url: "https://example.com/parent-main.webp", is_primary: true, display_order: 0 },
        { id: "p2", url: "https://example.com/parent-angle-2.webp", display_order: 1 },
        { id: "p3", url: "https://example.com/parent-angle-3.webp", display_order: 2 },
      ];
      const variants = [
        {
          id: "var-luna-grey",
          color: "Luna Grey",
          image_url: "https://example.com/parent-main.webp",
          product_variant_images: [
            { id: "v-luna-1", url: "https://example.com/parent-main.webp", display_order: 0 },
          ],
        },
        {
          id: "var-cosmic-blue",
          color: "Cosmic Blue",
          image_url: "https://example.com/parent-angle-2.webp",
          product_variant_images: [
            { id: "v-cosmic-1", url: "https://example.com/parent-angle-2.webp", display_order: 0 },
          ],
        },
      ];

      const allImages = getAllProductGalleryImages(parentImages, "IdeaPad 5 2-in-1", variants);

      // Must contain ALL 3 photos so all thumbnails appear in the gallery
      expect(allImages).toHaveLength(3);
      expect(allImages.map((img) => img.url)).toEqual([
        "https://example.com/parent-main.webp",
        "https://example.com/parent-angle-2.webp",
        "https://example.com/parent-angle-3.webp",
      ]);

      // Checks variant mapping
      expect(allImages[0].variantIds).toContain("var-luna-grey");
      expect(allImages[1].variantIds).toContain("var-cosmic-blue");
      expect(allImages[2].variantIds).toEqual([]); // General product angle
    });

    it("appends unique variant photos that are not part of parent product images", () => {
      const parentImages = [
        { id: "p1", url: "https://example.com/laptop-general.webp", is_primary: true, display_order: 0 },
      ];
      const variants = [
        {
          id: "var-red",
          color: "Red",
          image_url: "https://example.com/laptop-red.webp",
          product_variant_images: [
            { id: "vr-1", url: "https://example.com/laptop-red-side.webp", display_order: 1 },
          ],
        },
      ];

      const allImages = getAllProductGalleryImages(parentImages, "Laptop", variants);

      expect(allImages).toHaveLength(3);
      expect(allImages.map((img) => img.url)).toEqual([
        "https://example.com/laptop-general.webp",
        "https://example.com/laptop-red-side.webp",
        "https://example.com/laptop-red.webp",
      ]);
      expect(allImages[1].variantIds).toContain("var-red");
      expect(allImages[2].variantIds).toContain("var-red");
    });

    it("deduplicates identical image URLs across multiple variants of the same color/specs", () => {
      const parentImages = [
        { id: "p1", url: "https://example.com/main.webp", is_primary: true },
      ];
      const variants = [
        { id: "v-8gb", color: "Silver", ram: "8GB", image_url: "https://example.com/silver.webp" },
        { id: "v-16gb", color: "Silver", ram: "16GB", image_url: "https://example.com/silver.webp" },
      ];

      const allImages = getAllProductGalleryImages(parentImages, "Laptop", variants);

      expect(allImages).toHaveLength(2);
      expect(allImages[1].url).toBe("https://example.com/silver.webp");
      expect(allImages[1].variantIds).toEqual(["v-8gb", "v-16gb"]);
    });

    it("filters out invalid URLs and known promotional posters from both parent and variant galleries", () => {
      const poster = "https://storage.example/products/official-acer-aspire-lite-pink.webp";
      const parentImages = [
        { id: "p1", url: "https://example.com/valid.webp", is_primary: true },
        { id: "p2", url: poster },
        { id: "p3", url: "http://insecure.example.com/pic.jpg" },
      ];
      const variants = [
        { id: "v1", image_url: poster },
        { id: "v2", image_url: "invalid-url" },
      ];

      const allImages = getAllProductGalleryImages(parentImages, "Laptop", variants);

      expect(allImages).toHaveLength(1);
      expect(allImages[0].url).toBe("https://example.com/valid.webp");
    });
  });
});
