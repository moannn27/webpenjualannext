import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSafeProductImageUrl } from "@/lib/product-gallery";

type Candidate = {
  id: string;
  name: string;
  description: string;
  price: number;
  discount_price: number | null;
  stock: number;
  categories: { name: string } | null;
  brands: { name: string } | null;
  product_images: { url: string; is_primary: boolean }[];
};

type CategoryIntent = "laptop" | "monitor" | "desktop" | "smartphone" | "tablet" | "accessory";

const KNOWN_SERIES = [
  "yoga",
  "zenbook",
  "vivobook",
  "ideapad",
  "thinkpad",
  "macbook",
  "zephyrus",
  "legion",
  "loq",
  "aspire",
  "soulmate",
  "workmate",
  "nitro",
  "tuf",
  "rog",
  "galaxy",
];

function detectMentionedSeries(text: string): string[] {
  const lower = text.toLowerCase();
  return KNOWN_SERIES.filter((s) => new RegExp(`\\b${s}\\b`, "i").test(lower));
}

function isPremiumIntent(text: string): boolean {
  return /\b(premium|flagship|high[\s-]end|highend|mewah|kelas atas|spek dewa|spek tinggi|tertinggi|eksekutif|tipis mewah|ultrabook|sultan)\b/i.test(
    text
  );
}

function detectCategoryIntent(text: string): CategoryIntent | null {
  const t = text.toLowerCase();
  if (
    /\b(laptop|laptops|notebook|notebooks|netbook|ultrabook|macbook|chromebook)\b/.test(t) ||
    KNOWN_SERIES.some((s) => new RegExp(`\\b${s}\\b`, "i").test(t) && !["galaxy"].includes(s))
  ) {
    return "laptop";
  }
  if (/\b(monitor|monitors|layar|display)\b/.test(t)) {
    return "monitor";
  }
  if (/\b(desktop|desktops|pc|all[\s-]in[\s-]one|aio|komputer)\b/.test(t)) {
    return "desktop";
  }
  if (/\b(smartphone|smartphones|hp|handphone|ponsel|telepon)\b/.test(t)) {
    return "smartphone";
  }
  if (/\b(tablet|tablets|tab|ipad)\b/.test(t)) {
    return "tablet";
  }
  if (/\b(aksesoris|accessories|keyboard|mouse|headset|earphone|headphone|speaker|tws|webcam|charger|tas)\b/.test(t)) {
    return "accessory";
  }
  return null;
}

function isItemMatchingCategory(item: Candidate, intent: CategoryIntent): boolean {
  const cat = (item.categories?.name ?? "").toLowerCase();
  const name = item.name.toLowerCase();
  const desc = item.description.toLowerCase();

  switch (intent) {
    case "laptop": {
      // If categories relation is populated and is not a laptop category, reject immediately
      if (cat && !cat.includes("laptop")) {
        return false;
      }
      // Strictly exclude monitors, desktops, accessories, phones, tablets
      if (
        cat.includes("monitor") ||
        name.includes("monitor") ||
        cat.includes("accessories") ||
        cat.includes("smartphones") ||
        cat.includes("tablet") ||
        cat.includes("desktops") ||
        cat.includes("all-in-one") ||
        name.includes("one pc") ||
        name.includes("aio")
      ) {
        return false;
      }
      return (
        cat.includes("laptop") ||
        name.includes("laptop") ||
        name.includes("notebook") ||
        name.includes("ideapad") ||
        name.includes("thinkpad") ||
        name.includes("yoga") ||
        name.includes("aspire") ||
        name.includes("soulmate") ||
        name.includes("vivobook") ||
        name.includes("zenbook") ||
        name.includes("macbook") ||
        desc.includes("laptop")
      );
    }

    case "monitor": {
      if (cat && !cat.includes("monitor")) return false;
      return cat.includes("monitor") || name.includes("monitor") || name.includes("display") || desc.includes("monitor");
    }

    case "desktop": {
      if (cat && !cat.includes("desktop") && !cat.includes("all-in-one")) return false;
      if (cat.includes("laptop") || cat.includes("monitor")) return false;
      return (
        cat.includes("desktop") ||
        cat.includes("all-in-one") ||
        name.includes("tower") ||
        name.includes("aio") ||
        name.includes("desktop")
      );
    }

    case "smartphone": {
      if (cat && !cat.includes("smartphone")) return false;
      return cat.includes("smartphone") || name.includes("phone") || name.includes("smartphone");
    }

    case "tablet": {
      if (cat && !cat.includes("tablet")) return false;
      return cat.includes("tablet") || name.includes("tablet") || name.includes("tab ");
    }

    case "accessory": {
      if (cat && !cat.includes("accessori")) return false;
      return (
        cat.includes("accessories") ||
        name.includes("keyboard") ||
        name.includes("mouse") ||
        name.includes("headset") ||
        name.includes("earphone")
      );
    }

    default:
      return true;
  }
}

