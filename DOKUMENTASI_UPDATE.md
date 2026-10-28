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

## 10. Fitur Halaman "Tentang Kami" (About Us) & Visual Photo Layout Editor

Menambahkan halaman publik `/about` dan manajemen konten visual di `/admin/about`:
1. **Halaman Publik `/about` (Server Components & SEO Ready)**:
   - Metadata SEO lengkap (`title`, `description`, OpenGraph, Twitter card).
   - 8 seksi konten dinamis: Hero Perkenalan, Tentang Kami (Story), Fakta & Statistik, Keunggulan Kami, Brand Partner, Layanan / Alur Pembelian, Tim / Foto Aktivitas, dan Call-to-Action (CTA).
   - Menghubungkan tautan navigasi di Navbar desktop, Navbar mobile, dan Footer.
2. **Admin Panel Visual About Us (`features/admin/AboutUsManager.tsx`)**:
   - Pengelolaan urutan dan visibilitas setiap seksi (tampil/sembunyi).
   - Form input terstruktur dengan live preview interaktif.
   - Manajemen upload foto langsung ke Supabase Storage (`storefront-images` atau bucket terkait) lengkap dengan pengaturan teks alt SEO.
3. **Fitur Khusus Visual Photo Layout Editor (`components/shared/PhotoLayoutRenderer.tsx`)**:
   - **Pilihan Template Layout**: Single Image, Split Layout (kiri/kanan), Image Grid (2-4 kolom), Photo Collage (kombinasi hero & kartu), Gallery / Carousel, dan Wide Banner.
   - **Kustomisasi Gambar**: Rasio (1:1, 16:9, 4:3, 3:4, wide, auto), sudut membulat (*rounded*, *slightly rounded*, *sharp*), fokus gambar (*center*, *top*, *bottom*, *left*, *right*), fit (*cover* / *contain*), serta opsi border dan shadow.
   - Responsif desktop dan mobile tanpa merusak proporsi gambar.
4. **Migrasi Database Idempotent (`supabase/migrations/20261104000000_about_us_content.sql`)**:
   - Menyimpan konten About Us ke dalam `storefront_settings.settings.about_us` dengan fallback default yang relevan untuk Toko Next Solution.

---

## 11. Pusat Notifikasi Admin Multi-Kategori & Multi-Role

Pembaruan sistem notifikasi header admin pada `actions/admin.ts` dan `components/layouts/AdminHeader.tsx`:
1. **Perbaikan Z-Index Stacking Context (Masalah Bleeding/Tumpukan)**:
   - Header admin dinaikkan ke `z-50` dan popover notifikasi ke `z-[100]`.
   - Sticky bar sub-header pada halaman pengelola diturunkan ke `z-20` sehingga dropdown notifikasi melayang sempurna tanpa tertembus tombol halaman.
2. **Pusat Notifikasi Multi-Kategori**:
   - Ikon lonceng (*Bell*) dengan badge indikator jumlah pesan yang belum dibaca.
   - Tab filter kategori cepat: `Semua`, `Pesanan`, `Pembayaran`, `Stok`, `Katalog`, `Aktivitas`, `Keamanan`.
   - Menampilkan detail pesanan baru, bukti transfer verifikasi, peringatan stok menipis/habis ($\le 5$), penambahan produk/brand/kategori, riwayat audit log admin, serta peringatan keamanan akun terkunci.
3. **Visibilitas Berbasis Peran (Super Admin vs Admin Biasa)**:
   - **Super Admin**: Menerima seluruh notifikasi lengkap (finansial, audit log, keamanan).
   - **Admin Biasa**: Menerima notifikasi operasional dasar (pesanan masuk, stok, katalog).
   - **Dialog Konfigurasi Staf**: Super Admin dapat mengatur kategori notifikasi staf langsung dari dropdown via `saveStaffNotificationConfigAction()`.

---

## 12. Redesain Switch Mode Gelap / Terang (Smooth Gliding Pill Switch)

Pembaruan tombol dark/light mode pada `components/layouts/AdminHeader.tsx`:
1. **Wadah Proporsional Anti-Dempet**:
   - Menggantikan wadah lingkaran sempit 40px yang sebelumnya memaksakan 2 ikon bertumpukan menjadi kapsul switch selebar `w-[68px]` dan tinggi `h-9` ($36\text{px}$).
   - Slot matahari dan bulan berjarak lega ($28\text{px}$ masing-masing) tanpa tumpang tindih.
2. **Animasi Geser Halus (Spring Gliding Thumb)**:
   - Indikator kapsul meluncur dengan kurva pegas `cubic-bezier(0.34, 1.56, 0.64, 1)`.
   - **Mode Terang**: Thumb meluncur ke kiri dengan gradien hangat amber/matahari (`from-amber-400 to-amber-300`) dan rotasi halus ikon matahari.
   - **Mode Gelap**: Thumb meluncur sejauh $32\text{px}$ ke kanan dengan gradien biru modern (`from-blue-600 to-indigo-600`) dan rotasi halus ikon bulan.
3. **Sinkronisasi Tema Real-Time**:
   - Terhubung langsung ke `document.documentElement` dan menyimpan preferensi ke dua kunci penyimpanan (`next-solution-theme` & `theme`) secara instan.

---

## 14. Redesain Faktur / Invoice Penjualan & Real-Time Sync

Pembaruan faktur pembelian pada `app/orders/[id]/invoice/page.tsx` dan `components/invoice/OrderInvoice.tsx`:
1. **Tata Letak Faktur Lapang & Standar Marketplace**:
   - Padding kertas diperluas (`p-6 sm:p-9`) dan kartu penerima/pengiriman ditata dengan ruang bernapas yang cukup.
   - Tinggi baris tabel produk diperluas (`py-3.5 px-4`) dan foto produk diperbesar menjadi `size-14` dengan sudut membulat.
2. **Penyajian Spesifikasi Berbentuk Chip Rapi**:
   - Spesifikasi teknis (Processor, RAM, Storage, GPU, Display, OS, Garansi) ditata sebagai chip terstruktur, bukan lagi paragraf teks bertumpuk yang berjejal.
   - Duplikasi teks catatan produk yang mengulang spesifikasi mentah dieliminasi.
   - Kolom tanda tangan pembeli dan kasir dipertinggi (`space-y-8`) sehingga siap untuk tanda tangan fisik dan cap resmi.
3. **Logo Toko Real-Time dari Database**:
   - Membaca `logo_url` dari `storefront_settings.store.logo_url` dan menampilkannya secara dinamis dengan proporsi `object-contain`.
   - Mendukung opsi tampilan logo: logo + teks nama toko, logo saja, atau teks saja.
4. **Bebas Cache Usang (*Zero Stale Cache*)**:
   - Menambahkan `export const dynamic = "force-dynamic"` dan `export const revalidate = 0` sehingga setiap perubahan data produk, harga, logo toko, maupun spesifikasi di admin langsung tercermin di faktur seketika.

---

## 15. Security Hardening: Anti-Race Condition Voucher & Proteksi Peran Pengguna (Role Guard)

Berdasarkan hasil audit keamanan, diterapkan penguatan keamanan pada alur transaksi voucher dan proteksi tabel pengguna:

