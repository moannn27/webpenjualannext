import { describe, it, expect, afterEach } from "vitest";
import { getSiteUrl, absoluteUrl, buildProductJsonLd, buildStoreJsonLd } from "@/lib/seo";

describe("SEO Utilities", () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
  });

  describe("getSiteUrl and absoluteUrl", () => {
    it("returns cleaned site url without trailing slash", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/";
      expect(getSiteUrl()).toBe("https://example.com");
    });

    it("adds https protocol if missing", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "example.com";
      expect(getSiteUrl()).toBe("https://example.com");
    });

    it("generates correct absolute url", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://nextsolution.store";
      expect(absoluteUrl("/products")).toBe("https://nextsolution.store/products");
      expect(absoluteUrl("product/123")).toBe("https://nextsolution.store/product/123");
    });
  });

  describe("buildProductJsonLd", () => {
    it("creates valid schema.org Product object with price, stock, and offer", () => {
      const product = {
        id: "prod-1",
        name: "Lenovo ThinkPad X1 Carbon",
        description: "Ultrabook premium untuk bisnis",
        price: 25000000,
        discount_price: 23000000,
        stock: 5,
        sku: "TP-X1-001",
        product_images: [{ url: "https://example.com/laptop.jpg" }],
        brands: { name: "Lenovo" },
        categories: { name: "Laptops" },
      };

      const result = buildProductJsonLd(product);
      expect(result["@context"]).toBe("https://schema.org");
      expect(result["@type"]).toBe("Product");
      expect(result.name).toBe("Lenovo ThinkPad X1 Carbon");
      expect(result.description).toBe("Ultrabook premium untuk bisnis");
      expect(result.sku).toBe("TP-X1-001");
      expect(result.image).toEqual(["https://example.com/laptop.jpg"]);
      expect(result.brand).toEqual({ "@type": "Brand", name: "Lenovo" });

      const offer = result.offers as Record<string, unknown>;
      expect(offer["@type"]).toBe("Offer");
      expect(offer.price).toBe(23000000);
      expect(offer.priceCurrency).toBe("IDR");
      expect(offer.availability).toBe("https://schema.org/InStock");
    });

    it("sets OutOfStock when product stock is 0", () => {
      const product = {
        id: "prod-2",
        name: "Asus ROG Zephyrus",
        price: 30000000,
        stock: 0,
      };

      const result = buildProductJsonLd(product);
      const offer = result.offers as Record<string, unknown>;
      expect(offer.availability).toBe("https://schema.org/OutOfStock");
      expect(offer.price).toBe(30000000);
    });

    it("does NOT add aggregateRating or review if reviews are empty (no fake reviews)", () => {
      const product = {
        id: "prod-3",
        name: "HP Pavilion",
        price: 10000000,
        stock: 2,
      };

      const result = buildProductJsonLd(product, []);
      expect(result.aggregateRating).toBeUndefined();
      expect(result.review).toBeUndefined();
    });

    it("adds aggregateRating and review only when authentic reviews are provided", () => {
      const product = {
        id: "prod-4",
        name: "Dell XPS 15",
        price: 28000000,
        stock: 3,
      };

      const reviews = [
        {
          id: "rev-1",
          rating: 5,
          comment: "Sangat memuaskan, kencang sekali!",
          created_at: "2026-03-01T10:00:00Z",
          users: { full_name: "Budi Santoso" },
        },
        {
          id: "rev-2",
          rating: 4,
          comment: "Layar tajam, baterai awet.",
          created_at: "2026-03-02T10:00:00Z",
          users: { full_name: "Siti Rahma" },
        },
      ];

      const result = buildProductJsonLd(product, reviews);
      const agg = result.aggregateRating as Record<string, unknown>;
      expect(agg["@type"]).toBe("AggregateRating");
      expect(agg.ratingValue).toBe("4.5");
      expect(agg.reviewCount).toBe(2);

      const reviewList = result.review as Record<string, unknown>[];
      expect(reviewList).toHaveLength(2);
      expect(reviewList[0].reviewRating).toEqual({
        "@type": "Rating",
        ratingValue: 5,
        bestRating: "5",
        worstRating: "1",
      });
    });
  });

  describe("buildStoreJsonLd", () => {
    it("creates ElectronicsStore schema with search action", () => {
      const store = {
        address: "Jl. Sudirman No. 45, Jakarta",
        phone: "081234567890",
        email: "store@nextsolution.com",
      };

      const result = buildStoreJsonLd(store);
      expect(result["@type"]).toBe("ElectronicsStore");
      expect(result.telephone).toBe("081234567890");
      expect(result.email).toBe("store@nextsolution.com");
      expect((result.address as Record<string, unknown>).streetAddress).toBe(
        "Jl. Sudirman No. 45, Jakarta"
      );
    });
  });
});

