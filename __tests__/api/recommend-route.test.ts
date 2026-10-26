import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  catalog: [] as Record<string, unknown>[],
  aiText: "",
  prompts: [] as string[],
  queryCount: 0,
  rangeCalls: 0,
  modelCalls: 0,
  failGemini: false,
  functionQuery: null as string | null,
  catalogError: false,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 14, limit: 15, resetSeconds: 60 })),
  getClientIp: vi.fn(() => "198.51.100.10"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => {
      mocks.queryCount += 1;
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn(async (start: number, end: number) => {
          mocks.rangeCalls += 1;
          return mocks.catalogError
            ? ({ data: null, error: { message: "database connection detail should not leak" } })
            : ({ data: mocks.catalog.slice(start, end + 1), error: null });
        }),
      };
      return query;
    }),
  })),
}));

vi.mock("@google/genai", () => ({
  FunctionCallingConfigMode: { AUTO: "AUTO" },
  Type: { OBJECT: "OBJECT", STRING: "STRING" },
  GoogleGenAI: class {
    models = {
      generateContent: async ({ contents, config }: { contents: unknown; config?: { tools?: unknown[] } }) => {
        mocks.modelCalls += 1;
        mocks.prompts.push(typeof contents === "string" ? contents : JSON.stringify(contents));
        if (mocks.failGemini) throw new Error("Gemini unavailable");
        if (config?.tools?.length && mocks.functionQuery) {
          const functionCall = { name: "search_catalog_products", id: "catalog-search-1", args: { query: mocks.functionQuery } };
          return { functionCalls: [functionCall], candidates: [{ content: { role: "model", parts: [{ functionCall }] } }] };
        }
        return { text: mocks.aiText };
      },
    };
  },
}));

vi.mock("@/services/faq.service", () => ({
  FAQService: class { getActiveFAQs = vi.fn(async () => []); },
}));

import { POST } from "@/app/api/recommend/route";

const laptop = (id: string, name: string, price: number, gpu: string | null, stock = 4) => ({
  id,
  name,
  description: gpu ? `Laptop ${gpu}` : "Laptop, detail grafis belum dicantumkan",
  price,
  discount_price: null,
  stock,
  sku: `${id.toUpperCase()}-SKU`,
  slug: `${id}-slug`,
  status: "published",
  categories: { name: "Laptop", slug: "laptop" },
  brands: { name: "Lenovo", slug: "lenovo" },
  product_images: [],
  product_specifications: gpu ? [{ key: "GPU", value: gpu }] : [],
  product_variants: id === "laptop-rtx4050" ? [{
    id: "variant-4050", sku: "VAR-4050-SKU", color: "Storm Grey", ram: "16 GB", storage: "512 GB SSD",
    price: price + 1_000_000, discount_price: null, stock,
  }] : [],
});

const catalog = [
  laptop("laptop-integrated", "Lenovo Laptop Integrated", 8_500_000, "Intel UHD Graphics"),
  laptop("laptop-unknown-gpu", "Lenovo Laptop GPU Unknown", 9_000_000, null),
  laptop("laptop-rtx3050", "Lenovo Laptop RTX 3050", 12_000_000, "NVIDIA GeForce RTX 3050"),
  laptop("laptop-rtx4050", "Lenovo Laptop RTX 4050", 15_000_000, "NVIDIA GeForce RTX 4050"),
  {
    ...laptop("desktop-rtx", "Lenovo Desktop RTX 4050", 8_000_000, "NVIDIA GeForce RTX 4050"),
    categories: { name: "Desktop" },
  },
  {
    ...laptop("monitor", "Lenovo Monitor", 2_000_000, null),
    categories: { name: "Monitor" },
    description: "Monitor 24 inch",
  },
];

