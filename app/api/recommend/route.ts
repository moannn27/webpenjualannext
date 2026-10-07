import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  let body: { message?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 }); }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
  if (!message) return NextResponse.json({ error: "Tulis kebutuhan produkmu dulu." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.from("products")
    .select("id,name,description,price,discount_price,stock,categories(name),brands(name),product_images(url,is_primary)")
    .eq("status", "published").gt("stock", 0).limit(200);
  if (error) return NextResponse.json({ error: "Katalog belum bisa dimuat. Coba lagi sebentar." }, { status: 503 });
  const all = (data ?? []) as unknown as Candidate[];
  const brand = all.map((item) => item.brands?.name).filter((name): name is string => Boolean(name)).find((name) => message.toLowerCase().includes(name.toLowerCase()));
  const budget = parseBudget(message);
  let matches = all.filter((item) => !brand || item.brands?.name.toLowerCase() === brand.toLowerCase());
  if (budget) matches = matches.filter((item) => Number(item.discount_price ?? item.price) <= budget * 1.15);
  matches.sort((a, b) => {
    const priceA = Number(a.discount_price ?? a.price), priceB = Number(b.discount_price ?? b.price);
    return budget ? Math.abs(priceA - budget) - Math.abs(priceB - budget) : priceA - priceB;
  });
  const products = matches.slice(0, 5);

  let answer = fallbackAnswer(message, products, budget);
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && products.length) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", input: `Jawab dalam bahasa Indonesia dengan ringkas dan ramah. Bantu rekomendasi atau bandingkan produk untuk pertanyaan user. Gunakan HANYA data katalog JSON berikut, jangan menambah spesifikasi atau klaim yang tidak tercantum. Produk yang diberikan semuanya berstatus published dan stoknya tersedia; sebut stok sesuai angka. Jika membandingkan, bandingkan harga, deskripsi, merek, dan kategori yang tersedia. Pertanyaan: ${message}\nKatalog: ${JSON.stringify(products.map((p) => ({ name: p.name, brand: p.brands?.name, category: p.categories?.name, price: p.price, discount_price: p.discount_price, stock: p.stock, description: p.description })))}` }),
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) {
        const result = await response.json() as { output?: { content?: { type: string; text?: string }[] }[] };
        const text = result.output?.flatMap((item) => item.content ?? []).find((part) => part.type === "output_text")?.text?.trim();
        if (text) answer = text;
      }
    } catch { /* Keep deterministic catalog answer when the model is unavailable. */ }
  }
  return NextResponse.json({ answer, products: products.map((product) => ({ ...product, image: product.product_images?.find((item) => item.is_primary)?.url ?? product.product_images?.[0]?.url ?? null, price: Number(product.price), discount_price: product.discount_price == null ? null : Number(product.discount_price) })) });
}
