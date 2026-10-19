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

## 5. Fitur Sinkronisasi Stok Offline (`/admin/stock-sync`)

Fitur khusus untuk mencocokkan stok fisik toko dari laporan server kantor/gudang offline dengan inventaris website secara transaksional tanpa merusak transaksi online yang sedang berjalan.

### Komponen & Logika Utama:
1. **Parser File Excel Sumber (`lib/stock-sync.ts`)**:
   - Mendukung format file kantor (`cpu stock all.xlsx`, `notebook stock all.xlsx`) dengan kolom: `IdBarang`, `Kategori`, `Merk`, `Tipe`, `Stok`, `GudangLuar`, `TglBeli`.
   - Mengekstrak kode produk/MTM dari tanda kurung pada kolom `Tipe` (misal: `82X6006FID`).
   - `IdBarang` diperlakukan sebagai ID inventaris offline internal, bukan langsung menimpa SKU website.
   - Mendukung unduh template resmi format `.xlsx` dan contoh dummy data.
2. **Penanganan Baris Duplikat & Konflik**:
   - Untuk baris duplikat (seperti `82X6006FID` dengan stok 5 dan 7), sistem tidak menjumlahkannya diam-diam, melainkan menampilkan konflik dan memberi admin 3 opsi: *Ambil Baris Pertama*, *Ambil Baris Terakhir*, atau *Gabungkan Total*.
3. **Pemisahan Gudang Luar**:
   - Stok gudang luar tidak otomatis dimasukkan ke stok jual website. Admin dapat memilih apakah ingin menyertakan gudang luar atau hanya stok toko utama.
4. **Rekonsiliasi Transaksi Online**:
   - Menyediakan pilihan apakah laporan server kantor sudah memperhitungkan transaksi web atau belum.
   - Jika belum, sistem menghitung pesanan aktif (`pending`, `processing`, `ready_for_pickup`, `shipped`) agar stok online tidak terpotong ganda (*double reduction*) dan pesanan batal tidak direfund dua kali.
5. **Bahasa Antarmuka Penjualan yang Ramah Admin**:
   - Opsi dijelaskan dalam istilah toko yang mudah dipahami: *"Stok Gudang Toko Utama"*, *"Gabung Gudang Luar"*, *"File Belum Tahu Ada Order Web"*, dsb.
6. **Migrasi Database (`supabase/migrations/20261103000000_offline_stock_sync.sql`)**:
   - Tabel `offline_stock_sync_logs` untuk audit trail lengkap (admin pelaksana, jumlah produk terupdate, file asli, snapshot perubahan).

---

## 6. Fitur Rekap & Ekspor Stok Toko (`lib/export-stock.ts`)

Menambahkan fitur ekspor inventaris stok lengkap di halaman Admin Katalog Produk (`/admin/products`):
1. **Multi-Format Unduhan**:
   - **Excel (.xlsx)**: Header indigo profesional (`#4338CA`), teks putih tebal, zebra stripes, format angka Rupiah otomatis (`Rp #,##0`), formula ringkasan `SUM()`, dan kartu statistik estimasi total aset toko.
   - **PDF / Cetak**: Membuka dialog print browser yang bersih dan siap dicetak atau disimpan ke PDF.
   - **Word (.doc)**: Dokumen HTML terstruktur yang dapat langsung dibuka dan diedit di Microsoft Word.
   - **CSV (.csv)**: Kompatibel dengan semua aplikasi spreadsheet menggunakan UTF-8 BOM.
2. **Cakupan Fleksibel**:
   - Opsi *Semua Produk* atau *Hanya Produk Sesuai Filter/Pencarian Aktif*.
   - Setiap varian spesifikasi (RAM / Storage / Warna) diekstrak menjadi baris inventaris tersendiri dengan SKU varian masing-masing.

---

## 7. Redesain Footer Ber-Border & Berbagan (`components/layouts/Footer.tsx`)

1. **Kontainer Ber-Border Elegan**:
   - Footer dibungkus kartu `rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs`.
2. **Bagan Trust Badges di Bagian Atas**:
   - Jaminan *"100% Produk Original & Bergaransi Resmi"* dan *"Pilihan Ambil di Toko & Pengiriman Seluruh Indonesia"*.