1. **Pola Reservasi Atomik Voucher (`services/checkout.service.ts`)**:
   * **Masalah**: Sebelumnya, pembaruan kuota pemakaian voucher (`usage_count`) dilakukan menggunakan pola *read-modify-write* di client Supabase, sehingga dua checkout paralel berisiko melebihi batas kuota (`usage_limit`).
   * **Solusi**: Diterapkan sistem reservasi token atomik di server:
     * Sebelum pesanan dibuat, server memanggil RPC `claim_voucher_quota` yang mengunci baris voucher dengan `FOR UPDATE` di PostgreSQL.
     * Jika kuota tersedia (`usage_count < usage_limit`), sistem menambah `usage_count` dan menerbitkan token reservasi (`voucher_reservations`) berstatus `reserved`.
     * Jika pesanan berhasil dibuat, reservasi dikonsumsi secara permanen (`consume_voucher_reservation`) dengan status `consumed`.
     * Jika pesanan gagal di tengah jalan (misal stok habis atau error koneksi), sistem membatalkan reservasi (`release_voucher_reservation`) dan mengembalikan kuota voucher tanpa merusak status keranjang belanja pelanggan.

2. **Mekanisme Anti-Replay pada Pelepasan Kuota**:
   * `release_voucher_reservation` hanya dapat melepaskan kuota jika token reservasi masih berstatus `reserved`.
   * Jika pelepasan kuota dipanggil berulang kali (replay attack atau network retry), RPC menolak dan tidak mengurangi `usage_count`.
   * Voucher yang sudah berhasil dikonsumsi pada pesanan yang selesai (`consumed`) tidak dapat dikurangi kuotanya melalui pemanggilan release.

3. **Penutupan Akses RPC Pengguna Biasa (`service_role` Only)**:
   * Hak `EXECUTE` pada seluruh fungsi manipulasi kuota voucher (`claim_voucher_quota`, `consume_voucher_reservation`, `release_voucher_reservation`) serta tabel `voucher_reservations` dicabut sepenuhnya dari `PUBLIC`, `anon`, dan `authenticated`.
   * Hanya backend server yang memegang `service_role` yang dapat memanggil fungsi-fungsi ini. Pengguna biasa atau penyerang yang mencoba memanggil RPC secara langsung melalui API PostgREST akan ditolak dengan error `42501 (permission denied)`.

4. **Constraint Skema Database & Sanitasi Data Lama**:
   * Ditambahkan constraint PostgreSQL pada tabel `public.vouchers`:
     * `CHECK (usage_limit IS NULL OR usage_count <= usage_limit)`
     * `CHECK (usage_count >= 0)`
   * Pada file migrasi `supabase/migrations/20261105000000_atomic_voucher_quota_and_user_role_guard.sql`, ditambahkan query pembersihan data historis secara otomatis sebelum constraint diterapkan untuk mencegah kegagalan migrasi.

5. **Proteksi Mutlak Kolom Role Pengguna (`guard_user_role_update` Trigger)**:
   * Menambahkan trigger `BEFORE UPDATE` pada `public.users` yang memeriksa apakah kolom `role` mengalami perubahan.
   * Modifikasi peran oleh akun biasa atau admin biasa langsung dibatalkan di tingkat PostgreSQL dengan exception `42501`.
   * Akses perubahan peran resmi oleh Super Admin melalui `admin_update_user_role` serta proses pemeliharaan internal `service_role`/`postgres` tetap diizinkan dan berjalan normal.

6. **Suite Pengujian Keamanan & Konkurensi Baru**:
   * Dibuat file pengujian baru `__tests__/services/checkout-voucher-concurrency.test.ts` (5 test cases) untuk menguji checkout paralel dengan sisa kuota 1, rollback saat checkout gagal, perlindungan anti-replay, dan penolakan hak akses RPC bagi user biasa.
   * Diperluas `__tests__/lib/security-authorization.test.ts` (4 test cases baru) untuk memverifikasi logika trigger `guard_user_role_update`.

---

## 16. Verifikasi Kualitas & Kesiapan Produksi

* **TypeScript Compilation (`npx tsc --noEmit`)**: **0 error**, seluruh tipe data valid.
* **Unit & Integration Testing (Vitest)**: Seluruh **245 tests** (23 test suites) lulus 100%.
* **ESLint Validation (`npm run lint`)**: **0 error**, format dan aturan kode bersih.
* **Next.js Production Build (`npm run build`)**: Sukses mengompilasi **40/40 routes** dengan Turbopack.

---

## 17. Perbaikan UI & Presisi Desain: Faktur Pembelian & Theme Toggle Admin

1. **Perataan Kolom Info Pembayaran & Bantuan Faktur (`components/invoice/OrderInvoice.tsx`)**:
   * **Masalah**: Label dan tanda titik dua pada bagian *"QUESTIONS?"* dan *"PAYMENT INFO:"* tidak sejajar, tampak berantakan dan kurang simetris.
   * **Solusi**: Diterapkan CSS Grid `grid-cols-[auto_auto_1fr]` dengan `items-baseline` dan spasi seragam (`gap-x-2 gap-y-1.5`). Titik dua dan teks penjelasan kini sejajar vertikal 100% sempurna di semua resolusi dan mode cetak.

2. **Presisi Geometris Tombol Toggle Mode Tema Admin (`components/layouts/AdminHeader.tsx`)**:
   * **Masalah**: Lingkaran thumb indikator tema (light/dark mode) di Admin Header tampak lonjong atau tidak bulat sempurna karena distorsi flex/shrink.
   * **Solusi**: Diterapkan proporsi lingkaran murni `size-6 aspect-square shrink-0 rounded-full` dengan margin simetris `top-[3px] left-[3px]`, track selebar 62px, dan jarak geser `translate-x-8`. Lingkaran thumb kini 100% geometris bulat sempurna dengan animasi transisi yang mulus.

---

## 18. Arsitektur Keranjang Belanja Terisolasi Penuh (Zero Cross-Account Leakage)

