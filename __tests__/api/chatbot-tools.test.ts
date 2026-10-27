import { describe, expect, it, vi } from "vitest";
import {
  executeCariProduk,
  executeInfoToko,
  executeCekPesanan,
  sanitizeChatHistory,
  TOOL_CARI_PRODUK,
  TOOL_INFO_TOKO,
  TOOL_CEK_PESANAN,
} from "@/app/api/recommend/route";
import { getProductCriteria } from "@/lib/recommendation-assistant";

describe("Chatbot History Conversion", () => {
  it("caps history at 20 messages, trims text to 500 characters, and removes invalid roles", () => {
    const rawHistory = Array.from({ length: 30 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      text: `Pesan ${index} ` + "x".repeat(600),
    }));
    rawHistory.push({ role: "system" as unknown as "user", text: "Hack attempt" });
    rawHistory.push({ role: "user", text: null as unknown as string });

    const sanitized = sanitizeChatHistory(rawHistory);
    expect(sanitized.length).toBeLessThanOrEqual(20);
    expect(sanitized.every((item) => item.role === "user" || item.role === "assistant")).toBe(true);
    expect(sanitized.every((item) => item.text.length <= 500)).toBe(true);
  });
});

describe("Chatbot Phase 3 Tools - Declaration metadata", () => {
  it("declares cari_produk, info_toko, and cek_pesanan with required schemas", () => {
    expect(TOOL_CARI_PRODUK.name).toBe("cari_produk");
    expect(TOOL_INFO_TOKO.name).toBe("info_toko");
    expect(TOOL_CEK_PESANAN.name).toBe("cek_pesanan");
    expect(TOOL_CEK_PESANAN.parameters?.required).toContain("nomor_pesanan");
    expect(TOOL_CEK_PESANAN.parameters?.required).toContain("email_atau_hp");
  });
});

describe("Chatbot Phase 3 Tools - executeCariProduk", () => {
  type CandidateItem = Parameters<typeof executeCariProduk>[0][number];
  const makeCandidate = (overrides: Partial<CandidateItem> & {
    id: string;
    name: string;
    price: number;
    status?: "published" | "draft" | "archived";
  }): CandidateItem => {
    const { status, ...rest } = overrides;
    return {
      slug: overrides.id,
      status: (status ?? "published") as unknown as "published",
      description: "",
      discount_price: null,
      stock: 5,
      sku: `SKU-${overrides.id}`,
      is_featured: false,
      is_new_arrival: false,
      is_best_seller: false,
      categories: overrides.categories ?? null,
      brands: overrides.brands ?? null,
      product_images: [],
      product_specifications: [],
      product_variants: [],
      ...rest,
    };
  };

  const dummyCatalog: Parameters<typeof executeCariProduk>[0] = [
    makeCandidate({
      id: "laptop-1",
      name: "Lenovo LOQ 15 Gaming",
      price: 15_000_000,
      discount_price: 14_000_000,
      categories: { name: "Laptop", slug: "laptop" },
      brands: { name: "Lenovo", slug: "lenovo" },
      description: "Laptop gaming RTX 4050",
      product_specifications: [{ key: "GPU", value: "GeForce RTX 4050", display_order: 1 }],
    }),
    makeCandidate({
      id: "laptop-2",
      name: "ASUS Vivobook 14",
      price: 8_000_000,
      discount_price: 7_500_000,
      categories: { name: "Laptop", slug: "laptop" },
      brands: { name: "ASUS", slug: "asus" },
      description: "Laptop kerja tipis",
      product_specifications: [{ key: "Processor", value: "Intel Core i5", display_order: 1 }],
    }),
    makeCandidate({
      id: "monitor-1",
      name: "LG UltraGear 24",
      price: 2_500_000,
      discount_price: null,
      categories: { name: "Monitor", slug: "monitor" },
      brands: { name: "LG", slug: "lg" },
      description: "Monitor gaming 144Hz",
    }),
  ];

  it("filters products by brand", () => {
    const criteria = getProductCriteria("Cari laptop Asus", []);
    const res = executeCariProduk(dummyCatalog, { brand: "ASUS" }, criteria);
    expect(res.products.length).toBe(1);
    expect(res.products[0].id).toBe("laptop-2");
  });

  it("filters products by category and sorts by termurah", () => {
    const criteria = getProductCriteria("Cari laptop termurah", []);
    const res = executeCariProduk(dummyCatalog, { kategori: "laptop", urutan: "termurah" }, criteria);
    expect(res.products.length).toBe(2);
    expect(res.products[0].id).toBe("laptop-2");
    expect(res.products[1].id).toBe("laptop-1");
  });

  it("filters products by price range", () => {
    const criteria = getProductCriteria("Laptop budget 10 juta", []);
    const res = executeCariProduk(dummyCatalog, { rentang_harga: { min: 5_000_000, max: 10_000_000 } }, criteria);
    expect(res.products.length).toBe(1);
    expect(res.products[0].id).toBe("laptop-2");
  });

  it("returns maximum 8 products and filters out non-published (draft/archived) products", () => {
    const largeCatalog: Parameters<typeof executeCariProduk>[0] = Array.from({ length: 15 }, (_, i) =>
      makeCandidate({
        id: `laptop-${i}`,
        name: `Laptop ${i}`,
        price: 10_000_000 + i * 100_000,
        status: (i === 0 ? "draft" : (i === 1 ? "archived" : "published")) as unknown as "published",
        categories: { name: "Laptop", slug: "laptop" },
        brands: { name: "Lenovo", slug: "lenovo" },
      })
    );

    const criteria = getProductCriteria("Cari laptop", []);
    const res = executeCariProduk(largeCatalog, { kategori: "laptop" }, criteria);
    expect(res.products.length).toBeLessThanOrEqual(8);
    expect(res.products.every((p) => p.status === "published" || !p.status)).toBe(true);
    expect(res.products.some((p) => p.id === "laptop-0" || p.id === "laptop-1")).toBe(false);
  });
});

