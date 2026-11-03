import { describe, it, expect, beforeEach } from "vitest";
import { useShareStore, shareProduct } from "@/store/useShareStore";
import {
  useQuickSearchStore,
  openQuickSearch,
  closeQuickSearch,
} from "@/store/useQuickSearchStore";

describe("Product Share System (Universal)", () => {
  beforeEach(() => {
    useShareStore.getState().closeShare();
  });

  it("opens share modal with product data via shareProduct helper", () => {
    shareProduct({
      id: "prod-123",
      name: "Lenovo IdeaPad Slim 3 15",
      price: 13300000,
      formattedPrice: "Rp 13.300.000",
      brand: "Lenovo",
      specs: "Core 5 120U, 16GB RAM, 512GB SSD",
      image: "https://example.com/laptop.jpg",
    });

    const state = useShareStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.product).not.toBeNull();
    expect(state.product?.id).toBe("prod-123");
    expect(state.product?.name).toBe("Lenovo IdeaPad Slim 3 15");
    expect(state.product?.brand).toBe("Lenovo");
    expect(state.product?.formattedPrice).toBe("Rp 13.300.000");
  });

  it("closes share modal and clears product data", () => {
    shareProduct({
      id: "prod-456",
      name: "ASUS ROG Zephyrus G14",
      price: 28999000,
    });

    expect(useShareStore.getState().isOpen).toBe(true);

    useShareStore.getState().closeShare();

    expect(useShareStore.getState().isOpen).toBe(false);
    expect(useShareStore.getState().product).toBeNull();
  });
});

describe("Quick Search Command Palette System", () => {
  beforeEach(() => {
    closeQuickSearch();
  });

  it("exports default popular search keywords as fallback", async () => {
    const { DEFAULT_POPULAR_SEARCHES } = await import("@/components/shared/QuickSearchModal");
    expect(DEFAULT_POPULAR_SEARCHES).toBeDefined();
    expect(Array.isArray(DEFAULT_POPULAR_SEARCHES)).toBe(true);
    expect(DEFAULT_POPULAR_SEARCHES).toContain("Laptop Gaming");
    expect(DEFAULT_POPULAR_SEARCHES).toContain("Lenovo IdeaPad");
    expect(DEFAULT_POPULAR_SEARCHES).toContain("ASUS ROG");
  });

  it("opens quick search modal without initial query", () => {
    openQuickSearch();

    const state = useQuickSearchStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.query).toBe("");
  });

  it("opens quick search modal with initial prefilled query", () => {
    openQuickSearch("RTX 4060");

    const state = useQuickSearchStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.query).toBe("RTX 4060");
  });

  it("updates query in quick search store", () => {
    openQuickSearch();
    useQuickSearchStore.getState().setQuery("MacBook Air");

    expect(useQuickSearchStore.getState().query).toBe("MacBook Air");
  });

  it("closes quick search modal and resets query", () => {
    openQuickSearch("Ideapad");
    expect(useQuickSearchStore.getState().isOpen).toBe(true);

    closeQuickSearch();

    const state = useQuickSearchStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.query).toBe("");
  });
});

