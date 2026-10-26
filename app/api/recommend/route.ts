import { NextResponse } from "next/server";
import { FunctionCallingConfigMode, GoogleGenAI, Type, type Content, type Part } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSafeProductImageUrl } from "@/lib/product-gallery";
import {
  effectiveVariantPrice,
  findRelevantFaq,
  type GraphicsAlternativeKind,
  getCatalogGraphicsLabel,
  getMatchingVariant,
  graphicsFollowUpAnswer,
  getProductCriteria,
  isWithinBudget,
  searchGraphicsProducts,
  recommendationPrice,
  selectAssistantAnswer,
  selectConversationalAnswer,
  type AssistantProduct,
} from "@/lib/recommendation-assistant";
import { FAQService } from "@/services/faq.service";

type Candidate = {
  id: string;
  name: string;
  slug: string;
  status: "published";
  description: string;
  price: number;
  discount_price: number | null;
  stock: number;
  sku?: string | null;
  categories: { name: string; slug: string } | null;
  brands: { name: string; slug: string } | null;
  product_specifications?: { key: string; value: string; display_order?: number }[];
  product_variants?: { id: string; sku: string | null; color: string; ram: string; storage: string; price: number | null; discount_price: number | null; stock: number }[];
  product_images: { url: string; alt_text?: string | null; is_primary: boolean }[];
  is_featured?: boolean;
  is_new_arrival?: boolean;
  is_best_seller?: boolean;
};

type CategoryIntent = "laptop" | "monitor" | "desktop" | "smartphone" | "tablet" | "accessory";

function fallbackAnswer(
  message: string,
  products: Candidate[],
  budget: number | null,
  categoryIntent: CategoryIntent | null,
  mentionedSeries: string[] = [],
  minBudget: boolean = false,
  criteria: ReturnType<typeof getProductCriteria>,
  alternativeKind: GraphicsAlternativeKind = null,
  alternatives: Candidate[] = []
) {
  if (criteria.graphicsQuestion || criteria.graphics || criteria.alternativeRequest || criteria.gaming || criteria.design) {
    return graphicsFollowUpAnswer(products, criteria, alternativeKind, alternatives);
  }
  if (alternativeKind === "cheapest-over-budget") {
    return `Belum ada pilihan dalam budget sebelumnya${criteria.comparisonBudget ? ` Rp${criteria.comparisonBudget.toLocaleString("id-ID")}` : ""}. Ini laptop ready termurah yang tersedia di atas batas itu; harga aktualnya ada di kartu alternatif.`;
  }
  if (alternativeKind === "near-target") {
    return `Aku prioritaskan pilihan yang paling dekat dengan kisaran Rp${budget?.toLocaleString("id-ID")}. Ada juga alternatif sedikit di atas target; aku pisahkan di kartu supaya selisih budget terlihat jelas.`;
  }

  const categoryLabel =
    categoryIntent === "laptop"
      ? "laptop"
      : categoryIntent === "monitor"
      ? "monitor"
      : categoryIntent === "desktop"
      ? "PC desktop"
      : categoryIntent === "smartphone"
      ? "smartphone"
      : "produk";

  if (!products.length) {
    if (mentionedSeries.length > 0) {
      return `Saat ini unit ready untuk seri **${mentionedSeries.map((s) => s.toUpperCase()).join(" / ")}** dengan kriteria tersebut belum tersedia di stok toko kami. Silakan cek seri lainnya atau hubungi admin WhatsApp kami untuk pemesanan khusus.`;
    }
    return `Saat ini belum ada pilihan ${categoryLabel} yang cocok dan ready di toko kami untuk kriteria atau budget tersebut. Coba sesuaikan rentang budget atau tanyakan pilihan ${categoryLabel} lainnya.`;
  }

  const resultSubject = criteria.series.length ? `seri ${criteria.series.map((series) => series.toUpperCase()).join(" / ")}` : categoryLabel;
  if (criteria.priceDirection === "lower") {
    return `Ada ${products.length} pilihan ${resultSubject} yang tersedia. Aku urutkan dari harga terendah supaya gampang dibandingkan; kartu menampilkan detail dan stoknya.`;
  }
  if (criteria.priceDirection === "higher") {
    return `Ada ${products.length} pilihan ${resultSubject} yang tersedia. Aku urutkan dari harga tertinggi; kartu menampilkan harga dan detail tiap pilihan.`;
  }
  if (criteria.series.length) {
    return `Ada, seri ${criteria.series.map((series) => series.toUpperCase()).join(" / ")} tersedia. Aku tampilkan pilihan yang stoknya ada; mau aku urutkan dari harga termurah atau cari yang paling cocok untuk kebutuhanmu?`;
  }

  const comparison = /banding|compare|versus|\bvs\b/i.test(message);
  const count = products.length === 1 ? `1 pilihan ${categoryLabel}` : `${products.length} pilihan ${categoryLabel}`;
  const budgetText = budget === null
    ? ""
    : minBudget
      ? ` mulai Rp${budget.toLocaleString("id-ID")}`
      : ` hingga Rp${budget.toLocaleString("id-ID")}`;
  const usageText = criteria.work ? " untuk kerja" : "";
  const opening = comparison
    ? `Aku menemukan ${count}${usageText}${budgetText} yang bisa dibandingkan.`
    : `Ada, aku menemukan ${count}${usageText}${budgetText} yang ready.`;
  const nextQuestion = criteria.work
    ? "Kamu lebih memprioritaskan laptop ringan, multitasking, atau kapasitas penyimpanan?"
    : "Kalau mau, aku bisa bantu persempit berdasarkan kebutuhan utama atau spesifikasi tertentu.";
  return `${opening} Kartu di bawah menampilkan ringkasan spesifikasi, harga, dan stok. ${nextQuestion}`;
}