describe("Chatbot Phase 3 Tools - executeInfoToko", () => {
  it("returns verified payment methods", () => {
    const res = executeInfoToko("pembayaran");
    expect(res.topik).toBe("pembayaran");
    expect(JSON.stringify(res)).toContain("BCA");
    expect(JSON.stringify(res)).toContain("QRIS");
  });

  it("returns verified delivery information", () => {
    const res = executeInfoToko("pengiriman");
    expect(res.topik).toBe("pengiriman");
    expect(JSON.stringify(res)).toContain("Instant");
    expect(JSON.stringify(res)).toContain("Bubble wrap");
  });

  it("returns verified warranty and return policies", () => {
    const res = executeInfoToko("retur_dan_garansi");
    expect(res.topik).toBe("garansi_dan_retur");
    expect(JSON.stringify(res)).toContain("100% Original");
    expect(JSON.stringify(res)).toContain("video unboxing");
  });

  it("returns store contact and operating hours", () => {
    const kontak = executeInfoToko("kontak");
    expect(JSON.stringify(kontak)).toContain("628112238310");
    const jam = executeInfoToko("jam_operasional");
    expect(JSON.stringify(jam)).toContain("09.00 - 18.00");
  });
});

describe("Chatbot Phase 3 Tools - executeCekPesanan", () => {
  const mockOrder = {
    id: "e9b5f3a0-1234-4567-89ab-cdef01234567",
    user_id: "user-123",
    order_number: "ORD-20261027-001",
    status: "processing",
    grand_total: 15_000_000,
    total_amount: 15_000_000,
    courier: "JNE",
    created_at: "2026-10-27T10:00:00Z",
    shipping_address: {
      recipient_name: "Budi Santoso",
      phone: "081234567890",
      customer_snapshot: {
        name: "Budi Santoso",
        email: "budi@example.com",
        phone: "081234567890",
      },
      tracking_number: "JNE-TRACK-999",
      city: "Bandung",
    },
    order_items: [
      { id: "item-1", product_name: "Lenovo LOQ 15", price: 15_000_000, quantity: 1 },
    ],
    payments: [{ payment_method: "bank_transfer", status: "success" }],
  };

  const createMockSupabase = (orderData: unknown = mockOrder) => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: orderData, error: null })),
        })),
        or: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: orderData, error: null })),
        })),
      })),
    })),
  });

  it("rejects when nomor_pesanan or email_atau_hp is missing", async () => {
    const supabase = createMockSupabase() as unknown as Parameters<typeof executeCekPesanan>[0];
    const res1 = await executeCekPesanan(supabase, "", "budi@example.com");
    expect(res1.success).toBe(false);
    expect(res1.message).toContain("Nomor pesanan harus");

    const res2 = await executeCekPesanan(supabase, "ORD-20261027-001", "");
    expect(res2.success).toBe(false);
    expect(res2.message).toContain("privasi");
  });

  it("verifies order successfully with matching email", async () => {
    const supabase = createMockSupabase() as unknown as Parameters<typeof executeCekPesanan>[0];
    const res = await executeCekPesanan(supabase, "ORD-20261027-001", "budi@example.com");
    expect(res.success).toBe(true);
    expect(res.nomor_pesanan).toBe("ORD-20261027-001");
    expect(res.status).toContain("Sedang Diproses");
    expect(res.kurir).toBe("JNE");
    expect(res.nomor_resi).toBe("JNE-TRACK-999");
    expect(res.item_pesanan?.length).toBe(1);
  });

  it("verifies order successfully with matching phone variations (08... vs 628...)", async () => {
    const supabase = createMockSupabase() as unknown as Parameters<typeof executeCekPesanan>[0];
    const res = await executeCekPesanan(supabase, "ORD-20261027-001", "+62 812-3456-7890");
    expect(res.success).toBe(true);
    expect(res.nomor_pesanan).toBe("ORD-20261027-001");
  });

  it("rejects without leaking data when verification fails (wrong email or phone)", async () => {
    const supabase = createMockSupabase() as unknown as Parameters<typeof executeCekPesanan>[0];
    const resWrongEmail = await executeCekPesanan(supabase, "ORD-20261027-001", "wrong@example.com");
    expect(resWrongEmail.success).toBe(false);
    expect(resWrongEmail.message).toContain("tidak cocok");
    expect(resWrongEmail).not.toHaveProperty("penerima");
    expect(resWrongEmail).not.toHaveProperty("total_pembayaran");

    const resWrongPhone = await executeCekPesanan(supabase, "ORD-20261027-001", "089999999999");
    expect(resWrongPhone.success).toBe(false);
    expect(resWrongPhone.message).toContain("tidak cocok");
  });

  it("rejects when order does not exist in database", async () => {
    const supabase = createMockSupabase(null) as unknown as Parameters<typeof executeCekPesanan>[0];
    const res = await executeCekPesanan(supabase, "ORD-NONEXISTENT", "budi@example.com");
    expect(res.success).toBe(false);
    expect(res.message).toContain("tidak ditemukan");
  });

  it("auto-verifies logged-in user without requiring manual email or phone entry", async () => {
    const supabase = createMockSupabase() as unknown as Parameters<typeof executeCekPesanan>[0];
    const res = await executeCekPesanan(
      supabase,
      "ORD-20261027-001",
      "",
      { id: "user-123", email: "user@example.com" }
    );
    expect(res.success).toBe(true);
    expect(res.nomor_pesanan).toBe("ORD-20261027-001");
    expect(res.status).toContain("Sedang Diproses");
  });
});
