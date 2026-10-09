import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

type Candidate = {
  id: string; name: string; description: string; price: number; discount_price: number | null; stock: number;
  categories: { name: string } | null; brands: { name: string } | null; product_images: { url: string; is_primary: boolean }[];
};

function parseBudget(message: string) {
  const million = message.match(/(?:rp\s*)?(\d+(?:[.,]\d+)?)\s*(?:jt|juta)(?:an)?/i);
  if (million) return Number(million[1].replace(",", ".")) * 1_000_000;
  const raw = message.match(/(?:rp\s*)?(\d{6,})(?:\s*(?:rupiah|rb|ribu))?/i);
  if (raw) return Number(raw[1]);
  const thousand = message.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu)(?:an)?/i);
  return thousand ? Number(thousand[1].replace(",", ".")) * 1_000 : null;
}

function fallbackAnswer(message: string, products: Candidate[], budget: number | null) {
  if (!products.length) return "Belum ada produk yang cocok dan tersedia saat ini. Coba ubah merek, kisaran harga, atau kebutuhanmu.";
  const comparison = /banding|compare|versus|\bvs\b/i.test(message);
  const lead = comparison ? "Ini perbandingan produk yang tersedia dan stoknya ready:" : budget ? `Saya menemukan ${products.length} produk ready yang paling mendekati budget sekitar Rp${budget.toLocaleString("id-ID")}:` : "Ini beberapa produk yang ready dan paling sesuai:";
  return `${lead}\n${products.slice(0, 3).map((product) => `• ${product.name} — Rp${Number(product.discount_price ?? product.price).toLocaleString("id-ID")} (stok ${product.stock})`).join("\n")}\nMau saya bandingkan dari harga, spesifikasi, atau kebutuhan pemakaian?`;
}

function isProductSearch(text: string) {
  return /\b(laptop|notebook|komputer|pc|smartphone|handphone|hp|tablet|aksesoris|produk|barang|rekomendasi|carikan|cari|bandingkan|bandingin|compare|vs|stok|ready|harga|budget|spesifikasi|spek|merek|brand)\b/i.test(text);
}

function fallbackChatReply(message: string) {
  if (/\b(hai|halo|hello|hi|pagi|siang|sore|malam)\b/i.test(message)) {
    return "Hai! Aku asisten AI Next Solution. Kita bisa ngobrol dulu soal kebutuhanmu, lalu kalau sudah siap aku bantu carikan produk yang cocok. Kamu lagi mempertimbangkan perangkat apa?";
  }
  return "Siap, kita diskusi dulu aja 😊 Aku bisa bantu cari tahu perangkat yang cocok berdasarkan kebutuhanmu, tanpa harus langsung pilih barang. Kamu rencananya mau dipakai untuk apa?";
}

