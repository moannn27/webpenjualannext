# Dokumentasi Pembaruan Sistem Next Solution E-Commerce

Dokumen ini mencatat seluruh pembaruan fitur, perbaikan bug logika, optimasi antarmuka pengguna (UI/UX), serta penambahan fungsionalitas di Admin Panel, AI Chatbot Rekomendasi, dan Storefront.

---

## 1. Pembaruan Logika AI Chat Rekomendasi (`app/api/recommend/route.ts`)

### Masalah yang Ditemukan
* **Pencampuran Kategori Produk**: Ketika pengguna mencari *"laptop dibawah 8jtan"*, sistem sebelumnya juga menyertakan produk monitor Lenovo Legion karena harganya masuk akal dan filter kategori belum membatasi secara ketat.
* **Stale Budget Filter (Budget Lama Mengunci Obrolan)**: Saat pengguna berganti topik atau menanyakan lini premium seperti *"itu ada tuh yoga bang, kan itu premium, zenbook juga ada"*, batas harga $\le$ 8 juta dari pertanyaan pertama tetap terbawa dari context riwayat. Akibatnya, Lenovo Yoga (Rp 20–29 juta) dan ASUS Zenbook (Rp 37 juta) tereliminasi dari pencarian, lalu AI keliru mengklaim bahwa toko tidak memiliki produk tersebut.
* **Status Produk Pasca Import**: Unit ASUS Zenbook 14 dengan stok 2 unit sebelumnya tertinggal dalam status `draft`.

### Implementasi Solusi
1. **Filter Kategori Ketat & Pengenalan Seri Laptop Resmi (`KNOWN_SERIES`)**:
   * Sistem mengenali seri: `yoga`, `zenbook`, `vivobook`, `ideapad`, `thinkpad`, `macbook`, `zephyrus`, `legion`, `loq`, `aspire`, `soulmate`, `nitro`, `tuf`, `rog`.
   * Memastikan kategori lain (monitor, desktop, aksesoris) ditolak ketika intent pengguna adalah laptop.
2. **Intent Laptop Premium (`isPremiumIntent`)**:
   * Mengenali frasa: `premium`, `flagship`, `high-end`, `mewah`, `kelas atas`, `spek dewa`, `spek tinggi`, `ultrabook`.
   * Otomatis memprioritaskan lini flagship: **Lenovo Yoga**, **ASUS Zenbook**, **Apple MacBook Pro**, dan **ROG Zephyrus**.
3. **Reset Budget Otomatis**:
   * Batasan budget dari pesan terdahulu otomatis dilepas saat pengguna menanyakan seri premium atau beralih topik.
   * Jika filter budget warisan menghasilkan 0 produk pada seri yang dicari pengguna, batasan lama tersebut diabaikan agar katalog asli toko tetap dapat ditampilkan.
4. **Instruksi Khusus untuk Google Gemini**:
   * AI memahami klasifikasi laptop (*Budget* $\le$ 10jt, *Mainstream* 10–18jt, *Premium* $\ge$ 18jt).
   * Dilarang menyatakan toko tidak menjual brand/seri resmi yang ready stock di katalog.
5. **Aktivasi Stok**: Seluruh unit ASUS Zenbook dan Lenovo Yoga yang memiliki stok $>0$ telah dipublikasikan (`published`).

---

## 2. Peningkatan Fitur Chatbot Interaktif (`features/chat/RecommendationChat.tsx`)

1. **Jendela Chat Resizable / Expandable ("Bisa di Gede-Kecilin")**:
   * Tombol toggle **Maximize / Minimize** (`Maximize2` / `Minimize2`) di header chat.
   * Ukuran normal: `w-[410px] h-[650px]`.
   * Ukuran ekspansi: `w-[700px] h-[780px]`.
   * Dalam mode lebar, kartu rekomendasi produk tertata rapi dalam grid 2 kolom lengkap dengan foto produk, spesifikasi singkat, stok, dan harga resmi.
