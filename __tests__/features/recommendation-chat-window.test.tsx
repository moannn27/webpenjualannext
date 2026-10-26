import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductCards, RecommendationChatWindow, toRecommendationHistory } from "@/features/chat/RecommendationChatWindow";

describe("recommendation chat responsive UI", () => {
  it("sends IDs of displayed recommendations so rejected products can be excluded", () => {
    const history = toRecommendationHistory([
      { role: "user", text: "Cari laptop" },
      {
        role: "assistant", text: "Ini pilihannya.",
        products: [{ id: "laptop-1", name: "Laptop 1", price: 1, discount_price: null, stock: 1, image: null, brands: null }],
        alternatives: [{ id: "laptop-2", name: "Laptop 2", price: 2, discount_price: null, stock: 1, image: null, brands: null }],
      },
    ]);
    expect(history[1]).toMatchObject({ role: "assistant", productIds: ["laptop-1", "laptop-2"] });
    expect(history[0]).not.toHaveProperty("productIds");
  });

  it("renders branded chat, mobile-safe sizing, product affordances and prompt without a startup request", () => {
    const html = renderToStaticMarkup(createElement(RecommendationChatWindow, {
      whatsappHref: "https://wa.me/620000000000",
      onClose: vi.fn(),
    }));

    expect(html).toContain("AI Assistant");
    expect(html).toContain("Asisten Next Solution Store");
    expect(html).not.toContain("Next Assistant");
    expect(html).toContain("100dvh");
    expect(html).toContain("safe-area-inset-bottom");
    expect(html).toContain("sm:max-w");
    expect(html).toContain("Buat kuliah");
    expect(html).toContain("Kirim pesan");
    expect(html).not.toContain("Mulai percakapan.");
  });

  it("shows over-budget GPU alternatives in a separate, clearly labeled card with a local relative link", () => {
    const html = renderToStaticMarkup(createElement(ProductCards, {
      isExpanded: false,
      title: "RTX 4050 di atas budget",
      products: [{
        id: "loq", name: "Lenovo LOQ 15", price: 15_000_000, discount_price: null,
        stock: 3, image: null, brands: { name: "Lenovo" },
        graphicsLabel: "NVIDIA GeForce RTX 4050",
      }],
    }));

    expect(html).toContain("RTX 4050 di atas budget");
    expect(html).toContain("15.000.000");
    expect(html).toContain("NVIDIA GeForce RTX 4050");
    expect(html).toContain('href="/product/loq"');
    expect(html).not.toContain("localhost:3000");
  });
});