function parseBudgetAndOperator(text: string) {
  let budget: number | null = null;
  const million = text.match(/(?:rp\s*)?(\d+(?:[.,]\d+)?)\s*(?:jt|juta)(?:an)?/i);
  if (million) {
    budget = Number(million[1].replace(",", ".")) * 1_000_000;
  } else {
    const raw = text.match(/(?:rp\s*)?(\d{6,})(?:\s*(?:rupiah|rb|ribu))?/i);
    if (raw) {
      budget = Number(raw[1]);
    } else {
      const thousand = text.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu)(?:an)?/i);
      if (thousand) budget = Number(thousand[1].replace(",", ".")) * 1_000;
    }
  }

  const isStrictUnder = /\b(dibawah|di bawah|kurang dari|maks|maksimal|max|mentok|paling mahal|dibawahnya)\b/i.test(text);
  const isStrictAbove = /\b(diatas|di atas|lebih dari|minimal|min|paling murah|mulai dari)\b/i.test(text);

  return { budget, isStrictUnder, isStrictAbove };
}

function fallbackAnswer(
  message: string,
  products: Candidate[],
  budget: number | null,
  categoryIntent: CategoryIntent | null,
  isPremium: boolean = false,
  mentionedSeries: string[] = []
) {
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

  const comparison = /banding|compare|versus|\bvs\b/i.test(message);
  const isYogaOrZenbook = mentionedSeries.includes("yoga") || mentionedSeries.includes("zenbook");
  const lead = comparison
    ? `Ini perbandingan ${categoryLabel} yang tersedia dan stoknya ready:`
    : isYogaOrZenbook || isPremium
    ? `Tentu ada! Di Next Solution kami memiliki koleksi laptop premium ready stock (seperti Lenovo Yoga & ASUS Zenbook) dengan spesifikasi tinggi dan build mewah:`
    : budget
    ? `Tentu ada! Untuk kategori ${categoryLabel} dengan anggaran di bawah Rp${budget.toLocaleString("id-ID")}, berikut adalah pilihan yang tersedia di Next Solution:`
    : `Ini beberapa pilihan ${categoryLabel} yang ready dan paling sesuai di Next Solution:`;

  return `${lead}\n\n${products
    .map(
      (p) =>
        `• **${p.name}** - Rp${Number(p.discount_price ?? p.price).toLocaleString("id-ID")}\n  Brand: ${p.brands?.name ?? "-"} | Stok: ${p.stock} unit\n  ${p.description.slice(0, 180)}...`
    )
    .join("\n\n")}\n\nMau saya jelaskan spesifikasi detail, layar, atau perbandingannya?`;
}

function isProductSearch(text: string) {
  return /\b(laptop|notebook|komputer|pc|smartphone|handphone|hp|tablet|aksesoris|monitor|produk|barang|rekomendasi|carikan|cari|bandingkan|bandingin|compare|vs|stok|ready|harga|budget|spesifikasi|spek|merek|brand|premium|yoga|zenbook|macbook|vivobook|ideapad|thinkpad|loq|legion)\b/i.test(
    text
  );
}