export async function POST(request: Request) {
  let body: { message?: unknown; history?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 }); }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
  if (!message) return NextResponse.json({ error: "Tulis kebutuhan produkmu dulu." }, { status: 400 });
  const history = Array.isArray(body.history) ? body.history.slice(-8).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as { role?: unknown; text?: unknown };
    if ((entry.role !== "user" && entry.role !== "assistant") || typeof entry.text !== "string") return [];
    return [{ role: entry.role, text: entry.text.trim().slice(0, 500) }];
  }) : [];
  const previousUserMessages = history.filter((entry) => entry.role === "user").map((entry) => entry.text);
  const conversationContext = [...previousUserMessages, message].join(" ");
  const wantsProducts = isProductSearch(conversationContext);

  const supabase = await createClient();
  const { data, error } = await supabase.from("products")
    .select("id,name,description,price,discount_price,stock,categories(name),brands(name),product_images(url,is_primary)")
    .eq("status", "published").gt("stock", 0).limit(200);
  if (error) return NextResponse.json({ error: "Katalog belum bisa dimuat. Coba lagi sebentar." }, { status: 503 });
  const all = (data ?? []) as unknown as Candidate[];
  const brands = all.map((item) => item.brands?.name).filter((name): name is string => Boolean(name));
  const brand = [message, ...previousUserMessages.slice().reverse()].map((turn) => brands.find((name) => turn.toLowerCase().includes(name.toLowerCase()))).find(Boolean);
  const budget = parseBudget(message) ?? [...previousUserMessages].reverse().map(parseBudget).find((value) => value !== null) ?? null;
  let matches = wantsProducts ? all.filter((item) => !brand || item.brands?.name.toLowerCase() === brand.toLowerCase()) : [];
  if (budget) matches = matches.filter((item) => Number(item.discount_price ?? item.price) <= budget * 1.15);
  const stopWords = new Set(["yang", "buat", "untuk", "dengan", "dong", "bang", "berapa", "harga", "cari", "mau", "saya", "aku", "ada", "atau", "dan", "dari", "lebih", "sama", "tolong", "produk", "budget"]);
  const queryWords = [...new Set((conversationContext.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((word) => !stopWords.has(word)))];
  matches.sort((a, b) => {
    const priceA = Number(a.discount_price ?? a.price), priceB = Number(b.discount_price ?? b.price);
    const textA = `${a.name} ${a.description} ${a.categories?.name ?? ""} ${a.brands?.name ?? ""}`.toLowerCase();
    const textB = `${b.name} ${b.description} ${b.categories?.name ?? ""} ${b.brands?.name ?? ""}`.toLowerCase();
    const relevance = queryWords.filter((word) => textB.includes(word)).length - queryWords.filter((word) => textA.includes(word)).length;
    return relevance || (budget ? Math.abs(priceA - budget) - Math.abs(priceB - budget) : priceA - priceB);
  });
  const products = matches.slice(0, 5);

  let answer = wantsProducts ? fallbackAnswer(message, products, budget) : fallbackChatReply(message);
  let aiGenerated = false;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    const models = [...new Set([process.env.GEMINI_MODEL || "gemini-3.6-flash", "gemini-3.8-flash"] )];
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: `Kamu adalah asisten AI Next Solution yang membantu pelanggan berdiskusi dan memilih perangkat elektronik. Jangan buru-buru menampilkan katalog: bila pelanggan hanya menyapa atau masih ingin diskusi, balas ramah dan tanyakan kebutuhan/peruntukannya. Kalau informasi jenis perangkat, kebutuhan, atau budget belum cukup, tanyakan satu pertanyaan lanjutan saja. Jawab ringkas dalam bahasa Indonesia yang alami dan sopan. Gunakan riwayat percakapan agar balasan nyambung. Format jawaban dengan rapi: gunakan Markdown standar secukupnya, **tebalkan** nama produk atau informasi penting, gunakan *miring* hanya bila perlu, dan buat daftar berpoin jika menyebut beberapa pilihan. Hindari tanda bintang dekoratif, tabel, heading berlebihan, dan format yang tidak perlu. Rekomendasikan hanya produk di katalog JSON; jangan mengarang spesifikasi, harga, atau ketersediaan. Produk di katalog sudah published dan stoknya tersedia. Bila katalog berisi produk dan pelanggan meminta rekomendasi, sebutkan nama produk, harga, alasan kecocokan dari data yang ada, lalu tanyakan apakah pelanggan ingin detail lain. Jangan membalas hanya satu kata. Bila katalog kosong, sampaikan belum ada yang cocok dan tanyakan apakah mau mengubah budget, merek, atau jenis produk.\nRiwayat chat: ${JSON.stringify(history)}\nPesan terbaru: ${message}\nPelanggan sedang meminta rekomendasi katalog: ${wantsProducts ? "ya" : "belum, jangan tampilkan produk dulu"}\nBudget terdeteksi: ${budget ? `Rp${budget.toLocaleString("id-ID")}` : "belum disebutkan"}\nKatalog yang cocok: ${JSON.stringify(products.map((p) => ({ name: p.name, brand: p.brands?.name, category: p.categories?.name, price: p.price, discount_price: p.discount_price, stock: p.stock, description: p.description })))}`,
          config: { httpOptions: { timeout: 15_000 }, maxOutputTokens: 400, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
        });
        const generatedText = response.text?.trim();
        if (generatedText && generatedText.length >= 24) { answer = generatedText; aiGenerated = true; break; }
      } catch { /* Try the backup Gemini model, then keep the deterministic fallback. */ }
    }
  }
  return NextResponse.json({ answer, aiGenerated, products: products.map((product) => ({ ...product, image: product.product_images?.find((item) => item.is_primary)?.url ?? product.product_images?.[0]?.url ?? null, price: Number(product.price), discount_price: product.discount_price == null ? null : Number(product.discount_price) })) });
}