1. **Prinsip Single Source of Truth**:
   * Database Supabase (`cart` dan `cart_items`) dijadikan satu-satunya sumber kebenaran data (*authoritative source of truth*) untuk pengguna terotentikasi.
   * Dibuat helper universal [`lib/cart-utils.ts`](file:///c:/web next penjualan/lib/cart-utils.ts) (`formatCartItemToStored`) yang menstandarisasi konversi data relasi produk dan varian dari database ke client store. Seluruh duplikasi kode mapping dieliminasi.

2. **Sinkronisasi Multi-Akun Global (`components/layouts/StorefrontChrome.tsx` & `app/layout.tsx`)**:
   * `app/layout.tsx` mengambil status autentikasi user dan keranjang dari database di tingkat server untuk setiap halaman storefront, lalu meneruskannya ke `StorefrontChrome`.
   * `StorefrontChrome` secara proaktif mendeteksi perubahan sesi login:
     * **Saat Pengguna Logout**: Memanggil `clearCart()`, mengosongkan isi keranjang dan `localStorage` menjadi 0 item seketika.
     * **Saat Pengguna Berganti Akun (misal Akun 1 ke Akun 2)**:
       Memanggil `syncWithUser(currentUserId, initialCartItems)`. Isi keranjang Akun 1 langsung dibersihkan total dan digantikan 100% dengan keranjang resmi milik Akun 2. Tidak ada lagi sisa barang akun lama yang tercampur.

3. **Perbaikan Bug Badge Navbar (`components/layouts/Navbar.tsx`)**:
   * Menghapus logika cacat `Math.max(displayCartCount, totalStoreItems)` yang sebelumnya menyebabkan angka keranjang dari akun sebelumnya terjebak dan tidak pernah berkurang.
   * Nilai badge kini murni merefleksikan jumlah barang akun yang sedang login secara real-time dan terhubung dengan event `CART_UPDATED_EVENT`.

4. **Auto-Resolution Varian & Pencegahan Kegagalan Quick-Add (`services/cart.service.ts` & `features/cart/useAddToCart.ts`)**:
   * Ketika pembeli mengklik tombol keranjang dari kartu katalog pada produk yang memiliki varian spesifikasi/warna, sistem secara otomatis memilih varian default yang memiliki stok tersedia (*first in-stock variant*).
   * Menghilangkan error *"Pilih warna dan spesifikasi produk terlebih dahulu"* saat quick-add dan langsung memasukkan produk ke keranjang akun aktif.
   * Server Action mengembalikan objek `cartItem` lengkap yang langsung diinjeksi ke client store melalui method baru `addItemDirect(item)` di [`store/useCartStore.ts`](file:///c:/web next penjualan/store/useCartStore.ts).

5. **Pencegahan Kontaminasi Database Baru (`features/cart/CartClient.tsx` & `features/checkout/CheckoutClient.tsx`)**:
   * Dihapus percabangan berbahaya yang sebelumnya mengunggah data keranjang usang di localStorage ke database akun baru yang masih kosong.
   * Sinkronisasi ke database saat checkout hanya diizinkan jika `storeUserId === currentUserId`.

6. **Pengujian Unit Tambahan (`__tests__/store/cart.test.ts`)**:
   * Ditambahkan test suite pengujian isolasi akun, pergantian akun, reset keranjang kosong, penambahan `addItemDirect`, dan penjaminan keamanan harga.




---

## 19. Siklus Penghapusan Akun Aman, Snapshot Identitas Pembeli & Pembersihan UI

1. **Preservasi Pesanan & Riwayat Transaksi Historis (`supabase/migrations/20261107000000_account_deletion_and_session_guard.sql`)**:
   * Kolom `orders.user_id` dan `voucher_reservations.user_id` diubah menjadi `NULLABLE` dengan foreign key `ON DELETE SET NULL`.
   * Penghapusan akun pengguna tidak lagi membahayakan atau menghapus riwayat pesanan fisik dan transaksi legal toko.
   * Supabase Auth Admin API dapat menghapus akun secara tuntas tanpa tertahan error *Foreign Key Constraint Violation*.

2. **Snapshot Identitas Pembeli saat Transaksi (`supabase/migrations/20261108000000_snapshot_order_customer_identity.sql`)**:
   * Trigger PostgreSQL `snapshot_order_customer_identity_before_insert` secara otomatis merekam nama, email, dan nomor telepon pembeli di waktu transaksi ke dalam `shipping_address.customer_snapshot`.
   * Dibuat resolver universal [`lib/orders/customer-identity.ts`](file:///c:/webnext/lib/orders/customer-identity.ts) (`resolveOrderCustomerIdentity`) yang diterapkan pada:
     - Faktur resmi pembelian ([`OrderInvoice.tsx`](file:///c:/webnext/components/invoice/OrderInvoice.tsx) & `app/orders/[id]/invoice/page.tsx`).
     - Panel manajemen pesanan admin ([`OrderActionModal.tsx`](file:///c:/webnext/features/admin/OrderActionModal.tsx) & `actions/admin.ts`).
   * Menjamin nama pembeli, email, dan nomor kontak selalu tampil akurat dan lengkap selamanya, bahkan jika akun auth telah dihapus di kemudian hari.

3. **Pembersihan File Storage Akun Otomatis (`actions/admin.ts`)**:
   * Ditambahkan fungsi PostgreSQL `list_user_storage_objects(p_user_id)` untuk mendeteksi file avatar dan foto ulasan milik pengguna di bucket Supabase Storage.
   * Server action `deleteAdminManagedAccountAction` menghapus seluruh file milik akun melalui Storage API resmi sebelum akun dihapus dari Auth, mencegah error penolakan hapus dari Supabase Auth karena kepemilikan file storage.

4. **Proteksi Mutlak Super Admin Terakhir**:
   * Trigger PostgreSQL `guard_last_super_admin_delete` menggunakan *advisory transaction lock* (`pg_advisory_xact_lock`) untuk mencegah kondisi *race condition* atau dua permintaan hapus paralel yang dapat melenyapkan seluruh Super Admin di sistem.

5. **Proteksi Sesi Akun Terhapus di Middleware (`lib/supabase/middleware.ts` & `lib/auth/active-profile.ts`)**:
   * Token JWT Supabase yang masih aktif setelah akun dihapus otomatis diperiksa terhadap data profil aktif melalui helper `getActiveUserProfileStatus`.
   * Jika profil terhapus (`missing`), cookie otentikasi langsung dibersihkan (`maxAge: 0`) dan request ditolak secara aman, mencegah akun yang sudah dihapus mengakses endpoint privat sebelum masa kedaluwarsa JWT berakhir.

6. **Pengaturan Kata Sandi bagi Akun Google OAuth ([`actions/user.ts`](file:///c:/webnext/actions/user.ts) & [`ProfileDashboard.tsx`](file:///c:/webnext/features/profile/ProfileDashboard.tsx))**:
   * Pengguna yang mendaftar via Google Sign-In kini dapat langsung membuat kata sandi pertama kali tanpa diminta memasukkan kata sandi lama (`canSetPasswordWithoutCurrentPassword`).
   * Sesi login Google yang telah diverifikasi menjadi otoritas sah untuk menyetel password baru pada akun tersebut.

7. **Pembersihan Elemen Visual Landing Page (Desain Alami & Bebas AI Slop)**:
   * Menghilangkan badge berkilau berlebihan (*sparkles*) pada seksi About Us ([`AboutUsSection.tsx`](file:///c:/webnext/features/landing/AboutUsSection.tsx)), Review Produk ([`ProductReviewsSection.tsx`](file:///c:/webnext/features/landing/ProductReviewsSection.tsx)), dan Banner Promo ([`PromoBanner.tsx`](file:///c:/webnext/features/landing/PromoBanner.tsx)).
   * Menggantinya dengan tipografi judul uppercase tracking yang elegan dan natural (`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500`).
   * Membersihkan teks label berulang "Official Partner" pada kartu brand ([`BrandShowcase.tsx`](file:///c:/webnext/features/landing/BrandShowcase.tsx)).

8. **Pengujian Otomatis Komprehensif**:
   * Ditambahkan file tes baru:
     - `__tests__/lib/account-lifecycle.test.ts` (13 test cases): menguji siklus hidup penghapusan akun, pembersihan file, proteksi super admin, dan middleware.
     - `__tests__/lib/order-customer-identity.test.ts` (4 test cases): menguji keakuratan snapshot identitas pembeli historis dan fallback profil.
   * Seluruh **25 test suites (262 tests)** lulus 100%.

---

## 20. Presisi Varian Keranjang, Pemisahan Status Pembayaran & SKU Faktur, Optimasi Galeri Produk, dan Pembersihan Zero-Warning

1. **Presisi Varian Keranjang (Harga, Stok, dan SKU)**:
   * **Helper Sentral (`lib/cart-utils.ts`)**:
     - `getCartItemUnitPrice`: Menghitung harga satuan item keranjang dengan memprioritaskan harga spesifik varian (`item.variant?.price`) di atas harga master produk (`item.product.price`).
     - `getCartItemAvailableStock`: Memastikan batasan kuantitas pemesanan mengacu pada stok varian aktif (`item.variant?.stock`), mencegah *overselling* atau salah kalkulasi stok.
     - `getCartItemSku`: Mengambil SKU varian (`item.variant?.sku`) jika ada, dan fallback ke SKU master produk.
   * **Sinkronisasi Store & UI Keranjang (`store/useCartStore.ts`, `features/cart/CartClient.tsx`, `features/cart/useAddToCart.ts`)**:
     - `updateQuantity` dan `getSubtotal` di store secara konsisten menggunakan helper harga dan stok varian.
     - UI Keranjang menampilkan thumbnail gambar varian spesifik, badge stok varian real-time (`Stok: X`), dan label SKU varian.
   * **Validasi Checkout (`features/checkout/CheckoutClient.tsx`)**:
     - Validasi stok saat menuju transaksi pembayaran kini memeriksa ketersediaan stok varian masing-masing produk secara akurat.
   * **Pengujian Unit (`__tests__/lib/cart-utils.test.ts`)**:
     - 4 skenario pengujian komprehensif untuk kalkulasi harga varian, batas stok varian, resolusi SKU, dan fallback produk tanpa varian.

2. **Pemisahan Status Pembayaran & SKU Faktur Pemesanan**:
   * **Decoupling Status Pembayaran (`lib/orders/payment-status.ts`)**:
     - Memisahkan status finansial/pembayaran (`paid`, `pending`, `failed`, `refunded`, `cancelled`) dari status fisik pengiriman (*fulfillment progress*: `processing`, `shipped`, `delivered`).
     - Mencegah kekeliruan visual di mana status pesanan "processing" dianggap belum bayar, atau pesanan yang dibatalkan tetap tercatat dibayar.
   * **Resolusi SKU Faktur (`lib/orders/order-item.ts`)**:
     - Helper `getOrderItemSku` memastikan faktur pembelian menampilkan SKU varian yang dibeli konsumen, bukan generic parent SKU.
   * **Perapian Faktur Pembelian (`components/invoice/OrderInvoice.tsx` & `app/checkout/success/page.tsx`)**:
     - Grid layout pada tabel faktur dirapikan agar sejajar sempurna baik pada tampilan desktop maupun mobile.
     - Penataan badge status pembayaran yang mandiri dari status pengiriman dengan visual yang bersih dan rapi.
     - Pembaruan skenario tes di `__tests__/lib/order-invoice-scenarios.test.ts` (10 test cases lulus).

3. **Optimasi Galeri Produk & Pengalaman Pemilihan Varian**:
   * **Next.js Image Optimization (`features/product/ProductDetail.tsx`)**:
     - Mengganti seluruh tag `<img>` HTML mentah dengan komponen `next/image` (`<Image />`) dengan rasio aspek terjaga dan optimasi otomatis dari CDN Next.js.
   * **In-Stock Variant Preselection & Thumbnail Mapping**:
     - Sistem secara cerdas memilih varian pertama yang masih memiliki stok (`stock > 0`) saat halaman dibuka, mencegah pengguna melihat tombol nonaktif secara default.
     - Memetakan ID varian dengan galeri foto sehingga ketika varian dipilih, gambar utama langsung beralih ke foto varian tersebut.
   * **Riwayat Pesanan Akun (`features/profile/ProfileDashboard.tsx` & `repositories/order.repository.ts`)**:
     - Query repository pesanan diperluas untuk menyertakan `product_variants(image_url)`.
     - Daftar pesanan di dashboard profil kini menampilkan gambar spesifik varian produk yang dipesan konsumen.

4. **Pembersihan Kode Menyeluruh Menuju Zero Warning (0 Errors, 0 Warnings)**:
   * **Migrasi Tag `<img>` Native ke `<Image />`**:
     - Diterapkan pada `components/layouts/Footer.tsx`, `components/layouts/Navbar.tsx`, dan `features/admin/StorefrontSettingsManager.tsx`.
   * **Pembersihan Import & Variabel Tak Digunakan**:
     - Membersihkan seluruh *dead code*, icon yang tidak dipakai, dan variabel *unused* pada halaman admin (`app/admin/layout.tsx`, `app/admin/orders/page.tsx`, `app/admin/page.tsx`, `components/layouts/AdminShell.tsx`, `components/layouts/AdminSidebar.tsx`, `features/admin/AdminAuditLogsManager.tsx`, `features/admin/ProductTable.tsx`, `features/admin/StockSyncManager.tsx`).
     - Merapikan penanganan search params di `app/category/[slug]/page.tsx` dan `app/products/page.tsx`.
     - Merapikan pemanggilan import di `lib/bulk-image-upload.ts`, `lib/export-stock.ts`, dan `__tests__/lib/admin-product-import-stock.test.ts`.

5. **Hasil Verifikasi Kualitas Mutlak**:
   * **Unit Tests**: 26 test suites (266 tests) lulus 100% tanpa kegagalan (`npx vitest run`).
   * **TypeScript Compilation**: `npx tsc --noEmit` lolos tanpa satu pun error (0 errors).
   * **ESLint**: `npm run lint` lolos dengan status bersih **0 errors dan 0 warnings** (sebelumnya ada 40 warnings).
   * **Production Build**: `npm run build` sukses mengompilasi seluruh **40/40 routes** dengan lancar.

---

## 21. Hardening Concurrency Voucher Checkout, Keamanan Storage RLS, Peningkatan UX Reset Password & Polish Checkout

1. **Hardening Concurrency Voucher Checkout (`services/checkout.service.ts`)**:
   * **Idempotent & Ambiguous Network Protection**:
     - Menangani error timeout atau koneksi ambigu saat eksekusi RPC `consume_voucher_reservation`.
     - Sebelum membatalkan pesanan, sistem secara otomatis memverifikasi status reservasi di database (`status === 'consumed' && order_id === orderId`).
     - Jika transaksi voucher sebenarnya sudah ter-commit di database, pesanan tidak lagi dibatalkan secara keliru (*prevent false order cancellation*).
     - Jika status masih `reserved`, sistem melakukan retry aman sebanyak 1 kali menggunakan RPC idempoten.
   * **Pengecekan Fail-Closed Voucher Pengguna Baru**:
     - Jika query riwayat pesanan pengguna atau nomor telepon mengalami kegagalan/timeout, sistem menolak penggunaan voucher pelanggan baru secara fail-closed demi mencegah *voucher abuse*.
   * **Safe Non-Replayable Release**:
     - Pelepasan kuota reservasi voucher saat rollback error hanya mengurangi `usage_count` jika reservasi masih berstatus `reserved`.

2. **Perbaikan Delimiter RPC & Migrasi Korektif Supabase (`supabase/migrations/`)**:
   * **Normalisasi Delimiter PostgreSQL (`20261110000000_repair_voucher_reservation_rpc_delimiters.sql`)**:
     - Memperbaiki fungsi PL/pgSQL `consume_voucher_reservation`, `release_voucher_reservation`, dan `cleanup_expired_voucher_reservations` dengan syntax delimiter standar `$$` yang kompatibel di semua versi Supabase CLI dan dashboard remote.
   * **Hardening RLS Storage Policy Avatars & Reviews (`20261111000000_harden_avatars_and_reviews_storage_policies.sql`)**:
     - Isolasi ketat folder upload per UID pengguna (`auth.uid()`) untuk mencegah manipulasi/upload berkas ke path pengguna lain.
     - Pembatasan ekstensi file hanya untuk format gambar aman (`jpg`, `jpeg`, `png`, `webp`) dan memblokir ekstensi berbahaya (`svg`, `html`, dll.).

3. **Peningkatan UX Halaman Reset Kata Sandi (`app/reset-password/page.tsx`)**:
   * **Toggle Visibilitas Password**:
     - Ditambahkan tombol intip kata sandi (`Eye` / `EyeOff`) pada kolom Kata Sandi Baru dan Konfirmasi Kata Sandi.
   * **Daftar Ketentuan Real-time**:
     - Checklist interaktif real-time untuk validasi minimal 6 karakter dan kesesuaian kedua kata sandi dengan indikator visual checklist/silang yang jelas.
   * **Auto-Redirect dengan Hitung Mundur (Countdown Timer)**:
     - Setelah kata sandi berhasil diubah, halaman menampilkan status sukses disertai hitung mundur live 10 detik otomatis ke halaman `/login`.
     - Disediakan tombol "Masuk Sekarang (Login)" untuk navigasi instan tanpa menunggu countdown selesai.

4. **Penyempurnaan Tampilan & Alur Checkout (`features/checkout/CheckoutClient.tsx`)**:
   * **Toolbar Navigasi & Alur Bertahap**:
     - Toolbar checkout dibungkus dalam kartu beraksen bersih dengan tombol "Kembali ke keranjang" dan alur tahapan ("Alamat" → "Pengiriman/Pickup" → "Pembayaran").
     - Antar-tahapan dihubungkan dengan panah penunjuk `ChevronRight` yang jelas.
   * **Kesejajaran Kolom Horizontal**:
     - Judul header "Checkout" diposisikan di atas grid sehingga Card Formulir Kiri (step input) dan Card Ringkasan Belanja Kanan (order summary) sejajar secara sempurna dari atas ke bawah.

5. **Stabilitas Build Turbopack (`next.config.ts`)**:
   * Menonaktifkan cache filesystem eksperimental Turbopack (`turbopackFileSystemCacheForBuild: false`) untuk menghindari kegagalan *stale cache* saat build produksi Next.js.

6. **Hasil Pengujian & Verifikasi Kualitas**:
   * **Unit Tests**: **30 test suites (312 tests)** lulus 100% (`npx vitest run`), mencakup tes baru di `__tests__/services/checkout-voucher-concurrency.test.ts` dan `__tests__/lib/security-hardening-remediation.test.ts`.
   * **TypeScript Compilation**: `npx tsc --noEmit` lolos bersih (0 errors).
   * **ESLint**: `npm run lint` lolos bersih (0 errors, 0 warnings).
   * **Production Build**: `npm run build` sukses mengompilasi seluruh **42/42 routes**.

---

## 22. AI Recommendation Assistant Berbasis Domain, Floating UI Safe-Area Anti-Tumpang-Tindih, dan Penguatan Status Pemuatan (Loading States & A11y)

1. **AI Recommendation Assistant Terstruktur (`lib/recommendation-assistant.ts` & `app/api/recommend/route.ts`)**:
   * **Pemisahan Modul Domain (`lib/recommendation-assistant.ts`)**:
     - Ekstraksi seluruh logika rekomendasi cerdas ke modul domain independen yang teruji penuh secara unit test.
     - Parsing budget yang cerdas dan fleksibel: mendukung rentang harga (misal: "Rp 5-7 juta"), jutaan/ribuan ("10 jutaan", "500 ribuan"), maupun angka nominal bertitik.
     - Deteksi kebutuhan grafis yang komprehensif: membedakan GPU diskrit (RTX, GeForce, Radeon) dengan iGPU/grafis terintegrasi, mendeteksi kebutuhan software (gaming, editing, desain, kerja harian), serta merek dan seri laptop terpopuler (ThinkPad, IdeaPad, Legion, LOQ, Yoga, ZenBook, ROG, TUF, dll.).
     - Penanganan pertanyaan non-produk / operasional toko (FAQ seputar metode pembayaran, opsi pengiriman, garansi, retur, akun).
   * **Integrasi Gemini Function Calling & Verifikasi Katalog Ketat**:
     - API route menggunakan Gemini Function Calling (`search_catalog_products`) untuk memastikan model AI mencari dan memverifikasi produk berdasarkan data riil katalog (hanya menampilkan produk `published` dengan stok tersedia).
     - Menghadirkan saran produk alternatif (`alternatives` & `alternativeLabel`) jika produk yang dicari tidak tersedia dalam batas budget yang diinginkan pengguna.
   * **Antarmuka Chat Interaktif (`features/chat/RecommendationChatWindow.tsx`)**:
     - Kartu produk rekomendasi dan alternatif terpasang rapi dengan gambar thumbnail, spesifikasi kunci/highlights, label grafis, status stok, dan harga diskon.
     - Penanganan pesan error yang elegan dengan batasan border yang lembut dan visual yang tidak mengintimidasi pengguna.
   * **Test Suites Baru**:
     - `__tests__/lib/recommendation-assistant.test.ts` (40 tests)
     - `__tests__/api/recommend-route.test.ts` (16 tests)
     - `__tests__/features/recommendation-chat-window.test.tsx` (3 tests)

2. **Koordinasi Posisi Floating Controls Anti-Tumpang-Tindih di Mobile (`components/layouts/floating-positions.ts`)**:
   * Helper terpusat `getFloatingControlBottom(hasBottomBar, control)` menghitung elevasi vertikal (`bottom`) secara dinamis untuk:
     - Tombol peluncur Chat Rekomendasi AI ([`RecommendationChat.tsx`](file:///c:/web%20next%20penjualan/features/chat/RecommendationChat.tsx))
     - Tombol kembali ke atas ([`ScrollToTopButton.tsx`](file:///c:/web%20next%20penjualan/components/shared/ScrollToTopButton.tsx))
     - Mengakomodasi Quick Cart Bar ([`MobileStickyCartBar.tsx`](file:///c:/web%20next%20penjualan/components/layouts/MobileStickyCartBar.tsx)) dan Bar Bandingkan Produk saat aktif.
   * Menghitung offset secara presisi dengan dukungan `env(safe-area-inset-bottom)` agar elemen melayang tidak menutupi satu sama lain maupun terhalang bilah navigasi perangkat iPhone/Android.
   * Unit test: `__tests__/components/floating-positions.test.ts` (3 tests).

3. **Global Loading State & Indikator Aksi Asinkron (A11y)**:
   * **Global Fallback Loader ([`app/loading.tsx`](file:///c:/web%20next%20penjualan/app/loading.tsx))**:
     - Komponen loading suspense global Next.js dengan spinner animasi `LoaderCircle`, semantic `role="status"`, `aria-live="polite"`, dan teks ramah screen-reader `sr-only`.
   * **Feedback Loading Otentikasi ([`app/login/page.tsx`](file:///c:/web%20next%20penjualan/app/login/page.tsx) & [`app/register/page.tsx`](file:///c:/web%20next%20penjualan/app/register/page.tsx))**:
     - Tombol "Masuk", "Daftar Akun", dan "Masuk dengan Akun Google" menampilkan spinner animasi `LoaderCircle` dan status `aria-busy` saat proses autentikasi berlangsung untuk mencegah klik ganda.
   * **Proteksi Double-Action Wishlist ([`ProductDetail.tsx`](file:///c:/web%20next%20penjualan/features/product/ProductDetail.tsx) & [`WishlistClient.tsx`](file:///c:/web%20next%20penjualan/features/profile/WishlistClient.tsx))**:
     - State `wishlistLoading` / `busyId` dengan spinner loading otomatis mengunci tombol favorit dan hapus wishlist saat request ke server sedang berjalan, mencegah *race condition*.
   * **Perapian Touch Target & Padding Checkout/Cart ([`CartClient.tsx`](file:///c:/web%20next%20penjualan/features/cart/CartClient.tsx) & [`CheckoutClient.tsx`](file:///c:/web%20next%20penjualan/features/checkout/CheckoutClient.tsx))**:
     - Perbaikan padding, touch target tombol voucher, dan ringkasan order pada resolusi layar sempit.

4. **Hasil Verifikasi Kualitas Menyeluruh**:
   * **Unit Tests**: **34 test suites (374 tests)** lulus 100% tanpa kegagalan (`npx vitest run`).
   * **TypeScript Compilation**: `npx tsc --noEmit` lolos bersih tanpa kesalahan (0 errors).
   * **ESLint**: `npm run lint` lolos bersih (0 errors, 0 warnings).
   * **Production Build**: `npm run build` sukses mengompilasi seluruh **42/42 routes**.

---

## 23. Pembuat Faktur Manual Admin, Pengelolaan & Kustomisasi Nota Pesanan, Arsitektur Failover LLM Multi-Provider, Perbaikan OAuth Netlify, dan Perapian Bento Layout & Footer

1. **Fitur Pembuat Faktur Manual Admin (`app/admin/invoices/page.tsx` & `features/admin/ManualInvoiceManager.tsx`)**:
   * **Manajer Faktur Mandiri**:
     - Ditambahkan halaman baru di admin panel `/admin/invoices` untuk membuat, mengedit, dan mencetak faktur invoice toko secara fleksibel tanpa harus melalui alur checkout reguler (sangat berguna untuk transaksi offline toko / walk-in customer / pemesanan korporat).
     - Menghasilkan nomor faktur unik otomatis berformat `INV-YYYYMMDD-XXXX`.
     - Kustomisasi identitas toko (nama toko, alamat, kontak WhatsApp).
     - Kustomisasi data pembeli (nama, kontak, alamat, metode penerimaan: ambil di toko / kurir).
     - Tabel daftar item dinamis: tambah produk, input SKU, jumlah, harga satuan, dan kalkulasi subtotal otomatis.
     - Penyesuaian diskon, biaya kirim, dan catatan garansi resmi toko.
     - Desain faktur resmi ramah cetak (print-ready stylesheet `@media print` dengan margin cetak rapi, tanda tangan penerima/kasir, dan stempel digital).

2. **Pengelolaan & Kustomisasi Nota Pesanan (`features/admin/OrderActionModal.tsx` & `actions/admin.ts`)**:
   * **Kustomisasi Faktur Pesanan Masuk (`updateAdminOrderInvoiceAction`)**:
     - Admin kini dapat mengedit data yang tercetak pada faktur pesanan riil: nama pembeli, nomor telepon, nama toko/cabang kustom, nomor pesanan tampil, dan catatan faktur khusus tanpa merusak integritas data akun auth pengguna.
     - Disimpan secara elegan ke `shipping_address.invoice_override` dan langsung direfleksikan pada tampilan faktur resmi ([`OrderInvoice.tsx`](file:///c:/web%20next%20penjualan/components/invoice/OrderInvoice.tsx)).
   * **Penghapusan Pesanan Terkendali (`deleteAdminOrderAction`)**:
     - Super Admin atau staf dengan izin `delete_orders` kini dapat menghapus pesanan tertentu dengan konfirmasi dialog modal yang aman.
     - Menghapus relasi terkait (`payments`, `order_items`) secara rapi dan mencatat audit aktivitas admin (*audit logging*).
   * **Tombol Segarkan Pesanan Realtime ([`OrderRefreshButton.tsx`](file:///c:/web%20next%20penjualan/features/admin/OrderRefreshButton.tsx))**:
     - Tombol "Segarkan" pada header manajemen pesanan untuk memuat ulang data tanpa harus me-refresh seluruh halaman browser.

3. **Arsitektur Failover LLM Multi-Provider & Tool Calling (`lib/llm-provider.ts` & `app/api/recommend/route.ts`)**:
   * **Multi-Provider Router (Groq ↔ Gemini)**:
     - Dibuat abstraksi provider LLM cerdas [`lib/llm-provider.ts`](file:///c:/web%20next%20penjualan/lib/llm-provider.ts) dengan failover otomatis (`executeWithFailover`).
     - Default urutan provider: Groq (kecepatan tinggi / `openai/gpt-oss-20b`) → Gemini (`gemini-2.5-flash`).
     - **Manajemen Cooldown Cerdas**: Jika salah satu provider terkena *rate limit* (HTTP 429), sistem otomatis menerapkan jeda cooldown dan mengarahkan seluruh request berikutnya ke provider cadangan tanpa menunggu timeout berulang.
     - **Parser Robust Llama Leaked Tools**: Mampu mendeteksi dan mengekstrak format tool-calling khusus model open-source (`<function=...>`, `<tool_call>`, `[TOOL_CALLS]`, blok JSON mandiri) menjadi format standar.
   * **Dukungan Testing & Unit Tests Baru**:
     - [`__tests__/api/llm-provider.test.ts`](file:///c:/web%20next%20penjualan/__tests__/api/llm-provider.test.ts) (10 tests)
     - [`__tests__/api/chatbot-tools.test.ts`](file:///c:/web%20next%20penjualan/__tests__/api/chatbot-tools.test.ts) (16 tests)
     - Sinkronisasi tes alur rekomendasi di [`__tests__/api/recommend-route.test.ts`](file:///c:/web%20next%20penjualan/__tests__/api/recommend-route.test.ts).

4. **Perbaikan OAuth Netlify & Forwarded Headers (`actions/auth.ts` & `app/auth/callback/route.ts`)**:
   * **Resolusi Asal Publik (Public Origin)**:
     - Memperbaiki alur otentikasi Google/GitHub OAuth saat di-deploy ke Netlify atau reverse proxy.
     - Menggunakan `x-forwarded-host` dan `x-forwarded-proto` serta `process.env.URL` / `NEXT_PUBLIC_SITE_URL` untuk menjamin redirect URL selalu menuju domain HTTPS publik yang valid, bukan `localhost` atau IP proxy internal.
   * **Sinkronisasi Cookie Server Client**:
     - Route callback menggunakan `createServerClient` (@supabase/ssr) dengan handler cookie eksplisit `getAll` dan `setAll` untuk menjamin token sesi Supabase tersimpan sempurna pada browser pengguna.

5. **Perapian Bento Layout & Footer Rebalancing**:
   * **Keseimbangan Kartu Bento Kategori ([`CategorySection.tsx`](file:///c:/web%20next%20penjualan/features/landing/CategorySection.tsx))**:
     - Layout flexbox horizontal yang responsif (`flex-1` teks di kiri dan gambar produk di kanan) memastikan gambar produk tidak pernah menimpa teks judul atau tombol "Explore category".
   * **Footer 12-Kolom Seimbang ([`Footer.tsx`](file:///c:/web%20next%20penjualan/components/layouts/Footer.tsx))**:
     - Memperbaiki tata letak footer menggunakan grid 12 kolom (`lg:grid-cols-12`) agar proporsi brand toko (4 kolom), grup tautan navigasi (5 kolom), kontak kami (3 kolom), dan lokasi cabang (12 kolom) terdistribusi merata dan elegan di desktop dan tablet.
   * **Aset Branding & Favicon Resmi**:
     - Penambahan ikon resmi aplikasi di `app/icon.png`, `app/apple-icon.png`, `public/icon.png`, `public/apple-icon.png`, dan `public/logo.png`.

6. **Hasil Pengujian & Verifikasi Kualitas Mutlak**:
   * **Unit Tests**: **36 test suites (406 tests)** lulus 100% tanpa error (`npx vitest run`).
   * **TypeScript Compilation**: `npx tsc --noEmit` bersih tanpa kesalahan (0 errors).
   * **ESLint**: `npm run lint` bersih **0 errors dan 0 warnings**.
   * **Production Build**: `npm run build` sukses mengompilasi seluruh **45/45 routes**.





---

## 24. Perbaikan Kritis Google OAuth Login Loop, Sinkronisasi Sesi Supabase SSR, dan Auto-Provisioning Profil Akun

1. **Penyesuaian Presisi Callback URI dengan Allowlist Supabase ([`actions/auth.ts`](file:///c:/web%20next%20penjualan/actions/auth.ts))**:
   * **Penyebab**: Sebelumnya helper `getOAuthRedirect` selalu menambahkan query parameter paksa `?next=%2Fprofile` pada URL callback (`http://localhost:3000/auth/callback?next=%2Fprofile`). Hal ini menyebabkan URL ditolak oleh allowlist Supabase Dashboard yang didaftarkan sebagai `http://localhost:3000/auth/callback` (tanpa wildcard query), sehingga Supabase membatalkan callback otentikasi.
   * **Solusi**: Menghapus query parameter redundant jika target redirect adalah default `/profile`. URL callback yang dikirim ke Google/Supabase kini persis `http://localhost:3000/auth/callback` yang 100% cocok dengan allowlist Supabase.

2. **Sinkronisasi Sesi, Cookie SSR, dan Auto-Provisioning Profil ([`app/auth/callback/route.ts`](file:///c:/web%20next%20penjualan/app/auth/callback/route.ts))**:
   * **Pengambilan Data User Langsung**:
     - Mengambil `data.user` langsung dari hasil `exchangeCodeForSession(code)` (`const user = data?.user ?? (await supabase.auth.getUser()).data?.user`), mengatasi masalah kegagalan `getUser()` akibat cookie sesi yang belum ter-commit ke request headers awal.
   * **Penyimpanan Sesi & Flag Cookie Dinamis**:
     - Melacak cookie secara aktif menggunakan `cookieMap` internal dan `cookies()` dari `next/headers`.
     - Menyematkan seluruh cookie sesi Supabase (`cookiesToSetList`) secara eksplisit ke header respons 302 redirect (`redirectResponse.cookies.set`).
     - Mengatur flag `secure` secara dinamis: `false` pada `http://localhost:3000` (agar browser tidak menolak cookie di lingkungan HTTP) dan `true` pada domain HTTPS produksi.
   * **Auto-Provisioning Profil Database & Keranjang**:
     - Sebelum redirect selesai, server meng-upsert profil user baru ke tabel `public.users` (nama lengkap, avatar Google, role default `customer`).
     - Memastikan record keranjang (`public.cart`) terinisialisasi untuk user tersebut, mencegah kegagalan foreign key saat menambah produk ke keranjang.
     - Mencegah middleware menganggap akun sebagai `'missing'` yang sebelumnya memicu pembersihan sesi paksa (`clearDeletedUserSession`) dan menyebabkan looping login.
     - Jika akun memiliki role `admin` atau `super_admin`, otomatis diarahkan ke `/admin`.

3. **Visibilitas Pesan Kesalahan OAuth pada UI ([`app/login/page.tsx`](file:///c:/web%20next%20penjualan/app/login/page.tsx))**:
   * State `error` pada form login diinisialisasi secara deklaratif membaca query parameter `?error=...` dari URL tanpa memicu render bertingkat (sesuai standar React 19).
   * Menampilkan pesan kesalahan secara transparan pada banner alert jika Google OAuth atau Supabase mengalami penolakan otentikasi.

4. **Hasil Verifikasi Kualitas**:
   * **Unit Tests**: **36 test files, 406 tests lulus (100% pass)** (`npx vitest run`).
   * **TypeScript Compilation**: Bersih tanpa kesalahan (`npx tsc --noEmit`).
   * **ESLint**: Bersih **0 errors, 0 warnings** (`npm run lint`).
   * **Production Build**: Seluruh **45/45 routes** sukses terkompilasi (`npm run build`).


---

## 25. Sistem Analitik Bisnis Terintegrasi, Indikator Loading Global & Navigasi, Faktur Penjualan Modular, Kustomisasi Brand Multi-Warna, dan Manajemen Marketplace Multi-Sumber

Dokumentasi ini merangkum pengembangan menyeluruh pada sistem analisis bisnis, pengalaman navigasi responsif, tata letak faktur penjualan presisi, standarisasi identitas brand visual, serta fleksibilitas pengelolaan gambar marketplace offline dan online.

### 1. Sistem Analitik & Pelacakan First-Party Mandiri (`public.analytics_events`)
* **Skema Database & Keamanan Ketat (`supabase/migrations/20261112000000_analytics_events_and_tracking.sql`)**:
  - Dibuat tabel aditif `public.analytics_events` tanpa mengubah atau merusak skema e-commerce yang sudah ada.
  - Memiliki indeks performa tinggi pada kolom `(created_at DESC)`, `(event_name, created_at DESC)`, `visitor_id`, `session_id`, `product_id`, dan `path`.
  - Dilengkapi Row Level Security (RLS): Pembacaan data analitik hanya diizinkan bagi akun dengan status admin (`is_admin()`), sedangkan penulisan dibatasi ketat melalui validasi event name.
* **Pipeline Event & Endpoint Terproteksi (`app/api/analytics/event/route.ts`)**:
  - Endpoint dilengkapi Zod schema validation, sanitasi payload metadata, dan sliding-window rate limiter per IP/client untuk mencegah spam request.
  - Tracker client-side (`lib/analytics/tracker.ts` & `components/providers/AnalyticsTracker.tsx`) mencatat alur interaksi belanja: `page_view`, `view_item`, `search`, `add_to_cart`, `begin_checkout`, dan `ai_recommendation_click` tanpa mencatat informasi pribadi (PII) sensitif.
* **Mesin Agregasi & Visualisasi Laporan (`lib/analytics-reporting.ts` & `app/admin/reports/page.tsx`)**:
  - Dashboard analitik interaktif di `/admin/reports` menampilkan:
    * Corong Konversi (*Conversion Funnel*): dari kunjungan, lihat produk, tambah ke keranjang, hingga checkout.
    * Tingkat Drop-off Pelanggan pada setiap tahapan belanja.
    * Distribusi lalu lintas pengunjung berdasarkan jenis perangkat (*Device Type*), sumber perujuk (*Referrer Domain*), dan kampanye marketing (*UTM Parameters*).
    * Analisis efektivitas rekomendasi Asisten AI dalam mendorong konversi penjualan.
    * Ekspor multi-sheet Excel (.xlsx) komprehensif (`lib/analytics-exports.ts`) mencakup ringkasan KPI, funnel, traffic, dan rincian transaksi.

### 2. Indikator Loading Global, Feedback Interaktif, dan Progress Bar Halaman
* **Progress Bar Navigasi Atas (`components/providers/NavigationProgress.tsx`)**:
  - Bar navigasi halus (*top loading bar*) terpasang di layout utama (`app/layout.tsx`), memberikan umpan balik visual instan saat pengunjung maupun admin berpindah rute antar-halaman.
* **Loading State Rute Global & Admin (`app/loading.tsx` & `app/admin/loading.tsx`)**:
  - Tampilan spinner modern dan indikator transisi rute halus saat menunggu data server siap.
* **Feedback Loading Form Login & Register (`app/login/page.tsx` & `app/register/page.tsx`)**:
  - Tombol submit "Masuk" dan "Daftar" kini menampilkan animasi spinner berputar dinamis dan teks "Memproses masuk..." saat proses otentikasi berlangsung.
  - Tombol otomatis dalam kondisi `disabled` untuk mencegah submit ganda (*double request*).

### 3. Penjelasan Otomatisasi Stok pada Pesanan Batal / Refund
* **Mekanisme Database Trigger**:
  - Pada sistem penjualan Next Solution, ketika pesanan dibatalkan atau status pembayaran beralih ke `cancelled` atau `refunded`, kuantitas stok dari setiap produk dalam pesanan tersebut **secara otomatis dikembalikan ke inventaris** oleh trigger database PostgreSQL (`restore_stock_on_order_cancel` / `update_stock_on_order_status_change`).
  - Admin toko **tidak perlu melakukan penyesuaian manual**; stok produk langsung bertambah kembali secara akurat.

### 4. Desain Ulang Faktur Penjualan Manual (`features/admin/ManualInvoiceManager.tsx`)
* **Pencetakan / PDF Bersih Tanpa Header & Footer Browser**:
  - Diterapkan styling scoped `@media print` dan `@page { size: A4 portrait; margin: 0mm !important; }` yang menghilangkan teks judul tab, URL `http://localhost:3000/...`, nomor halaman, dan waktu cetak dari browser.
* **Border Rapi & Penyelarasan Presisi**:
  - Seluruh tabel item produk kini dibungkus kontainer bersatu dengan border konsisten, tanpa garis yang terpotong.
  - Kotak ringkasan Subtotal, Diskon, Ongkir, dan Total Akhir disejajarkan sempurna (*exact vertical alignment*) dengan tabel produk.
* **Nama Toko Modular & Kustomisasi Warna Per Kata**:
  - Nama toko di header faktur tidak lagi berupa gambar mati yang menyatu.
  - Admin dapat mengonfigurasi:
    * **Kata 1**: Teks (default: `NEXT`) + Pemilih warna hex / color picker (default: `#DC2626` merah).
    * **Kata 2**: Teks (default: `SOLUTION`) + Pemilih warna hex / color picker (default: `#0048BA` biru).
    * **Toggle Lambang Logo S**: Opsi menampilkan atau menyembunyikan simbol S resmi di samping teks.
  - Identitas catatan kaki bawah faktur juga otomatis tersinkronisasi mengikuti pengaturan kata dan warna tersebut.
* **Cap / Stempel Resmi Area Tanda Tangan**:
  - Disediakan stempel lingkaran ganda berlogo resmi Next Solution (Lambang S + NEXT + SOLUTION + OFFICIAL STORE).
  - Dilengkapi toggle aktif/nonaktif stempel, serta kolom isian judul penutup, nama penandatangan, dan jabatan kasir/admin yang dapat diketik bebas.

### 5. Standarisasi Brand Visual & Fleksibilitas Content Manager
* **Admin Sidebar Header (`components/layouts/AdminSidebar.tsx`)**:
  - Logo lambang S di sisi kiri dipadukan dengan teks horizontal memanjang ke samping: <span style="color:#DC2626; font-weight:bold; font-style:italic;">NEXT</span> <span style="color:#0048BA; font-weight:bold; font-style:italic;">SOLUTION</span> dan label `ADMIN PANEL` di bawahnya. Tampilan tidak lagi bertumpuk sempit.
* **Navbar Toko (`components/layouts/Navbar.tsx`)**:
  - Mode tampilan header default disetel ke `logo_only`.
  - Menampilkan **hanya gambar lambang logo S saja** di pojok kiri atas tanpa teks "Next Solution" yang menempel, menghasilkan tampilan navbar yang bersih dan modern.
* **Footer Toko (`components/layouts/Footer.tsx`)**:
  - Logo toko di area footer diperbesar secara proporsional (`h-16 sm:h-20` dengan batas lebar `max-w-[260px]`) agar jelas dan gagah.
* **Admin Content Manager (`features/admin/StorefrontSettingsManager.tsx`)**:
  - Tab "Logo & Identitas Toko" kini menyediakan kontrol pengaturan teks & warna per-kata (Kata 1 & Kata 2) lengkap dengan tombol *"Set Warna Asli (NEXT Merah / SOLUTION Biru)"*.
  - Kotak Pratinjau Langsung (*Live Preview*) seketika merefleksikan perubahan warna brand untuk Header Toko maupun Header Admin.

### 6. Manajemen Marketplace Multi-Sumber (Local Upload & Online Image)
* **Upload Foto dari File Lokal**:
  - Ditambahkan tombol **"Upload Foto"** pada setiap baris pengaturan marketplace di `/admin/content`.
  - Admin dapat mengunggah gambar logo kustom langsung dari PC/HP lokal (mendukung PNG, JPG, WebP, AVIF, dan SVG yang otomatis dikonversi ke WebP tajam).
  - File disimpan langsung ke bucket storage `brands` Supabase toko.
* **Dukungan Link Gambar Online Bebas Blokir**:
  - Komponen `PlatformLogo` (`components/shared/BrandLogos.tsx`) dilengkapi dengan `referrerPolicy="no-referrer"` dan `crossOrigin="anonymous"`. Hal ini mencegah pemblokiran hotlink 403 Forbidden saat menggunakan link gambar dari website luar (Tokopedia, Shopee, Google, dsb.).
  - Jika link gambar online sewaktu-waktu mati, sistem secara otomatis beralih (*fallback*) ke logo SVG standar platform tanpa merusak tata letak.
* **Fitur "Simpan Cloud"**:
  - Ditambahkan server action `saveExternalImageUrlAction` (`actions/admin.ts`).
  - Ketika link online dimasukkan, muncul tombol **"Simpan Cloud"** yang memungkinkan pengunduhan otomatis ke Supabase Storage toko Anda, memastikan aset gambar tetap tersimpan selamanya.
* **Tombol "Reset Icon Standar"**:
  - Opsi satu klik untuk mengembalikan logo ke SVG bawaan platform tanpa perlu menghapus isian secara manual.

### 7. Hasil Pengujian & Verifikasi Kualitas
* **Unit & Integration Tests**: Seluruh **37 file tes dan 423 pengujian lulus (100% Passed)** melalui `npx vitest run`.
* **TypeScript Compilation**: Bersih tanpa kesalahan apapun (`npx tsc --noEmit` exit code 0).