function toChatProduct(product: Candidate, criteria: ReturnType<typeof getProductCriteria>) {
  const selectedVariant = getMatchingVariant(product, criteria);
  const graphicsFollowUp = criteria.graphicsQuestion || Boolean(criteria.graphics) || criteria.alternativeRequest || criteria.gaming || criteria.design;
  return {
    id: product.id,
    name: product.name,
    brands: product.brands,
    image: getSafeProductImageUrl(product.product_images),
    price: Number(recommendationPrice(product, criteria) ?? product.price),
    discount_price: null,
    stock: selectedVariant?.stock ?? (product.product_variants?.length
      ? product.product_variants.reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0)
      : product.stock),
    highlights: getProductHighlights(product, criteria),
    ...(graphicsFollowUp ? { graphicsLabel: getCatalogGraphicsLabel(product) } : {}),
  };
}

function getProductHighlights(product: Candidate, criteria: ReturnType<typeof getProductCriteria>) {
  const graphicsFollowUp = criteria.graphicsQuestion || Boolean(criteria.graphics) || criteria.alternativeRequest || criteria.gaming || criteria.design;
  const priority = graphicsFollowUp ? ["processor", "ram", "storage", "display"] : ["processor", "ram", "storage", "display", "gpu"];
  return (product.product_specifications ?? [])
    .filter((specification) => priority.includes(specification.key.toLowerCase()))
    .sort((left, right) => priority.indexOf(left.key.toLowerCase()) - priority.indexOf(right.key.toLowerCase()))
    .slice(0, 3)
    .map(({ key, value }) => ({ key, value }));
}

function getAlternativeLabel(criteria: ReturnType<typeof getProductCriteria>, kind: GraphicsAlternativeKind) {
  if (kind === "over-budget-match") return `${criteria.graphics?.toUpperCase() ?? "GPU yang diminta"} di atas budget`;
  if (kind === "other-dedicated") return "Alternatif GPU dedicated dalam budget";
  if (kind === "over-budget-dedicated") return "Alternatif GPU dedicated di atas budget";
  if (kind === "integrated") return "Pilihan terdekat: grafis integrated, bukan dedicated";
  if (kind === "near-target") return "Alternatif sedikit di atas kisaran budget";
  if (kind === "graphics-inventory") return "Pilihan laptop di atas budget (tipe GPU ada di kartu)";
  if (kind === "cheapest-over-budget") return "Pilihan termurah yang melebihi budget sebelumnya";
  return undefined;
}

