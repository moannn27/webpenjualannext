export interface LegalSection {
  id: string;
  title: string;
  content: string;
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  last_updated: string;
  effective_domain: string;
  sections: LegalSection[];
}

export const DEFAULT_TERMS_CONTENT: LegalDocument = {
  title: "Syarat & Ketentuan (Terms & Conditions)",
  subtitle:
    "Selamat datang di Next Solution Store (https://nextsolution.web.id). Syarat & Ketentuan ini mengatur penggunaan situs web, pembuatan akun, pemesanan produk komputer dan laptop, metode pembayaran, pengiriman, serta klaim garansi di toko kami. Dengan mengakses atau berbelanja di situs ini, Anda menyetujui seluruh ketentuan di bawah ini.",
  last_updated: "28 Oktober 2026",
  effective_domain: "https://nextsolution.web.id",
  sections: [
    {
      id: "terms-1",
      title: "1. Pendaftaran Akun dan Autentikasi Pengguna",
      content: `• **Pilihan Pendaftaran**: Anda dapat membuat akun menggunakan email dan kata sandi mandiri, atau menggunakan fitur login cepat satu-klik dengan Akun Google (Google Identity Services).
• **Keakuratan Informasi**: Anda wajib memberikan data kontak yang benar dan aktif (nama lengkap, alamat email, dan nomor WhatsApp/telepon) guna kelancaran konfirmasi transaksi dan pengiriman pesanan.
• **Keamanan Akun**: Anda bertanggung jawab penuh untuk menjaga kerahasiaan kredensial akun Anda. Segera hubungi tim dukungan kami jika mencurigai adanya akses tidak sah terhadap akun Anda.
• **Hak Penghentian Layanan**: Kami berhak menonaktifkan atau membatasi akses akun yang terbukti melakukan tindakan kecurangan, manipulasi promo, atau pelanggaran hukum yang berlaku.`,
    },
    {
      id: "terms-2",
      title: "2. Informasi Produk, Spesifikasi, Varian, dan Harga",
      content: `• **Keaslian Produk**: Seluruh unit laptop dan perangkat teknologi yang dijual di Next Solution Store adalah 100% produk baru, original, dan bergaransi resmi distributor Indonesia.
• **Spesifikasi & Varian**: Rincian spesifikasi teknis (prosesor, RAM, penyimpanan SSD, grafis, layar, serta pilihan varian warna) dicantumkan pada setiap halaman produk. Mohon memeriksa kesesuaian varian sebelum melanjutkan proses pembayaran.
• **Mata Uang & Harga Efektif**: Seluruh harga tercantum dalam mata uang Rupiah (IDR). Kami berupaya memastikan akurasi harga dan ketersediaan stok secara real-time. Jika terjadi kesalahan sistematis yang nyata pada pencantuman harga atau stok, kami akan menghubungi Anda terlebih dahulu untuk konfirmasi pembatalan atau penyesuaian pesanan.`,
    },
    {
      id: "terms-3",
      title: "3. Alur Pemesanan dan Metode Pembayaran",
      content: `Pesanan dibuat melalui proses checkout keranjang belanja di website. Metode pembayaran resmi yang didukung meliputi:
• **Transfer Bank**: Rekening resmi BCA, Mandiri, BRI, atau BNI atas nama toko. Pelanggan mengunggah bukti transfer yang valid melalui website untuk diverifikasi oleh admin.
• **QRIS (All Payment)**: Pembayaran instan melalui pemindaian kode QRIS resmi dengan verifikasi status pembayaran otomatis/manual.
• **Bayar Tunai di Kasir / Gerai Toko**: Pembayaran tunai saat unit diambil langsung di gerai fisik Next Solution (khusus opsi Ambil Sendiri di Gerai Toko).
• **Status Pesanan**: Status transaksi dapat dipantau real-time pada menu Akun / Pesanan: *Menunggu Pembayaran*, *Diproses (Packing & QC)*, *Siap Diambil / Dikirim*, *Selesai*, atau *Dibatalkan*.`,
    },
    {
      id: "terms-4",
      title: "4. Pengiriman Kurir dan Pengambilan Mandiri di Gerai Toko",
      content: `• **Ambil Sendiri di Gerai Toko (Pickup)**: Anda dapat memilih gerai toko Next Solution yang tersedia (misalnya gerai Bandung di Jl. Kartini No. 9 atau Jl. Pajajaran No. 42). Saat mengambil pesanan, mohon tunjukkan nomor faktur/pesanan dan kartu identitas pemesan. Tidak dikenakan ongkos kirim untuk opsi ini.
• **Pengiriman ke Alamat (Delivery)**: Pesanan dikemas secara aman dengan bubble wrap tebal dan opsi packing kayu jika diperlukan. Pengiriman diserahkan kepada jasa ekspedisi resmi terpercaya. Estimasi waktu tiba mengikuti jadwal operasional kurir pengiriman.`,
    },
    {
      id: "terms-5",
      title: "5. Ketentuan Garansi Resmi dan Kebijakan Ganti Baru Toko",
      content: `• **Garansi Resmi Distributor**: Seluruh unit laptop dilindungi garansi resmi dari distributor/prinsipal resmi di Indonesia (antara 1 hingga 3 tahun tergantung merek dan model). Klaim perbaikan dapat dilakukan di seluruh service center resmi brand tersebut di Indonesia.
• **Garansi Toko 14 Hari Ganti Unit Baru**: Next Solution memberikan jaminan perlindungan ekstra berupa penggantian unit baru dalam waktu 14 hari kalender sejak tanggal penerimaan apabila produk mengalami kendala cacat produksi pabrik (*factory defect* / cacat pabrik).
• **Syarat Mutlak Klaim Cacat Pabrik**:
  1. Segel unit, segel toko, dan segel distributor dalam kondisi utuh dan tidak rusak.
  2. Wajib menyertakan nota / faktur penjualan resmi dari Next Solution Store.
  3. **Wajib menyertakan video unboxing lengkap tanpa jeda (cut/pause/edit)** mulai dari paket masih terbungkus rapat hingga unit dihidupkan pertama kali.
  4. Kelengkapan kotak, kartu garansi, manual, dan adaptor charger lengkap dalam kondisi mulus.
• **Pengecualian Garansi**: Garansi tidak mencakup kerusakan akibat kelalaian fisik pengguna (jatuh, retak/pecah, terkena cairan, bencana alam, korsleting akibat instalasi listrik rumah yang tidak stabil, atau modifikasi software/hardware yang melanggar ketentuan pabrik).
• **Pengembalian Stok Otomatis**: Jika pesanan dibatalkan atau refund disetujui secara resmi oleh tim admin, stok unit yang bersangkutan akan dikembalikan ke inventaris toko secara otomatis oleh sistem.`,
    },
    {
      id: "terms-6",
      title: "6. Penggunaan Voucher Diskon dan Kode Promo",
      content: `• Kode voucher promosi hanya dapat diterapkan pada transaksi yang memenuhi syarat ketentuan minimum belanja dan kategori produk yang ditentukan.
• Setiap voucher memiliki batas kuota pemakaian dan masa berlaku aktif. Voucher tidak dapat ditukarkan dengan uang tunai.
• Jika pesanan yang menggunakan voucher dibatalkan karena kelalaian pembeli, kuota voucher yang sudah terpakai tidak dapat dikembalikan secara otomatis.`,
    },
    {
      id: "terms-7",
      title: "7. Hak Kekayaan Intelektual dan Penggunaan yang Dilarang",
      content: `Seluruh merek dagang, logo brand Next Solution, materi gambar katalog, desain antarmuka, dan kode sumber website adalah hak kekayaan intelektual milik Next Solution Store atau pemegang lisensi resmi kami. Pengguna dilarang keras untuk:
• Menyalin, menduplikasi, atau menyebarluaskan aset visual dan konten katalog untuk kepentingan komersial tanpa izin tertulis.
• Melakukan tindakan pengujian celah keamanan tanpa izin, serangan Denial of Service (DoS), atau scraping data secara agresif.
• Mengunggah file berbahaya, virus, atau bukti transaksi palsu pada sistem pembayaran kami.`,
    },
    {
      id: "terms-8",
      title: "8. Hubungi Kami untuk Bantuan Transaksi & Layanan",
      content: `Tim dukungan Next Solution siap membantu Anda jika memiliki pertanyaan mengenai pemesanan, konfirmasi faktur, pengambilan gerai, atau bantuan klaim garansi:
• **WhatsApp & Telepon**: +62 811-2238-310 (https://wa.me/628112238310)
• **Email Dukungan Pelanggan**: support@nextsolution.id (mailto:support@nextsolution.id)
• **Gerai Toko Resmi**: Jl. Kartini No. 9, Bandung / Jl. Pajajaran No. 42, Kota Bandung, Jawa Barat
• **Jam Layanan Operasional**: Senin – Sabtu: 09.00 – 18.00 WIB`,
    },
  ],
};

