export interface DefaultFaqItem {
  question: string;
  answer: string;
  category?: string;
  display_order: number;
  is_active: boolean;
}

export const DEFAULT_FAQS: DefaultFaqItem[] = [
  {
    question: "Apakah semua produk di Next Solution dijamin 100% original dan bergaransi resmi?",
    answer: "Ya, seluruh produk laptop, PC, dan aksesoris di Next Solution dijamin 100% original, baru (Brand New In Box / BNIB), serta dilengkapi garansi resmi dari distributor/prinsipal brand di Indonesia (seperti ASUS, Lenovo, Apple, HP, Acer, Dell, dll). Anda dapat langsung mengecek keaslian dan status garansi ke service center resmi masing-masing brand.",
    category: "Produk & Garansi",
    display_order: 1,
    is_active: true,
  },
  {
    question: "Metode pengiriman apa saja yang tersedia dan bagaimana keamanannya?",
    answer: "Kami melayani pengiriman reguler, kargo antarkota, dan kurir Instant/Same-Day untuk area terdekat. Setiap pengiriman produk elektronik dipacking secara standar aman dengan bubble wrap tebal berlapis, proteksi asuransi penuh, dan opsi packing kayu untuk pengiriman jarak jauh ke seluruh Indonesia.",
    category: "Pengiriman",
    display_order: 2,
    is_active: true,
  },
  {
    question: "Apakah pesanan bisa diambil langsung di cabang toko Next Solution?",
    answer: "Tentu bisa. Anda dapat memilih metode Ambil di Tempat (Store Pickup) saat checkout. Setelah pesanan dikonfirmasi siap, Anda cukup datang ke cabang Next Solution yang dipilih untuk mengambil dan melakukan pengecekan fisik unit bersama tim teknisi kami.",
    category: "Pengambilan",
    display_order: 3,
    is_active: true,
  },
  {
    question: "Metode pembayaran apa saja yang diterima?",
    answer: "Kami menerima Transfer Bank (BCA, Mandiri, BRI, BNI), QRIS instan otomatis, pembayaran tunai/debit saat ambil di toko cabang, serta konfirmasi pemesanan cepat via WhatsApp resmi Next Solution.",
    category: "Pembayaran",
    display_order: 4,
    is_active: true,
  },
  {
    question: "Bagaimana jika produk yang saya terima mengalami kendala atau kerusakan saat pengiriman?",
    answer: "Semua pengiriman kami dilindungi garansi proteksi pengiriman dan jaminan retur/tukar unit apabila terdapat cacat pabrik (wajib menyertakan video unboxing tanpa jeda maksimal 2x24 jam sejak barang tiba). Tim Customer Service kami siap memandu proses solusi hingga tuntas.",
    category: "Layanan Purna Jual",
    display_order: 5,
    is_active: true,
  },
  {
    question: "Apakah saya bisa konsultasi spesifikasi sebelum membeli laptop atau PC?",
    answer: "Sangat bisa! Anda dapat menggunakan fitur Asisten AI Pintar di website kami untuk rekomendasi spesifikasi instan, atau hubungi CS kami via WhatsApp. Kami siap membantu merekomendasikan perangkat yang paling cocok sesuai kebutuhan kerja, sekolah, desain grafis, maupun gaming.",
    category: "Konsultasi",
    display_order: 6,
    is_active: true,
  },
];