2. **Kotak Bantuan Admin WhatsApp Bisa Dibuka-Tutup**:
   * Dilengkapi tombol **"Tutup"** untuk meminimalkan card WhatsApp menjadi pil ringkas *"Tanya Admin WA"* di pojok kanan bawah agar tampilan chat lebih leluasa.
   * Pengguna dapat mengklik tombol tersebut kapan saja untuk memunculkan kembali info kontak WhatsApp lengkap.
3. **Animasi & Pengalaman Pengguna Modern**:
   * Balon percakapan menggunakan transisi masuk yang halus (*fade-in slide-up*).
   * Status berpikir AI diperbarui dengan animasi **3 bouncing dots** dan ikon AI yang berdenyut (*pulse*).
   * Fitur auto-scroll otomatis mengarahkan ke pesan terbaru setiap ada respon masuk.

---

## 3. Fitur Tombol Melayang Otomatis ke Atas (`components/shared/ScrollToTopButton.tsx`)

* Komponen tombol melayang (*floating button*) terpasang di layout storefront `components/layouts/StorefrontChrome.tsx`.
* Muncul otomatis saat pengguna melakukan scroll halaman ke bawah lebih dari 350px.
* Terletak di atas tombol chat (`bottom-22 right-5 sm:bottom-24 sm:right-6`).
* Memberikan navigasi *smooth scroll* kembali ke puncak halaman dengan satu kali klik.

---

## 4. Pembaruan Antarmuka & Manajemen Admin Panel (Finly Style)

1. **Dashboard Utama & Visualisasi Analitik (`app/admin/page.tsx`)**:
   * Desain kartu modern Finly (`finly-card`) dengan radius membulat `rounded-[26px]`, bayangan lembut, dan tema warna ungu-indigo (`#7C5CFC`).
   * Ringkasan performa finansial: Gross Revenue, Net Profit, Total Orders, Active Customers, dan Average Order Value (AOV).
   * Visualisasi grafik penjualan mingguan dan bulanan pada `features/admin/SalesChart.tsx`.
2. **Manajemen Pesanan (`app/admin/orders/page.tsx`)**:
   * Komponen pemilih sort order berbasis client `features/admin/OrderSortSelect.tsx` untuk mengatasi Next.js Turbopack handler mismatch.
   * Modal aksi interaktif `features/admin/OrderActionModal.tsx` untuk memperbarui status transaksi, status pengiriman, nomor resi kurir, dan catatan pesanan secara langsung.
   * Standardisasi status pesanan berbahasa Indonesia: *"Menunggu Pembayaran"*, *"Diproses"*, *"Dikirim"*, *"Selesai"*, *"Dibatalkan"*.
3. **Manajemen Konten Banner Hero (`features/admin/LandingContentManager.tsx`)**:
   * Batas maksimal banner ditingkatkan hingga **10 banner** (sebelumnya terbatas 2).
   * Dilengkapi validasi upload gambar, pengelolaan headline, subtitle, tombol CTA, dan urutan tayang.
4. **Manajemen Voucher & Promo (`features/admin/VoucherManager.tsx`)**:
   * Dukungan diskon tipe persentase dan nominal potongan harga.
   * Penambahan skrip migrasi database `supabase/migrations/20261102000000_voucher_usage_lifecycle.sql` untuk pelacakan kuota pemakaian per akun pelanggan.

---

## 5. Perbaikan Bug Runtime & Hydration

1. **Duplicate Key Console Error**:
   * Memperbaiki error duplikasi key UUID pada kartu hero kategori di `features/landing/CategorySection.tsx`.
2. **Event Handler Passing Error**:
   * Memisahkan elemen `<select onChange={...}>` di Server Component halaman admin pesanan menjadi Client Component terpisah.
3. **CSS Input Angka**:
   * Menghilangkan panah spinner default browser pada input type number di `app/globals.css`.

---

## 6. Verifikasi Kualitas Kode

* **Unit Testing (Vitest)**: Seluruh **157 unit tests** (16 test suites) lulus 100%.
* **Next.js Production Build (Turbopack)**: Sukses mengompilasi seluruh **36 halaman** tanpa error.