3. **Bagan Kontak & Peta Mini**:
   - Panel khusus *"Hubungi Kami"* dengan alamat toko, mini Google Maps, nomor telepon, dan tombol WhatsApp instan.
4. **Bagan Official Partner & Marketplace**:
   - Kartu terpisah untuk toko resmi di Tokopedia, Shopee, TikTok Shop, Blibli, dan Lazada.
5. **Responsivitas Kolom**:
   - Menggunakan `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5/6` sehingga tata letak di tablet dan smartphone tetap rapi tanpa teks terpotong.

---

## 8. Label "Produk Terbaru" & "Produk Terlaris" pada Kartu Produk

1. **Badges di Pojok Kiri Atas Gambar (`ProductCard.tsx`)**:
   - **`⚡ Baru`**: Badge biru tebal untuk produk baru.
   - **`🔥 Terlaris`**: Badge amber/oranye untuk produk best seller.
   - Dibungkus kontainer `flex-wrap` dengan pembatas `max-w-[calc(100%-42px)]` sehingga tidak bertabrakan dengan tombol wishlist.
   - Label kategori yang sebelumnya menabrak badge dihilangkan karena brand dan kategori sudah tampil rapi di bawah gambar produk.
2. **Pojok Kanan Atas Independen**:
   - Tombol Wishlist ❤️ memiliki area tersendiri dan tetap dapat diklik di layar sentuh HP/Tablet (`opacity-80`).
3. **Penyajian Cerdas Sesuai Konteks Carousel (`badgeContext`)**:
   - Di carousel *"Produk Terbaru"*, kartu difokuskan menampilkan label **`⚡ Baru`**.
   - Di carousel *"Produk Terlaris"*, kartu difokuskan menampilkan label **`🔥 Terlaris`**.
   - Di katalog produk dan pencarian umum, kedua label ditampilkan bersisian secara proporsional jika produk memiliki kedua status.
4. **Sinkronisasi Database Otomatis**:
   - Saat admin mengatur produk di menu *Tampilan Toko (Storefront)*, kolom `is_new_arrival` dan `is_best_seller` pada tabel `products` Supabase otomatis disinkronkan.
5. **Pencarian & Filter Cepat**:
   - Pencarian kata kunci `"baru"`, `"terbaru"`, `"terlaris"`, `"bestseller"` langsung menemukan produk terkait.
   - Ditambahkan tombol filter cepat `⚡ Terbaru` dan `🔥 Terlaris` di katalog produk.

---

## 9. Responsivitas Penuh (HP, Tablet, dan Desktop)

1. **Carousel Fleksibel 4-Breakpoint (`FeaturedProducts.tsx`)**:
   - **HP / Mobile (`< 640px`)**: 1 kartu per slide.
   - **Tablet Portrait (`640px - 1023px`, iPad / Galaxy Tab)**: 2 kartu per slide.
   - **Tablet Landscape & Laptop 13" (`1024px - 1279px`)**: 3 kartu per slide.
   - **Desktop Lebar (`≥ 1280px`)**: 4 kartu per slide.
2. **Perbaikan Gesture Swipe Layar Sentuh**:
   - Deteksi sentuhan HP & Tablet kini membedakan antara scroll vertikal dan geser horizontal (`Math.abs(touchDeltaX) > Math.abs(touchDeltaY)`), sehingga scrolling halaman tidak tersangkut slider.
3. **Baseline Kartu Rata Sempurna**:
   - Ditambahkan `h-full` pada kartu dan `mt-auto` pada baris aksi harga & keranjang, sehingga meskipun judul produk berbeda panjangnya, tinggi kartu dan tombol beli selalu sejajar lurus.
4. **Standarisasi Kontainer Landing Page**:
   - Seluruh seksi di beranda distandarisasi menggunakan `rounded-2xl sm:rounded-3xl` dan padding adaptif `p-4 sm:p-6 lg:p-8`.

---

## 10. Verifikasi Kualitas & Kesiapan Produksi

* **TypeScript Compilation (`npx tsc --noEmit`)**: **0 error**, seluruh tipe data valid.
* **Unit Testing (Vitest)**: Seluruh **189 tests** (18 test suites) lulus 100%.
* **Next.js Production Build (Turbopack)**: Sukses mengompilasi seluruh **39 halaman & endpoint API** tanpa error.
