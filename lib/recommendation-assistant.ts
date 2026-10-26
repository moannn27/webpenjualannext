export type AssistantVariant = {
  id?: string; sku: string | null; color: string; ram: string; storage: string;
  price: number | null; discount_price: number | null; stock: number;
};
export type AssistantProduct = {
  id: string; name: string; slug?: string; description: string; price: number | null; discount_price: number | null;
  stock: number | null; sku?: string | null; categories?: { name: string; slug?: string } | null; brands?: { name: string; slug?: string } | null;
  product_specifications?: { key: string; value: string }[]; product_variants?: AssistantVariant[];
};
export type ChatTurn = { role: "user" | "assistant"; text: string; productIds?: string[] };
export type ProductCategory = "laptop" | "monitor" | "desktop" | "smartphone" | "tablet" | "accessory";
export type ProductCriteria = {
  budget: number | null; budgetFloor: number | null; minBudget: boolean; approximateBudget: boolean; category: ProductCategory | null;
  brand: string | null; series: string[]; memory: string | null; processor: string | null;
  graphics: string | null; color: string | null; storage: string | null; gaming: boolean;
  design: boolean; graphicsQuestion: boolean; requiresDedicatedGpu: boolean; requiresNvidiaGpu: boolean;
  alternativeRequest: boolean;
  graphicsInventoryRequest: boolean; smallTalk: boolean; capabilityQuestion: boolean; needsCategoryClarification: boolean;
  generalQuestion: boolean;
  work: boolean; premium: boolean; priceDirection: "higher" | "lower" | null;
  comparisonBudget: number | null; rejectedProductIds: string[];
  wantsProducts: boolean; outOfScope: boolean;
};
export type FaqEntry = { question: string; answer: string };

const SERIES: Record<string, string> = {
  yoga: "Lenovo", zenbook: "ASUS", vivobook: "ASUS", ideapad: "Lenovo", thinkpad: "Lenovo",
  macbook: "Apple", zephyrus: "ASUS", legion: "Lenovo", loq: "Lenovo", aspire: "Acer",
  soulmate: "Advan", workmate: "Advan", nitro: "Acer", tuf: "ASUS", rog: "ASUS",
};
const PRODUCT_TERMS = /laptop|laptp|notebook|komputer|\bpc\b|smartphone|handphone|\bhp\b|ponsel|iphone|tablet|ipad|aksesoris|monitor|produk|barang|rekomendasi|carikan|cari|banding|\bvs\b|stok|ready|harga|budget|spek|spesifikasi|merek|brand|slug|gaming|game|desain|editing|kuliah|kerja|coding|streaming|lebih murah|lebih mahal|yang tadi|\b(cpu|gpu(?:nya)?|vga(?:nya)?|bervga|grafis(?:nya)?|ram|ssd|hdd|storage|warna|sku|mtm|rtx|gtx)\b/i;
const SERVICE_TERMS = /daftar|registrasi|register|login|masuk|akun|keranjang|cart|checkout|voucher|kupon|bayar|pembayaran|transfer|pengiriman|kurir|ongkir|pesanan|order|refund|garansi|retur|kebijakan|website|situs|admin|whatsapp|\bfaq\b/i;
const BRANDS = ["ASUS", "Acer", "Lenovo", "Apple", "Advan", "HP", "Dell", "MSI", "Gigabyte"];

export type ParsedBudget = { amount: number | null; floor: number | null; min: boolean; approximate: boolean };
export function parseBudget(text: string): ParsedBudget {
  const range = text.match(/(?:rp\s*)?(\d+(?:[.,]\d+)?)\s*(?:-|[\u2010-\u2015\u2212])\s*(\d+(?:[.,]\d+)?)\s*(jt|juta|rb|ribu)\b/i)
    ?? text.match(/(?:rp\s*)?(\d+(?:[.,]\d+)?)\s*(?:sampai|hingga|to)\s*(\d+(?:[.,]\d+)?)\s*(jt|juta|rb|ribu)\b/i);
  if (range) {
    const multiplier = /^(?:jt|juta)$/i.test(range[3]) ? 1_000_000 : 1_000;
    return { floor: Number(range[1].replace(",", ".")) * multiplier, amount: Number(range[2].replace(",", ".")) * multiplier, min: false, approximate: false };
  }
  const million = text.match(/(?:rp\s*)?(\d+(?:[.,]\d+)?)\s*(?:jt|juta)(?:an)?/i);
  const thousand = text.match(/(?:rp\s*)?(\d+(?:[.,]\d+)?)\s*(?:rb|ribu)(?:an)?/i);
  const formatted = text.match(/(?:rp\s*)?(\d{1,3}(?:[.,]\d{3}){1,3})\b/i);
  const raw = text.match(/rp\s*(\d{6,})/i) ?? text.match(/\b(\d{6,})\b/);
  const amount = million ? Number(million[1].replace(",", ".")) * 1_000_000
    : thousand ? Number(thousand[1].replace(",", ".")) * 1_000
    : formatted ? Number(formatted[1].replace(/[.,]/g, ""))
    : raw ? Number(raw[1]) : null;
  return {
    amount: amount && Number.isFinite(amount) ? amount : null,
    floor: null,
    min: /di atas|diatas|lebih dari|minimal|mulai dari|paling murah/i.test(text),
    approximate: /sekitar|kisaran|kurang lebih|kurleb/i.test(text) || /(?:jt|juta|rb|ribu)an\b/i.test(text),
  };
}

function findCategory(text: string): ProductCategory | null {
  if (/laptop|notebook|macbook|chromebook|kuliah|gaming|desain|editing video|coding|streaming|kerja kantor/i.test(text)) return "laptop";
  if (/monitor|display|layar eksternal/i.test(text)) return "monitor";
  if (/desktop|\bpc\b|all[ -]in[ -]one|aio|komputer/i.test(text)) return "desktop";
  if (/smartphone|handphone|ponsel|telepon|iphone|\bhp\b/i.test(text)) return "smartphone";
  if (/tablet|ipad/i.test(text)) return "tablet";
  if (/aksesoris|keyboard|mouse|headset|earphone|headphone|speaker|tws|webcam|charger|tas/i.test(text)) return "accessory";
  return null;
}
function findMentionedSeries(text: string): string[] {
  return Object.keys(SERIES).filter((series) => new RegExp("\\b" + series + "\\b", "i").test(text));
}
function containsAny(text: string, choices: string[]): string | null {
  const lower = text.toLowerCase();
  return choices.find((choice) => lower.includes(choice.toLowerCase())) ?? null;
}
function latestUserTurn(history: ChatTurn[], predicate: (text: string) => boolean): string | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].role === "user" && predicate(history[index].text)) return history[index].text;
  }
  return null;
}

