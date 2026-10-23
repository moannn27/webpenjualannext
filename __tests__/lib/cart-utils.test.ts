import { describe, expect, it } from "vitest";
import { formatCartItemToStored, getCartItemAvailableStock, getCartItemUnitPrice } from "@/lib/cart-utils";

describe("cart variant mapping", () => {
  const variantCartItem = {
    id: "cart-item-1",
    product_id: "1",
    variant_id: "variant-1",
    quantity: 2,
    products: {
      id: "1",
      name: "Nama produk dari database",
      price: 1000,
      discount_price: 900,
      stock: 20,
      product_images: [{ url: "parent-image.jpg", is_primary: true }],
      categories: { name: "Laptop" },
    },
    product_variants: {
      id: "variant-1",
      sku: "SKU-VARIAN-01",
      color: "Graphite",
      ram: "16GB",
      storage: "1TB",
      price: 1400,
      discount_price: 1300,
      stock: 3,
      image_url: "variant-image.jpg",
    },
  };

  it("uses the selected variant's price and stock ahead of parent product data", () => {
    expect(getCartItemUnitPrice(variantCartItem)).toBe(1300);
    expect(getCartItemAvailableStock(variantCartItem)).toBe(3);
  });

  it("keeps the selected variant image, label, and SKU in the stored cart item", () => {
    expect(formatCartItemToStored(variantCartItem)).toMatchObject({
      name: "Nama produk dari database",
      price: 1300,
      stock: 3,
      image: "variant-image.jpg",
      variantId: "variant-1",
      variantLabel: "Graphite · 16GB · 1TB",
      variantSku: "SKU-VARIAN-01",
    });
  });

  it("falls back to the parent product image when a variant has no dedicated image", () => {
    const stored = formatCartItemToStored({
      ...variantCartItem,
      product_variants: {
        id: "variant-1",
        sku: "SKU-VARIAN-01",
        color: "Graphite",
        ram: "16GB",
        storage: "1TB",
        price: 1400,
        discount_price: 1300,
        stock: 3,
      },
    });

    expect(stored.image).toBe("parent-image.jpg");
    expect(stored.variantSku).toBe("SKU-VARIAN-01");
  });
});
