import { describe, expect, it } from "vitest";
import {
  answerOutOfScope,
  findRelevantFaq,
  getCatalogGraphicsLabel,
  getCatalogGraphicsType,
  graphicsFollowUpAnswer,
  getMatchingVariant,
  getProductCriteria,
  parseBudget,
  rankProducts,
  searchGraphicsProducts,
  selectConversationalAnswer,
  selectAssistantAnswer,
  type AssistantProduct,
  type ChatTurn,
} from "@/lib/recommendation-assistant";

const catalog: AssistantProduct[] = [
  {
    id: "budget", name: "ASUS Vivobook 14", description: "Laptop Intel Core i5, RAM 16 GB, SSD 512 GB, Intel Graphics",
    sku: "ASU-14", price: 8_000_000, discount_price: 7_000_000, stock: 2,
    categories: { name: "Laptop" }, brands: { name: "ASUS" },
    product_specifications: [{ key: "RAM", value: "16 GB" }, { key: "GPU", value: "Intel Graphics" }],
  },
  {
    id: "gaming", name: "Lenovo LOQ 15", description: "Laptop Core i5, GeForce RTX 4050, RAM 16 GB, SSD 512 GB",
    sku: "LNV-LOQ", price: 15_000_000, discount_price: null, stock: 3,
    categories: { name: "Laptop" }, brands: { name: "Lenovo" },
    product_specifications: [{ key: "GPU", value: "GeForce RTX 4050" }, { key: "RAM", value: "16 GB" }],
  },
  {
    id: "dead", name: "Acer Aspire", description: "Laptop RAM 8 GB",
    sku: "ACR-8", price: 6_000_000, discount_price: null, stock: 0,
    categories: { name: "Laptop" }, brands: { name: "Acer" },
  },
];

const graphicsCatalog: AssistantProduct[] = [
  {
    id: "soulmate-x2", name: "Advan Soulmate X2", description: 'AMD 3020e / AMD Radeon Vega 3 Graphics / 8GB / 128GB',
    price: 4_799_000, discount_price: null, stock: 39, categories: { name: "Laptop" }, brands: { name: "Advan" },
    product_specifications: [{ key: "Processor", value: "AMD 3020e" }],
  },
  {
    id: "acer-n4500", name: "Acer Aspire Lite 14 AL14-36P", description: "Intel Celeron N4500 / Intel UHD Graphics / 8GB / 512GB SSD",
    price: 7_999_000, discount_price: null, stock: 9, categories: { name: "Laptop" }, brands: { name: "Acer" },
    product_specifications: [{ key: "Processor", value: "Intel Celeron N4500" }],
  },
  {
    id: "asus-n150", name: "ASUS Vivobook Go 14", description: "Intel N150 / 8GB / 256GB UFS",
    price: 7_999_000, discount_price: null, stock: 19, categories: { name: "Laptop" }, brands: { name: "ASUS" },
    product_specifications: [{ key: "Processor", value: "Intel N150" }],
  },
  {
    id: "rtx-budget-over", name: "Laptop NVIDIA RTX", description: "Intel Core i5 / NVIDIA GeForce RTX 2050",
    price: 9_999_000, discount_price: null, stock: 3, categories: { name: "Laptop" }, brands: { name: "MSI" },
    product_specifications: [{ key: "GPU", value: "NVIDIA GeForce RTX 2050" }],
  },
];

