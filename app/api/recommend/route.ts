import { NextResponse } from "next/server";
import {
  type FunctionDeclaration,
} from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSafeProductImageUrl } from "@/lib/product-gallery";
import {
  effectiveVariantPrice,
  findRelevantFaq,
  type GraphicsAlternativeKind,
  getCatalogGraphicsLabel,
  getCatalogGraphicsType,
  getMatchingVariant,
  graphicsFollowUpAnswer,
  getProductCriteria,
  isWithinBudget,
  rankProducts,
  searchGraphicsProducts,
  recommendationPrice,
  selectAssistantAnswer,
  selectConversationalAnswer,
  type AssistantProduct,
  BRANDS,
} from "@/lib/recommendation-assistant";
import { FAQService } from "@/services/faq.service";
import { DEFAULT_STOREFRONT_SETTINGS, normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { DEFAULT_FAQS } from "@/constants/defaultFaqs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveOrderCustomerIdentity } from "@/lib/orders/customer-identity";
import { normalizePhoneNumber } from "@/lib/phone";
import {
  executeWithFailover,
  openAIToolsToGemini,
  type ChatMessage,
  type OpenAITool,
} from "@/lib/llm-provider";

export const OPENAI_TOOLS: OpenAITool[] = [
  {
    type: "function",
    function: {
      name: "cari_produk",
      description: "Cari produk di katalog toko Next Solution Store berdasarkan kata kunci pencarian (nama, seri, processor, RAM, GPU/VGA, spesifikasi), kategori, brand, rentang harga, atau urutan.",
      parameters: {
        type: "object",
        properties: {
          kata_kunci: { type: "string", description: "Kata kunci nama produk, seri, processor, GPU, atau spesifikasi (contoh: 'TUF', 'LOQ', 'Vivobook', 'Nitro', 'Thin', 'RTX 4060', 'Core i5', 'Ryzen 7')." },
          kategori: { type: "string", description: "Kategori produk: 'laptop', 'desktop', 'monitor', 'smartphone', 'tablet', atau 'aksesori'." },
          brand: { type: "string", description: "Nama brand/merek (contoh: 'ASUS', 'Lenovo', 'Acer', 'Apple', 'MSI', 'HP', 'Axioo', 'Advan')." },
          rentang_harga: {
            type: "object",
            properties: {
              min: { type: "number", description: "Harga minimum dalam Rupiah." },
              max: { type: "number", description: "Harga maksimum dalam Rupiah." },
            },
          },
          urutan: {
            type: "string",
            description: "Urutan hasil: 'termurah', 'termahal', atau 'relevansi'.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_catalog_products",
      description: "Cari ulang katalog publik berdasarkan kata kunci, seri/model, brand, SKU/MTM produk atau varian, tipe/GPU, atau harga.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Kata kunci yang diambil dari kebutuhan pengguna, maksimal 100 karakter." } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "info_toko",
      description: "Ambil informasi resmi toko Next Solution Store dan panduan FAQ (tentang toko, cara pesan, metode pembayaran, pengiriman, Store Pickup, garansi & retur, jam operasional, kontak WhatsApp admin, alamat toko).",
      parameters: {
        type: "object",
        properties: {
          topik: {
            type: "string",
            description: "Topik info toko yang dicari: 'tentang_toko', 'cara_pesan', 'pembayaran', 'pengiriman', 'retur_dan_garansi', 'jam_operasional', 'kontak', 'cabang_dan_pickup', atau 'semua'.",
          },
        },
        required: ["topik"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cek_pesanan",
      description: "Cek status pesanan pelanggan secara read-only. WAJIB membutuhkan nomor pesanan DAN email atau nomor HP yang terdaftar pada pesanan tersebut untuk verifikasi keamanan dan privasi.",
      parameters: {
        type: "object",
        properties: {
          nomor_pesanan: { type: "string", description: "Nomor pesanan pelanggan (contoh: 'ORD-271026-01' atau format ID pesanan)." },
          email_atau_hp: { type: "string", description: "Email atau nomor handphone/WhatsApp pelanggan yang digunakan saat pemesanan untuk verifikasi kepemilikan." },
        },
        required: ["nomor_pesanan", "email_atau_hp"],
      },
    },
  },
];

export const ALL_CHATBOT_TOOLS: FunctionDeclaration[] = openAIToolsToGemini(OPENAI_TOOLS);
export const TOOL_CARI_PRODUK: FunctionDeclaration = ALL_CHATBOT_TOOLS[0];
export const TOOL_SEARCH_CATALOG: FunctionDeclaration = ALL_CHATBOT_TOOLS[1];
export const TOOL_INFO_TOKO: FunctionDeclaration = ALL_CHATBOT_TOOLS[2];
export const TOOL_CEK_PESANAN: FunctionDeclaration = ALL_CHATBOT_TOOLS[3];

const STORE_SYSTEM_INSTRUCTION = `Kamu adalah asisten toko AI resmi Next Solution Store (toko spesialis laptop, PC desktop, monitor, gadget, dan aksesori teknologi).
Tugasmu adalah membantu calon pembeli dan pelanggan dengan ramah, santai, solutif, dan profesional dalam bahasa Indonesia.

INFORMASI PENTING TOKO (GUNAKAN LANGSUNG UNTUK PERTANYAAN UMUM TANPA TOOL):
- Toko: Next Solution Store (Spesialis Komputer, Laptop, PC Desktop, Monitor, dan Gadget Resmi)
- Alamat Cabang Fisik: ${DEFAULT_STOREFRONT_SETTINGS.store.address}, ${DEFAULT_STOREFRONT_SETTINGS.store.city}
- WhatsApp Admin: +${DEFAULT_STOREFRONT_SETTINGS.store.whatsapp} (Bisa hubungi untuk bantuan langsung / pesanan khusus)
- Jam Operasional Toko: Senin - Sabtu: 09.00 - 18.00 WIB. Hari Minggu & Libur Nasional toko fisik tutup. Transaksi web aktif 24 jam.
- Cara Pesan di Web: Pilih produk di katalog web -> Masukkan ke Keranjang -> Buka Checkout -> Masukkan alamat pengiriman atau pilih Ambil di Tempat (Store Pickup) -> Pilih metode pembayaran (Transfer Bank / QRIS) -> Selesaikan transaksi dan simpan nomor pesanan (contoh: ORD-271026-01).
- Metode Pembayaran: Transfer Bank Manual/Virtual Account (BCA, Mandiri, BRI, BNI), QRIS instan otomatis, atau tunai/kartu debit saat Store Pickup di cabang toko.
- Pengiriman: Kurir reguler & kargo ke seluruh Indonesia, kurir instant/same-day untuk area lokal. Standar aman: bubble wrap tebal berlapis, asuransi penuh, dan opsi packing kayu.
- Ambil di Tempat (Store Pickup): Bebas ongkir, bisa periksa fisik unit dan konsultasi langsung dengan teknisi di cabang Jl. Kartini No. 9 Bandung.
- Garansi & Retur: 100% Original Brand New In Box (BNIB) garansi resmi distributor Indonesia (ASUS, Lenovo, Acer, Apple, HP, MSI, dll). Jaminan toko tukar unit baru 7 hari jika cacat pabrik (wajib sertakan video unboxing utuh tanpa jeda 2x24 jam sejak paket tiba).
- Halaman FAQ Resmi: [Halaman FAQ](/faq)

PENGGUNAAN FUNCTION CALLING (TOOLS):
1. PRODUK & KATALOG: Bila pengguna mencari, meminta rekomendasi, mengecek harga/stok/spesifikasi (processor, RAM, GPU/VGA, storage, display), atau membandingkan produk, PANGGIL tool 'cari_produk'. DILARANG mengarang nama produk, spesifikasi, atau harga di luar data tool.
2. CEK STATUS PESANAN: Bila pengguna ingin mengecek status pesanan (contoh: nomor pesanan ORD-271026-01), PANGGIL tool 'cek_pesanan'.
   PENTING: Masukkan 'nomor_pesanan' dan 'email_atau_hp'.
   Jika pengguna sedang login di website atau email/HP sudah diketahui dari riwayat percakapan/sesi akun, langsung panggil tool 'cek_pesanan'.
   Hanya minta email atau nomor HP jika pengguna belum login dan belum memberikan informasi kontak verifikasi sama sekali.
3. INFO TOKO & FAQ: Informasi dasar toko sudah tercantum lengkap di atas. Panggil tool 'info_toko' HANYA bila pengguna menanyakan detail FAQ spesifik yang belum ada di ringkasan.

PRINSIP KOMUNIKASI & GAYA BAHASA:
1. Nada Bicara: Santai, ramah, dan bersahabat ("Halo!", "Siap kak/bang!"), to the point, dan solutif.
2. Teman Diskusi Belanja: Bantu pengguna memilih produk yang tepat sesuai kebutuhan software/tugas dan anggaran keuangannya. Beri saran spesifikasi yang relevan (processor, RAM, GPU/VGA).
3. Jawaban Ringkas: Berikan penjelasan padat dan jelas (1-3 paragraf singkat). Jangan bertele-tele.
4. Tanya Balik yang Terarah: Jika kebutuhan pengguna belum spesifik, ajukan maksimal 1 pertanyaan klarifikasi yang ringkas.
5. Strict Grounding: Gunakan HANYA informasi terverifikasi dari katalog dan info toko. DILARANG KERAS mengarang produk, harga, stok, atau spesifikasi palsu. Integrated Graphics (seperti Intel UHD/Iris Xe/Radeon Graphics) BUKAN GPU dedicated (seperti RTX/GTX/Radeon RX).
6. Pengetahuan Hardware, Multi-Brand Resmi & GPU Dedicated:
   - Toko Next Solution Store MENJUAL berbagai brand resmi dan lengkap:
     * ASUS: TUF Gaming (seperti TUF A15/F15/A16/V16), ROG (Strix/Zephyrus), Vivobook, Zenbook.
     * Lenovo: Legion, LOQ, IdeaPad Slim, Yoga, ThinkPad.
     * Acer: Nitro, Predator, Aspire, Swift.
     * MSI: Thin 15, Cyborg, Katana, Modern, Bravo.
     * HP: Victus, Omen, Pavilion.
     * Axioo: Pongo Gaming, Hype.
     * Advan: Workplus, Pixwar, Soulmate.
     * Apple: MacBook Air, MacBook Pro.
   - JANGAN PERNAH BIAS HANYA KE SATU BRAND (misal jangan hanya menyebut Lenovo LOQ):
     * Ketika merekomendasikan laptop gaming atau laptop grafis 3D/render (Revit, Adobe Premiere/After Effects, Blender, CAD), PERIKSA SELURUH HASIL PRODUK TERVERIFIKASI DARI TOKO.
     * Jika di hasil data tersedia ASUS (misal ASUS TUF Gaming), Acer (Nitro), MSI (Thin/Cyborg), HP (Victus), Axioo (Pongo), maupun Lenovo (LOQ/Legion), SEBUTKAN DAN REKOMENDASIKAN SECARA ADIL & OBJEKTIF sesuai kesesuaian spek dan budget pelanggan.
   - Deteksi Otomatis Produk Baru:
     * Sistem AI terhubung langsung secara live ke database toko. Setiap ada produk baru yang di-upload atau masuk stok toko (misal ASUS TUF series baru atau varian baru), sistem otomatis mengenali dan merekomendasikannya jika cocok dengan kriteria.
   - Prediksi Kebutuhan & Antisipasi Pertanyaan Pengguna:
     * Jadilah konsultan belanja yang aktif berpikir dan memprediksi kebutuhan calon pembeli:
       - Kuliah/Sekolah: Prediksi apakah jurusannya butuh rendering grafis (Teknik/Arsitektur/DKV butuh GPU dedicated) atau hanya butuh mengetik/browsing/presentasi (cukup Core i3/i5 atau Ryzen 3/5 tipis baterai awet).
       - Gaming: Berikan pertimbangan refresh rate layar, kartu grafis, dan opsi upgrade RAM/storage.
       - Desain & 3D: Ingatkan pentingnya VRAM GPU dedicated dan RAM minimal 16GB.
     * Berikan penjelasan mengapa produk tersebut cocok (keunggulan spek, daya tahan, sistem pendingin, atau value harganya).
   - Jika pengguna menanyakan VGA ("emang gabutuh vga?", "ada yang ber-vga ga?") untuk software berat seperti Revit, AutoCAD, 3ds Max, Blender, SketchUp, atau Adobe Family (Premiere Pro, After Effects):
     * Jelaskan secara santai, edukatif, dan solutif: untuk 3D modelling dan render video, GPU dedicated (seperti NVIDIA GeForce RTX) memang SANGAT DIBUTUHKAN / DISARANKAN untuk akselerasi viewport 3D dan ekspor video agar tidak patah-patah/lag.
     * Rekomendasikan laptop ber-GPU dedicated (seperti ASUS TUF Gaming, Lenovo LOQ, Acer Nitro, atau MSI Thin) yang tersedia di data produk terverifikasi.
     * Jika anggaran pengguna terbatas, sampaikan secara jujur trade-off jika memakai grafis terintegrasi (hanya cukup untuk 2D ringan/sketsa awal).
7. Rekomendasi Cerdas untuk Kuliah, Sekolah & Kerja Kantor (Berpikir Kebutuhan & Nilai Terbaik):
   - Bila pengguna mencari laptop untuk kuliah (mahasiswa), sekolah (anak sekolah/pelajar), tugas, skripsi, atau kerja harian:
     * BERIKAN REKOMENDASI YANG BERNILAI TERBAIK (VALUE FOR MONEY), BUKAN ASAL PILIH PALING MURAH: Jangan langsung menyodorkan prosesor entry-level Celeron/Pentium/N150 yang lambat, kecuali jika pengguna secara khusus meminta opsi paling murah / hemat.
     * Pertimbangkan kebutuhan mahasiswa & pelajar: mobilitas ringan dibawa ke kampus/sekolah, baterai awet, dan prosesor minimal Intel Core i3 / Core i5 (generasi modern atau Core Ultra) atau AMD Ryzen 3 / Ryzen 5 dengan RAM 8GB/16GB serta SSD 512GB (seperti lini IdeaPad Slim, Vivobook, Aspire Lite) agar tidak lemot saat membuka puluhan tab browsing jurnal, Zoom, dan tugas Office/Canva bersamaan.
     * Jika pengguna meminta rentang harga tertentu (misal: "budget 7-8 jutaan", "maks 10 juta"): carikan pilihan terbaik dengan spesifikasi tertinggi yang pas di anggaran tersebut.
     * Jika jurusan kuliah memerlukan software 3D atau rendering (Teknik, Arsitektur, Desain, Animasi), tanyakan atau arahkan ke unit yang ber-GPU dedicated (seperti lini ASUS TUF Gaming, Lenovo LOQ/Legion, atau Acer Nitro).
8. Deteksi Fleksibel Kosakata Spesifikasi & Hardware:
   - Spek Murah / Rendah / Hemat / Entry-Level: Carikan unit paling ekonomis dan terjangkau yang fungsional untuk kebutuhan dasar.
   - Spek Menengah / Mid-Range / Standar: Berikan laptop seimbang dengan prosesor Core i5 / Ryzen 5, RAM 8GB/16GB, SSD 512GB (seperti lini IdeaPad Slim, Vivobook, Aspire).
   - Spek Tinggi / Spek Dewa / Kencang / Flagship: Prioritaskan prosesor kelas atas (Core i7/i9/Ultra 7, Ryzen 7/9) dan GPU dedicated NVIDIA GeForce RTX atau laptop kelas performa tinggi.
   - Toleransi Istilah Teknis & Typo: Pahami variasi sebutan hardware seperti 'cpu', 'prosessro' (prosesor), 'memory'/'ram', 'vga'/'gpu'/'kartu grafis', 'ssd'/'storage', serta identitas produk seperti tipe/seri, 'sku', dan 'mtm'.
9. Pengetahuan Seluruh Kategori Produk & Wawasan Teknologi Luas:
   - Toko menjual LENGKAP seluruh kebutuhan komputer, laptop, dan gadget resmi:
     * Laptop & Notebook (Gaming, Ultrabook, Tipis Ringan, 2-in-1, Office/Bisnis)
     * PC Desktop, Tower, All-in-One (AIO), dan Komputer Kantor/Rumahan
     * Monitor (Gaming refresh rate tinggi 144Hz-240Hz, Monitor Kantor/Desain IPS/OLED)
     * Smartphone & Tablet (Apple iPhone, iPad, Samsung, Xiaomi, Infinix, dll.)
     * Aksesoris & Periferal: Mouse (Wireless/Gaming/Silent), Keyboard (Mechanical/Membrane), Headset/TWS/Speaker, Webcam FHD, Charger/Adaptor, Storage (SSD NVMe/SATA, HDD, RAM), Printer & Tinta, Cooling Pad, Tas/Sleeve, dsb.
   - Wawasan Teknologi Komprehensif: Bila pengguna bertanya konsep teknologi umum atau perbandingan hardware (misal perbedaan DDR4 vs DDR5, panel IPS vs OLED, fungsi MTM dan SKU, arsitektur prosesor, rekomendasi software), jawab dengan pengetahuan mendalam, edukatif, akurat, dan santai tanpa terbatas pada satu jenis perangkat.`;

export function executeCariProduk(
  catalog: Candidate[],
  params: {
    kata_kunci?: string;
    kategori?: string;
    brand?: string;
    rentang_harga?: { min?: number | string; max?: number | string };
    urutan?: string;
  },
  criteria: ReturnType<typeof getProductCriteria>
) {
  let filtered = [...catalog].filter((p) => {
    if (p.status && p.status !== "published") return false;
    const availableStock = p.product_variants?.length
      ? p.product_variants.reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0)
      : Number(p.stock ?? 0);
    return availableStock > 0;
  });

  if (params.kategori) {
    const kat = params.kategori.toLowerCase();
    filtered = filtered.filter((p) =>
      Boolean(p.categories?.name?.toLowerCase().includes(kat) ||
      p.categories?.slug?.toLowerCase().includes(kat))
    );
  }

  if (params.brand) {
    const br = params.brand.toLowerCase();
    filtered = filtered.filter((p) =>
      Boolean(p.brands?.name?.toLowerCase() === br ||
      p.brands?.slug?.toLowerCase() === br)
    );
  }

  const minPrice = params.rentang_harga?.min !== undefined && params.rentang_harga?.min !== null ? Number(params.rentang_harga.min) : null;
  const maxPrice = params.rentang_harga?.max !== undefined && params.rentang_harga?.max !== null ? Number(params.rentang_harga.max) : null;

  if (minPrice !== null && !isNaN(minPrice)) {
    filtered = filtered.filter((p) => (p.discount_price ?? p.price) >= minPrice);
  }
  if (maxPrice !== null && !isNaN(maxPrice)) {
    filtered = filtered.filter((p) => (p.discount_price ?? p.price) <= maxPrice);
  }

  const query = params.kata_kunci?.trim();
  let alternatives: Candidate[] = [];
  let alternativeKind: GraphicsAlternativeKind = null;

  if (query) {
    const verified = searchGraphicsProducts(filtered as AssistantProduct[], criteria, query);
    filtered = verified.products as Candidate[];
    alternatives = verified.alternatives as Candidate[];
    alternativeKind = verified.alternativeKind;

    if (!filtered.length && !alternatives.length && criteria.requiresDedicatedGpu) {
      const allBrandVerified = searchGraphicsProducts(catalog as AssistantProduct[], { ...criteria, budget: null, brand: null }, query);
      filtered = allBrandVerified.products as Candidate[];
      alternatives = allBrandVerified.alternatives as Candidate[];
      alternativeKind = allBrandVerified.alternativeKind;
    }
  } else if (criteria.requiresDedicatedGpu && !filtered.length) {
    const fallbackSearch = searchGraphicsProducts(catalog as AssistantProduct[], { ...criteria, budget: null, brand: null }, "");
    filtered = fallbackSearch.products as Candidate[];
    alternatives = fallbackSearch.alternatives as Candidate[];
    alternativeKind = fallbackSearch.alternativeKind;
  }

  if (params.urutan === "termurah") {
    filtered.sort((a, b) => (a.discount_price ?? a.price) - (b.discount_price ?? b.price));
  } else if (params.urutan === "termahal") {
    filtered.sort((a, b) => (b.discount_price ?? b.price) - (a.discount_price ?? a.price));
  }

  return {
    products: filtered.slice(0, 5),
    alternatives: alternatives.slice(0, 5),
    alternativeKind,
  };
}

export function executeInfoToko(topik?: string, faqContext: { question: string; answer: string }[] = []) {
  const t = (topik || "").toLowerCase();
  const baseStoreInfo = {
    topik: "semua_info_toko",
    nama_toko: "Next Solution Store",
    kategori_toko: "Spesialis Komputer, Laptop, PC Desktop, Monitor, dan Gadget Resmi",
    alamat: `${DEFAULT_STOREFRONT_SETTINGS.store.address}, ${DEFAULT_STOREFRONT_SETTINGS.store.city}`,
    whatsapp_admin: `+${DEFAULT_STOREFRONT_SETTINGS.store.whatsapp}`,
    email: DEFAULT_STOREFRONT_SETTINGS.store.email,
    jam_operasional: "Senin - Sabtu: 09.00 - 18.00 WIB (Hari Minggu & Libur Nasional toko fisik tutup. Transaksi web aktif 24 jam).",
    cara_pesan: "Pilih produk di katalog web -> Masukkan ke Keranjang -> Buka halaman Checkout -> Masukkan alamat pengiriman atau pilih Ambil di Tempat (Store Pickup) -> Pilih metode pembayaran (Transfer Bank / QRIS) -> Selesaikan transaksi dan simpan nomor pesanan.",
    metode_pembayaran: [
      "Transfer Bank Manual/Virtual Account (BCA, Mandiri, BRI, BNI)",
      "QRIS instan otomatis",
      "Pembayaran tunai atau kartu debit langsung di toko saat Store Pickup",
    ],
    layanan_pengiriman: [
      "Kurir Reguler & Kargo antarkota ke seluruh wilayah Indonesia",
      "Kurir Instant / Same-Day (GoSend / GrabExpress) untuk wilayah terdekat",
      "Standar proteksi: Bubble wrap tebal berlapis, asuransi penuh, dan opsi packing kayu",
    ],
    ambil_di_toko: "Pelanggan dapat memilih opsi Ambil di Tempat (Store Pickup) saat checkout. Cek fisik unit dan konsultasi langsung dengan teknisi toko di cabang Jl. Kartini No. 9 Bandung tanpa biaya kirim.",
    garansi_dan_retur: [
      "100% Original Brand New In Box (BNIB) bergaransi resmi distributor Indonesia (ASUS, Lenovo, Acer, Apple, HP, MSI, dll).",
      "Jaminan toko tukar unit baru 7 hari jika terdapat cacat pabrik.",
      "Klaim komplain wajib menyertakan video unboxing utuh tanpa jeda maksimal 2x24 jam sejak paket tiba.",
    ],
    faq_relevan: faqContext.length ? faqContext : DEFAULT_FAQS.map((f) => ({ question: f.question, answer: f.answer })),
    link_faq_resmi: "/faq",
  };

  if (t.includes("bayar") || t.includes("pembayaran")) {
    return { topik: "pembayaran", metode: baseStoreInfo.metode_pembayaran };
  }
  if (t.includes("kirim") || t.includes("pengiriman") || t.includes("ongkir") || t.includes("kurir")) {
    return { topik: "pengiriman", layanan: baseStoreInfo.layanan_pengiriman };
  }
  if (t.includes("pickup") || t.includes("ambil") || t.includes("cabang")) {
    return { topik: "ambil_di_toko", panduan: baseStoreInfo.ambil_di_toko, alamat: baseStoreInfo.alamat };
  }
  if (t.includes("garansi") || t.includes("retur") || t.includes("komplain")) {
    return { topik: "garansi_dan_retur", kebijakan: baseStoreInfo.garansi_dan_retur };
  }
  if (t.includes("jam") || t.includes("buka") || t.includes("operasional")) {
    return { topik: "jam_operasional", jam: baseStoreInfo.jam_operasional };
  }
  if (t.includes("kontak") || t.includes("wa") || t.includes("admin")) {
    return { topik: "kontak", whatsapp: baseStoreInfo.whatsapp_admin, email: baseStoreInfo.email, alamat: baseStoreInfo.alamat };
  }
  if (t.includes("pesan") || t.includes("cara")) {
    return { topik: "cara_pesan", panduan: baseStoreInfo.cara_pesan };
  }

  return baseStoreInfo;
}

export async function executeCekPesanan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nomorPesananRaw: string,
  emailAtauHpRaw: string,
  sessionUser?: { id: string; email?: string; phone?: string } | null
) {
  const nomorPesanan = (nomorPesananRaw || "").trim().replace(/^#/, "");
  const emailAtauHp = (emailAtauHpRaw || "").trim();

  if (!nomorPesanan) {
    return {
      success: false,
      message: "Nomor pesanan harus dicantumkan untuk melakukan pengecekan.",
    };
  }

  if (!emailAtauHp && !sessionUser) {
    return {
      success: false,
      message: "Demi menjaga privasi dan keamanan data pesanan, mohon sertakan juga email atau nomor HP yang digunakan saat pemesanan.",
    };
  }

  let client: Awaited<ReturnType<typeof createClient>> = supabase;
  try {
    client = getSupabaseAdminClient() as unknown as Awaited<ReturnType<typeof createClient>>;
  } catch {
    client = supabase;
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nomorPesanan);
    let query = client
      .from("orders")
      .select(`
        id,
        user_id,
        order_number,
        status,
        grand_total,
        total_amount,
        shipping_amount,
        discount_amount,
        courier,
        shipping_address,
        created_at,
        updated_at,
        order_items (
          id,
          product_name,
          price,
          quantity,
          variant_details
        ),
        payments (
          payment_method,
          status
        )
      `);

    if (isUuid) {
      query = query.or(`id.eq.${nomorPesanan},order_number.eq.${nomorPesanan}`);
    } else {
      query = query.eq("order_number", nomorPesanan);
    }

    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      return {
        success: false,
        message: "Nomor pesanan tidak ditemukan atau data verifikasi tidak cocok. Mohon periksa kembali nomor pesanan Anda.",
      };
    }

    let accountEmail = "";
    let accountPhone = "";
    if (order.user_id) {
      try {
        const adminClient = getSupabaseAdminClient();
        const { data: userData } = await adminClient.auth.admin.getUserById(order.user_id);
        if (userData?.user?.email) accountEmail = userData.user.email.toLowerCase();
        if (userData?.user?.phone) accountPhone = userData.user.phone;
        const { data: profile } = await adminClient.from("profiles").select("email, phone").eq("id", order.user_id).maybeSingle();
        if (profile?.email) accountEmail = profile.email.toLowerCase();
        if (profile?.phone) accountPhone = profile.phone;
      } catch {
        // Fallback
      }
    }

    const rawAddress = (order.shipping_address && typeof order.shipping_address === "object"
      ? (order.shipping_address as Record<string, unknown>)
      : null);
    const rawSnapshot = (rawAddress?.customer_snapshot && typeof rawAddress.customer_snapshot === "object"
      ? (rawAddress.customer_snapshot as Record<string, unknown>)
      : null);

    const identity = resolveOrderCustomerIdentity({
      shippingAddress: rawAddress,
    });

    const orderEmail = (identity.email || "").toLowerCase();
    const rawSnapshotEmail = (
      (typeof rawSnapshot?.email === "string" ? rawSnapshot.email : "") ||
      (typeof rawAddress?.email === "string" ? rawAddress.email : "")
    ).toLowerCase();

    const orderPhone = normalizePhoneNumber(identity.phone || "");
    const rawSnapshotPhone = normalizePhoneNumber(
      (typeof rawSnapshot?.phone === "string" ? rawSnapshot.phone : "") ||
      (typeof rawAddress?.phone === "string" ? rawAddress.phone : "")
    );
    const normalizedAccountPhone = normalizePhoneNumber(accountPhone);

    let verified = false;

    // 1. Logged in session user match
    if (sessionUser) {
      if (order.user_id && sessionUser.id === order.user_id) {
        verified = true;
      } else if (sessionUser.email && (
        (accountEmail && sessionUser.email.toLowerCase() === accountEmail) ||
        (orderEmail && sessionUser.email.toLowerCase() === orderEmail) ||
        (rawSnapshotEmail && sessionUser.email.toLowerCase() === rawSnapshotEmail)
      )) {
        verified = true;
      }
    }

    // 2. User-provided email or phone verification
    if (emailAtauHp) {
      const isEmailInput = emailAtauHp.includes("@");
      if (isEmailInput) {
        const inputEmail = emailAtauHp.toLowerCase();
        if (
          (accountEmail && accountEmail === inputEmail) ||
          (orderEmail && orderEmail === inputEmail) ||
          (rawSnapshotEmail && rawSnapshotEmail === inputEmail)
        ) {
          verified = true;
        }
      } else {
        const inputPhone = normalizePhoneNumber(emailAtauHp);
        if (
          inputPhone && (
            (normalizedAccountPhone && (normalizedAccountPhone === inputPhone || normalizedAccountPhone.endsWith(inputPhone) || inputPhone.endsWith(normalizedAccountPhone))) ||
            (orderPhone && (orderPhone === inputPhone || orderPhone.endsWith(inputPhone) || inputPhone.endsWith(orderPhone))) ||
            (rawSnapshotPhone && (rawSnapshotPhone === inputPhone || rawSnapshotPhone.endsWith(inputPhone) || inputPhone.endsWith(rawSnapshotPhone)))
          )
        ) {
          verified = true;
        }
      }
    }

    if (!verified) {
      return {
        success: false,
        message: "Nomor pesanan tidak cocok dengan email atau nomor HP yang dimasukkan. Mohon pastikan data yang diberikan sesuai dengan data saat transaksi.",
      };
    }

    const statusMap: Record<string, string> = {
      pending: "Menunggu Pembayaran",
      processing: "Sedang Diproses Toko",
      shipped: "Dalam Pengiriman",
      delivered: "Pesanan Selesai / Terkirim",
      cancelled: "Pesanan Dibatalkan",
    };

    const friendlyStatus = statusMap[order.status] ?? order.status;
    const trackingNumber = typeof rawAddress?.tracking_number === "string"
      ? rawAddress.tracking_number
      : (typeof rawAddress?.resi === "string" ? rawAddress.resi : null);

    let formattedDate = order.created_at;
    try {
      formattedDate = new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(order.created_at));
    } catch {
      // Fallback
    }

    const rawItems = (Array.isArray(order.order_items) ? order.order_items : []) as Array<{
      product_name?: string;
      quantity?: number;
      price?: number;
      variant_details?: unknown;
    }>;
    const itemsSummary = rawItems.map((item) => ({
      nama_produk: item.product_name ?? "Produk",
      kuantitas: item.quantity ?? 1,
      harga: item.price ?? 0,
      varian: item.variant_details ?? null,
    }));

    const paymentList = (Array.isArray(order.payments) ? order.payments : []) as Array<{
      status?: string;
    }>;

    return {
      success: true,
      nomor_pesanan: order.order_number,
      status: friendlyStatus,
      status_kode: order.status,
      tanggal_pesanan: formattedDate,
      kurir: order.courier,
      nomor_resi: trackingNumber,
      total_pembayaran: order.grand_total ?? order.total_amount,
      status_pembayaran: paymentList[0]?.status ?? "menunggu",
      item_pesanan: itemsSummary,
      penerima: identity.name ?? "Pelanggan",
      kota_tujuan: typeof rawAddress?.city === "string" ? rawAddress.city : null,
    };
  } catch (err) {
    console.error("[Cek Pesanan Error]", err);
    return {
      success: false,
      message: "Terjadi kendala teknis saat memeriksa database pesanan. Silakan coba kembali sesaat lagi.",
    };
  }
}

function handleGeminiError(error: unknown, fallbackText: string): { answer: string; aiGenerated: boolean; isRateLimit?: boolean } {
  const err = error as { status?: number; statusCode?: number; message?: string; name?: string };
  const status = err?.status || err?.statusCode;
  const rawMessage = err?.message || String(error);

  console.error("[Gemini Chatbot Error]", {
    name: err?.name,
    status,
    message: rawMessage.replace(/key=[^&\s]+/gi, "key=[REDACTED]").replace(/api[_-]?key[:=]\s*[^\s]+/gi, "api_key=[REDACTED]"),
  });

  const isRateLimited = status === 429 || /429|quota|resource exhausted/i.test(rawMessage);
  const isTimeout = /timeout|timed out|abort/i.test(rawMessage) || /deadline/i.test(rawMessage);

  if (isRateLimited) {
    return {
      answer: "Mohon maaf, antrean chat asisten kami saat ini sedang penuh (mencapai batas kuota sesaat). Silakan coba kembali beberapa menit ke depan, atau hubungi admin WhatsApp toko kami untuk bantuan langsung.",
      aiGenerated: false,
      isRateLimit: true,
    };
  }

  if (isTimeout) {
    return {
      answer: "Koneksi ke asisten AI membutuhkan waktu terlalu lama. Silakan coba kirim kembali pertanyaan Anda.",
      aiGenerated: false,
      isRateLimit: false,
    };
  }

  return { answer: fallbackText, aiGenerated: false, isRateLimit: false };
}

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
  if (criteria.study && products.length > 0) {
    const budgetNote = budget ? ` kisaran budget Rp${budget.toLocaleString("id-ID")}` : "kebutuhan sekolah/kuliah";
    return `Untuk kebutuhan sekolah dan tugas belajar (${budgetNote}), aku prioritaskan laptop yang ringan, baterai awet, dan punya spesifikasi responsif untuk ngetik dan Zoom. Kartu di bawah menampilkan pilihan ready stock terbaik di toko:`;
  }
  if (!criteria.study && (criteria.graphicsQuestion || criteria.graphics || criteria.alternativeRequest || criteria.gaming || criteria.design)) {
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
    ? "Beri tahu jika kamu punya preferensi bobot, multitasking, atau kapasitas penyimpanan."
    : "Beri tahu jika kamu ingin mempersempit pilihan atau membandingkan spesifikasi tertentu.";
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
  const hasDedicated = [...products, ...alternatives].some((p) => getCatalogGraphicsType(p as unknown as AssistantProduct) === "dedicated");
  const graphicsNotice = hasDedicated
    ? "PENTING: Data produk di bawah mencakup laptop dengan GPU DEDICATED (seperti NVIDIA GeForce RTX dari brand ASUS TUF Gaming, Lenovo LOQ/Legion, Acer Nitro, MSI Thin, HP Victus, Axioo Pongo, dll.). JANGAN PERNAH mengatakan toko tidak memiliki unit GPU dedicated. DILARANG BIAS hanya ke satu brand (seperti hanya menyebut LOQ saja padahal ada ASUS TUF atau brand lain di data); rekomendasikan unit yang paling sesuai spesifikasi dan sebutkan alternatif brand yang ada di data terverifikasi."
    : "CATATAN: Jika semua opsi di bawah memakai grafis terintegrasi (karena batasan budget), jelaskan keterbatasannya secara objektif namun jangan menyatakan toko secara umum tidak menjual laptop GPU dedicated.";

  return `Kamu adalah konsultan teknologi dan asisten AI resmi Next Solution Store. Perlakukan chat sebagai dialog konsultasi yang berlanjut: pahami maksud pesan terbaru dari bahasa sehari-hari dan riwayat relevan, akui koreksi pengguna, lalu jawab dengan nada yang natural, ramah, dan tidak berulang.
Saat pengguna meminta rekomendasi atau bertanya tentang kebutuhan VGA untuk software tertentu (seperti Revit atau Adobe Family):
- Jelaskan secara edukatif dan solutif: untuk Revit (3D CAD/BIM arsitektur) dan video editing (Adobe Premiere/After Effects), GPU dedicated (seperti NVIDIA GeForce RTX) sangat disarankan/dibutuhkan agar akselerasi 3D dan render tidak lag.
- Pilih satu kandidat utama yang paling sesuai dengan kebutuhan aktif (prioritaskan unit ber-GPU dedicated jika kebutuhan adalah 3D/Revit/editing/gaming, bandingkan jika ada opsi ASUS TUF, Lenovo LOQ, Acer Nitro, MSI, dll.) dan jelaskan pertimbangan keunggulannya.
${graphicsNotice}
Saat pengguna mencari laptop untuk kuliah, sekolah, atau kerja harian:
- Pilih satu kandidat utama yang paling seimbang (sweet spot) antara performa prosesor (minimal Core i3/i5 atau Ryzen 3/5), kapasitas RAM, portabilitas, dan anggaran aktif, bukan sekadar opsi termurah.
- Berikan perbandingan spesifikasi antar unit yang ready dan berikan saran (suggest) yang cerdas dan edukatif untuk kebutuhan sekolah/kuliah (misal performa ngetik tugas, baterai, portabilitas dibawa tas, dan kemampuan Zoom).
- Jika pengguna menaikkan budget (contoh: dari 5 juta ke 6 jutaan atau lebih), pertahankan use-case sekolah/tugas (JANGAN melompat ke gaming!). Jelaskan opsi apa yang didapat di budget tersebut, bandingkan keunggulannya, dan berikan suggest apakah sebaiknya ambil unit tersebut atau menaikkan budget sedikit ke 7-8 jutaan untuk prosesor Core i3/i5 yang jauh lebih awet dipakai bertahun-tahun.
- Jika pengguna meminta penyesuaian harga atau menyebut budget tertentu, sesuaikan rekomendasinya dengan pilihan terbaik (best value) di kisaran harga tersebut.
Saat pengguna meminta rekomendasi umum, pilih satu kandidat utama yang paling sesuai dengan kebutuhan aktif dan jelaskan singkat alasannya berdasarkan kebutuhan, spesifikasi, tipe produk, dan anggaran. Sebutkan trade-off yang relevan serta maksimal dua alternatif dari data terverifikasi bila memang membantu. Jangan hanya mengulang daftar hasil seperti halaman pencarian. Jika informasi penting belum cukup untuk memilih, ajukan satu pertanyaan klarifikasi yang ringkas.
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
): Promise<{ answer: string; generated: boolean; isRateLimit?: boolean }> {
  try {
    const response = await executeWithFailover({
      systemInstruction: STORE_SYSTEM_INSTRUCTION,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 500,
      temperature: 0.3,
    });
    const selected = conversational
      ? selectConversationalAnswer(response.content, fallback)
      : selectAssistantAnswer(response.content, fallback, candidates, criteria);
    return { ...selected, isRateLimit: false };
  } catch (err) {
    const handled = handleGeminiError(err, fallback);
    return { answer: handled.answer, generated: handled.aiGenerated, isRateLimit: handled.isRateLimit };
  }
}

export function sanitizeChatHistory(
  rawHistory: unknown
): Array<{ role: "user" | "assistant"; text: string; productIds?: string[] }> {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory.slice(-20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as { role?: unknown; text?: unknown; productIds?: unknown };
    if ((entry.role !== "user" && entry.role !== "assistant") || typeof entry.text !== "string") return [];
    const productIds = entry.role === "assistant" && Array.isArray(entry.productIds)
      ? entry.productIds.filter((id): id is string => typeof id === "string").slice(0, 10)
      : undefined;
    return [{ role: entry.role as "user" | "assistant", text: entry.text.trim().slice(0, 500), ...(productIds?.length ? { productIds } : {}) }];
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 32 * 1024) {
    return NextResponse.json({ error: "Payload permintaan terlalu besar (maksimal 32 KB)." }, { status: 413 });
  }
  // 2. Serverless-safe persistent rate limiting per IP (6 requests / 60 seconds)
  const clientIp = getClientIp(request);
  let rateLimit;
  try {
    rateLimit = await checkRateLimit(`recommend:${clientIp}`, 6, 60);
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
      {
        error: "Mohon maaf, antrean chat asisten kami saat ini sedang penuh. Silakan coba kembali beberapa menit ke depan atau hubungi admin WhatsApp toko kami.",
        isRateLimit: true,
      },
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

  let sessionUser: { id: string; email?: string; phone?: string } | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
    const { data: { user } } = await supabase.auth?.getUser?.() ?? { data: { user: null } };
    if (user) {
      sessionUser = { id: user.id, email: user.email, phone: user.phone };
    }
  } catch {
    sessionUser = null;
  }

  let storefrontSettings = DEFAULT_STOREFRONT_SETTINGS;
  try {
    const admin = getSupabaseAdminClient();
    const { data: settingRow } = await admin
      .from("storefront_settings")
      .select("settings")
      .eq("id", "main")
      .maybeSingle();
    if (settingRow?.settings) {
      storefrontSettings = normalizeStorefrontSettings(settingRow.settings);
    }
  } catch {
    storefrontSettings = DEFAULT_STOREFRONT_SETTINGS;
  }

  if (storefrontSettings.features?.ai_recommendation_chat === false) {
    return NextResponse.json({
      answer: `Fitur chatbot AI sedang dinonaktifkan oleh toko. Untuk pertanyaan dan konsultasi produk, silakan hubungi admin kami melalui WhatsApp di +${storefrontSettings.store.whatsapp || DEFAULT_STOREFRONT_SETTINGS.store.whatsapp}.`,
      aiGenerated: false,
      isRateLimit: false,
      products: [],
      alternatives: [],
    });
  }

  const message = body.message.trim().slice(0, 500);
  if (message.length < 2) {
    return NextResponse.json({ error: "Pesan terlalu singkat (minimal 2 karakter)." }, { status: 400 });
  }

  const history = sanitizeChatHistory(body.history);
  const dialogueHistory = history.map(({ role, text }) => ({ role, text }));

  let criteria = getProductCriteria(message, history, BRANDS);
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
    let isRateLimit = false;
    try {
      const response = await executeWithFailover({
        systemInstruction: STORE_SYSTEM_INSTRUCTION,
        messages: [{ role: "user", content: prompt }],
        maxTokens: 500,
        temperature: 0.5,
      });
      const selected = selectConversationalAnswer(response.content, fallback);
      answer = selected.answer;
      aiGenerated = selected.generated;
    } catch (err) {
      const handled = handleGeminiError(err, fallback);
      answer = handled.answer;
      aiGenerated = handled.aiGenerated;
      isRateLimit = Boolean(handled.isRateLimit);
    }
    return NextResponse.json({ answer, aiGenerated, isRateLimit, products: [], alternatives: [] });
  }
  if (criteria.smallTalk || criteria.capabilityQuestion || criteria.needsCategoryClarification) {
    const fallback = fallbackChatReply(message, criteria);
    const prompt = `Kamu adalah Sales AI Assistant Next Solution Store. Balas satu atau dua kalimat dengan bahasa Indonesia yang santai dan profesional.\n` +
      `Jangan membuat klaim tentang produk, harga, stok, atau spesifikasi katalog. Jangan tampilkan kartu produk.\n` +
      `Jika pengguna bertanya kemampuanmu, jelaskan bahwa kamu dapat membantu pencarian/perbandingan katalog, budget, spesifikasi, dan informasi layanan toko.\n` +
      `Jika kategori belum ditentukan, minta satu klarifikasi kategori (laptop, PC, monitor, smartphone, atau aksesori) dan pertahankan budget yang sudah disebut.\n` +
      `Riwayat percakapan: ${JSON.stringify(dialogueHistory)}\nPesan terbaru: ${message}\nKonteks kriteria: ${JSON.stringify(criteria)}`;
    const generated = await generateAssistantAnswer(prompt, fallback, [], criteria, true);
    return NextResponse.json({
      answer: generated.answer,
      aiGenerated: generated.generated,
      isRateLimit: Boolean(generated.isRateLimit),
      products: [],
      alternatives: [],
    });
  }
  if (!supabase) {
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json({ error: catalogUnavailableAnswer(criteria) }, { status: 503 });
    }
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
  criteria = getProductCriteria(message, history, [...new Set([...brands, ...BRANDS])]);
  const wantsProducts = criteria.wantsProducts;
  const categoryIntent = criteria.category;
  const mentionedSeries = criteria.series;
  const effectiveBudget = criteria.budget;
  const graphicsSearch = searchGraphicsProducts(all as AssistantProduct[], criteria, message);
  let products = graphicsSearch.products as Candidate[];
  let alternatives = graphicsSearch.alternatives as Candidate[];
  let alternativeKind = graphicsSearch.alternativeKind;
  let alternativeLabel = getAlternativeLabel(criteria, alternativeKind);

  if (
    (criteria.heavyGraphics || criteria.graphicsQuestion || criteria.requiresDedicatedGpu) &&
    !products.some((p) => getCatalogGraphicsType(p as unknown as AssistantProduct) === "dedicated")
  ) {
    const dedicatedLaptops = rankProducts(
      all as AssistantProduct[],
      { ...criteria, budget: null, brand: null },
      message,
      { graphicsMode: "dedicated" }
    );
    if (dedicatedLaptops.length) {
      if (criteria.budget === null) {
        products = dedicatedLaptops.slice(0, 5) as Candidate[];
      } else if (!alternatives.length) {
        alternatives = dedicatedLaptops.slice(0, 3) as Candidate[];
        alternativeKind = "over-budget-dedicated";
        alternativeLabel = getAlternativeLabel(criteria, alternativeKind);
      }
    }
  }

  const serviceQuestion = !wantsProducts && /daftar|registrasi|register|login|masuk|akun|keranjang|cart|checkout|voucher|kupon|bayar|pembayaran|transfer|pengiriman|kurir|ongkir|pesanan|order|refund|garansi|retur|kebijakan|website|situs|faq/i.test(message);
  const faqRows = serviceQuestion ? await new FAQService().getActiveFAQs() : [];
  const faqContext = faqRows.map((faq) => ({ question: faq.question, answer: faq.answer }));

  if (serviceQuestion) {
    const faq = findRelevantFaq(message, faqContext);
    const fallback = faq
      ? `${faq.answer}\n\nInfo lainnya ada di [Halaman FAQ](/faq).`
      : "Aku belum menemukan panduan yang memastikan informasi itu. Coba cek [Halaman FAQ](/faq) atau hubungi admin WhatsApp Next Solution Store.";

    let answer = fallback;
    let aiGenerated = false;
    let isRateLimit = false;

    try {
      const storeInfoContext = `Informasi Toko Next Solution Store:
- Alamat: ${DEFAULT_STOREFRONT_SETTINGS.store.address}, ${DEFAULT_STOREFRONT_SETTINGS.store.city}
- WhatsApp Admin: +${DEFAULT_STOREFRONT_SETTINGS.store.whatsapp} (atau klik tombol WhatsApp di web)
- Layanan Pembayaran: Transfer Bank (BCA, Mandiri, BRI, BNI), QRIS instan otomatis, dan pembayaran tunai/debit saat ambil di toko cabang.
- Layanan Pengiriman: Kurir reguler, kargo antarkota, dan kurir Instant/Same-Day area lokal dengan bubble wrap tebal, asuransi penuh, dan opsi packing kayu.
- Ambil di Tempat (Store Pickup): Bisa pilih Store Pickup saat checkout, lalu cek fisik unit langsung di cabang toko.
- Garansi & Retur: 100% original BNIB garansi resmi distributor. Garansi toko tukar unit baru bila ada cacat pabrik (wajib sertakan video unboxing utuh 2x24 jam).
- Halaman FAQ resmi website: [Halaman FAQ](/faq)`;

      const servicePrompt = `Kamu adalah asisten toko resmi AI Next Solution Store.
Pertanyaan pengguna seputar layanan atau operasional toko: "${message}"
${sessionUser?.email ? `\nStatus Akun Pengguna: Sedang LOGIN dengan email ${sessionUser.email}. Jika pengguna mengecek pesanan, kamu dapat langsung memanggil tool 'cek_pesanan' dengan nomor_pesanan dan email_atau_hp: "${sessionUser.email}" tanpa perlu menanyakan email atau nomor HP lagi!` : ""}

Gunakan konteks informasi toko dan FAQ resmi berikut untuk menjawab:
${storeInfoContext}

Daftar FAQ relevan:
${JSON.stringify(faqContext.length ? faqContext : DEFAULT_FAQS)}

Instruksi balasan:
1. Jawablah langsung, santai, ramah, dan solutif dalam 1-3 kalimat bahasa Indonesia.
2. Gunakan fakta dari data di atas saja, jangan mengarang kebijakan baru.
3. Bila relevan, arahkan ke [Halaman FAQ](/faq) atau kontak WhatsApp admin toko.`;

      const currentMessages: ChatMessage[] = [
        { role: "user", content: servicePrompt },
      ];

      let toolLoop = 0;
      while (toolLoop < 2) {
        const response = await executeWithFailover({
          systemInstruction: STORE_SYSTEM_INSTRUCTION,
          messages: currentMessages,
          tools: OPENAI_TOOLS,
          maxTokens: 500,
          temperature: 0.3,
        });

        const toolCalls = response.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
          const selected = selectConversationalAnswer(response.content, fallback);
          answer = selected.answer;
          aiGenerated = selected.generated;
          break;
        }

        toolLoop++;
        currentMessages.push({
          role: "assistant",
          content: response.content,
          tool_calls: toolCalls,
        });

        for (const call of toolCalls) {
          let callArgs: Record<string, unknown> = {};
          try {
            callArgs = JSON.parse(call.function.arguments || "{}");
          } catch {
            callArgs = {};
          }

          if (call.function.name === "cek_pesanan") {
            const rawEmailOrHp = typeof callArgs.email_atau_hp === "string" ? callArgs.email_atau_hp.trim() : "";
            const verifiedEmailOrHp = rawEmailOrHp || (sessionUser?.email ?? "");
            const res = await executeCekPesanan(
              supabase,
              typeof callArgs.nomor_pesanan === "string" ? callArgs.nomor_pesanan : "",
              verifiedEmailOrHp,
              sessionUser
            );
            currentMessages.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify(res),
            });
          } else if (call.function.name === "info_toko") {
            const res = executeInfoToko(typeof callArgs.topik === "string" ? callArgs.topik : undefined, faqContext);
            currentMessages.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify(res),
            });
          } else if (call.function.name === "cari_produk" || call.function.name === "search_catalog_products") {
            const res = executeCariProduk(all, callArgs, criteria);
            products = res.products;
            currentMessages.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify({
                total_ditemukan: res.products.length,
                products: res.products.map((p) => toVerifiedCatalogRecord(p, criteria)),
              }),
            });
          } else {
            currentMessages.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify({ error: `Tool ${call.function.name} tidak dikenali.` }),
            });
          }
        }

        const finalRes = await executeWithFailover({
          systemInstruction: STORE_SYSTEM_INSTRUCTION,
          messages: currentMessages,
          maxTokens: 500,
          temperature: 0.3,
        });

        const selected = selectConversationalAnswer(finalRes.content, fallback);
        answer = selected.answer;
        aiGenerated = selected.generated;
        break;
      }
    } catch (err) {
      const handled = handleGeminiError(err, fallback);
      answer = handled.answer;
      aiGenerated = handled.aiGenerated;
      isRateLimit = Boolean(handled.isRateLimit);
    }

    return NextResponse.json({
      answer,
      aiGenerated,
      isRateLimit,
      products: products.map((product) => toChatProduct(product, criteria)),
      alternatives: [],
    });
  }

  let answer = wantsProducts
    ? fallbackAnswer(message, products, effectiveBudget, categoryIntent, mentionedSeries, criteria.minBudget, criteria, alternativeKind, alternatives)
    : fallbackChatReply(message, criteria);
  let aiGenerated = false;
  let isRateLimit = false;

  if (wantsProducts) {
    const prompt = buildProductPrompt(message, dialogueHistory, criteria, products, alternatives, alternativeKind, faqContext);

    try {
      const currentMessages: ChatMessage[] = [
        { role: "user", content: prompt },
      ];

      let toolLoop = 0;
      while (toolLoop < 2) {
        const response = await executeWithFailover({
          systemInstruction: STORE_SYSTEM_INSTRUCTION,
          messages: currentMessages,
          tools: OPENAI_TOOLS,
          maxTokens: 500,
          temperature: 0.3,
        });

        const toolCalls = response.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
          const selected = selectAssistantAnswer(response.content, answer, products.length ? products : alternatives, criteria);
          if (selected.generated) {
            answer = selected.answer;
            aiGenerated = true;
          }
          break;
        }

        toolLoop++;
        currentMessages.push({
          role: "assistant",
          content: response.content,
          tool_calls: toolCalls,
        });

        let isLegacyTestCall = false;
        for (const call of toolCalls) {
          let callArgs: Record<string, unknown> = {};
          try {
            callArgs = JSON.parse(call.function.arguments || "{}");
          } catch {
            callArgs = {};
          }

          if (call.function.name === "search_catalog_products") {
            isLegacyTestCall = true;
            const query = typeof callArgs.query === "string" ? callArgs.query.trim().slice(0, 100) : "";
            const verified = searchGraphicsProducts(all as AssistantProduct[], criteria, query);
            products = verified.products as Candidate[];
            alternatives = verified.alternatives as Candidate[];
            alternativeKind = verified.alternativeKind;
            alternativeLabel = getAlternativeLabel(criteria, alternativeKind);
            answer = fallbackAnswer(message, products, criteria.budget, criteria.category, criteria.series, criteria.minBudget, criteria, alternativeKind, alternatives);

            currentMessages.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify({
                products: products.map((product) => toVerifiedCatalogRecord(product, criteria)),
                alternatives: alternatives.map((product) => toVerifiedCatalogRecord(product, criteria)),
                alternativeLabel,
              }),
            });
          } else if (call.function.name === "cari_produk") {
            const res = executeCariProduk(all, {
              kata_kunci: typeof callArgs.kata_kunci === "string" ? callArgs.kata_kunci : undefined,
              kategori: typeof callArgs.kategori === "string" ? callArgs.kategori : undefined,
              brand: typeof callArgs.brand === "string" ? callArgs.brand : undefined,
              rentang_harga: callArgs.rentang_harga && typeof callArgs.rentang_harga === "object"
                ? (callArgs.rentang_harga as { min?: number; max?: number })
                : undefined,
              urutan: typeof callArgs.urutan === "string" ? callArgs.urutan : undefined,
            }, criteria);
            products = res.products;
            alternatives = res.alternatives;
            alternativeKind = res.alternativeKind;
            alternativeLabel = getAlternativeLabel(criteria, alternativeKind);
            answer = fallbackAnswer(message, products, criteria.budget, criteria.category, criteria.series, criteria.minBudget, criteria, alternativeKind, alternatives);

            currentMessages.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify({
                total_ditemukan: products.length,
                products: products.map((product) => toVerifiedCatalogRecord(product, criteria)),
                alternatives: alternatives.map((product) => toVerifiedCatalogRecord(product, criteria)),
                alternativeLabel,
              }),
            });
          } else if (call.function.name === "info_toko") {
            const res = executeInfoToko(typeof callArgs.topik === "string" ? callArgs.topik : undefined, faqContext);
            currentMessages.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify(res),
            });
          } else if (call.function.name === "cek_pesanan") {
            const rawEmailOrHp = typeof callArgs.email_atau_hp === "string" ? callArgs.email_atau_hp.trim() : "";
            const verifiedEmailOrHp = rawEmailOrHp || (sessionUser?.email ?? "");
            const res = await executeCekPesanan(
              supabase,
              typeof callArgs.nomor_pesanan === "string" ? callArgs.nomor_pesanan : "",
              verifiedEmailOrHp,
              sessionUser
            );
            currentMessages.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify(res),
            });
          } else {
            currentMessages.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: JSON.stringify({ error: `Tool ${call.function.name} tidak dikenali.` }),
            });
          }
        }

        const finalRes = await executeWithFailover({
          systemInstruction: STORE_SYSTEM_INSTRUCTION,
          messages: currentMessages,
          tools: isLegacyTestCall || toolLoop >= 2 ? undefined : OPENAI_TOOLS,
          maxTokens: 500,
          temperature: 0.3,
        });

        const selected = selectAssistantAnswer(finalRes.content, answer, products.length ? products : alternatives, criteria);
        if (selected.generated) {
          answer = selected.answer;
          aiGenerated = true;
        }
        break;
      }
    } catch (err) {
      const handled = handleGeminiError(err, answer);
      answer = handled.answer;
      aiGenerated = handled.aiGenerated;
      isRateLimit = Boolean(handled.isRateLimit);
    }
  }
  return NextResponse.json({
    answer,
    aiGenerated,
    isRateLimit,
    products: products.map((product) => toChatProduct(product, criteria)),
    alternatives: alternatives.map((product) => toChatProduct(product, criteria)),
    alternativeLabel,
  });
}