function toVerifiedCatalogRecord(product: Candidate, criteria: ReturnType<typeof getProductCriteria>) {
  const matchingVariant = getMatchingVariant(product, criteria);
  const variants = matchingVariant
    ? [matchingVariant]
    : (product.product_variants ?? []).filter((variant) => variant.stock > 0);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    product_url: `/product/${product.id}`,
    brand: product.brands,
    category: product.categories,
    status: product.status,
    effective_price: matchingVariant ? effectiveVariantPrice(product, matchingVariant) : recommendationPrice(product, criteria),
    stock: matchingVariant?.stock ?? (product.product_variants?.length
      ? product.product_variants.reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0)
      : product.stock),
    sku: matchingVariant?.sku ?? product.sku,
    specifications: product.product_specifications ?? [],
    variants: variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      color: variant.color,
      ram: variant.ram,
      storage: variant.storage,
      price: variant.price,
      discount_price: variant.discount_price,
      effective_price: effectiveVariantPrice(product, variant),
      stock: variant.stock,
      within_active_budget: isWithinBudget(effectiveVariantPrice(product, variant) ?? Number.POSITIVE_INFINITY, criteria),
    })),
    images: product.product_images.map(({ url, alt_text, is_primary }) => ({ url, alt_text, is_primary })),
    is_featured: product.is_featured,
    is_new_arrival: product.is_new_arrival,
    is_best_seller: product.is_best_seller,
    description: product.description,
  };
}

function buildProductPrompt(
  message: string,
  history: { role: "user" | "assistant"; text: string }[],
  criteria: ReturnType<typeof getProductCriteria>,
  products: Candidate[],
  alternatives: Candidate[],
  alternativeKind: GraphicsAlternativeKind,
  faqContext: { question: string; answer: string }[]
) {
  return `Kamu adalah konsultan teknologi dan asisten AI resmi Next Solution Store. Perlakukan chat sebagai dialog konsultasi yang berlanjut: pahami maksud pesan terbaru dari bahasa sehari-hari dan riwayat relevan, akui koreksi pengguna, lalu jawab dengan nada yang natural dan tidak berulang.
Saat pengguna meminta rekomendasi, pilih satu kandidat utama yang paling sesuai dengan kebutuhan aktif dan jelaskan singkat alasannya berdasarkan kebutuhan, spesifikasi, tipe produk, dan anggaran. Sebutkan trade-off yang relevan serta maksimal dua alternatif dari data terverifikasi bila memang membantu. Jangan hanya mengulang daftar hasil seperti halaman pencarian. Jika informasi penting belum cukup untuk memilih, ajukan satu pertanyaan klarifikasi yang ringkas.
Gunakan hanya fakta dari data katalog di bawah. Jangan mengarang atau menebak nama, ID, slug, SKU/MTM, harga, stok, spesifikasi, varian, gambar, atau URL. Jangan menyatakan alternatif di luar budget sebagai cocok budget. Integrated graphics bukan GPU dedicated. Bila spesifikasi kosong, katakan belum tercantum. Harga boleh disebut saat membantu membandingkan rekomendasi atau budget, tetapi harus sama persis dengan harga efektif katalog. SKU/MTM tampilkan hanya saat ditanya, dan gunakan kode yang benar-benar tercatat. Jangan mengulang detail lengkap yang sudah ada di kartu produk.
Jika butuh pencarian yang lebih spesifik (brand, seri, slug, SKU/MTM produk atau varian, GPU/model, harga, atau atribut varian), panggil search_catalog_products satu kali. Kode MTM yang masuk pada katalog disimpan sebagai SKU; cocokkan persis ke SKU produk/varian dan jangan menganggap kode yang tidak ditemukan valid. Jika data yang tersedia sudah cukup, jawab tanpa tool.
Riwayat relevan: ${JSON.stringify(history)}
Pesan terbaru: ${message}
Kriteria aktif: ${JSON.stringify(criteria)}
Produk utama terverifikasi: ${JSON.stringify(products.map((product) => toVerifiedCatalogRecord(product, criteria)))}
Alternatif terverifikasi: ${JSON.stringify(alternatives.map((product) => toVerifiedCatalogRecord(product, criteria)))}
Tipe alternatif: ${alternativeKind ?? "tidak ada"}
FAQ/panduan website: ${JSON.stringify(faqContext)}`;
}

function fallbackChatReply(message: string, criteria: ReturnType<typeof getProductCriteria>) {
  if (criteria.needsCategoryClarification) {
    const budget = criteria.budget ? `Budget sekitar Rp${criteria.budget.toLocaleString("id-ID")} sudah aku catat. ` : "";
    return `${budget}Kamu sedang mencari perangkat apa: laptop, PC, monitor, smartphone, atau aksesori?`;
  }
  if (criteria.capabilityQuestion) {
    return "Aku bisa bantu mencari dan membandingkan produk di katalog, menyaring pilihan berdasarkan budget dan spesifikasi, serta menjawab pertanyaan layanan toko.";
  }
  if (/makasih|terima kasih|thanks|thank you/i.test(message)) {
    return "Sama-sama! Kalau ada yang mau dicari, tinggal bilang ya.";
  }
  return "Hai bang! Siap bantu. Lagi ada yang mau ditanyain atau dicari?";
}