async function send(message: string, history: { role: "user" | "assistant"; text: string; productIds?: string[] }[] = []) {
  const request = new Request("http://localhost/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  const response = await POST(request);
  return { status: response.status, body: await response.json() as {
    answer: string;
    error?: string;
    aiGenerated: boolean;
    products: { id: string; price: number; graphicsLabel?: string | null }[];
    alternatives?: { id: string; price: number; graphicsLabel?: string | null }[];
  } };
}

describe("POST /api/recommend conversation flow", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-test");
    mocks.catalog = catalog;
    mocks.aiText = "Aku sudah menyesuaikan pencarian dengan kebutuhanmu; detail katalog yang tersedia ada pada kartu.";
    mocks.prompts = [];
    mocks.queryCount = 0;
    mocks.rangeCalls = 0;
    mocks.modelCalls = 0;
    mocks.failGemini = false;
    mocks.functionQuery = null;
    mocks.catalogError = false;
  });

  afterEach(() => vi.unstubAllEnvs());

  it("keeps a full sales conversation contextual and returns only validated current-category cards", async () => {
    const history: { role: "user" | "assistant"; text: string }[] = [];
    const ask = async (message: string, aiText?: string) => {
      if (aiText) mocks.aiText = aiText;
      const result = await send(message, history);
      history.push({ role: "user", text: message }, { role: "assistant", text: result.body.answer });
      return result.body;
    };

    mocks.aiText = "Hai bang, siap bantu ya. Ada yang mau dicari?";
    const greeting = await ask("bang bang woi");
    expect(greeting.aiGenerated).toBe(true);
    expect(greeting.products).toEqual([]);
    expect(greeting.answer).toContain("Hai bang");
    expect(mocks.queryCount).toBe(0);

    mocks.aiText = "Budget sekitar Rp10 juta sudah aku catat. Kamu mencari laptop, PC desktop, monitor, atau perangkat lain?";
    const clarification = await ask("gua cari barang harga 10jtan");
    expect(clarification.aiGenerated).toBe(true);
    expect(clarification.products).toEqual([]);
    expect(clarification.answer).toContain("laptop");
    expect(clarification.answer).toContain("monitor");
    expect(mocks.queryCount).toBe(0);

    const laptops = await ask("laptop aja bang", "Aku sudah menyesuaikan pencarian dengan kebutuhanmu; detail katalog yang tersedia ada pada kartu.");
    expect(laptops.products.map(({ id }) => id)).toEqual(["laptop-unknown-gpu", "laptop-integrated"]);
    expect(laptops.products.some(({ id }) => id === "monitor" || id === "desktop-rtx")).toBe(false);

    const vga = await ask("kalo yang bervga ada ga?", "Kartu laptop menampilkan tipe grafis yang tercatat; sebagian informasi GPU memang belum dicantumkan.");
    expect(vga.products.map(({ id }) => id)).toEqual(["laptop-integrated"]);
    expect(vga.products.find(({ id }) => id === "laptop-integrated")?.graphicsLabel).toBe("Intel UHD Graphics");

    const rtx3050 = await ask("vga yang pake rtx 3050", "RTX 3050 belum ditemukan dalam budgetmu; opsi di atas budget dipisahkan pada kartu alternatif.");
    expect(rtx3050.products).toEqual([]);
    expect(rtx3050.alternatives?.map(({ id }) => id)).toContain("laptop-rtx3050");

    const rtx4050 = await ask("kalo yang 4050?", "RTX 4050 belum ditemukan dalam budgetmu; opsi di atas budget dipisahkan pada kartu alternatif.");
    expect(rtx4050.products).toEqual([]);
    expect(rtx4050.alternatives?.map(({ id }) => id)).toContain("laptop-rtx4050");

    const rtx5050 = await ask("kalo yang rtx 5050?", "Model GPU yang kamu tanya belum ada yang cocok di anggaran ini; kartu alternatif menunjukkan pilihan lain yang tercatat.");
    expect(rtx5050.products).toEqual([]);
    expect(rtx5050.alternatives?.map(({ id }) => id)).toContain("laptop-rtx3050");
    expect(rtx5050.alternatives?.map(({ id }) => id)).not.toContain("desktop-rtx");

    const gpuInventory = await ask("trus adanya vga apa?", "Katalog laptop menampilkan grafis integrated di budgetmu; ada juga GPU dedicated di atas budget. Tipe yang tidak tercatat kutandai pada kartu.");
    expect(gpuInventory.products.map(({ id }) => id)).toEqual(["laptop-integrated"]);
    expect(gpuInventory.alternatives?.map(({ id }) => id)).toContain("laptop-rtx3050");
    expect(gpuInventory.alternatives?.some(({ id }) => id === "desktop-rtx")).toBe(false);
    expect(gpuInventory.answer).toContain("integrated");
    expect(gpuInventory.answer).toContain("dedicated");
    expect(mocks.prompts.some((prompt) => prompt.toLowerCase().includes("rtx 5050"))).toBe(true);
    expect(mocks.prompts.some((prompt) => prompt.includes("graphicsInventoryRequest"))).toBe(true);

    const gaming = await ask("gaming adanya apa aja?");
    expect(gaming.products.every(({ id }) => id.startsWith("laptop-"))).toBe(true);
    expect(mocks.prompts.at(-1)).toContain('"budget":10000000');
    expect(mocks.prompts.at(-1)).toContain('"category":"laptop"');

    mocks.aiText = "Aku bisa bantu mencari dan membandingkan produk katalog, menyesuaikan budget dan spesifikasi, serta menjawab informasi layanan toko.";
    const capability = await ask("lu bisa bantu apa?");
    expect(capability.aiGenerated).toBe(true);
    expect(capability.products).toEqual([]);
    expect(capability.answer).toContain("membandingkan");
    expect(mocks.prompts.at(-1)).toContain("gaming adanya apa aja?");
    expect(mocks.modelCalls).toBe(10);
  });

  it("asks Gemini for a grounded next step when a GPU search has no matching product or alternative", async () => {
    mocks.catalog = [laptop("only-basic", "Lenovo Basic", 7_000_000, null)];
    mocks.aiText = "Untuk RTX 4050 di budget Rp8 juta, belum ada laptop yang cocok. Mau coba mengubah budget atau mencari GPU lain?";
    const result = await send("RTX 4050 ada?", [
      { role: "user", text: "Cari laptop budget Rp8 juta" },
      { role: "assistant", text: "Kebutuhan grafisnya seperti apa?" },
    ]);

    expect(result.body.aiGenerated).toBe(true);
    expect(result.body.products).toEqual([]);
    expect(result.body.alternatives).toEqual([]);
    expect(result.body.answer).toContain("RTX 4050");
    expect(result.body.answer).not.toContain("Aku fokus membantu soal produk");
    expect(mocks.modelCalls).toBe(1);
  });

  it.each([
    ["halo", "Halo! Senang bisa bantu, ada yang mau dicari?"],
    ["makasih", "Sama-sama, kabari saja kalau butuh bantuan lagi."],
  ])("answers small talk '%s' naturally without querying products", async (message, responseText) => {
    mocks.aiText = responseText;
    const result = await send(message);
    expect(result.body.aiGenerated).toBe(true);
    expect(result.body.products).toEqual([]);
    expect(result.body.answer).toBe(responseText);
    expect(mocks.queryCount).toBe(0);
  });

  it("switches from product advice to general technology and back without old cards or filters leaking", async () => {
    const history: { role: "user" | "assistant"; text: string }[] = [];
    mocks.aiText = "Aku menemukan pilihan laptop sesuai anggaran dan kebutuhanmu. Kartu di bawah memuat detail katalog.";
    const firstProductSearch = await send("Cari laptop budget Rp9 juta");
    history.push(
      { role: "user", text: "Cari laptop budget Rp9 juta" },
      { role: "assistant", text: firstProductSearch.body.answer },
    );
    expect(firstProductSearch.body.products.every(({ id }) => id.startsWith("laptop-"))).toBe(true);
    expect(firstProductSearch.body.products.map(({ id }) => id)).not.toContain("monitor");
    expect(mocks.queryCount).toBe(1);

    mocks.aiText = "GPU memproses data grafis untuk membentuk gambar yang ditampilkan layar. Kemampuan tiap GPU berbeda menurut arsitektur dan beban kerja.";
    const general = await send("How does a GPU work?", history);
    expect(general.body.aiGenerated).toBe(true);
    expect(general.body.answer).toContain("memproses data grafis");
    expect(general.body.products).toEqual([]);
    expect(general.body.alternatives).toEqual([]);
    expect(mocks.queryCount).toBe(1);
    history.push(
      { role: "user", text: "How does a GPU work?" },
      { role: "assistant", text: general.body.answer },
    );

    mocks.aiText = "Aku sesuaikan lagi pilihan laptop dengan budget terbaru. Detail produknya ada pada kartu.";
    const returned = await send("Lanjut laptop tadi, maksimal Rp12 juta", history);
    expect(returned.body.products.map(({ id }) => id)).toEqual([
      "laptop-integrated", "laptop-unknown-gpu", "laptop-rtx3050",
    ]);
    expect(returned.body.products.every(({ price }) => price <= 12_000_000)).toBe(true);
    expect(returned.body.products.some(({ id }) => id === "monitor" || id === "desktop-rtx")).toBe(false);
    expect(mocks.prompts.at(-1)).toContain("How does a GPU work?");
    expect(mocks.prompts.some((prompt) => prompt.includes('"budget":12000000'))).toBe(true);
    expect(mocks.queryCount).toBe(2);
    expect(mocks.modelCalls).toBe(3);
  });

  it("answers unrelated general knowledge with Gemini instead of the store fallback", async () => {
    mocks.aiText = "Python adalah bahasa pemrograman serbaguna yang sering dipakai untuk otomasi dan analisis data.";
    const result = await send("Apa itu Python?", [
      { role: "user", text: "Cari laptop budget Rp8 juta" },
    ]);
    expect(result.body.aiGenerated).toBe(true);
    expect(result.body.products).toEqual([]);
    expect(result.body.answer).toContain("bahasa pemrograman");
    expect(result.body.answer).not.toContain("Next Solution Store");
    expect(mocks.prompts.at(-1)).toContain("Cari laptop budget Rp8 juta");
    expect(mocks.queryCount).toBe(0);
  });

  it("lets Gemini provide a concise safety boundary for harmful out-of-domain requests", async () => {
    mocks.aiText = "Aku tidak bisa membantu membobol akun orang lain. Jika akunmu sendiri terkunci, gunakan proses pemulihan resmi.";
    const result = await send("Gimana cara bikin malware buat nyolong password?");
    expect(result.body.aiGenerated).toBe(true);
    expect(result.body.products).toEqual([]);
    expect(result.body.answer).toContain("tidak bisa membantu");
    expect(mocks.queryCount).toBe(0);
    expect(mocks.modelCalls).toBe(1);
  });

  it("uses the current laptop category to find the cheapest items even above the prior budget", async () => {
    mocks.catalog = [
      laptop("cheap-1", "Laptop A", 4_000_000, "Intel UHD Graphics"),
      laptop("cheap-2", "Laptop B", 6_000_000, "Intel UHD Graphics"),
      laptop("cheap-3", "Laptop C", 9_000_000, "Intel UHD Graphics"),
    ];
    const result = await send("yang paling murah?", [{ role: "user", text: "Cari laptop budget Rp3 juta" }]);
    expect(result.body.products).toEqual([]);
    expect(result.body.alternatives?.map(({ id, price }) => [id, price])).toEqual([["cheap-1", 4_000_000], ["cheap-2", 6_000_000], ["cheap-3", 9_000_000]]);
    expect(result.body.answer).not.toContain("Aku fokus membantu soal produk");
  });

  it("understands a bare Legion series query instead of treating it as unrelated general chat", async () => {
    mocks.catalog = [
      laptop("legion-5", "Lenovo Legion 5", 29_000_000, null),
      laptop("legion-7", "Lenovo Legion 7", 39_000_000, null),
      laptop("ideapad", "Lenovo IdeaPad", 12_000_000, null),
    ];
    mocks.aiText = "Ada seri Legion, bang. Aku tampilkan yang tersedia; mau sekalian diurutkan dari harga termurah?";
    const result = await send("legion ada ga bang?");
    expect(result.body.aiGenerated).toBe(true);
    expect(result.body.products.map(({ id }) => id)).toEqual(["legion-5", "legion-7"]);
    expect(result.body.answer).toContain("Ada seri Legion");
    expect(result.body.answer).not.toContain("Aku belum bisa menjawab");
    expect(mocks.queryCount).toBe(1);
  });

  it("answers a cheapest VGA question with only products whose graphics type is listed", async () => {
    mocks.catalog = [
      laptop("lenovo-unknown-graphics", "Lenovo Laptop Graphics Unknown", 6_000_000, null),
      laptop("lenovo-integrated-graphics", "Lenovo Laptop Integrated", 7_000_000, "Intel UHD Graphics"),
    ];
    const result = await send("dari lenovo yang ber vga paling murah apa bang?", [
      { role: "user", text: "Cari laptop Lenovo" },
    ]);
    expect(result.body.products.map(({ id }) => id)).toEqual(["lenovo-integrated-graphics"]);
    expect(result.body.answer).toContain("integrated");
    expect(result.body.answer).not.toContain("belum dicantumkan");
  });

  it("clears a cancelled budget before searching for a dedicated gaming laptop", async () => {
    const result = await send("jangan budget 5jtan, gue mau laptop gaming dengan VGA dedicated", [
      { role: "user", text: "Cari laptop budget Rp5 juta" },
    ]);
    expect(result.body.products.map(({ id }) => id)).toEqual(["laptop-rtx3050", "laptop-rtx4050"]);
    expect(result.body.products.every(({ price }) => price > 5_000_000)).toBe(true);
    expect(result.body.products.some(({ id }) => id === "laptop-integrated")).toBe(false);
  });

  it("does not repeat the product cards the user just rejected", async () => {
    mocks.catalog = [...catalog, laptop("laptop-fresh", "Lenovo Laptop Fresh", 8_000_000, "Intel UHD Graphics")];
    const result = await send("yang lain, itu gak cocok", [
      { role: "user", text: "Cari laptop budget Rp10 juta" },
      { role: "assistant", text: "Ada pilihan ini.", productIds: ["laptop-integrated", "laptop-unknown-gpu"] },
    ]);
    expect(result.body.products.map(({ id }) => id)).toEqual(["laptop-fresh"]);
  });

  it("keeps Gemini failures contextual instead of returning the old generic error", async () => {
    mocks.failGemini = true;
    const result = await send("Apa itu Python?", [{ role: "user", text: "Aku lagi cari laptop untuk kuliah" }]);
    expect(result.body.answer).toContain("Apa itu Python?");
    expect(result.body.answer).toContain("laptop untuk kuliah");
    expect(result.body.answer).not.toBe("Aku belum bisa menyusun jawaban sekarang. Coba tanyakan lagi sebentar ya.");
    expect(result.body.aiGenerated).toBe(false);
    expect(mocks.queryCount).toBe(0);
    expect(mocks.modelCalls).toBe(1);
  });

  it("returns a safe catalog error that keeps the active product context", async () => {
    mocks.catalogError = true;
    const result = await send("Cari laptop budget Rp5 juta");
    expect(result.status).toBe(503);
    expect(result.body.error).toContain("laptop");
    expect(result.body.error).toContain("Rp5.000.000");
    expect(result.body.error).not.toContain("database connection detail");
    expect(mocks.modelCalls).toBe(0);
  });

  it("passes complete public catalog facts to Gemini and executes one validated search tool call", async () => {
    mocks.functionQuery = "SKU: VAR-4050-SKU";
    const result = await send("Cari laptop");
    const payload = mocks.prompts[0];
    expect(payload).toContain('"slug":"laptop-rtx4050-slug"');
    expect(payload).toContain('"status":"published"');
    expect(payload).toContain('"brand":{"name":"Lenovo","slug":"lenovo"}');
    expect(payload).toContain('"category":{"name":"Laptop","slug":"laptop"}');
    expect(payload).toContain('"sku":"LAPTOP-RTX4050-SKU"');
    expect(payload).toContain('"sku":"VAR-4050-SKU"');
    expect(payload).toContain('"effective_price":16000000');
    expect(payload).toContain('"stock":4');
    expect(payload).toContain("NVIDIA GeForce RTX 4050");
    expect(payload).toContain('"color":"Storm Grey"');
    expect(payload).toContain("dialog konsultasi yang berlanjut");
    expect(payload).toContain("satu kandidat utama");
    expect(payload).toContain("SKU/MTM");
    expect(result.body.products.map(({ id }) => id)).toEqual(["laptop-rtx4050"]);
    expect(mocks.modelCalls).toBe(2);
    expect(mocks.queryCount).toBe(1);
  });

  it("paginates beyond the first catalog page and finds an exact SKU on a later page", async () => {
    mocks.catalog = Array.from({ length: 401 }, (_, index) =>
      laptop(`catalog-${index}`, `Lenovo Laptop ${index}`, 5_000_000 + index, "Intel UHD Graphics"),
    );
    mocks.functionQuery = "SKU: CATALOG-400-SKU";
    const result = await send("Cari laptop");
    expect(mocks.rangeCalls).toBe(2);
    expect(result.body.products.map(({ id }) => id)).toEqual(["catalog-400"]);
  });
});
