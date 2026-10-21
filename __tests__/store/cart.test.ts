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

    it("isolates cart across user accounts and prevents cross-account item leaks", () => {
      const prodA = MASTER_PRODUCTS[0];
      const prodB = MASTER_PRODUCTS[1];

      // User A (e.g. Admin) adds prodA
      useCartStore.getState().syncWithUser("user-admin-id", [
        {
          id: "item-admin-1",
          productId: prodA.id,
          name: prodA.name,
          price: prodA.price,
          category: prodA.category,
          image: prodA.image,
          stock: prodA.stock,
          quantity: 2,
        },
      ]);
      expect(useCartStore.getState().userId).toBe("user-admin-id");
      expect(useCartStore.getState().items.length).toBe(1);
      expect(useCartStore.getState().items[0].productId).toBe(prodA.id);

      // User switches to User B (Customer) with their own server items
      useCartStore.getState().syncWithUser("user-customer-id", [
        {
          id: "item-cust-1",
          productId: prodB.id,
          name: prodB.name,
          price: prodB.price,
          category: prodB.category,
          image: prodB.image,
          stock: prodB.stock,
          quantity: 1,
        },
      ]);

      // Cart MUST now only have User B's item, and User A's item MUST be completely gone
      expect(useCartStore.getState().userId).toBe("user-customer-id");
      expect(useCartStore.getState().items.length).toBe(1);
      expect(useCartStore.getState().items[0].productId).toBe(prodB.id);
      expect(useCartStore.getState().items.some((it) => it.productId === prodA.id)).toBe(false);

      // User logs out (userId becomes null)
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().userId).toBeNull();
      expect(useCartStore.getState().items.length).toBe(0);
    });

    it("supports addItemDirect and updates existing matching variant", () => {
      useCartStore.getState().setUserId("user-2");
      useCartStore.getState().addItemDirect({
        id: "cart-item-uuid-1",
        productId: "prod-db-uuid-1",
        name: "Lenovo AIO 24IRH9",
        price: 8500000,
        category: "All-in-One PC",
        image: "https://example.com/aio.jpg",
        stock: 5,
        quantity: 1,
        variantId: "variant-uuid-cloud-grey",
        variantLabel: "Cloud Grey · 8GB",
      });

      expect(useCartStore.getState().items.length).toBe(1);
      expect(useCartStore.getState().items[0].name).toBe("Lenovo AIO 24IRH9");
      expect(useCartStore.getState().items[0].variantId).toBe("variant-uuid-cloud-grey");
      expect(useCartStore.getState().items[0].quantity).toBe(1);

      // Add another with same variant -> updates quantity and properties
      useCartStore.getState().addItemDirect({
        id: "cart-item-uuid-1",
        productId: "prod-db-uuid-1",
        name: "Lenovo AIO 24IRH9",
        price: 8500000,
        category: "All-in-One PC",
        image: "https://example.com/aio.jpg",
        stock: 5,
        quantity: 2,
        variantId: "variant-uuid-cloud-grey",
        variantLabel: "Cloud Grey · 8GB",
      });

      expect(useCartStore.getState().items.length).toBe(1);
      expect(useCartStore.getState().items[0].quantity).toBe(2);

      // Add a different variant -> appends new item
      useCartStore.getState().addItemDirect({
        id: "cart-item-uuid-2",
        productId: "prod-db-uuid-1",
        name: "Lenovo AIO 24IRH9",
        price: 8900000,
        category: "All-in-One PC",
        image: "https://example.com/aio-luna.jpg",
        stock: 3,
        quantity: 1,
        variantId: "variant-uuid-luna-grey",
        variantLabel: "Luna Grey · 8GB",
      });

      expect(useCartStore.getState().items.length).toBe(2);
      expect(useCartStore.getState().getTotalItems()).toBe(3);
    });

    it("resets cart to empty when switching from User 1 to an empty User 2", () => {
      // User 1 has 3 items
      useCartStore.getState().syncWithUser("user-1", [
        { id: "1", productId: "p1", name: "P1", price: 100, category: "C", image: "", stock: 5, quantity: 1 },
        { id: "2", productId: "p2", name: "P2", price: 200, category: "C", image: "", stock: 5, quantity: 2 },
      ]);
      expect(useCartStore.getState().getTotalItems()).toBe(3);

      // User switches to User 2 who has an empty cart
      useCartStore.getState().syncWithUser("user-2", []);
      expect(useCartStore.getState().userId).toBe("user-2");
      expect(useCartStore.getState().items.length).toBe(0);
      expect(useCartStore.getState().getTotalItems()).toBe(0);
    });

    it("syncWithUser(null) cleans up all items when user logs out", () => {
      useCartStore.getState().syncWithUser("user-1", [
        { id: "1", productId: "p1", name: "P1", price: 100, category: "C", image: "", stock: 5, quantity: 1 },
      ]);
      expect(useCartStore.getState().items.length).toBe(1);

      useCartStore.getState().syncWithUser(null);
      expect(useCartStore.getState().userId).toBeNull();
      expect(useCartStore.getState().items.length).toBe(0);
    });
  });
});
