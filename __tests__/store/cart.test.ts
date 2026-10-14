import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { MASTER_PRODUCTS, getMasterProductById } from "@/constants/products";
import { useCartStore } from "@/store/useCartStore";

describe("Cart State & Product Master Data (Step 1)", () => {
  beforeAll(() => {
    // Polyfill localStorage for node test environment
    const storage = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, String(value)); },
      removeItem: (key: string) => { storage.delete(key); },
      clear: () => { storage.clear(); },
    };

    if (typeof window === "undefined") {
      (global as unknown as { window: unknown }).window = { localStorage: mockStorage };
    }
  });

  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  describe("1. Single Source of Truth for Product Data", () => {
    it("ensures master products have consistent fields (id, name, price, category, image, stock)", () => {
      expect(MASTER_PRODUCTS.length).toBeGreaterThan(0);

      MASTER_PRODUCTS.forEach((product) => {
        expect(product.id).toBeDefined();
        expect(typeof product.id).toBe("string");
        expect(product.name).toBeDefined();
        expect(typeof product.name).toBe("string");
        expect(product.price).toBeDefined();
        expect(typeof product.price).toBe("number");
        expect(product.category).toBeDefined();
        expect(typeof product.category).toBe("string");
        expect(product.image).toBeDefined();
        expect(typeof product.image).toBe("string");
        expect(product.stock).toBeDefined();
        expect(typeof product.stock).toBe("number");
      });
    });

    it("correctly looks up product by id", () => {
      const prod = getMasterProductById("1");
      expect(prod).toBeDefined();
      expect(prod?.name).toContain("MacBook Pro");
      expect(prod?.price).toBe(3499);
    });
  });

  describe("2. Cart State & LocalStorage Persistence", () => {
    it("adds item and persists to cart state", () => {
      const prod = MASTER_PRODUCTS[0];
      useCartStore.getState().addItem(prod, 2);

      const items = useCartStore.getState().items;
      expect(items.length).toBe(1);
      expect(items[0].productId).toBe(prod.id);
      expect(items[0].quantity).toBe(2);
    });

    it("updates quantity and respects stock limits", () => {
      const prod = MASTER_PRODUCTS[0]; // stock is 12
      useCartStore.getState().addItem(prod, 5);

      useCartStore.getState().updateQuantity(`${prod.id}-default`, 10);
      expect(useCartStore.getState().items[0].quantity).toBe(10);

      // Attempt to exceed stock
      useCartStore.getState().updateQuantity(`${prod.id}-default`, 999);
      expect(useCartStore.getState().items[0].quantity).toBe(prod.stock);
    });
  });

  describe("3. Security Fix: Never Trust Tampered Price from LocalStorage", () => {
    it("re-looks up master price and ignores manipulated price", () => {
      const realProd = MASTER_PRODUCTS[0]; // Real price is 3499
      const realPrice = realProd.discountPrice ?? realProd.price;

      // Add item to cart
      useCartStore.getState().addItem(realProd, 2);

      // Directly tamper with price in stored item (simulating DevTools localStorage hack)
      useCartStore.setState({
        items: [
          {
            ...useCartStore.getState().items[0],
            price: 1, // Tampered price: $1 instead of $3499
          },
        ],
      });

      // Verification: getSubtotal() MUST ignore the tampered price and re-lookup master product price
      const calculatedSubtotal = useCartStore.getState().getSubtotal();
      expect(calculatedSubtotal).toBe(realPrice * 2);
      expect(calculatedSubtotal).not.toBe(1 * 2);
    });
  });
});