function isGeneralKnowledgeQuestion(text: string): boolean {
  return /^(?:what is|what are|what does|why|how(?: does| do| can| to)?|can you explain|could you explain|can you teach|help me understand|help me learn|i want to learn|explain|tell me about|teach me|what do you think|what(?:'s| is) your opinion|apa itu|apa arti|kenapa|mengapa|jelaskan|gimana (?:cara|kerja)|bagaimana (?:cara|kerja)|cara kerja|menurut (?:kamu|lu|lo)|pendapat tentang|ajari|belajar|tutorial|which is better|difference between)\b/i.test(text.trim()) &&
    !/\b(?:cari|carikan|rekomendasi|mau beli|ingin beli|budget|harga|stok|ready|shopping for|recommend|price of|available in store)\b/i.test(text) &&
    !/\b(?:it|this|that|these|those|the one|yang tadi|yang itu|produk itu|produk tadi|punyanya|miliknya)\b/i.test(text);
}

function parseGraphicsModel(text: string, allowBareModel = false): string | null {
  const namedModel = text.match(/\b(?:rtx|gtx)\s*\d{3,4}(?:\s*ti)?\b|\bradeon\s*rx\s*\d{3,4}\b/i)?.[0];
  if (namedModel) return namedModel.replace(/\s+/g, " ").toLowerCase();
  if (!allowBareModel) return null;
  const bareModel = text.match(/\b((?:20|30|40|50|60|70|80|90)\d{2})\b/i)?.[1];
  return bareModel ? `rtx ${bareModel}` : null;
}

export function getProductCriteria(message: string, history: ChatTurn[], brands: string[] = []): ProductCriteria {
  const current = message.trim();
  const currentSeries = findMentionedSeries(current);
  const generalQuestion = isGeneralKnowledgeQuestion(current);
  const userTurns = history.filter((turn) => turn.role === "user" && !isGeneralKnowledgeQuestion(turn.text));
  const smallTalk = /^(?:(?:hai|halo|hello|hi|pagi|siang|sore|malam)(?:\s+(?:bang|kak))?|bang(?:\s+bang)?(?:\s+woi)?|makasih|terima kasih|thanks|thank you|wkwk)[!.?, ]*$/i.test(current);
  const capabilityQuestion = /\b(?:lu|lo|kamu|anda)?\s*(?:bisa|dapat)\s+(?:bantu|membantu)\s+apa\b|\bapa saja yang bisa kamu bantu\b/i.test(current);
  const currentBudget = parseBudget(current);
  const cancelsBudget = /\b(?:jangan|abaikan|lupakan|hapus|tanpa|gak usah|tidak usah|nggak usah)\s+(?:pakai\s+)?budget\b/i.test(current);
  const budgetHistory = userTurns.filter((turn) => parseBudget(turn.text).amount !== null || /\b(?:jangan|abaikan|lupakan|hapus|tanpa|gak usah|tidak usah|nggak usah)\s+(?:pakai\s+)?budget\b/i.test(turn.text));
  let previousBudget = parseBudget("");
  for (const turn of budgetHistory) {
    if (/\b(?:jangan|abaikan|lupakan|hapus|tanpa|gak usah|tidak usah|nggak usah)\s+(?:pakai\s+)?budget\b/i.test(turn.text)) previousBudget = parseBudget("");
    else previousBudget = parseBudget(turn.text);
  }
  const priorBudget = cancelsBudget ? parseBudget("") : previousBudget;
  const asksForCheapest = /\b(?:yang\s+)?(?:paling\s+murah|murah|termurah|harga\s+terendah|paling\s+rendah)\b/i.test(current);
  const asksForMostExpensive = /\b(?:yang\s+)?(?:paling\s+mahal|termahal|harga\s+tertinggi|paling\s+tinggi(?:\s+harganya)?)\b/i.test(current);
  const priorProductTurn = latestUserTurn(userTurns, (text) => PRODUCT_TERMS.test(text) || findMentionedSeries(text).length > 0);
  const hasProductContext = priorProductTurn !== null;
  const hasGraphicsContext = userTurns.some((turn) => /\b(?:vga|gpu|graphics?|rtx|gtx|radeon\s*rx)\b/i.test(turn.text));
  const currentGraphicsModel = parseGraphicsModel(current, hasGraphicsContext);
  const previousGraphicsTurn = latestUserTurn(userTurns, (text) => parseGraphicsModel(text, hasGraphicsContext) !== null);
  const previousGraphicsModel = previousGraphicsTurn ? parseGraphicsModel(previousGraphicsTurn, hasGraphicsContext) : null;
  const graphicsInventoryRequest = hasProductContext && !asksForCheapest && !asksForMostExpensive && /(?:\b(?:vga|gpu|grafis|graphics?)\b.*\b(?:apa|tipe|jenis|tersedia|adanya)\b|\b(?:apa|tipe|jenis)\b.*\b(?:vga|gpu|grafis|graphics?)\b)/i.test(current) &&
    !parseGraphicsModel(current, hasGraphicsContext);
  const alternativeRequest = hasProductContext && /^(?:(?:lah|terus|trus)\s*)?(?:adanya apa|adanya\s+(?:vga|gpu|grafis)\s+apa|apa adanya|apa dong|adanya|yang ada apa|alternatif|pilihan lain|yang lain|terus apa)\b/i.test(current);
  const followUp = hasProductContext && (currentBudget.amount !== null ||
    alternativeRequest || currentGraphicsModel !== null ||
    /^(kalau|kalo|terus|yang|ada|lebih|gimana|bagaimana|itu|tadi|warna|4050|4060|3050)\b/i.test(current));
  const outOfScope = !smallTalk && !capabilityQuestion && !PRODUCT_TERMS.test(current) && currentSeries.length === 0 && !SERVICE_TERMS.test(current) &&
    currentBudget.amount === null && !followUp && !alternativeRequest;

  const currentCategory = findCategory(current);
  const previousCategory = findCategory(latestUserTurn(userTurns, (text) => findCategory(text) !== null) ?? "");
  const category = currentCategory ?? (hasProductContext ? previousCategory : null);
  const requestedBrands = [...new Set([...brands, ...BRANDS])];
  const currentBrand = containsAny(current, requestedBrands);

  let brandTurnIndex = -1;
  let latestBrand: string | null = null;
  let latestSeries: string[] = [];
  userTurns.forEach((turn, index) => {
    const series = findMentionedSeries(turn.text);
    const brand = containsAny(turn.text, requestedBrands);
    if (brand || series.length) {
      brandTurnIndex = index;
      latestBrand = brand ?? SERIES[series.at(-1)!];
      latestSeries = series;
    }
  });
  const latestBrandTurn = brandTurnIndex >= 0 ? userTurns[brandTurnIndex].text : "";
  const latestExplicitBrandIndex = userTurns.reduce((latest, turn, index) =>
    containsAny(turn.text, requestedBrands) ? index : latest, -1);
  if (latestExplicitBrandIndex > brandTurnIndex && latestExplicitBrandIndex >= 0) {
    latestBrand = containsAny(userTurns[latestExplicitBrandIndex].text, requestedBrands);
    latestSeries = [];
  }
  let series = currentSeries.length ? currentSeries : outOfScope ? [] : latestSeries;
  const brand = currentBrand ?? (currentSeries.length ? SERIES[currentSeries.at(-1)!] : latestBrand);
  if (currentBrand && series.some((name) => SERIES[name].toLowerCase() !== currentBrand.toLowerCase())) series = [];

  const memory = current.match(/\b(\d{1,2})\s*gb\b/i) ?? current.match(/ram\s*(\d{1,2})/i);
  const processor = current.match(/\b(?:core\s*i[3579](?:[- ]\w+)?|i[3579]-?\d{4,5}\w*|core\s*ultra\s*\d\s*\w*|ryzen\s*[3579]\s*\d{4,5}\w*)\b/i)?.[0] ?? null;
  const resetsGraphicsForUseCase = /(?:buat|untuk)\s+(?:kuliah|kerja|kantor)(?:\s+(?:saja|aja))?/i.test(current) &&
    !currentGraphicsModel && !/\b(?:vga|gpu|graphics?|grafis|rtx|gtx|radeon)\b/i.test(current);
  const graphics = graphicsInventoryRequest
    ? null
    : resetsGraphicsForUseCase
    ? null
    : alternativeRequest
    ? previousGraphicsModel
    : currentGraphicsModel ?? (followUp ? previousGraphicsModel : null);
  const graphicsQuestion = /\b(?:ber[\s-]?vga|vga(?:nya)?|gpu(?:nya)?|grafis(?:nya)?|graphics?|kartu grafis)\b/i.test(current);
  const explicitDedicated = /\b(?:dedicated|discrete|dedicated gpu|vga gaming)\b/i.test(current) ||
    (!graphicsInventoryRequest && alternativeRequest && Boolean(previousGraphicsModel));
  const requiresNvidiaGpu = /\b(?:nvidia|geforce|rtx|gtx)\b/i.test(current) ||
    Boolean(graphics && /^(?:rtx|gtx)\b/i.test(graphics));
  const colors: Record<string, string> = { hitam: "black", black: "black", putih: "white", white: "white", silver: "silver", abu: "grey", grey: "grey", gray: "grey", biru: "blue", blue: "blue" };
  const color = containsAny(current, Object.keys(colors));
  const storage = current.match(/\b(\d+(?:[.,]\d+)?)\s*(gb|tb)\s*(ssd|hdd|nvme)\b/i)?.[0] ?? null;
  const latestUseCase = latestUserTurn(userTurns, (text) => /gaming|game|desain|design|editing|render|kuliah|kerja|kantor|office|coding|streaming/i.test(text));
  const activeUseCase = currentCategory ? current : latestUseCase ?? current;
  const gaming = /gaming|game|main game|buat ngegame/i.test(activeUseCase);
  const design = /desain|design|editing|render/i.test(activeUseCase);
  const work = /kerja|kantor|office/i.test(activeUseCase);
  const wantsProducts = !smallTalk && !capabilityQuestion && !generalQuestion && !outOfScope && !SERVICE_TERMS.test(current) && (PRODUCT_TERMS.test(current) || currentSeries.length > 0 || followUp);
  const inferredCategory = category ?? (series.length ? "laptop" : null);
  const needsCategoryClarification = wantsProducts && inferredCategory === null && !/\b(?:sku|mtm)\s*[:#-]?\s*[a-z0-9-]{3,}/i.test(current);

  return {
    budget: cancelsBudget || asksForCheapest || outOfScope ? null : currentBudget.amount !== null ? currentBudget.amount : priorBudget.amount,
    budgetFloor: cancelsBudget || asksForCheapest ? null : currentBudget.amount !== null ? currentBudget.floor : priorBudget.floor,
    minBudget: cancelsBudget ? false : asksForCheapest ? true : currentBudget.amount !== null ? currentBudget.min : priorBudget.min,
    approximateBudget: cancelsBudget || asksForCheapest ? false : currentBudget.amount !== null ? currentBudget.approximate : priorBudget.approximate,
    category: inferredCategory,
    brand,
    series,
    memory: memory?.[1] ?? null,
    processor,
    graphics,
    color: color ? colors[color] : null,
    storage,
    gaming,
    design,
    graphicsQuestion,
    requiresDedicatedGpu: explicitDedicated || Boolean(graphics),
    requiresNvidiaGpu,
    alternativeRequest,
    graphicsInventoryRequest,
    smallTalk,
    capabilityQuestion,
    needsCategoryClarification,
    generalQuestion,
    work,
    premium: /premium|flagship|high[ -]?end|kelas atas|ultrabook/i.test(current) ||
      (!currentCategory && /premium|flagship|high[ -]?end|kelas atas|ultrabook/i.test(latestBrandTurn)),
    priceDirection: asksForMostExpensive || /lebih mahal|yang mahal|lebih tinggi/i.test(current)
      ? "higher"
      : asksForCheapest || /lebih murah|yang murah|lebih rendah/i.test(current)
        ? "lower"
        : null,
    comparisonBudget: asksForCheapest ? priorBudget.amount : null,
    rejectedProductIds: /\b(?:yang lain|gak cocok|nggak cocok|tidak cocok|kurang cocok|jangan yang tadi|aku tidak suka|gue tidak suka|saya tidak suka)\b/i.test(current)
      ? [...new Set([...history].reverse().find((turn) => turn.role === "assistant" && turn.productIds?.length)?.productIds ?? [])]
      : [],
    wantsProducts,
    outOfScope,
  };
}

function searchable(product: AssistantProduct): string {
  return [product.name, product.slug, product.sku, product.description, product.brands?.name, product.brands?.slug, product.categories?.name, product.categories?.slug,
    ...(product.product_specifications ?? []).flatMap((spec) => [spec.key, spec.value]),
    ...(product.product_variants ?? []).flatMap((variant) => [variant.sku, variant.color, variant.ram, variant.storage]),
  ].filter(Boolean).join(" ").toLowerCase();
}
export type CatalogGraphicsType = "integrated" | "dedicated" | "unknown";
function catalogGraphicsSource(product: AssistantProduct): string {
  const gpuSpecs = (product.product_specifications ?? [])
    .filter((specification) => /gpu|graphic|vga/i.test(specification.key))
    .map((specification) => specification.value);
  return [...gpuSpecs, product.description].filter(Boolean).join(" ");
}
export function getCatalogGraphicsType(product: AssistantProduct): CatalogGraphicsType {
  const source = catalogGraphicsSource(product);
  if (/\b(?:rtx|gtx|geforce|radeon\s*rx|arc\s*a\d{3}|dedicated|discrete)\b/i.test(source)) return "dedicated";
  if (/\b(?:integrated|shared)\b/i.test(source)) return "integrated";
  if (/\b(?:intel\s+uhd|uhd\s+graphics|intel\s+iris|intel\s+graphics|radeon\s+vega(?:\s*\d+)?(?:\s+graphics)?|amd\s+radeon\s+graphics)\b/i.test(source)) return "integrated";
  return "unknown";
}
export function getCatalogGraphicsLabel(product: AssistantProduct): string | null {
  const specification = (product.product_specifications ?? []).find((item) => /gpu|graphic|vga/i.test(item.key));
  if (specification?.value.trim()) return specification.value.trim();
  const match = catalogGraphicsSource(product).match(/\b(?:amd\s+)?radeon\s+vega\s*\d+\s+graphics\b|\bintel\s+uhd\s+graphics\b|\b(?:nvidia\s+)?geforce\s+(?:rtx|gtx)\s*\d{3,4}(?:\s*ti)?(?:\s+\d+\s*gb)?\b|\bradeon\s+rx\s*\d{3,4}\b|\bintel\s+arc\s+a\d{3}\b/i);
  return match?.[0] ?? null;
}
export type GraphicsAlternativeKind = "over-budget-match" | "other-dedicated" | "over-budget-dedicated" | "integrated" | "near-target" | "graphics-inventory" | "cheapest-over-budget" | null;
export function graphicsFollowUpAnswer(
  products: AssistantProduct[],
  criteria: ProductCriteria,
  alternativeKind: GraphicsAlternativeKind = null,
  alternatives: AssistantProduct[] = []
): string {
  const budgetText = criteria.budget === null ? "anggaranmu" : `budget Rp${criteria.budget.toLocaleString("id-ID")}`;
  if (criteria.graphicsInventoryRequest) {
    const types = new Set([...products, ...alternatives].map(getCatalogGraphicsType));
    const kinds = [types.has("integrated") ? "integrated" : null, types.has("dedicated") ? "dedicated" : null].filter(Boolean);
    const typeText = kinds.length === 2 ? "Tercatat opsi integrated dan dedicated" : kinds.length === 1 ? `Tercatat opsi ${kinds[0]}` : "Belum ada tipe GPU yang bisa dipastikan dari data katalog";
    const unknownText = types.has("unknown") ? " Beberapa produk belum mencantumkan informasi GPU, jadi tipenya belum bisa kupastikan." : "";
    const alternativeText = alternatives.length ? " Ada pilihan laptop di atas budget yang kupisahkan di kartu alternatif." : "";
    return `${typeText} pada katalog laptop yang sesuai pencarianmu. GPU integrated menyatu dengan prosesor, sedangkan dedicated memakai chip grafis terpisah.${unknownText}${alternativeText} Tipe yang tercatat ditampilkan pada kartu.`;
  }
  if (criteria.requiresDedicatedGpu) {
    const target = criteria.graphics?.toUpperCase();
    if (criteria.alternativeRequest && products.length > 0) {
      if (criteria.graphics && products.some((product) => searchable(product).includes(criteria.graphics!.toLowerCase()))) {
        return `Ada ${target} yang sesuai dengan budget dan stok katalog. Kartu di bawah memuat harga serta ringkasan spesifikasi.`;
      }
      return `Belum ada ${target ?? "GPU yang diminta"} yang cocok dalam ${budgetText}. Ini alternatif GPU dedicated yang benar-benar tersedia dan masih sesuai budget; spesifikasi serta harga ada di kartu.`;
    }
    if (alternativeKind === "over-budget-match") {
      return `${target ?? "GPU yang diminta"} tersedia, tetapi harganya melewati ${budgetText}. Aku pisahkan sebagai alternatif di luar budget dengan harga katalog pada kartu.`;
    }
    if (alternativeKind === "other-dedicated") {
      return `Belum ada ${target ?? "GPU yang diminta"} yang cocok dalam ${budgetText}. Ada GPU dedicated lain yang terverifikasi dan masih sesuai budget; model serta harga ada di kartu alternatif.`;
    }
    if (alternativeKind === "over-budget-dedicated") {
      return `Belum ada ${target ?? "GPU yang diminta"} yang cocok dalam ${budgetText}. GPU dedicated lain yang tersedia hanya melebihi budget dan ditampilkan terpisah sebagai alternatif.`;
    }
    if (alternativeKind === "integrated") {
      return `Belum ada GPU dedicated ${target ? `seperti ${target} ` : ""}yang terverifikasi di katalog. Pilihan terdekat di bawah memakai grafis integrated; itu bukan pengganti performa RTX. Harga dan stoknya ada di kartu.`;
    }
    if (products.length > 0 && criteria.graphics) {
      return `Ada ${target} yang sesuai dengan budget dan stok katalog. Kartu di bawah memuat harga serta ringkasan spesifikasi.`;
    }
    if (products.length === 0) {
      const requirement = criteria.requiresNvidiaGpu ? "GPU dedicated NVIDIA" : "GPU dedicated";
      return `Belum ada produk dengan ${requirement} yang terverifikasi memenuhi ${budgetText} dan tersedia di katalog. Grafis integrated bukan VGA dedicated. Kalau perlu GPU dedicated, budget perlu dinaikkan.`;
    }
    return "GPU integrated menyatu dengan prosesor, sedangkan GPU dedicated memakai chip grafis terpisah. Ada pilihan yang memenuhi kriteria dan budget; tipe grafis serta detail katalog bisa dilihat pada kartu produk.";
  }
  if (products.length === 0) {
    if (criteria.graphicsQuestion && criteria.budget === null) {
      const subject = criteria.brand ?? criteria.series[0]?.toUpperCase() ?? criteria.category ?? "produk yang dicari";
      return `Aku belum menemukan ${subject} dengan tipe grafis yang tercantum di katalog, jadi belum bisa memastikan mana yang punya VGA sesuai maksudmu. Mau aku carikan yang GPU dedicated saja, atau tipe integrated juga boleh?`;
    }
    return `Belum ada produk dengan informasi grafis yang cocok untuk ${budgetText}. Kamu bisa memperluas budget atau kebutuhan perangkatnya.`;
  }

  const types = new Set(products.map(getCatalogGraphicsType));
  if (criteria.gaming || criteria.design) {
    const activity = criteria.gaming ? "gaming" : "desain";
    if (!types.has("dedicated")) {
      const integratedNote = types.has("integrated")
        ? "Opsi dengan grafis terintegrasi bukan VGA dedicated dan mungkin terbatas untuk game atau aplikasi desain berat."
        : "Tipe grafis pada pilihan yang tersedia belum cukup tercantum untuk memastikan kemampuannya.";
      const unknownNote = types.has("unknown") ? " Ada produk yang spesifikasi grafisnya belum dicantumkan." : "";
      return `Untuk ${activity} dalam ${budgetText}, belum ada GPU dedicated yang terverifikasi. ${integratedNote}${unknownNote} Kalau butuh performa grafis lebih tinggi, budget perlu dinaikkan; detail yang tercatat ada di kartu produk.`;
    }
    return `Ada pilihan dengan GPU dedicated terverifikasi untuk dipertimbangkan dalam ${budgetText}. GPU integrated menyatu dengan prosesor; dedicated memakai chip grafis terpisah. Detailnya ada di kartu produk.`;
  }
  if (types.has("integrated") && !types.has("dedicated")) {
    const unknownNote = types.has("unknown") ? " Ada produk lain yang tipe grafisnya belum dicantumkan di katalog, jadi belum bisa kupastikan." : "";
    return `Pilihan dalam ${budgetText} yang grafisnya tercantum memakai GPU integrated (menyatu dengan prosesor), bukan VGA dedicated. GPU dedicated memakai chip terpisah dan lebih cocok untuk beban grafis berat.${unknownNote} Tipe grafis terverifikasi ada di kartu produk.`;
  }
  if (types.has("dedicated") && !types.has("integrated")) {
    const unknownNote = types.has("unknown") ? " Beberapa tipe lain belum tercantum di katalog." : "";
    return `Ada pilihan dengan GPU dedicated terverifikasi dalam ${budgetText}. GPU integrated menyatu dengan prosesor, sedangkan dedicated memakai chip terpisah.${unknownNote} Detailnya ada di kartu produk.`;
  }
  if (types.has("integrated") && types.has("dedicated")) {
    const unknownNote = types.has("unknown") ? " Sebagian produk belum mencantumkan tipe grafis." : "";
    return `Katalog punya GPU integrated dan dedicated yang terverifikasi dalam ${budgetText}. Integrated menyatu dengan prosesor, sedangkan dedicated memakai chip grafis terpisah.${unknownNote} Detailnya ada di kartu produk.`;
  }
  return `GPU integrated menyatu dengan prosesor, sedangkan GPU dedicated memakai chip grafis terpisah. Untuk ${budgetText}, tipe grafis produk yang tersedia belum dicantumkan jelas di katalog.`;
}
function hasCategory(product: AssistantProduct, category: ProductCategory): boolean {
  const name = product.categories?.name?.toLowerCase() ?? "";
  if (name) {
    if (category === "laptop") return /laptop|notebook/i.test(name);
    if (category === "desktop") return /desktop|all.in.one|aio/i.test(name);
    if (category === "accessory") return /accessor/i.test(name);
    return name.includes(category);
  }
  const text = (product.name + " " + product.description).toLowerCase();
  if (category === "laptop") return /laptop|notebook|macbook|ideapad|thinkpad|vivobook|zenbook|aspire/i.test(text);
  if (category === "desktop") return /desktop|tower|all.in.one|\baio\b/i.test(text);
  if (category === "accessory") return /keyboard|mouse|headset|earphone|speaker|charger/i.test(text);
  return text.includes(category);
}
export function effectiveVariantPrice(product: AssistantProduct, variant: AssistantVariant): number | null {
  const price = variant.discount_price ?? variant.price ?? product.discount_price ?? product.price;
  return price == null || !Number.isFinite(Number(price)) ? null : Number(price);
}
export function isWithinBudget(price: number, criteria: ProductCriteria): boolean {
  return !(criteria.budget !== null && (criteria.minBudget ? price < criteria.budget : price > criteria.budget)) &&
    !(criteria.budgetFloor !== null && price < criteria.budgetFloor);
}
export function getBudgetEligibleVariants(product: AssistantProduct, criteria: ProductCriteria): AssistantVariant[] {
  return (product.product_variants ?? []).filter((variant) => {
    const price = effectiveVariantPrice(product, variant);
    return variant.stock > 0 && price !== null && isWithinBudget(price, criteria);
  });
}
export function getMatchingVariant(product: AssistantProduct, criteria: ProductCriteria): AssistantVariant | undefined | null {
  const variants = product.product_variants ?? [];
  const needsVariant = Boolean(criteria.color || criteria.memory || criteria.storage);
  if (!needsVariant || !variants.length) return undefined;
  const hasColor = variants.some((variant) => Boolean(variant.color?.trim()));
  const hasRam = variants.some((variant) => Boolean(variant.ram?.trim()));
  const hasStorage = variants.some((variant) => Boolean(variant.storage?.trim()));
  const text = searchable(product);
  if (criteria.color && !hasColor && !new RegExp("\\b" + criteria.color + "\\b", "i").test(text)) return null;
  if (criteria.memory && !hasRam && !new RegExp("\\b" + criteria.memory + "\\s*gb\\b", "i").test(text)) return null;
  if (criteria.storage && !hasStorage && !text.includes(criteria.storage.toLowerCase())) return null;
  if (!hasColor && !hasRam && !hasStorage) return undefined;
  const storageSize = criteria.storage?.match(/\d+(?:[.,]\d+)?\s*(?:gb|tb)/i)?.[0]?.replace(/\s+/g, "").toLowerCase();
  const matching = variants.filter((variant) => variant.stock > 0 &&
    (!criteria.color || !hasColor || variant.color.toLowerCase().includes(criteria.color)) &&
    (!criteria.memory || !hasRam || new RegExp("\\b" + criteria.memory + "\\s*gb\\b", "i").test(variant.ram)) &&
    (!criteria.storage || !hasStorage || Boolean(storageSize && variant.storage.toLowerCase().replace(/\s+/g, "").includes(storageSize))));
  return matching.find((variant) => {
    const price = effectiveVariantPrice(product, variant);
    return price !== null && isWithinBudget(price, criteria);
  }) ?? null;
}
export function recommendationPrice(product: AssistantProduct, criteria: ProductCriteria): number | null {
  const variant = getMatchingVariant(product, criteria);
  if (variant === null) return null;
  if (variant) return effectiveVariantPrice(product, variant);
  if (product.product_variants?.length) {
    const availablePrices = product.product_variants.filter((item) => item.stock > 0)
      .map((item) => effectiveVariantPrice(product, item))
      .filter((price): price is number => price !== null)
      .sort((left, right) => left - right);
    if (availablePrices.length) return availablePrices[0];
  }
  const price = product.discount_price ?? product.price;
  return price == null || !Number.isFinite(Number(price)) ? null : Number(price);
}
export type ProductRankingOptions = {
  budgetMode?: "within" | "over";
  ignoreExactGraphics?: boolean;
  anyDedicatedBrand?: boolean;
  graphicsMode?: "criteria" | "dedicated" | "integrated";
};
export function rankProducts(
  products: AssistantProduct[],
  criteria: ProductCriteria,
  message: string,
  options: ProductRankingOptions = {}
): AssistantProduct[] {
  if (!criteria.wantsProducts || criteria.outOfScope) return [];
  const query = message.toLowerCase();
  const sku = query.match(/\b(?:sku|mtm)\s*[:#-]?\s*([a-z0-9-]{3,})/i)?.[1];
  const slug = query.match(/\bslug\s*[:#-]?\s*([a-z0-9-]{3,})/i)?.[1];
  const bareIdentifier = products.some((product) => [product.slug, product.sku, ...(product.product_variants ?? []).map((variant) => variant.sku)]
    .some((value) => value?.toLowerCase() === query.trim())) ? query.trim() : null;
  const exactIdentifier = sku ?? slug ?? bareIdentifier;
  const filtered = products.filter((product) => {
    if (criteria.rejectedProductIds.includes(product.id)) return false;
    const price = recommendationPrice(product, criteria);
    const availableStock = product.product_variants?.length
      ? product.product_variants.reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0)
      : Number(product.stock ?? 0);
    if (price === null || availableStock <= 0) return false;
    if (options.budgetMode === "over") {
      if (criteria.budget === null || criteria.minBudget || price <= criteria.budget) return false;
    } else if (!isWithinBudget(price, criteria)) return false;
    if (criteria.category && !hasCategory(product, criteria.category)) return false;
    const text = searchable(product);
    if (exactIdentifier) {
      const identifiers = [product.sku, product.slug, ...(product.product_variants ?? []).map((variant) => variant.sku)]
        .filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase());
      if (!identifiers.includes(exactIdentifier.toLowerCase())) return false;
    }
    if (criteria.brand && product.brands?.name?.toLowerCase() !== criteria.brand.toLowerCase()) return false;
    if (criteria.series.length && !criteria.series.some((series) => text.includes(series))) return false;
    const graphicsType = getCatalogGraphicsType(product);
    // A GPU/VGA search must only surface products whose graphics type is in the catalog.
    // Unknown graphics can still appear in ordinary laptop searches with an explicit label.
    if (criteria.graphicsQuestion && graphicsType === "unknown") return false;
    if (options.graphicsMode === "dedicated" && graphicsType !== "dedicated") return false;
    if (options.graphicsMode === "integrated" && graphicsType !== "integrated") return false;
    if (options.graphicsMode !== "integrated" && (criteria.requiresDedicatedGpu || options.graphicsMode === "dedicated")) {
      if (graphicsType !== "dedicated") return false;
      if (criteria.requiresNvidiaGpu && !options.anyDedicatedBrand && !/\b(?:nvidia|geforce|rtx|gtx)\b/i.test(catalogGraphicsSource(product))) return false;
    }
    if (criteria.memory && !new RegExp("\\b" + criteria.memory + "\\s*gb\\b", "i").test(text)) return false;
    if (criteria.processor && !text.includes(criteria.processor.toLowerCase())) return false;
    if (criteria.graphics && !options.ignoreExactGraphics && !text.includes(criteria.graphics.toLowerCase())) return false;
    if (criteria.color && !new RegExp("\\b" + criteria.color + "\\b", "i").test(text)) return false;
    if (criteria.storage && !text.includes(criteria.storage.toLowerCase().replace(/\s+/g, "")) && !text.includes(criteria.storage.toLowerCase())) return false;
    if (sku && !text.includes(sku)) return false;
    return true;
  });
  const words = [...new Set(query.match(/[a-z0-9]{3,}/g) ?? [])].filter((word) => !["laptop", "buat", "yang", "ada", "dong", "bang", "cari", "tolong", "produk"].includes(word));
  const normalizedQuery = query.trim().replace(/^(?:sku|mtm|slug)\s*[:#-]?\s*/i, "");
  const score = (product: AssistantProduct) => {
    const text = searchable(product);
    const exactIdentifier = [product.sku, product.slug, ...(product.product_variants ?? []).map((variant) => variant.sku)]
      .some((identifier) => identifier?.toLowerCase() === normalizedQuery);
    return (exactIdentifier ? 1000 : 0) + words.filter((word) => text.includes(word)).length +
      (criteria.gaming && /rtx|gtx|geforce|radeon|arc graphics|dedicated/i.test(text) ? 4 : 0) +
      (criteria.design && /rtx|gtx|geforce|radeon|professional|dedicated/i.test(text) ? 4 : 0);
  };
  return filtered.sort((a, b) => (criteria.approximateBudget && criteria.budget !== null
      ? Math.abs(recommendationPrice(a, criteria)! - criteria.budget) - Math.abs(recommendationPrice(b, criteria)! - criteria.budget)
      : 0) || score(b) - score(a) ||
    (criteria.premium || criteria.priceDirection === "higher"
      ? recommendationPrice(b, criteria)! - recommendationPrice(a, criteria)!
      : recommendationPrice(a, criteria)! - recommendationPrice(b, criteria)!));
}

export type GraphicsSearchResult = {
  products: AssistantProduct[];
  alternatives: AssistantProduct[];
  alternativeKind: GraphicsAlternativeKind;
};
export function searchGraphicsProducts(
  products: AssistantProduct[],
  criteria: ProductCriteria,
  message: string
): GraphicsSearchResult {
  if (criteria.priceDirection === "lower") {
    const cheapestCriteria = { ...criteria, budget: null, budgetFloor: null, minBudget: false, approximateBudget: false };
    const ranked = rankProducts(products, cheapestCriteria, message).slice(0, 5);
    const withinBudget = criteria.comparisonBudget === null ? ranked : ranked.filter((product) => (recommendationPrice(product, cheapestCriteria) ?? Infinity) <= criteria.comparisonBudget!);
    const overBudget = criteria.comparisonBudget === null ? [] : ranked.filter((product) => (recommendationPrice(product, cheapestCriteria) ?? 0) > criteria.comparisonBudget!);
    return { products: withinBudget, alternatives: overBudget, alternativeKind: overBudget.length ? "cheapest-over-budget" : null };
  }
  if (criteria.graphicsInventoryRequest) {
    const inBudget = rankProducts(products, criteria, message).slice(0, 5);
    const overBudget = criteria.budget !== null && !criteria.minBudget
      ? rankProducts(products, criteria, message, { budgetMode: "over" }).slice(0, 3)
      : [];
    return {
      products: inBudget,
      alternatives: overBudget,
      alternativeKind: overBudget.length ? "graphics-inventory" : null,
    };
  }
  const mainOptions = criteria.alternativeRequest && criteria.requiresDedicatedGpu
    ? { ignoreExactGraphics: true, anyDedicatedBrand: true }
    : {};
  const matching = rankProducts(products, criteria, message, mainOptions).slice(0, 5);
  if (matching.length) {
    if (criteria.approximateBudget && criteria.budget !== null && !criteria.minBudget) {
      const nearTarget = rankProducts(products, criteria, message, { ...mainOptions, budgetMode: "over" })
        .filter((product) => {
          const price = recommendationPrice(product, criteria);
          return price !== null && price <= criteria.budget! * 1.1;
        }).slice(0, 3);
      if (nearTarget.length) return { products: matching, alternatives: nearTarget, alternativeKind: "near-target" };
    }
    return { products: matching, alternatives: [], alternativeKind: null };
  }
  if (!criteria.requiresDedicatedGpu) return { products: [], alternatives: [], alternativeKind: null };

  if (criteria.alternativeRequest) {
    const overBudgetDedicated = rankProducts(products, criteria, message, {
      budgetMode: "over", ignoreExactGraphics: true, anyDedicatedBrand: true,
    }).slice(0, 3);
    if (overBudgetDedicated.length) {
      return { products: [], alternatives: overBudgetDedicated, alternativeKind: "over-budget-dedicated" };
    }
  } else if (criteria.graphics) {
    const exactOverBudget = rankProducts(products, criteria, message, { budgetMode: "over" }).slice(0, 3);
    if (exactOverBudget.length) {
      return { products: [], alternatives: exactOverBudget, alternativeKind: "over-budget-match" };
    }
  }

  const otherDedicated = rankProducts(products, criteria, message, {
    ignoreExactGraphics: true,
    anyDedicatedBrand: true,
  }).slice(0, 3);
  if (otherDedicated.length) {
    return { products: [], alternatives: otherDedicated, alternativeKind: "other-dedicated" };
  }

  const overBudgetDedicated = rankProducts(products, criteria, message, {
    budgetMode: "over",
    ignoreExactGraphics: true,
    anyDedicatedBrand: true,
  }).slice(0, 3);
  if (overBudgetDedicated.length) {
    return { products: [], alternatives: overBudgetDedicated, alternativeKind: "over-budget-dedicated" };
  }

  const integrated = rankProducts(products, criteria, message, {
    ignoreExactGraphics: true,
    graphicsMode: "integrated",
  }).slice(0, 3);
  return integrated.length
    ? { products: [], alternatives: integrated, alternativeKind: "integrated" }
    : { products: [], alternatives: [], alternativeKind: null };
}

export function validateAssistantAnswer(answer: string, products: AssistantProduct[], criteria: ProductCriteria): boolean {
  if (!answer.trim()) return false;
  if (!products.length) return validateEmptyCatalogAnswer(answer, criteria);
  if (
    answer.length > 500 ||
    /https?:\/\/|\blocalhost(?::\d+)?\b|\/product\/[a-z0-9-]+/i.test(answer) ||
    /\b(?:id produk|product id|id katalog)\s*[:#-]?\s*[a-z0-9-]{6,}/i.test(answer) ||
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(answer)
  ) return false;
  if (products.some((product) =>
    answer.toLowerCase().includes(product.name.toLowerCase())
  )) return false;
  const facts = products.map((product) => {
    const variant = getMatchingVariant(product, criteria);
    const variants = variant ? [variant] : (product.product_variants ?? []).filter((item) => item.stock > 0);
    return { product, variants, price: variant ? effectiveVariantPrice(product, variant) : recommendationPrice(product, criteria), stock: variant?.stock ?? product.stock };
  });
  const corpus = facts.flatMap(({ product, variants }) => [
    product.name, product.description, product.sku, product.brands?.name,
    ...(product.product_specifications ?? []).flatMap((spec) => [spec.key, spec.value]),
    ...variants.flatMap((variant) => [variant.sku, variant.color, variant.ram, variant.storage]),
  ]).filter(Boolean).join(" ").toLowerCase();
  const allowedPrices = new Set(facts.flatMap((fact) => [
    fact.price,
    ...fact.variants.map((variant) => effectiveVariantPrice(fact.product, variant)),
  ]).filter((price): price is number => price !== null));
  for (const match of answer.matchAll(/(?:\bRp\.?\s*|\b)([\d.,]+)\s*(juta|jt|ribu|rb)?\b/gi)) {
    const hasRupiahPrefix = /\bRp\.?\s*$/i.test(match[0].slice(0, match[0].indexOf(match[1])));
    const hasUnit = Boolean(match[2]);
    const isFormattedAmount = /^\d{1,3}(?:[.,]\d{3})+$/.test(match[1]);
    if (!hasRupiahPrefix && !hasUnit && !isFormattedAmount) continue;
    const value = hasUnit ? Number(match[1].replace(",", ".")) : Number(match[1].replace(/[.,]/g, ""));
    const multiplier = /^(?:juta|jt)$/i.test(match[2] ?? "") ? 1_000_000 : /^(?:ribu|rb)$/i.test(match[2] ?? "") ? 1_000 : 1;
    if (!allowedPrices.has(value * multiplier)) return false;
  }
  const allowedSkus = new Set(facts.flatMap(({ product, variants }) => [product.sku, ...variants.map((variant) => variant.sku)]).filter(Boolean).map((sku) => sku!.toLowerCase()));
  for (const match of answer.matchAll(/\b(?:sku|mtm)\s*[:#-]?\s*([a-z0-9-]{3,})/gi)) if (!allowedSkus.has(match[1].toLowerCase())) return false;
  const allowedStocks = new Set(facts.flatMap((fact) => [fact.stock, ...fact.variants.map((variant) => variant.stock)]).map(Number));
  for (const match of answer.matchAll(/\bstok(?:nya)?\s*(?:tersedia\s*)?[:=]?\s*(\d+)\s*(?:unit|buah|pcs)?/gi)) if (!allowedStocks.has(Number(match[1]))) return false;
  const specPatterns = [
    /\b(?:core\s*i[3579](?:[- ]\w+)?|i[3579]-?\d{4,5}\w*|core\s*ultra\s*\d\s*\w*|ryzen\s*[3579]\s*\d{4,5}\w*)\b/gi,
    /\b(?:rtx|gtx)\s*\d{3,4}(?:\s*ti)?\b|\bradeon\s*(?:rx\s*)?\d{3,4}\b|\b(?:intel|arc)\s+graphics\b/gi,
    /\b\d+(?:[.,]\d+)?\s*(?:gb|tb)\b/gi,
    /\b(?:oled|amoled|ips|fhd|qhd|uhd|touchscreen|touch screen|fingerprint|layar sentuh)\b/gi,
    /\b(?:hitam|black|putih|white|silver|abu(?:-abu)?|grey|gray|biru|blue)\b/gi,
    /\b\d{1,2}(?:[.,]\d)?\s*(?:inch|inci|["″])\b/gi,
  ];
  const normalizedCorpus = corpus.replace(/\s+/g, "");
  for (const pattern of specPatterns) {
    for (const match of answer.matchAll(pattern)) if (!normalizedCorpus.includes(match[0].toLowerCase().replace(/\s+/g, ""))) return false;
  }
  const allowedBrands = new Set(facts.map(({ product }) => product.brands?.name?.toLowerCase()).filter(Boolean));
  for (const brand of [...BRANDS, ...Object.values(SERIES)]) {
    if (new RegExp("\\b" + brand + "\\b", "i").test(answer) && !allowedBrands.has(brand.toLowerCase())) return false;
  }
  const catalogTerms = [...new Set(facts.flatMap(({ product }) => Object.keys(SERIES).filter((series) =>
    searchable(product).includes(series)) ))];
  for (const series of Object.keys(SERIES)) {
    if (new RegExp("\\b" + series + "\\b", "i").test(answer) && !catalogTerms.includes(series)) return false;
  }
  return true;
}

function validateEmptyCatalogAnswer(answer: string, criteria: ProductCriteria): boolean {
  if (
    answer.length > 500 ||
    /https?:\/\/|\blocalhost(?::\d+)?\b|\/product\/|\b(?:sku|mtm|stok|tersedia\s+\d+)\b/i.test(answer) ||
    /\b(?:id produk|product id|id katalog)\s*[:#-]?\s*[a-z0-9-]{6,}/i.test(answer) ||
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(answer)
  ) return false;

  const normalized = answer.toLowerCase().replace(/[\s.-]+/g, "");
  const requestedGraphics = criteria.graphics?.toLowerCase().replace(/[\s.-]+/g, "");
  const graphicsPattern = /\b(?:rtx|gtx)\s*\d{3,4}(?:\s*ti)?\b|\bradeon\s*(?:rx\s*)?\d{3,4}\b/gi;
  for (const match of answer.matchAll(graphicsPattern)) {
    if (!requestedGraphics || match[0].toLowerCase().replace(/[\s.-]+/g, "") !== requestedGraphics) return false;
  }

  const specificationPatterns = [
    /\b(?:core\s*i[3579]|ryzen\s*[3579]|celeron|pentium|core\s+ultra)\b/i,
    /\b\d+(?:[.,]\d+)?\s*(?:gb|tb)\b/i,
    /\b(?:oled|amoled|ips|fhd|qhd|uhd|ssd|hdd|ram|vram)\b/i,
  ];
  if (specificationPatterns.some((pattern) => pattern.test(answer))) return false;

  for (const brand of [...BRANDS, ...Object.keys(SERIES)]) {
    const isRequested = criteria.brand?.toLowerCase() === brand.toLowerCase() || criteria.series.includes(brand.toLowerCase());
    if (!isRequested && new RegExp("\\b" + brand + "\\b", "i").test(answer)) return false;
  }

  for (const match of answer.matchAll(/(?:\bRp\.?\s*|\b)([\d.,]+)\s*(juta|jt|ribu|rb)?\b/gi)) {
    const prefix = match[0].slice(0, match[0].indexOf(match[1]));
    const hasRupiahPrefix = /\bRp\.?\s*$/i.test(prefix);
    const hasUnit = Boolean(match[2]);
    const isFormattedAmount = /^\d{1,3}(?:[.,]\d{3})+$/.test(match[1]);
    if (!hasRupiahPrefix && !hasUnit && !isFormattedAmount) continue;
    const value = hasUnit ? Number(match[1].replace(",", ".")) : Number(match[1].replace(/[.,]/g, ""));
    const multiplier = /^(?:juta|jt)$/i.test(match[2] ?? "") ? 1_000_000 : /^(?:ribu|rb)$/i.test(match[2] ?? "") ? 1_000 : 1;
    if (criteria.budget === null || value * multiplier !== criteria.budget) return false;
  }

  // A zero-result answer may discuss the user's request, but cannot assert catalog facts.
  return normalized.length >= 24;
}

export function selectAssistantAnswer(generatedText: string | null | undefined, catalogFallback: string, products: AssistantProduct[], criteria: ProductCriteria) {
  const answer = generatedText?.trim();
  return answer && answer.length >= 24 && validateAssistantAnswer(answer, products, criteria) && addressesActiveRequest(answer, criteria)
    ? { answer, generated: true }
    : { answer: catalogFallback, generated: false };
}

function addressesActiveRequest(answer: string, criteria: ProductCriteria): boolean {
  const lower = answer.toLowerCase();
  if (criteria.priceDirection === "lower" && !/termurah|terendah|harga.{0,35}(?:rendah|murah)|urut.{0,35}(?:murah|rendah)/i.test(lower)) return false;
  if (criteria.priceDirection === "higher" && !/termahal|tertinggi|harga.{0,35}(?:tinggi|mahal)|urut.{0,35}(?:mahal|tinggi)/i.test(lower)) return false;
  if (criteria.graphicsQuestion && !/vga|gpu|grafis|graphics|integrated|dedicated|kartu grafis/i.test(lower) &&
    !(criteria.graphics && lower.includes(criteria.graphics.toLowerCase()))) return false;
  if (criteria.series.length && !criteria.series.some((series) => lower.includes(series))) return false;
  const brandIsClearFromSeries = criteria.series.some((series) =>
    SERIES[series]?.toLowerCase() === criteria.brand?.toLowerCase() && lower.includes(series)
  );
  if (criteria.brand && !lower.includes(criteria.brand.toLowerCase()) && !brandIsClearFromSeries) return false;
  return true;
}
export function selectConversationalAnswer(generatedText: string | null | undefined, fallback: string) {
  const answer = generatedText?.trim();
  const hasUnsafeStoreReference = answer && (/\bstok(?:nya)?\b.{0,20}\b\d+|\btersedia\b.{0,20}\b\d+|\bunit ready\b|\bdi katalog Next Solution\b/i.test(answer));
  const hasProductIdentifier = answer && (/https?:\/\/|\blocalhost(?::\d+)?\b|\/product\/|\b(?:sku|mtm|id produk|product id)\s*[:#-]?\s*[a-z0-9-]{3,}/i.test(answer) ||
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(answer));
  return answer && answer.length >= 8 && answer.length <= 2000 && !hasUnsafeStoreReference && !hasProductIdentifier
    ? { answer, generated: true }
    : { answer: fallback, generated: false };
}
export function findRelevantFaq(question: string, faqs: FaqEntry[]): FaqEntry | null {
  const stopWords = new Set(["bagaimana", "gimana", "cara", "apakah", "untuk", "dengan", "yang", "bisa", "saya", "kami"]);
  const terms = question.toLowerCase().split(/\W+/).filter((word) => word.length > 3 && !stopWords.has(word));
  const ranked = faqs.map((faq) => ({ faq, score: terms.filter((term) => (faq.question + " " + faq.answer).toLowerCase().includes(term)).length })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked[0].faq : null;
}
export function answerOutOfScope(): string {
  return "Aku fokus membantu soal produk, pesanan, dan layanan Next Solution Store. Kalau ada kebutuhan perangkat yang mau dicari, ceritakan saja ya.";
}