describe("recommendation assistant intent and catalog accuracy", () => {
  it("recognizes a bare known product series and returns the five lowest or highest prices in order", () => {
    const seriesCriteria = getProductCriteria("legion ada ga bang?", []);
    expect(seriesCriteria.wantsProducts).toBe(true);
    expect(seriesCriteria.outOfScope).toBe(false);
    expect(seriesCriteria.category).toBe("laptop");
    expect(seriesCriteria.brand).toBe("Lenovo");
    expect(seriesCriteria.series).toContain("legion");

    const products: AssistantProduct[] = Array.from({ length: 7 }, (_, index) => ({
      id: `laptop-${index + 1}`, name: `Laptop ${index + 1}`, description: "Laptop untuk penggunaan umum",
      price: (index + 1) * 1_000_000, discount_price: null, stock: 2,
      categories: { name: "Laptop" }, brands: { name: "Lenovo" },
    }));
    const lowestCriteria = getProductCriteria("laptop paling murah", []);
    const lowest = searchGraphicsProducts(products, lowestCriteria, "laptop paling murah");
    expect(lowest.products.map(({ id }) => id)).toEqual(["laptop-1", "laptop-2", "laptop-3", "laptop-4", "laptop-5"]);

    const highestCriteria = getProductCriteria("laptop paling mahal", []);
    const highest = searchGraphicsProducts(products, highestCriteria, "laptop paling mahal");
    expect(highest.products.map(({ id }) => id)).toEqual(["laptop-7", "laptop-6", "laptop-5", "laptop-4", "laptop-3"]);
  });

  it("does not treat unlisted graphics as a match for a cheapest VGA request", () => {
    const history: ChatTurn[] = [{ role: "user", text: "Cari laptop Lenovo" }];
    const question = "dari lenovo yang ber vga paling murah apa bang?";
    const criteria = getProductCriteria(question, history);
    const result = searchGraphicsProducts([
      { ...catalog[1], id: "gpu-not-listed", description: "Laptop", product_specifications: [] },
      { ...catalog[0], id: "integrated-known", brands: { name: "Lenovo" }, product_specifications: [{ key: "GPU", value: "Intel UHD Graphics" }] },
    ], criteria, question);

    expect(criteria.graphicsQuestion).toBe(true);
    expect(criteria.graphicsInventoryRequest).toBe(false);
    expect(result.products.map(({ id }) => id)).toEqual(["integrated-known"]);
  });

  it("finds exact brand, slug, product or variant SKU, GPU model, and requested variant attributes", () => {
    const detailedLaptop: AssistantProduct = {
      ...catalog[1],
      slug: "lenovo-loq-15-rtx-4050",
      sku: "LOQ-MAIN-4050",
      brands: { name: "Lenovo", slug: "lenovo" },
      categories: { name: "Laptop", slug: "laptop" },
      product_variants: [{
        id: "loq-grey-variant", sku: "LOQ-GREY-4050", color: "Storm Grey", ram: "16 GB", storage: "512 GB SSD",
        price: 15_000_000, discount_price: null, stock: 2,
      }],
    };
    const records = [detailedLaptop, { ...catalog[0], slug: "asus-vivobook-silver", brands: { name: "ASUS", slug: "asus" } }];
    const history: ChatTurn[] = [{ role: "user", text: "Cari laptop" }];

    expect(rankProducts(records, getProductCriteria("Cari laptop brand ASUS", []), "Cari laptop brand ASUS").map(({ id }) => id)).toEqual(["budget"]);
    expect(rankProducts(records, getProductCriteria("slug: lenovo-loq-15-rtx-4050", history), "slug: lenovo-loq-15-rtx-4050").map(({ id }) => id)).toEqual(["gaming"]);
    expect(rankProducts(records, getProductCriteria("SKU: LOQ-GREY-4050", history), "SKU: LOQ-GREY-4050").map(({ id }) => id)).toEqual(["gaming"]);
    expect(rankProducts(records, getProductCriteria("MTM: LOQ-GREY-4050", history), "MTM: LOQ-GREY-4050").map(({ id }) => id)).toEqual(["gaming"]);
    expect(rankProducts(records, getProductCriteria("RTX 4050", history), "RTX 4050").map(({ id }) => id)).toEqual(["gaming"]);
    expect(rankProducts(records, getProductCriteria("Cari laptop warna grey", history), "Cari laptop warna grey").map(({ id }) => id)).toEqual(["gaming"]);
  });

  it("allows requested verified catalog details but rejects invented variant SKUs and GPU models", () => {
    const detailedLaptop: AssistantProduct = {
      ...catalog[1],
      sku: "LOQ-MAIN-4050",
      product_variants: [{ id: "v", sku: "LOQ-GREY-4050", color: "Storm Grey", ram: "16 GB", storage: "512 GB SSD", price: 15_000_000, discount_price: null, stock: 2 }],
    };
    const criteria = getProductCriteria("SKU laptop ini apa?", [{ role: "user", text: "Cari laptop" }]);
    const fallback = "Aku sudah cek data katalog untuk produk yang kamu maksud.";
    expect(selectAssistantAnswer("SKU: LOQ-GREY-4050 adalah kode varian yang tercantum di katalog.", fallback, [detailedLaptop], criteria).generated).toBe(true);
    expect(selectAssistantAnswer("SKU: FABRICATED-99 adalah kode varian yang tercantum di katalog.", fallback, [detailedLaptop], criteria).generated).toBe(false);
    expect(selectAssistantAnswer("GPU-nya NVIDIA GeForce RTX 5090.", fallback, [detailedLaptop], criteria).generated).toBe(false);
  });

  it("keeps laptop and latest budget context through short GPU-model follow-ups", () => {
    const history: ChatTurn[] = [
      { role: "user", text: "Cari laptop buat kerja budget Rp7 juta" },
      { role: "assistant", text: "Ada beberapa pilihan." },
      { role: "user", text: "Naikin budget jadi Rp8 juta" },
      { role: "assistant", text: "Oke, aku pakai budget terbaru." },
      { role: "user", text: "VGA ada?" },
      { role: "assistant", text: "Ada opsi integrated." },
      { role: "user", text: "GPU seperti RTX 3050" },
      { role: "assistant", text: "Belum ketemu RTX 3050." },
    ];
    const criteria4050 = getProductCriteria("4050 ada?", history);
    expect(criteria4050.outOfScope).toBe(false);
    expect(criteria4050.wantsProducts).toBe(true);
    expect(criteria4050.category).toBe("laptop");
    expect(criteria4050.budget).toBe(8_000_000);
    expect(criteria4050.graphics).toBe("rtx 4050");
    expect(criteria4050.requiresDedicatedGpu).toBe(true);

    const criteria4060 = getProductCriteria("Kalau 4060?", history);
    expect(criteria4060.outOfScope).toBe(false);
    expect(criteria4060.category).toBe("laptop");
    expect(criteria4060.budget).toBe(8_000_000);
    expect(criteria4060.graphics).toBe("rtx 4060");
  });

  it("separates an exact dedicated GPU match above budget from eligible products", () => {
    const criteria = getProductCriteria("RTX 4050", [
      { role: "user", text: "Laptop budget Rp8 juta" },
      { role: "user", text: "GPU seperti RTX 3050" },
    ]);
    const result = searchGraphicsProducts([...graphicsCatalog, catalog[1]], criteria, "RTX 4050");
    expect(result.products).toEqual([]);
    expect(result.alternativeKind).toBe("over-budget-match");
    expect(result.alternatives.map(({ id }) => id)).toEqual(["gaming"]);
    expect(result.alternatives[0].price).toBe(15_000_000);
    expect(result.alternatives[0].stock).toBe(3);
    expect(result.alternatives[0].description).toContain("GeForce RTX 4050");
  });

  it("uses a grounded contextual answer when an RTX 4050 search has no matches or alternatives", () => {
    const history: ChatTurn[] = [
      { role: "user", text: "Cari laptop gaming budget Rp8 juta" },
      { role: "assistant", text: "Aku cek GPU yang tersedia." },
    ];
    const question = "RTX 4050 ada?";
    const criteria = getProductCriteria(question, history);
    const result = searchGraphicsProducts([], criteria, question);
    const fallback = graphicsFollowUpAnswer(result.products, criteria, result.alternativeKind);
    const generated = "Untuk RTX 4050, belum ada laptop yang cocok dengan budget Rp8 juta. Mau coba GPU lain atau menyesuaikan budget?";
    const selected = selectAssistantAnswer(generated, fallback, result.products, criteria);

    expect(result.products).toEqual([]);
    expect(result.alternatives).toEqual([]);
    expect(criteria.outOfScope).toBe(false);
    expect(selected).toEqual({ answer: generated, generated: true });
    expect(selectAssistantAnswer(
      "Ada ASUS TUF dengan RTX 4060 seharga Rp12 juta dan stok 3.", fallback, [], criteria
    )).toEqual({ answer: fallback, generated: false });
  });

  it("keeps 'lah adanya apa dong?' in the GPU conversation when the catalog is empty", () => {
    const history: ChatTurn[] = [
      { role: "user", text: "Laptop gaming budget Rp8 juta" },
      { role: "assistant", text: "Aku cek dulu ya." },
      { role: "user", text: "RTX 4050" },
      { role: "assistant", text: "Belum ada yang cocok." },
    ];
    const question = "lah adanya apa dong?";
    const criteria = getProductCriteria(question, history);
    const result = searchGraphicsProducts([], criteria, question);
    const fallback = graphicsFollowUpAnswer(result.products, criteria, result.alternativeKind);
    const generated = "Untuk laptop dengan RTX 4050, belum ada pilihan yang cocok di budget Rp8 juta. Kita bisa cek GPU lain atau ubah budget—kamu prefer yang mana?";
    const selected = selectAssistantAnswer(generated, fallback, result.products, criteria);

    expect(criteria.outOfScope).toBe(false);
    expect(criteria.alternativeRequest).toBe(true);
    expect(criteria.graphics).toBe("rtx 4050");
    expect(criteria.budget).toBe(8_000_000);
    expect(result.alternatives).toEqual([]);
    expect(selected).toEqual({ answer: generated, generated: true });
    expect(selected.answer).not.toContain("Aku fokus membantu soal produk");
  });

  it("treats 'lah adanya apa dong' as a request for real dedicated GPU alternatives", () => {
    const history: ChatTurn[] = [
      { role: "user", text: "Laptop gaming budget Rp8 juta" },
      { role: "user", text: "RTX 4050" },
      { role: "assistant", text: "Belum ada yang sesuai budget." },
    ];
    const criteria = getProductCriteria("lah adanya apa dong?", history);
    const result = searchGraphicsProducts([...graphicsCatalog, catalog[1]], criteria, "lah adanya apa dong?");
    expect(criteria.outOfScope).toBe(false);
    expect(criteria.wantsProducts).toBe(true);
    expect(criteria.alternativeRequest).toBe(true);
    expect(criteria.graphics).toBe("rtx 4050");
    expect(criteria.budget).toBe(8_000_000);
    expect(result.products).toEqual([]);
    expect(result.alternativeKind).toBe("over-budget-dedicated");
    expect(result.alternatives.map(({ id }) => id)).toContain("gaming");
  });

  it("offers verified integrated choices only when the catalog has no dedicated GPU", () => {
    const criteria = getProductCriteria("RTX 3050 ada?", [{ role: "user", text: "Laptop budget Rp8 juta" }]);
    const result = searchGraphicsProducts(graphicsCatalog.slice(0, 3), criteria, "RTX 3050 ada?");
    expect(result.products).toEqual([]);
    expect(result.alternativeKind).toBe("integrated");
    expect(result.alternatives.map((product) => getCatalogGraphicsType(product))).toEqual(["integrated", "integrated"]);
    expect(graphicsFollowUpAnswer(result.products, criteria, result.alternativeKind)).toContain("bukan pengganti performa RTX");
  });

  it("answers a VGA follow-up from the college budget context with verified graphics types", () => {
    const history: ChatTurn[] = [{ role: "user", text: "Cari laptop buat kuliah budget Rp8 juta" }];
    const question = "kalo yang ada vganya?";
    const criteria = getProductCriteria(question, history);
    const products = rankProducts(graphicsCatalog, criteria, question);
    const answer = graphicsFollowUpAnswer(products, criteria);

    expect(criteria.graphicsQuestion).toBe(true);
    expect(criteria.budget).toBe(8_000_000);
    expect(criteria.category).toBe("laptop");
    expect(products.map(({ id }) => id)).toEqual(["soulmate-x2", "acer-n4500"]);
    expect(products.every((product) => (product.discount_price ?? product.price)! <= criteria.budget! && product.stock! > 0)).toBe(true);
    expect(getCatalogGraphicsType(graphicsCatalog[0])).toBe("integrated");
    expect(getCatalogGraphicsLabel(graphicsCatalog[0])).toBe("AMD Radeon Vega 3 Graphics");
    expect(getCatalogGraphicsType(graphicsCatalog[1])).toBe("integrated");
    expect(getCatalogGraphicsLabel(graphicsCatalog[1])).toBe("Intel UHD Graphics");
    expect(getCatalogGraphicsType(graphicsCatalog[2])).toBe("unknown");
    expect(getCatalogGraphicsLabel(graphicsCatalog[2])).toBeNull();
    expect(getCatalogGraphicsType({
      ...graphicsCatalog[3], description: "Integrated Intel Graphics and NVIDIA GeForce RTX 2050",
    })).toBe("dedicated");
    expect(answer).toContain("GPU integrated");
    expect(answer).toContain("bukan VGA dedicated");
    expect(answer).not.toContain("Soulmate X2");
    expect(answer).not.toContain("Vega 3");
    const typoFollowUp = getProductCriteria("kalo yang bervga ada ga bang?", history);
    expect(typoFollowUp.graphicsQuestion).toBe(true);
    expect(typoFollowUp.budget).toBe(8_000_000);
  });

  it("only recommends verified NVIDIA dedicated GPUs when explicitly requested", () => {
    const history: ChatTurn[] = [{ role: "user", text: "Laptop kuliah budget Rp8 juta" }];
    const question = "maksud gua VGA dedicated NVIDIA";
    const criteria = getProductCriteria(question, history);
    const products = rankProducts(graphicsCatalog, criteria, question);
    expect(criteria.requiresDedicatedGpu).toBe(true);
    expect(criteria.requiresNvidiaGpu).toBe(true);
    expect(products).toEqual([]);
    expect(graphicsFollowUpAnswer(products, criteria)).toContain("Belum ada produk dengan GPU dedicated NVIDIA");
    expect(graphicsFollowUpAnswer(products, criteria)).toContain("budget perlu dinaikkan");
    const raisedQuestion = "Laptop gaming VGA dedicated NVIDIA RTX budget Rp12 juta";
    const raisedBudget = getProductCriteria(raisedQuestion, history);
    expect(rankProducts(graphicsCatalog, raisedBudget, raisedQuestion).map(({ id }) => id)).toEqual(["rtx-budget-over"]);
  });

  it.each([
    ["buat gaming ada?", "gaming"],
    ["buat desain ada?", "design"],
  ])("keeps the budget and explains graphics limits for %s", (question, useCase) => {
    const criteria = getProductCriteria(question, [{ role: "user", text: "Laptop kuliah budget Rp8 juta" }]);
    const products = rankProducts(graphicsCatalog, criteria, question);
    expect(criteria.budget).toBe(8_000_000);
    expect(criteria[useCase as "gaming" | "design"]).toBe(true);
    expect(criteria.requiresDedicatedGpu).toBe(false);
    expect(products.map(({ id }) => id)).toEqual(["soulmate-x2", "acer-n4500", "asus-n150"]);
    expect(products.some((product) => getCatalogGraphicsType(product) === "dedicated")).toBe(false);
    expect(graphicsFollowUpAnswer(products, criteria)).toContain("belum ada GPU dedicated yang terverifikasi");
    expect(graphicsFollowUpAnswer(products, criteria)).toContain("mungkin terbatas");
  });
  it("keeps every recommendation at or below the requested Rp7 million budget", () => {
    const criteria = getProductCriteria("Bang laptop budget Rp7 juta", []);
    expect(rankProducts(catalog, criteria, "Bang laptop budget Rp7 juta").map((item) => item.id)).toEqual(["budget"]);
  });

  it("excludes a product when its matching variant costs more than the budget", () => {
    const variantProduct: AssistantProduct = {
      ...catalog[0], price: 6_500_000, discount_price: null,
      product_variants: [
        { sku: "V-6", color: "Black", ram: "8 GB", storage: "512 GB", price: 6_500_000, discount_price: null, stock: 2 },
        { sku: "V-8", color: "Blue", ram: "16 GB", storage: "512 GB", price: 7_500_000, discount_price: null, stock: 1 },
      ],
    };
    const criteria = getProductCriteria("laptop 16GB budget 7 juta", []);
    expect(getMatchingVariant(variantProduct, criteria)).toBeNull();
    expect(rankProducts([variantProduct], criteria, "laptop 16GB budget 7 juta")).toEqual([]);
  });

  it("keeps the previous budget and explains the limits of integrated graphics for gaming", () => {
    const history: ChatTurn[] = [{ role: "user", text: "Laptop budget 7 juta" }];
    const criteria = getProductCriteria("kalau buat gaming?", history);
    expect(criteria.gaming).toBe(true);
    expect(criteria.budget).toBe(7_000_000);
    const products = rankProducts(catalog, criteria, "kalau buat gaming?");
    expect(products.map(({ id }) => id)).toEqual(["budget"]);
    expect(graphicsFollowUpAnswer(products, criteria)).toContain("belum ada GPU dedicated yang terverifikasi");
  });

  it("keeps the budget and explains the limits of integrated graphics for design", () => {
    const criteria = getProductCriteria("kalau buat desain grafis?", [{ role: "user", text: "Laptop budget 7 juta" }]);
    expect(criteria.design).toBe(true);
    expect(criteria.budget).toBe(7_000_000);
    const products = rankProducts(catalog, criteria, "kalau buat desain grafis?");
    expect(products.map(({ id }) => id)).toEqual(["budget"]);
    expect(graphicsFollowUpAnswer(products, criteria)).toContain("belum ada GPU dedicated yang terverifikasi");
  });

  it("updates use case to college while retaining prior budget", () => {
    const criteria = getProductCriteria("buat kuliah aja", [{ role: "user", text: "Laptop budget 7 juta" }]);
    expect(criteria.category).toBe("laptop");
    expect(criteria.budget).toBe(7_000_000);
    expect(rankProducts(catalog, criteria, "buat kuliah aja").map((item) => item.id)).toEqual(["budget"]);
  });

  it("replaces the previous budget with an explicit Rp15 million budget", () => {
    const criteria = getProductCriteria("naik jadi Rp15 juta", [{ role: "user", text: "Laptop budget 7 juta" }]);
    expect(criteria.budget).toBe(15_000_000);
    expect(rankProducts(catalog, criteria, "naik jadi Rp15 juta").map((item) => item.id)).toEqual(["budget", "gaming"]);
  });

  it("applies a requested brand and ranks a comparison by product names", () => {
    const brandCriteria = getProductCriteria("laptop ASUS", [], ["ASUS", "Lenovo"]);
    expect(rankProducts(catalog, brandCriteria, "laptop ASUS").map((item) => item.id)).toEqual(["budget"]);
    const compareCriteria = getProductCriteria("bandingkan Vivobook dan LOQ", []);
    expect(rankProducts(catalog, compareCriteria, "bandingkan Vivobook dan LOQ").slice(0, 2).map((item) => item.id)).toContain("gaming");
  });

  it("returns no product when no item meets the requested criteria", () => {
    const criteria = getProductCriteria("laptop ASUS budget 5 juta", [], ["ASUS", "Lenovo"]);
    expect(rankProducts(catalog, criteria, "laptop ASUS budget 5 juta")).toEqual([]);
  });

  it("excludes products with unverifiable price or stock", () => {
    const criteria = getProductCriteria("laptop", []);
    const unknown: AssistantProduct = { id: "unknown", name: "Laptop", description: "Laptop", price: null, discount_price: null, stock: null };
    expect(rankProducts([...catalog, unknown], criteria, "laptop").map((item) => item.id)).not.toContain("unknown");
    expect(rankProducts(catalog, criteria, "laptop").map((item) => item.id)).not.toContain("dead");
  });

  it("filters explicit CPU, GPU, RAM, storage, color, and SKU criteria using catalog fields", () => {
    const fullSpec: AssistantProduct = {
      id: "spec", name: "Lenovo LOQ 15", description: "Intel Core i5-12450H, GeForce RTX 4050",
      price: 14_000_000, discount_price: null, stock: 1, sku: "LOQ-4050",
      categories: { name: "Laptop" }, brands: { name: "Lenovo" },
      product_specifications: [{ key: "RAM", value: "16 GB" }, { key: "SSD", value: "1 TB SSD" }],
      product_variants: [{ sku: "LOQ-BLK", color: "Black", ram: "16 GB", storage: "1 TB SSD", price: 14_000_000, discount_price: null, stock: 1 }],
    };
    const query = "Lenovo LOQ Core i5-12450H RTX 4050 16GB 1 TB SSD warna hitam SKU LOQ-BLK";
    const criteria = getProductCriteria(query, [], ["Lenovo"]);
    expect(rankProducts([fullSpec], criteria, query).map((item) => item.id)).toEqual(["spec"]);
    const mismatchedQuery = query.replace("RTX 4050", "RTX 4060");
    expect(rankProducts([fullSpec], getProductCriteria(mismatchedQuery, [], ["Lenovo"]), mismatchedQuery)).toEqual([]);
  });

  it("uses catalog fallback if Gemini times out, is blank, or returns invalid short text", () => {
    const fallback = "Pilihan katalog yang sesuai: ASUS Vivobook 14, harga efektif Rp7.000.000, stok 2.";
    const criteria = getProductCriteria("laptop budget 7 juta", []);
    expect(selectAssistantAnswer(undefined, fallback, [catalog[0]], criteria)).toEqual({ answer: fallback, generated: false });
    expect(selectAssistantAnswer(" ", fallback, [catalog[0]], criteria)).toEqual({ answer: fallback, generated: false });
    expect(selectAssistantAnswer("ok", fallback, [catalog[0]], criteria)).toEqual({ answer: fallback, generated: false });
  });

  it("falls back when Gemini repeats card details or returns a localhost product URL", () => {
    const criteria = getProductCriteria("laptop kerja budget 10 juta", []);
    const fallback = "Ada beberapa laptop kerja yang sesuai. Harga dan ringkasan produk ada di kartu bawah.";
    const duplicated = "ASUS Vivobook 14 memakai Intel Core i5 dan RAM 16 GB, cek http://localhost:3000/product/budget untuk detail.";
    expect(selectAssistantAnswer(duplicated, fallback, [catalog[0]], criteria)).toEqual({ answer: fallback, generated: false });
    const inventedId = "ID produk 00000000-0000-4000-8000-000000000000 bisa dibuka dari kartu.";
    expect(selectAssistantAnswer(inventedId, fallback, [catalog[0]], criteria)).toEqual({ answer: fallback, generated: false });
  });

  it("accepts a concise contextual answer without repeating product card details", () => {
    const criteria = getProductCriteria("laptop kerja budget 10 juta", []);
    const fallback = "Ada beberapa laptop kerja yang sesuai. Harga dan ringkasan produk ada di kartu bawah.";
    const answer = "Aku menemukan beberapa pilihan laptop yang sesuai kebutuhan kerja. Kartu di bawah menampilkan harga dan stok.";
    expect(selectAssistantAnswer(answer, fallback, [catalog[0]], criteria)).toEqual({ answer, generated: true });
  });

  it("rejects Gemini prices, stock, SKU and specifications that contradict the catalog", () => {
    const criteria = getProductCriteria("laptop budget 7 juta", []);
    const fallback = "ASUS Vivobook 14 tersedia dengan harga Rp7.000.000 dan stok 2 unit.";
    for (const answer of [
      "ASUS Vivobook 14 harganya Rp8.000.000 dan stok 2 unit.",
      "ASUS Vivobook 14 harganya 8 juta dan stok 2 unit.",
      "ASUS Vivobook 14 harganya Rp7,5 juta dan stok 2 unit.",
      "ASUS Vivobook 14 harga Rp7.000.000 dan stok 4 unit.",
      "ASUS Vivobook 14 SKU ASUS-FAKE seharga Rp7.000.000.",
      "ASUS Vivobook 14 menggunakan RTX 4060 dan harganya Rp7.000.000.",
    ]) {
      expect(selectAssistantAnswer(answer, fallback, [catalog[0]], criteria)).toEqual({ answer: fallback, generated: false });
    }
  });

  it("recognizes an en dash budget range and returns only products within its ceiling", () => {
    const range = parseBudget("laptop 5–7 juta");
    expect(range).toMatchObject({ floor: 5_000_000, amount: 7_000_000 });
    const criteria = getProductCriteria("laptop 5–7 juta", []);
    expect(rankProducts(catalog, criteria, "laptop 5–7 juta").map(({ id }) => id)).toEqual(["budget"]);
  });

  it("routes voucher and checkout questions to service help, not product recommendations", () => {
    const voucher = getProductCriteria("cara pakai voucher di checkout?", [{ role: "user", text: "Laptop ASUS 7 juta" }]);
    expect(voucher.wantsProducts).toBe(false);
    expect(voucher.outOfScope).toBe(false);
    const checkout = getProductCriteria("gimana cara checkout?", []);
    expect(checkout.wantsProducts).toBe(false);
  });

  it("answers website FAQs only when a relevant official entry exists", () => {
    const faqs = [{ question: "Bagaimana cara checkout?", answer: "Buka keranjang lalu lanjutkan checkout." }];
    expect(findRelevantFaq("cara checkout", faqs)?.answer).toContain("keranjang");
    expect(findRelevantFaq("cara bayar dengan kartu?", faqs)).toBeNull();
  });

  it("politely rejects unrelated questions and clears carried product context", () => {
    const criteria = getProductCriteria("resep rendang yang enak gimana?", [{ role: "user", text: "Laptop ASUS budget 7 juta" }]);
    expect(criteria.outOfScope).toBe(true);
    expect(criteria.budget).toBeNull();
    expect(answerOutOfScope()).toMatch(/Next Solution Store/);
  });

  it("routes general technology questions away from the catalog without losing the saved laptop context", () => {
    const history: ChatTurn[] = [
      { role: "user", text: "Cari laptop budget Rp8 juta" },
      { role: "assistant", text: "Aku cek pilihannya." },
    ];
    const general = getProductCriteria("How does a GPU work?", history);
    expect(general.generalQuestion).toBe(true);
    expect(general.wantsProducts).toBe(false);

    const returned = getProductCriteria("Lanjut laptop tadi, maksimal Rp12 juta", [
      ...history,
      { role: "user", text: "How does a GPU work?" },
      { role: "assistant", text: "GPU memproses grafis." },
    ]);
    expect(returned.generalQuestion).toBe(false);
    expect(returned.category).toBe("laptop");
    expect(returned.budget).toBe(12_000_000);
    expect(returned.requiresDedicatedGpu).toBe(false);
  });

  it("accepts open-domain Gemini answers without applying catalog-spec filters", () => {
    const fallback = "Aku belum bisa menyusun jawaban sekarang. Coba tanyakan lagi.";
    const answer = "Python sering dipakai untuk otomasi, analisis data, dan pengembangan aplikasi karena sintaksnya mudah dibaca.";
    expect(selectConversationalAnswer(answer, fallback)).toEqual({ answer, generated: true });
    expect(selectConversationalAnswer("Laptop ready stok 5 di katalog Next Solution", fallback)).toEqual({ answer: fallback, generated: false });
  });

  it("handles sequential requests without carrying irrelevant brand or budget forward", () => {
    const history: ChatTurn[] = [
      { role: "user", text: "Laptop ASUS budget 7 juta" },
      { role: "assistant", text: "Ada ASUS Vivobook." },
      { role: "user", text: "kalau gaming?" },
    ];
    const changed = getProductCriteria("Lenovo LOQ budget Rp15 juta", history, ["ASUS", "Lenovo"]);
    expect(changed.budget).toBe(15_000_000);
    expect(changed.brand).toBe("Lenovo");
    expect(rankProducts(catalog, changed, "Lenovo LOQ budget Rp15 juta").map((item) => item.id)).toEqual(["gaming"]);
  });

  it("clears an old model series when the user explicitly switches brands", () => {
    const criteria = getProductCriteria("yang ASUS saja", [{ role: "user", text: "laptop Lenovo LOQ budget 15 juta" }], ["ASUS", "Lenovo"]);
    expect(criteria.brand).toBe("ASUS");
    expect(criteria.series).toEqual([]);
    expect(rankProducts(catalog, criteria, "yang ASUS saja").map((item) => item.id)).toEqual(["budget"]);
  });

  it("switches category when a follow-up names a different product category", () => {
    const mouse: AssistantProduct = {
      id: "mouse", name: "Logitech Wireless Mouse", description: "Wireless mouse", price: 250_000,
      discount_price: null, stock: 5, categories: { name: "Accessories" }, brands: { name: "Logitech" },
    };
    const history: ChatTurn[] = [{ role: "user", text: "Laptop ASUS budget 7 juta" }];
    const criteria = getProductCriteria("sekarang cari mouse Logitech", history, ["ASUS", "Logitech"]);
    expect(criteria.category).toBe("accessory");
    expect(criteria.brand).toBe("Logitech");
    expect(rankProducts([...catalog, mouse], criteria, "sekarang cari mouse Logitech").map(({ id }) => id)).toEqual(["mouse"]);
  });

  it("parses Indonesian shorthand and formatted Rupiah budgets", () => {
    expect(parseBudget("budget 7,5 juta").amount).toBe(7_500_000);
    expect(parseBudget("maks Rp7.000.000").amount).toBe(7_000_000);
    const range = parseBudget("kisaran 5 sampai 10 juta");
    expect(range).toMatchObject({ floor: 5_000_000, amount: 10_000_000 });
    const criteria = getProductCriteria("laptop kisaran 5 sampai 10 juta", []);
    expect(rankProducts(catalog, criteria, "laptop kisaran 5 sampai 10 juta").map((item) => item.id)).toEqual(["budget"]);
  });

  it("treats a colloquial budget as a target, ranks close matches first, and separates slightly higher options", () => {
    const question = "Gua cari laptop buat adek gua nih 7jtan ada ga?";
    const criteria = getProductCriteria(question, []);
    const close = { ...catalog[0], id: "close", price: 6_900_000, discount_price: null };
    const cheaper = { ...catalog[0], id: "cheaper", price: 5_000_000, discount_price: null };
    const result = searchGraphicsProducts([cheaper, close], criteria, question);

    expect(parseBudget(question)).toMatchObject({ amount: 7_000_000, approximate: true, min: false });
    expect(criteria.approximateBudget).toBe(true);
    expect(result.products.map(({ id }) => id)).toEqual(["close", "cheaper"]);
    expect(result.alternatives).toEqual([]);

    const slightlyOver = { ...catalog[0], id: "slightly-over", price: 7_500_000, discount_price: null };
    const withAlternative = searchGraphicsProducts([close, slightlyOver], criteria, question);
    expect(withAlternative.products.map(({ id }) => id)).toEqual(["close"]);
    expect(withAlternative.alternatives.map(({ id }) => id)).toEqual(["slightly-over"]);
    expect(withAlternative.alternativeKind).toBe("near-target");

    const hardMaximum = getProductCriteria("Laptop maksimal Rp7 juta", []);
    expect(hardMaximum.approximateBudget).toBe(false);
    expect(searchGraphicsProducts([slightlyOver], hardMaximum, "Laptop maksimal Rp7 juta").alternatives).toEqual([]);
  });

  it("carries the newest approximate budget and updated use case through the follow-up sequence", () => {
    const history: ChatTurn[] = [
      { role: "user", text: "Gua cari laptop buat adek gua nih 7jtan ada ga?" },
      { role: "assistant", text: "Aku cek pilihannya." },
      { role: "user", text: "Kalau 8jtan?" },
      { role: "assistant", text: "Ada beberapa pilihan." },
      { role: "user", text: "Kalo yang ada VGA-nya?" },
      { role: "assistant", text: "Tipe grafisnya tercantum di kartu." },
      { role: "user", text: "Yang kaya RTX 3050 bang." },
      { role: "assistant", text: "Belum ketemu yang sesuai." },
      { role: "user", text: "4050 ada?" },
      { role: "assistant", text: "Belum ada RTX 4050 yang cocok." },
    ];
    const gpu = getProductCriteria("Lah adanya apa dong?", history);
    expect(gpu.category).toBe("laptop");
    expect(gpu.budget).toBe(8_000_000);
    expect(gpu.approximateBudget).toBe(true);
    expect(gpu.graphics).toBe("rtx 4050");
    expect(gpu.alternativeRequest).toBe(true);

    const college = getProductCriteria("Kalau buat kuliah saja?", [...history, { role: "user", text: "Lah adanya apa dong?" }]);
    expect(college.category).toBe("laptop");
    expect(college.budget).toBe(8_000_000);
    expect(college.graphics).toBeNull();
    expect(college.gaming).toBe(false);

    const changed = getProductCriteria("Kalau budget maksimal 10 juta?", [...history, { role: "user", text: "Kalau buat kuliah saja?" }]);
    expect(changed.budget).toBe(10_000_000);
    expect(changed.approximateBudget).toBe(false);
    expect(changed.minBudget).toBe(false);
  });
});