export const DEFAULT_PRIVACY_CONTENT: LegalDocument = {
  title: "Kebijakan Privasi (Privacy Policy)",
  subtitle:
    "Next Solution Store berkomitmen untuk melindungi privasi dan keamanan data pribadi pelanggan kami. Halaman ini menjelaskan secara transparan data apa saja yang kami kumpulkan, bagaimana data tersebut digunakan untuk mendukung layanan belanja, transaksi, dan akun Anda, serta hak-hak yang Anda miliki.",
  last_updated: "28 Oktober 2026",
  effective_domain: "https://nextsolution.web.id",
  sections: [
    {
      id: "privacy-1",
      title: "1. Informasi Akun dan Autentikasi Google (Google Identity Services)",
      content: `Ketika Anda membuat akun atau masuk ke situs Next Solution Store, kami mengumpulkan data autentikasi berikut:
• **Login dengan Akun Google**: Melalui Google Identity Services (GIS) / Google Sign-In, kami hanya menerima data profil publik dasar yang Anda izinkan, yaitu: nama lengkap, alamat email terverifikasi, foto profil (avatar), dan identifier akun Google unik (Google user ID).
• **Tidak Mengakses Password Google**: Kami tidak pernah meminta, melihat, atau menyimpan kata sandi akun Google Anda. Proses autentikasi Google ditangani secara aman oleh Google Identity Services dan diverifikasi oleh Supabase Auth.
• **Pendaftaran Manual (Email & Kata Sandi)**: Jika mendaftar langsung, kami mencatat nama lengkap, alamat email, nomor telepon/WhatsApp Indonesia yang valid, dan kata sandi yang telah di-hash secara kriptografis (kami tidak menyimpan kata sandi dalam teks biasa).
• **Sesi & Cookies Autentikasi**: Kami menggunakan cookie sesi first-party (HTTP-only dan aman) agar sesi login Anda tetap aktif saat berpindah halaman dan tidak perlu login berulang kali.`,
    },
    {
      id: "privacy-2",
      title: "2. Data Transaksi, Pemesanan, dan Pengiriman",
      content: `Untuk memproses pesanan belanja perangkat komputer, laptop, dan aksesori di toko kami, kami mengumpulkan data operasional yang diperlukan:
• **Informasi Kontak & Penerima**: Nama penerima, nomor WhatsApp/telepon aktif, serta alamat tujuan pengiriman lengkap (untuk opsi pengiriman kurir) atau penentuan gerai toko yang dipilih (untuk opsi Ambil Sendiri di Gerai Toko).
• **Metode & Verifikasi Pembayaran**: Kami mencatat metode transaksi yang Anda pilih (Transfer Bank BCA, Mandiri, BRI, BNI, QRIS, atau Bayar Tunai di Kasir / Gerai Toko). Untuk metode transfer, Anda dapat mengunggah foto struk/bukti transfer yang diverifikasi oleh tim admin kami. Kami tidak mengumpulkan atau menyimpan kredensial kartu debit/kredit Anda.
• **Riwayat Pesanan & Faktur Penjualan**: Nomor faktur, rincian produk (SKU, varian spesifikasi, kuantitas), harga satuan, diskon voucher promo, catatan garansi, serta status transaksi (menunggu pembayaran, diproses, selesai, dibatalkan, atau direfund).`,
    },
    {
      id: "privacy-3",
      title: "3. Aktivitas Website dan Analitik First-Party",
      content: `Untuk memahami kebutuhan pelanggan dan meningkatkan kenyamanan berbelanja, sistem kami mencatat metrik analitik internal:
• **Event Interaksi Belanja**: Melacak kunjungan halaman (page_view), produk yang dilihat (view_item), kata kunci pencarian katalog (search), penambahan ke keranjang (add_to_cart), inisiasi checkout (begin_checkout), dan interaksi rekomendasi produk AI (ai_recommendation_click).
• **Data Teknis Pseudonim**: Pengenal acak pengunjung (visitor_id) dan sesi belanja (session_id), kategori perangkat (mobile, desktop, atau tablet), domain perujuk (referrer), serta parameter kampanye iklan (UTM Source/Medium).
• **Bebas Pelacak Pihak Ketiga**: Sistem analitik ini berjalan secara first-party pada basis data kami sendiri. Kami tidak menanamkan script pelacak pihak ketiga lintas situs (seperti Facebook Pixel atau data broker). Data analitik disimpan secara pseudonim dan semata-mata digunakan untuk evaluasi performa toko Next Solution.`,
    },
    {
      id: "privacy-4",
      title: "4. Asisten Rekomendasi Belanja AI",
      content: `Next Solution menyediakan fitur jendela obrolan pintar Asisten AI untuk membantu Anda menemukan laptop atau gadget sesuai kebutuhan (misalnya kriteria spesifikasi, gaming, kebutuhan kantor, atau rentang budget):
• **Pemrosesan Percakapan**: Pesan pertanyaan yang Anda ketikkan dalam jendela chat dikirimkan melalui server kami ke penyedia Large Language Model (Google Gemini API atau Groq API) bersama konteks katalog produk resmi toko kami.
• **Privasi Percakapan**: Percakapan ini diproses sesuai kebijakan pemrosesan data penyedia API terkait. Kami mengimbau pelanggan untuk tidak membagikan informasi pribadi yang bersifat rahasia (seperti nomor PIN, rekening bank, atau kata sandi) ke dalam obrolan asisten AI.`,
    },
    {
      id: "privacy-5",
      title: "5. Penyimpanan Data dan Pihak Ketiga yang Terlibat",
      content: `Kami hanya membagikan data Anda kepada pihak ketiga tepercaya sejauh yang diperlukan untuk menjalankan operasional toko:
• **Supabase Inc.**: Infrastruktur basis data cloud terenkripsi, penyimpanan sesi login, dan hosting file media (foto produk dan bukti transfer).
• **Google LLC (Google Identity Services)**: Penyedia layanan otentikasi masuk satu-klik Google Sign-In.
• **Penyedia Eksternal AI (Google Gemini & Groq)**: Pemrosesan kueri pencarian dan konsultasi produk pada chatbot.
• **Jasa Ekspedisi / Kurir Pengantaran**: Nama penerima, alamat pengiriman, dan nomor telepon diserahkan kepada kurir pengiriman resmi hanya untuk tujuan mengantarkan pesanan fisik ke alamat Anda.
• **Tidak Memperjualbelikan Data**: Kami tidak pernah dan tidak akan pernah menjual, menyewakan, atau memperdagangkan data pribadi pelanggan kepada pihak pengiklan atau pihak ketiga lainnya.`,
    },
    {
      id: "privacy-6",
      title: "6. Keamanan Data, Masa Simpan, dan Hak Anda",
      content: `• **Keamanan Teknis**: Seluruh lalu lintas data di situs kami dilindungi dengan enkripsi HTTPS / SSL tingkat industri. Akses basis data internal dilindungi dengan Row Level Security (RLS) bertingkat.
• **Retensi Data**: Informasi akun dan transaksi disimpan selama akun Anda aktif atau selama diperlukan untuk kepentingan administrasi garansi resmi distributor dan bukti perpajakan penjualan.
• **Hak Koreksi dan Penghapusan Akun**: Anda berhak melihat rincian akun Anda, memperbarui nomor kontak atau alamat melalui menu Profil, atau mengajukan permohonan penutupan akun beserta penghapusan data dengan menghubungi tim dukungan kami.`,
    },
    {
      id: "privacy-7",
      title: "7. Privasi Anak dan Perubahan Kebijakan",
      content: `Layanan Next Solution Store ditujukan untuk individu yang telah berusia minimal 18 tahun atau yang melakukan transaksi dengan persetujuan dan pengawasan orang tua/wali sah. Kami berhak memperbarui Kebijakan Privasi ini dari waktu ke waktu seiring penyempurnaan fitur website. Setiap pembaruan materiil akan dicantumkan tanggal revisinya pada bagian atas halaman ini.`,
    },
    {
      id: "privacy-8",
      title: "8. Saluran Kontak Resmi Next Solution Store",
      content: `Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, penggunaan data Google, permohonan pembaruan data, atau klaim transaksi, silakan hubungi kami melalui saluran resmi berikut:
• **Email Dukungan Pelanggan**: support@nextsolution.id (mailto:support@nextsolution.id)
• **WhatsApp & Telepon**: +62 811-2238-310 (https://wa.me/628112238310)
• **Alamat Gerai Toko Fisik**: Jl. Kartini No. 9, Bandung / Jl. Pajajaran No. 42, Kota Bandung, Jawa Barat
• **Jam Operasional Layanan**: Senin – Sabtu: 09.00 – 18.00 WIB`,
    },
  ],
};