function fallbackChatReply(message: string) {
  if (/\b(hai|halo|hello|hi|pagi|siang|sore|malam)\b/i.test(message)) {
    return "Hai! Aku asisten AI Next Solution. Kita bisa ngobrol dulu soal kebutuhanmu, lalu kalau sudah siap aku bantu carikan produk yang cocok. Kamu lagi mempertimbangkan perangkat apa?";
  }
  return "Siap, kita diskusi dulu aja 😊 Aku bisa bantu cari tahu perangkat yang cocok berdasarkan kebutuhanmu, tanpa harus langsung pilih barang. Kamu rencananya mau dipakai untuk apa?";
}

export async function POST(request: Request) {
  // 1. Enforce payload size limit (max 32 KB)
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
    ? body.history.slice(-8).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const entry = item as { role?: unknown; text?: unknown };
        if ((entry.role !== "user" && entry.role !== "assistant") || typeof entry.text !== "string") return [];
        return [{ role: entry.role, text: entry.text.trim().slice(0, 500) }];
      })
    : [];

  const previousUserMessages = history.filter((entry) => entry.role === "user").map((entry) => entry.text);
  const conversationContext = [...previousUserMessages, message].join(" ");
  const wantsProducts = isProductSearch(conversationContext);

  const mentionedSeries = detectMentionedSeries(message);
  const isPremium = isPremiumIntent(message);

  // Category Intent: Current message first, then series detected, then conversation history
  let categoryIntent = detectCategoryIntent(message);
  if (!categoryIntent && (mentionedSeries.length > 0 || isPremium)) {
    categoryIntent = "laptop";
  }
  if (!categoryIntent) {
    categoryIntent = detectCategoryIntent(conversationContext);
  }

  // Parse Budget & Operator from current message
  const { budget: currentBudget, isStrictUnder, isStrictAbove } = parseBudgetAndOperator(message);

  // Determine if previous budget should be cleared / ignored:
  // If user says "premium", mentions high-end series (Yoga, Zenbook, MacBook, etc.),
  // or uses budget pivot phrases, NEVER inherit old budget from history!
  const isBudgetReset =
    isPremium ||
    mentionedSeries.length > 0 ||
    /\b(bukan|ganti|naik|naikin|tambah|bebas|tanpa|mahal|bagus|lain|beda|itu kan|ada tuh|tapi kan)\b/i.test(message);

  let effectiveBudget = currentBudget;
  if (!effectiveBudget && !isBudgetReset) {
    effectiveBudget = parseBudgetAndOperator(conversationContext).budget;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,description,price,discount_price,stock,categories(name),brands(name),product_images(url,is_primary)")
    .eq("status", "published")
    .gt("stock", 0)
    .limit(200);

  if (error) return NextResponse.json({ error: "Katalog belum bisa dimuat. Coba lagi sebentar." }, { status: 503 });

  const all = (data ?? []) as unknown as Candidate[];
  const brands = all.map((item) => item.brands?.name).filter((name): name is string => Boolean(name));

  // Inferred brands from current message
  const brandsInCurrent = brands.filter((name) => new RegExp(`\\b${name}\\b`, "i").test(message));
  const inferredBrandsFromSeries = [
    ...(mentionedSeries.some((s) => ["yoga", "ideapad", "thinkpad", "loq", "legion"].includes(s)) ? ["Lenovo"] : []),
    ...(mentionedSeries.some((s) => ["zenbook", "vivobook", "rog", "zephyrus", "tuf"].includes(s)) ? ["Asus"] : []),
    ...(mentionedSeries.some((s) => ["aspire", "nitro"].includes(s)) ? ["Acer"] : []),
    ...(mentionedSeries.some((s) => ["macbook"].includes(s)) ? ["Apple"] : []),
    ...(mentionedSeries.some((s) => ["soulmate", "workmate"].includes(s)) ? ["Advan"] : []),
  ];
  const targetBrands = [...new Set([...brandsInCurrent, ...inferredBrandsFromSeries])];

  let matches = wantsProducts ? [...all] : [];

  // 1. Strict Category Matching
  if (categoryIntent) {
    matches = matches.filter((item) => isItemMatchingCategory(item, categoryIntent));
  }

  // 2. Series / Model Matching (Highest Priority if user mentions specific series like Yoga, Zenbook)
  if (mentionedSeries.length > 0) {
    const seriesMatches = matches.filter((item) => {
      const text = `${item.name} ${item.description}`.toLowerCase();
      return mentionedSeries.some((s) => text.includes(s));
    });
    if (seriesMatches.length > 0) {
      matches = seriesMatches;
    }
  } else if (isPremium) {
    // 3. Premium Intent (If user specifically asks for premium/flagship laptops)
    const premiumMatches = matches.filter((item) => {
      const text = `${item.name} ${item.description}`.toLowerCase();
      const isPremiumModel = /yoga|zenbook|macbook|zephyrus|thinkpad|legion/i.test(text);
      const isPremiumPrice = Number(item.discount_price ?? item.price) >= 15_000_000;
      return isPremiumModel || isPremiumPrice;
    });
    if (premiumMatches.length > 0) {
      matches = premiumMatches;
    }
  } else if (targetBrands.length > 0) {
    // 4. Target Brands Matching
    const brandMatches = matches.filter((item) =>
      targetBrands.some((b) => item.brands?.name?.toLowerCase() === b.toLowerCase())
    );
    if (brandMatches.length > 0) {
      matches = brandMatches;
    }
  }

  // 5. Budget Matching
  if (effectiveBudget) {
    let budgetFiltered: Candidate[] = [];
    if (isStrictUnder) {
      budgetFiltered = matches.filter((item) => Number(item.discount_price ?? item.price) <= effectiveBudget);
    } else if (isStrictAbove) {
      budgetFiltered = matches.filter((item) => Number(item.discount_price ?? item.price) >= effectiveBudget);
    } else {
      budgetFiltered = matches.filter((item) => Number(item.discount_price ?? item.price) <= effectiveBudget * 1.15);
    }

    if (budgetFiltered.length > 0) {
      matches = budgetFiltered;
    } else if (currentBudget) {
      // User explicitly typed a budget in THIS message and nothing met the criteria
      matches = [];
    }
    // If budgetFiltered was empty solely due to an inherited fallback budget, ignore the stale budget
  }

  // 6. Relevance Ranking & Sorting
  const stopWords = new Set([
    "yang", "buat", "untuk", "dengan", "dong", "bang", "berapa", "harga", "cari", "mau",
    "saya", "aku", "ada", "atau", "dan", "dari", "lebih", "sama", "tolong", "produk", "budget", "kalo", "apa"
  ]);
  const queryWords = [
    ...new Set(
      (conversationContext.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((word) => !stopWords.has(word))
    ),
  ];

  matches.sort((a, b) => {
    const priceA = Number(a.discount_price ?? a.price);
    const priceB = Number(b.discount_price ?? b.price);
    const textA = `${a.name} ${a.description} ${a.categories?.name ?? ""} ${a.brands?.name ?? ""}`.toLowerCase();
    const textB = `${b.name} ${b.description} ${b.categories?.name ?? ""} ${b.brands?.name ?? ""}`.toLowerCase();

    // If specific series requested, prioritize exact series matches
    if (mentionedSeries.length > 0) {
      const aMatches = mentionedSeries.some((s) => textA.includes(s)) ? 1 : 0;
      const bMatches = mentionedSeries.some((s) => textB.includes(s)) ? 1 : 0;
      if (bMatches !== aMatches) return bMatches - aMatches;
    }

    // If premium requested, sort higher tier first
    if (isPremium) {
      return priceB - priceA;
    }

    const relevance =
      queryWords.filter((word) => textB.includes(word)).length -
      queryWords.filter((word) => textA.includes(word)).length;
    return (
      relevance ||
      (effectiveBudget ? Math.abs(priceA - effectiveBudget) - Math.abs(priceB - effectiveBudget) : priceA - priceB)
    );
  });

  // Limit to top 5 candidates
  const products = matches.slice(0, 5);

  let answer = wantsProducts
    ? fallbackAnswer(message, products, effectiveBudget, categoryIntent, isPremium, mentionedSeries)
    : fallbackChatReply(message);
  let aiGenerated = false;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    const models = [...new Set([process.env.GEMINI_MODEL || "gemini-2.5-flash", "gemini-2.0-flash"])];
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: `Kamu adalah konsultan teknologi dan asisten AI resmi toko Next Solution.
Aturan Penting:
1. Rekomendasikan produk dari daftar 'Katalog yang cocok'. Jelaskan spesifikasi utama, keunggulan, harga, dan ketersediaan stoknya secara ramah dan profesional.
2. JANGAN PERNAH mengklaim bahwa toko Next Solution tidak menjual atau tidak punya stok Lenovo Yoga, ASUS Zenbook, Apple MacBook, Acer, dll jika produk tersebut ada di katalog atau ditanyakan oleh pengguna. Next Solution adalah toko resmi yang menjual produk-produk ini!
3. Klasifikasi Kategori Laptop:
   - Budget / Entry-Level: di bawah 8-10 juta (seperti Advan Soulmate, Acer Aspire Lite Celeron).
   - Mainstream / Produktivitas: 10 - 18 juta (seperti ASUS Vivobook, Lenovo IdeaPad).
   - Premium / Flagship / Ultrabook: 18 juta ke atas (seperti Lenovo Yoga 2-in-1 / Slim, ASUS Zenbook, Apple MacBook Pro, ASUS ROG Zephyrus).
4. Jika pengguna meminta laptop premium atau menanyakan seri tertentu (seperti Yoga, Zenbook, MacBook), HANYA fokus pada lini premium/seri tersebut dari 'Katalog yang cocok'. JANGAN menyarankan laptop budget entry-level (seperti Advan / Celeron) jika pengguna mencari laptop premium.
5. Jika pengguna sebelumnya membahas budget murah namun kemudian bertanya tentang lini premium (misal: "itu ada tuh yoga bang, kan itu premium, zenbook juga ada"), jelaskan dengan sopan dan antusias bahwa seri premium tersebut memang tersedia di toko Next Solution di rentang harga kelas atas dengan fitur-fitur flagship (layar OLED touchscreen, prosesor Intel Core Ultra / AMD Ryzen AI, build tipis premium).
6. Format jawaban dengan rapi: gunakan Markdown standar, **tebalkan** nama produk dan harga, gunakan daftar berpoin.

Riwayat chat: ${JSON.stringify(history)}
Pesan terbaru pengguna: ${message}
Kategori produk: ${categoryIntent ?? "laptop"}
Intent Premium: ${isPremium ? "Ya (Laptop Flagship / Premium)" : "Biasa"}
Seri yang ditanyakan: ${mentionedSeries.length > 0 ? mentionedSeries.join(", ") : "Umum"}
Budget terdeteksi: ${effectiveBudget ? `Rp${effectiveBudget.toLocaleString("id-ID")}` : "tidak dibatasi"}
Katalog yang cocok: ${JSON.stringify(
            products.map((p) => ({
              name: p.name,
              brand: p.brands?.name,
              category: p.categories?.name,
              price: p.price,
              discount_price: p.discount_price,
              stock: p.stock,
              description: p.description,
            }))
          )}`,
          config: {
            httpOptions: { timeout: 15_000 },
            maxOutputTokens: 450,
            temperature: 0.3,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        const generatedText = response.text?.trim();
        if (generatedText && generatedText.length >= 24) {
          answer = generatedText;
          aiGenerated = true;
          break;
        }
      } catch {
        /* Try backup model or use fallback answer */
      }
    }
  }

  return NextResponse.json({
    answer,
    aiGenerated,
    products: products.map((product) => ({
      ...product,
      image: getSafeProductImageUrl(product.product_images),
      price: Number(product.price),
      discount_price: product.discount_price == null ? null : Number(product.discount_price),
    })),
  });
}
