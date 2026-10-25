import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { ProductRepository } from "@/repositories/product.repository";

describe("ProductRepository variant relation compatibility", () => {
  const productRow = {
    id: "258bb7a2-b232-450a-8438-8d1e654d796b",
    name: "Acer Aspire Lite 14 AL14-36P",
    product_variants: [
      { id: "blue", sku: "NX.DT7SN.001", color: "Fresh Blue", ram: "8GB", storage: "512GB SSD", price: 7999000, stock: 2, image_url: null },
      { id: "grey", sku: "NX.DFJSN.001", color: "Lunar Grey", ram: "8GB", storage: "512GB SSD", price: 7999000, stock: 3, image_url: null },
    ],
  };

  beforeEach(() => {
    const productQuery = {
      select: vi.fn(() => productQuery),
      eq: vi.fn(() => productQuery),
      maybeSingle: vi.fn(async () => ({ data: productRow, error: null })),
    };
    const imageQuery = {
      select: vi.fn(() => imageQuery),
      in: vi.fn(() => imageQuery),
      order: vi.fn(async () => ({ data: null, error: { code: "PGRST205", message: "table missing from schema cache" } })),
    };
    createClient.mockResolvedValue({
      from: vi.fn((table: string) => table === "products" ? productQuery : imageQuery),
    });
  });

  it("keeps product variants when the optional variant image table is not installed", async () => {
    const product = await new ProductRepository().findById(productRow.id);
    expect(product?.product_variants).toHaveLength(2);
    expect(product?.product_variants?.map((variant: { sku: string }) => variant.sku)).toEqual(["NX.DT7SN.001", "NX.DFJSN.001"]);
  });

  it("keeps product variants when the supplemental gallery query fails", async () => {
    const productQuery = {
      select: vi.fn(() => productQuery),
      eq: vi.fn(() => productQuery),
      maybeSingle: vi.fn(async () => ({ data: productRow, error: null })),
    };
    const imageQuery = {
      select: vi.fn(() => imageQuery),
      in: vi.fn(() => imageQuery),
      order: vi.fn(async () => ({ data: null, error: { code: "57014", message: "statement timeout" } })),
    };
    createClient.mockResolvedValue({
      from: vi.fn((table: string) => table === "products" ? productQuery : imageQuery),
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const product = await new ProductRepository().findById(productRow.id);
    expect(product?.product_variants).toHaveLength(2);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