export function normalizeLegalDocument(
  input: unknown,
  fallback: LegalDocument
): LegalDocument {
  if (!input || typeof input !== "object") return fallback;
  const doc = input as Partial<LegalDocument>;

  const title = typeof doc.title === "string" && doc.title.trim() ? doc.title.trim() : fallback.title;
  const subtitle = typeof doc.subtitle === "string" ? doc.subtitle.trim() : fallback.subtitle;
  const last_updated = typeof doc.last_updated === "string" && doc.last_updated.trim() ? doc.last_updated.trim() : fallback.last_updated;
  const effective_domain = typeof doc.effective_domain === "string" && doc.effective_domain.trim() ? doc.effective_domain.trim() : fallback.effective_domain;

  let sections: LegalSection[] = [];
  if (Array.isArray(doc.sections) && doc.sections.length > 0) {
    sections = doc.sections
      .filter((sec) => sec && typeof sec === "object" && typeof sec.title === "string" && sec.title.trim())
      .map((sec, idx) => ({
        id: String(sec.id || `section-${idx + 1}`).trim(),
        title: String(sec.title).trim(),
        content: String(sec.content || "").trim(),
      }));
  }

  if (sections.length === 0) {
    sections = fallback.sections;
  }

  return {
    title,
    subtitle,
    last_updated,
    effective_domain,
    sections,
  };
}