function catalogUnavailableAnswer(criteria: ReturnType<typeof getProductCriteria>) {
  const category = criteria.category ?? "produk yang kamu cari";
  const budget = criteria.budget === null ? "" : ` dengan budget Rp${criteria.budget.toLocaleString("id-ID")}`;
  const graphics = criteria.graphics ? ` dan GPU ${criteria.graphics.toUpperCase()}` : criteria.requiresDedicatedGpu ? " dengan GPU dedicated" : "";
  return `Aku belum bisa memeriksa katalog ${category}${budget}${graphics} sekarang. Kriteria pencarianmu tetap tercatat; coba lagi sebentar ya.`;
}

async function generateAssistantAnswer(
  prompt: string,
  fallback: string,
  candidates: AssistantProduct[],
  criteria: ReturnType<typeof getProductCriteria>,
  conversational = false
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { answer: fallback, generated: false };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: {
        httpOptions: { timeout: 15_000 },
        maxOutputTokens: 900,
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return conversational
      ? selectConversationalAnswer(response.text, fallback)
      : selectAssistantAnswer(response.text, fallback, candidates, criteria);
  } catch {
    return { answer: fallback, generated: false };
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 32 * 1024) {
    return NextResponse.json({ error: "Payload permintaan terlalu besar (maksimal 32 KB)." }, { status: 413 });
  }
  // 2. Serverless-safe persistent rate limiting per IP (15 requests / 60 seconds)
  const clientIp = getClientIp(request);
  let rateLimit;
  try {
    rateLimit = await checkRateLimit(`recommend:${clientIp}`, 15, 60);
  } catch {
    return NextResponse.json(
      { error: "Layanan rekomendasi AI sedang tidak tersedia. Silakan coba beberapa saat lagi." },
      {
        status: 503,
        headers: {
          "Retry-After": "60",
        },
      }
    );
  }

  if (rateLimit.unavailable) {
    return NextResponse.json(
      { error: "Layanan rekomendasi AI sedang tidak tersedia karena kendala sistem rate limit. Silakan coba beberapa saat lagi." },
      {
        status: 503,
        headers: {
          "Retry-After": "60",
        },
      }
    );
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan rekomendasi. Silakan tunggu beberapa saat." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetSeconds),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetSeconds),
        },
      }
    );
  }
  let body: { message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (typeof body.message !== "string") {
    return NextResponse.json({ error: "Tulis kebutuhan produkmu dulu." }, { status: 400 });
  }

  const message = body.message.trim().slice(0, 500);
  if (message.length < 2) {
    return NextResponse.json({ error: "Pesan terlalu singkat (minimal 2 karakter)." }, { status: 400 });
  }

  const history = Array.isArray(body.history)
    ? body.history.slice(-20).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const entry = item as { role?: unknown; text?: unknown; productIds?: unknown };
        if ((entry.role !== "user" && entry.role !== "assistant") || typeof entry.text !== "string") return [];
        const productIds = entry.role === "assistant" && Array.isArray(entry.productIds)
          ? entry.productIds.filter((id): id is string => typeof id === "string").slice(0, 10)
          : undefined;
        return [{ role: entry.role as "user" | "assistant", text: entry.text.trim().slice(0, 500), ...(productIds?.length ? { productIds } : {}) }];
      })
    : [];
  const dialogueHistory = history.map(({ role, text }) => ({ role, text }));

  let criteria = getProductCriteria(message, history, ["ASUS", "Acer", "Lenovo", "Apple", "Advan", "HP", "Dell", "MSI", "Gigabyte"]);
  if (criteria.generalQuestion || criteria.outOfScope) {
    const priorUserMessage = [...dialogueHistory].reverse().find((turn) => turn.role === "user")?.text;
    const fallback = priorUserMessage
      ? `Aku belum bisa menjawab “${message}” sekarang. Tadi kita sempat membahas “${priorUserMessage.slice(0, 100)}”; coba kirim pertanyaannya sekali lagi ya.`
      : `Aku belum bisa menjawab “${message}” sekarang. Coba kirim pertanyaannya sekali lagi ya.`;
    const prompt = `Kamu adalah asisten percakapan AI yang ramah dan berpengetahuan luas. Jawab pertanyaan terbaru secara langsung, natural, dan sesuai konteks yang masih relevan dalam riwayat.\n` +
      `Ini mode percakapan umum: jangan mengarahkan pengguna ke produk atau layanan toko kecuali pertanyaan terbarunya memang meminta itu. Jangan query atau mengklaim isi katalog.\n` +
      `Jika permintaan berbahaya atau melanggar privasi, tolak dengan singkat dan tawarkan alternatif yang aman. Untuk pertanyaan biasa, bantu sebaik mungkin tanpa fallback toko.\n` +
      `Riwayat percakapan: ${JSON.stringify(dialogueHistory)}\nPesan terbaru pengguna: ${message}`;
    let answer = fallback;
    let aiGenerated = false;
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
          contents: prompt,
          config: { httpOptions: { timeout: 15_000 }, maxOutputTokens: 900, temperature: 0.5, thinkingConfig: { thinkingBudget: 0 } },
        });
        const selected = selectConversationalAnswer(response.text, fallback);
        answer = selected.answer;
        aiGenerated = selected.generated;
      } catch {
        // Use the concise conversational fallback when Gemini is unavailable.
      }
    }
    return NextResponse.json({ answer, aiGenerated, products: [], alternatives: [] });
  }
  if (criteria.smallTalk || criteria.capabilityQuestion || criteria.needsCategoryClarification) {
    const fallback = fallbackChatReply(message, criteria);
    const prompt = `Kamu adalah Sales AI Assistant Next Solution Store. Balas satu atau dua kalimat dengan bahasa Indonesia yang santai dan profesional.\n` +
      `Jangan membuat klaim tentang produk, harga, stok, atau spesifikasi katalog. Jangan tampilkan kartu produk.\n` +
      `Jika pengguna bertanya kemampuanmu, jelaskan bahwa kamu dapat membantu pencarian/perbandingan katalog, budget, spesifikasi, dan informasi layanan toko.\n` +
      `Jika kategori belum ditentukan, minta satu klarifikasi kategori (laptop, PC, monitor, smartphone, atau aksesori) dan pertahankan budget yang sudah disebut.\n` +
      `Riwayat percakapan: ${JSON.stringify(dialogueHistory)}\nPesan terbaru: ${message}\nKonteks kriteria: ${JSON.stringify(criteria)}`;
    const generated = await generateAssistantAnswer(prompt, fallback, [], criteria, true);
    return NextResponse.json({ answer: generated.answer, aiGenerated: generated.generated, products: [], alternatives: [] });
  }
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: catalogUnavailableAnswer(criteria) }, { status: 503 });
  }
  const all: Candidate[] = [];
  if (criteria.wantsProducts) {
    const pageSize = 400;
    for (let offset = 0; ; offset += pageSize) {
      let data: unknown[] | null;
      let error: unknown;
      try {
        const page = await supabase
          .from("products")
          .select("id,name,slug,status,description,price,discount_price,stock,sku,is_featured,is_new_arrival,is_best_seller,categories(name,slug),brands(name,slug),product_images(url,alt_text,is_primary),product_specifications(key,value,display_order),product_variants(id,sku,color,ram,storage,price,discount_price,stock)")
          .eq("status", "published")
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        data = page.data;
        error = page.error;
      } catch {
        return NextResponse.json({ error: catalogUnavailableAnswer(criteria) }, { status: 503 });
      }
      if (error) return NextResponse.json({ error: catalogUnavailableAnswer(criteria) }, { status: 503 });
      all.push(...((data ?? []) as unknown as Candidate[]));
      if (!data || data.length < pageSize) break;
    }
  }
  const brands = [...new Set(all.map((item) => item.brands?.name).filter((name): name is string => Boolean(name)))];
  criteria = getProductCriteria(message, history, [...new Set(brands), "ASUS", "Acer", "Lenovo", "Apple", "Advan", "HP", "Dell", "MSI", "Gigabyte"]);
  const wantsProducts = criteria.wantsProducts;
  const categoryIntent = criteria.category;
  const mentionedSeries = criteria.series;
  const effectiveBudget = criteria.budget;
  const graphicsSearch = searchGraphicsProducts(all as AssistantProduct[], criteria, message);
  let products = graphicsSearch.products as Candidate[];
  let alternatives = graphicsSearch.alternatives as Candidate[];
  let alternativeKind = graphicsSearch.alternativeKind;
  let alternativeLabel = getAlternativeLabel(criteria, alternativeKind);

  const serviceQuestion = !wantsProducts && /daftar|registrasi|register|login|masuk|akun|keranjang|cart|checkout|voucher|kupon|bayar|pembayaran|transfer|pengiriman|kurir|ongkir|pesanan|order|refund|garansi|retur|kebijakan|website|situs|faq/i.test(message);
  const faqRows = serviceQuestion ? await new FAQService().getActiveFAQs() : [];
  const faqContext = faqRows.map((faq) => ({ question: faq.question, answer: faq.answer }));
  let answer = wantsProducts
    ? fallbackAnswer(message, products, effectiveBudget, categoryIntent, mentionedSeries, criteria.minBudget, criteria, alternativeKind, alternatives)
    : fallbackChatReply(message, criteria);
  if (serviceQuestion) {
    const faq = findRelevantFaq(message, faqContext);
    answer = faq ? `${faq.answer}\n\nInfo lainnya ada di [Halaman FAQ](/faq).` : "Aku belum menemukan panduan yang memastikan informasi itu. Coba cek [Halaman FAQ](/faq) atau hubungi admin Next Solution.";
  }
  let aiGenerated = false;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && wantsProducts) {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const toolDeclaration = {
      name: "search_catalog_products",
      description: "Cari ulang katalog publik berdasarkan seri/model, brand, SKU/MTM produk atau varian, tipe/GPU, harga, atau atribut varian. MTM katalog dicocokkan ke SKU tersimpan. Pencarian wajib menghormati kriteria aktif dan stok; jangan mencari fakta di luar katalog.",
      parameters: {
        type: Type.OBJECT,
        properties: { query: { type: Type.STRING, description: "Kata kunci yang diambil dari kebutuhan pengguna, maksimal 100 karakter." } },
        required: ["query"],
      },
    };
    const prompt = buildProductPrompt(message, dialogueHistory, criteria, products, alternatives, alternativeKind, faqContext);
    try {
      let response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          httpOptions: { timeout: 15_000 },
          maxOutputTokens: 900,
          temperature: 0.3,
          thinkingConfig: { thinkingBudget: 0 },
          tools: [{ functionDeclarations: [toolDeclaration] }],
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
        },
      });
      const functionCall = response.functionCalls?.find((call) => call.name === toolDeclaration.name);
      const query = typeof functionCall?.args?.query === "string" ? functionCall.args.query.trim().slice(0, 100) : "";
      if (functionCall && query) {
        const verified = searchGraphicsProducts(all as AssistantProduct[], criteria, query);
        products = verified.products as Candidate[];
        alternatives = verified.alternatives as Candidate[];
        alternativeKind = verified.alternativeKind;
        alternativeLabel = getAlternativeLabel(criteria, alternativeKind);
        answer = fallbackAnswer(message, products, criteria.budget, criteria.category, criteria.series, criteria.minBudget, criteria, alternativeKind, alternatives);
        const modelTurn: Content = response.candidates?.[0]?.content ?? {
          role: "model",
          parts: [{ functionCall: { name: functionCall.name, args: functionCall.args, id: functionCall.id } } as Part],
        };
        const toolConversation: Content[] = [
          { role: "user", parts: [{ text: prompt }] },
          modelTurn,
          {
            role: "function",
            parts: [{ functionResponse: {
              name: functionCall.name,
              id: functionCall.id,
              response: {
                products: products.map((product) => toVerifiedCatalogRecord(product, criteria)),
                alternatives: alternatives.map((product) => toVerifiedCatalogRecord(product, criteria)),
                alternativeLabel,
              },
            } }],
          },
        ];
        response = await ai.models.generateContent({
          model,
          contents: toolConversation,
          config: { httpOptions: { timeout: 15_000 }, maxOutputTokens: 900, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
        });
      }
      const selected = selectAssistantAnswer(response.text, answer, products.length ? products : alternatives, criteria);
      if (selected.generated) {
        answer = selected.answer;
        aiGenerated = true;
      }
    } catch {
      // Keep the validated catalog summary if Gemini or a tool call fails.
    }
  }
  return NextResponse.json({
    answer,
    aiGenerated,
    products: products.map((product) => toChatProduct(product, criteria)),
    alternatives: alternatives.map((product) => toChatProduct(product, criteria)),
    alternativeLabel,
  });
}
