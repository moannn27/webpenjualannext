import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { verifiedMappings, planImageChanges } = require("../../scripts/product-image-manifest-utils.js");

describe("product image audit manifest", () => {
  const product = {
    product_id: "p1", product_sku_mtm: "PARENT-1", model: "Laptop", brand: "Brand",
    images: [{ id: null, image_url: "https://cdn.example.com/product.webp", source_url: "https://brand.example.com/product", status: "verified", verified_sku: "PARENT-1", model_match: true }],
  };
  const variant = {
    product_id: "p1", variant_id: "v1", product_sku_mtm: "PARENT-1", variant_sku_mtm: "VAR-1", model: "Laptop", brand: "Brand", color: "Blue", ram: "8GB", storage: "512GB",
    images: [
      { id: null, image_url: "https://cdn.example.com/blue-1.webp", source_url: "https://brand.example.com/blue", status: "verified", verified_sku: "VAR-1", model_match: true },
      { id: null, image_url: "https://cdn.example.com/blue-2.webp", source_url: "https://brand.example.com/blue", status: "verified", verified_sku: "VAR-1", model_match: true },
    ],
  };

  it("does not treat URL-only or wrong-SKU candidates as verified", () => {
    expect(verifiedMappings({ products: [{ ...product, images: [{ image_url: "https://cdn.example.com/x.webp", status: "needs_review" }] }], variants: [] })).toEqual([]);
    expect(() => verifiedMappings({ products: [{ ...product, images: [{ ...product.images[0], verified_sku: "OTHER" }] }], variants: [] })).toThrow(/SKU mismatch/i);
  });

  it("requires HTTPS source and directly accessible image URLs", () => {
    expect(() => verifiedMappings({ products: [{ ...product, images: [{ ...product.images[0], image_url: "http://cdn.example.com/x.webp" }] }], variants: [] })).toThrow(/HTTPS/i);
    expect(() => verifiedMappings({ products: [{ ...product, images: [{ ...product.images[0], source_url: "not a URL" }] }], variants: [] })).toThrow(/source URL must use HTTPS/i);
  });

  it("plans multiple variant images in order without overwriting a valid product primary", () => {
    const mappings = verifiedMappings({ products: [product], variants: [variant] });
    const currentProducts = [{ id: "p1", name: "Laptop", sku: "PARENT-1", product_images: [{ id: "pi1", url: "https://cdn.example.com/old.webp", is_primary: true, display_order: 0 }] }];
    const currentVariants = [{ id: "v1", product_id: "p1", sku: "VAR-1", image_url: "https://cdn.example.com/legacy.webp", product_variant_images: [] }];
    const plan = planImageChanges(mappings, currentProducts, currentVariants);
    expect(plan.productChanges).toHaveLength(1);
    expect(plan.productChanges[0]).toMatchObject({ is_primary: false, demote_primary_id: null, display_order: 1 });
    expect(plan.variantChanges.map((image: { url: string; display_order: number }) => [image.url, image.display_order])).toEqual([
      ["https://cdn.example.com/legacy.webp", 0],
      ["https://cdn.example.com/blue-1.webp", 1],
      ["https://cdn.example.com/blue-2.webp", 2],
    ]);
    expect(plan.variantChanges[0].legacy_image_url).toBeNull();
  });

  it("syncs only the first verified variant image to the legacy primary URL", () => {
    const mappings = verifiedMappings({ products: [], variants: [variant] });
    const plan = planImageChanges(mappings, [], [{
      id: "v1", product_id: "p1", sku: "VAR-1", image_url: null, product_variant_images: [],
    }]);
    expect(plan.variantChanges.map((image: { display_order: number; legacy_image_url: string | null }) => [image.display_order, image.legacy_image_url])).toEqual([
      [0, "https://cdn.example.com/blue-1.webp"],
      [1, null],
    ]);
  });

  it("is idempotent for existing product and variant gallery URLs", () => {
    const mappings = verifiedMappings({ products: [product], variants: [variant] });
    const currentProducts = [{ id: "p1", name: "Laptop", sku: "PARENT-1", product_images: [{ id: "pi1", url: product.images[0].image_url, is_primary: true, display_order: 0 }] }];
    const currentVariants = [{ id: "v1", product_id: "p1", sku: "VAR-1", image_url: variant.images[0].image_url, product_variant_images: variant.images.map((image, i) => ({ id: `vi${i}`, url: image.image_url, display_order: i })) }];
    const plan = planImageChanges(mappings, currentProducts, currentVariants);
    expect(plan.productChanges).toEqual([]);
    expect(plan.variantChanges).toEqual([]);
  });

  it("only promotes over a known campaign poster and syncs its exact variant legacy image", () => {
    const badProduct = { ...product, images: [{ id: null, image_url: "https://cdn.example.com/verified.webp", source_url: "https://brand.example.com/p", status: "verified", verified_sku: "PARENT-1", model_match: true, replaces_status: "known_invalid" }] };
    const badVariant = { ...variant, images: [{ ...variant.images[0], replaces_status: "known_invalid" }] };
    const plan = planImageChanges(verifiedMappings({ products: [badProduct], variants: [badVariant] }), [
      { id: "p1", name: "Laptop", sku: "PARENT-1", product_images: [{ id: "poster-id", url: "https://cdn.example.com/promo-poster.jpg", is_primary: true, display_order: 0 }] },
    ], [{ id: "v1", product_id: "p1", sku: "VAR-1", image_url: "https://cdn.example.com/old-poster.jpg", product_variant_images: [] }]);
    expect(plan.productChanges[0]).toMatchObject({ is_primary: true, demote_primary_id: "poster-id" });
    expect(plan.variantChanges[0].legacy_image_url).toBe("https://cdn.example.com/blue-1.webp");
  });

  it("promotes an already stored verified product image without inserting a duplicate", () => {
    const candidate = product.images[0];
    const mappings = verifiedMappings({ products: [{ ...product, images: [{ ...candidate, replaces_status: "known_invalid" }] }], variants: [] });
    const plan = planImageChanges(mappings, [{ id: "p1", name: "Laptop", sku: "PARENT-1", product_images: [
      { id: "poster", url: "https://cdn.example.com/promo-banner.webp", is_primary: true, display_order: 0 },
      { id: "good", url: candidate.image_url, is_primary: false, display_order: 1 },
    ] }], []);
    expect(plan.productChanges).toEqual([expect.objectContaining({ action: "promote_existing", existing_image_id: "good", demote_primary_id: "poster" })]);
  });
});
