# Next Solution Store 💻🛒

> **E-Commerce & Retail Management System Modern** untuk toko komputer, laptop, gadget, periferal, dan layanan IT. Dibangun secara *full-stack* dengan teknologi mutakhir: **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **TypeScript**, dan **Supabase (PostgreSQL, Auth, Storage)**.

Dilengkapi dengan **Asisten Rekomendasi Cerdas bertenaga AI (Groq & Gemini failover)**, **Sistem Mass Upload V2 Multi-Format (XLSX, CSV, DOCX, PDF)**, **Sinkronisasi Stok Gudang Real-Time**, serta **Panel Admin Komprehensif**.

---

## 🌟 Fitur Utama Website

### 1. 🛍️ Etalase Toko Modern (*Storefront*)
- **Katalog Multi-Brand & Multi-Kategori**: Jelajahi produk ASUS, Lenovo, Acer, MSI, HP, Axioo, Advan, Apple, Samsung, Logitech, Razer, dan puluhan merek IT ternama lainnya.
- **Kategori Lengkap**: Laptop (Gaming, Bisnis, Pelajar), PC Desktop & All-in-One (AIO), Monitor, Smartphone, Tablet, Audio, Aksesoris, Penyimpanan (RAM/SSD), dan Printer.
- **Konsolidasi Varian & Sinkronisasi Galeri**: Satu produk induk dengan banyak pilihan warna, kapasitas RAM, dan SSD. Memilih warna akan secara otomatis memperbarui tampilan gambar produk utama.
- **Keranjang Belanja Persisten**: Belanjaan tersimpan di peramban pembeli dengan dukungan update kuantitas seketika.
- **Alur Checkout & Pilihan Pengiriman**:
  - Ambil di Toko (*Store Pickup*) dengan peta lokasi interaktif gerai (Leaflet).
  - Kirim ke Alamat pembeli dengan input kontak WhatsApp aktif.
  - Pilihan pembayaran: Transfer Bank (BCA, Mandiri, BRI, BNI), QRIS, atau Bayar Tunai di Tempat.
  - Integrasi WhatsApp satu-klik untuk langsung mengirimkan rincian pesanan dan konfirmasi bukti bayar ke admin toko.
- **Portal Akun Pelanggan**: Login aman (Email/Password & Google One-Tap GIS), riwayat transaksi, pelacakan status pesanan secara *real-time*, dan unduh faktur digital.

### 2. 🤖 Asisten Chatbot AI Rekomendasi (*Smart Sales Consultant*)
- **Konsultasi Kebutuhan Real-Time**: Memberikan rekomendasi perangkat yang tepat berdasarkan kebutuhan (kuliah, skripsi, kerja kantoran, desain grafis/Revit/Adobe, hingga gaming berat).
- **Retensi Konteks Cerdas**: Mengingat topik percakapan sebelumnya sehingga rekomendasi tetap relevan saat pengguna mengubah rentang budget (misal: use-case sekolah tidak akan melompat ke gaming).
- **Multi-Brand Tanpa Bias**: Memberikan alternatif dari berbagai merk yang tersedia di etalase toko.
- **Penyaringan Stok Fisik Ketat**: Hanya menampilkan unit yang memiliki stok fisik aktif (`stok > 0`); produk yang habis tidak akan disodorkan.
- **Arsitektur Hybrid Failover**: Sistem beralih otomatis antara Groq API (`gpt-oss-20b`) dan Google Gemini (`gemini-3.5-flash`) jika salah satu provider mengalami limit kuota atau gangguan jaringan.

### 3. ⚙️ Panel Manajemen Admin Komprehensif
- **Dashboard & Analitik**: Ringkasan omzet penjualan, grafik pesanan, produk terlaris, dan data pelanggan.
- **Mass Upload V2 (Multi-Format)**: Unggah ribuan produk sekaligus dari berkas **Excel (.xlsx)**, **CSV**, **Word (.docx)**, maupun **PDF Pricelist Distributor** dengan auto-detect varian, validasi harga, dan pencegahan duplikasi SKU.
- **Sinkronisasi Stok Gudang**: Pembaruan stok berkala dari file Excel gudang dengan modal konfirmasi ramah, indikator animasi proses, dan popup konfirmasi sukses.
- **Manajemen Produk, Kategori, & Brand**: Manajemen inventaris penuh dengan proteksi *orphan products* (produk wajib dipindahkan ke taksonomi pengganti sebelum kategori/brand dihapus).
- **Manajemen Pesanan & Faktur Manual**: Verifikasi pembayaran transfer, cetak struk/faktur resmi, dan pembuatan pesanan manual untuk transaksi offline.
- **Voucher & Promosi**: Kode kupon diskon nominal rupiah atau persentase dengan syarat minimal belanja dan kuota penggunaan.
- **Manajemen Staf & Keamanan Berjenjang (RBAC)**: Pengelolaan staf toko dengan pemisahan wewenang ketat antara Super Admin dan Admin biasa.
- **Pengaturan Toko & FAQ Rich-Text**: Kelola profil toko, rekening bank, tautan WhatsApp, lokasi peta, dan konten edukasi menggunakan Tiptap Rich-Text Editor.

---

## 🛠️ Tumpukan Teknologi (*Tech Stack*)

| Lapisan | Teknologi |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router dengan `proxy.ts` middleware) |
| **Frontend UI** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/) |
| **State Management** | [Zustand 5](https://zustand.docs.pmnd.rs/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL dengan RLS, Supabase Auth, Supabase Storage) |
| **AI / LLM Engine** | [Groq Cloud](https://groq.com/) & [Google Gemini 2.5/3.5](https://ai.google.dev/) (Failover Routing) |
| **Document Parsers** | ExcelJS, Mammoth, Cheerio, PDF-Parse |
| **Testing Suite** | [Vitest 4](https://vitest.dev/) (485 Unit & Integration Tests) |
| **Type Checking** | TypeScript 5 (Strict Mode) |

---

## 📋 Prasyarat Sistem (*Prerequisites*)

Pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi 20.x atau 22.x LTS (disarankan v22+).
- **npm** (atau **pnpm** / **yarn**).
- **Git** untuk *version control*.
- **Akun Supabase**: Proyek aktif untuk database PostgreSQL, Auth, dan Storage.

---

## 🚀 Panduan Instalasi & Menjalankan Lokal

### 1. Clone Repository
```bash
git clone https://github.com/moannn27/webpenjualannext.git
cd webpenjualannext
```

### 2. Install Dependensi
```bash
npm install
# atau
npm ci
```

### 3. Konfigurasi Lingkungan (`.env.local`)
Salin file konfigurasi contoh `.env.example` menjadi `.env.local`:
```bash
# Windows (PowerShell)
Copy-Item .env.example .env.local

# Linux / macOS
cp .env.example .env.local
```

Buka `.env.local` dan lengkapi variabel berikut:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-or-anon-key

# Service Role Key (Wajib untuk fungsi admin & invitation; Hanya server-side, JANGAN beri prefix NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# AI Chatbot LLM Providers (Server-side only)
# Provider 1: Groq API
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b

# Provider 2: Google Gemini API (Failover)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash

# Provider Order
LLM_PROVIDER_ORDER=groq,gemini

# Google Identity Services (GIS) / Social Login (Opsional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### 4. Setup Database Supabase
Jika Anda menghubungkan ke proyek Supabase baru, terapkan migrasi database yang ada di folder `supabase/migrations/`:
```bash
npm run db:push
```
> *Catatan: Jika menggunakan database remote yang sudah terisi data aktif, jangan lakukan reset schema.*

### 5. Jalankan Server Pengembangan (*Development Server*)
```bash
npm run dev
```
Buka peramban Anda di [http://localhost:3000](http://localhost:3000).

---

## 🧪 Pengujian & Validasi Kode (*Testing & Quality*)

Proyek ini dilengkapi dengan cakupan pengujian otomatis yang komprehensif:

```bash
# Menjalankan seluruh unit test (Vitest)
npm run test

# Menjalankan pengecekan tipe data TypeScript
npx tsc --noEmit

# Menjalankan linter ESLint
npm run lint

# Membangun aplikasi untuk produksi (Production Build)
npm run build
```

### Skrip Utilitas Tambahan:
- **Audit URL Gambar Produk**: `npm run catalog:images:audit`
- **Sinkronisasi Gambar Katalog Default**: `npm run catalog:images:sync`

---

## 📁 Struktur Direktori Utama

```text
├── actions/             # Next.js Server Actions (admin, user, checkout, auth)
├── app/                 # Next.js 16 App Router (halaman etalase, admin, dan API routes)
│   ├── admin/           # Halaman dasbor panel admin
│   ├── api/             # API Endpoints (/api/recommend, /api/admin/...)
│   ├── checkout/        # Halaman checkout & pembayaran
│   ├── product/[id]/    # Halaman detail produk
│   └── profile/         # Halaman portal akun pelanggan
├── components/          # Komponen UI global (Navbar, Footer, Modal, Button)
├── features/            # Modul fitur terisolasi (admin, checkout, product, profile)
├── lib/                 # Utilitas inti (Supabase client/middleware, auth, rate-limit, AI assistant)
├── proxy.ts             # Next.js Proxy/Middleware gerbang keamanan sesi & rute terlindungi
├── public/              # Berkas aset statis (logo, ikon, gambar default)
├── supabase/            # Migrasi database PostgreSQL dan konfigurasi Supabase
├── __tests__/           # Rangkaian pengujian unit & integrasi (Vitest)
└── docs/                # Dokumentasi teknis terperinci
```

---

## 🔒 Praktik Keamanan & Perlindungan Data

- **Cryptographic Auth Verification**: Menggunakan `supabase.auth.getUser()` untuk memvalidasi token sesi pengguna secara kriptografis ke server autentikasi Supabase.
- **Fail-Closed RBAC**: Akses admin dilindungi berjenjang (`requireModulePermission`). Pembuatan dan penyetelan akun admin dibatasi khusus untuk Super Admin.
- **Anti-Brute Force**: Akun terkunci otomatis setelah 3x gagal memasukkan kata sandi dan status terkunci dicatat pada `app_metadata` (sisi server otoritatif).
- **Proteksi XSS Upload Berkas**: Penolakan berkas bertipe SVG dan HTML pada avatar dan ulasan untuk mencegah serangan *Stored Cross-Site Scripting*.
- **Anti-Spoofing Rate Limiting**: Proteksi endpoint AI asisten dari manipulasi header proxy dan serangan bot.
- **HTTP Security Headers**: Header keamanan standar (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`) aktif di seluruh respons server.

---

## 📖 Dokumentasi Lanjutan

Untuk panduan teknis yang lebih spesifik, silakan buka dokumen di direktori `docs/`:
- [Setup PC Baru & Deployment](docs/SETUP_PC_BARU.md)
- [Panduan Penggunaan Toko](docs/PANDUAN_PENGGUNAAN.md)
- [Panduan Mass Upload & Branding](docs/PANDUAN_MASS_UPLOAD_DAN_BRANDING.md)
- [Panduan Galeri Varian & Manifest Gambar](docs/PANDUAN_GALERI_VARIAN_DAN_MANIFEST.md)
- [Panduan Keamanan & Deploy Netlify](docs/PANDUAN_OPTIMASI_SECURITY_DAN_DEPLOY_NETLIFY.md)
- [Dokumentasi Optimasi Performance & Aksesibilitas](docs/DOKUMENTASI_OPTIMASI_PERFORMANCE_DAN_A11Y.md)

---

## 📄 Lisensi & Pemilik

Dikembangkan untuk **Next Solution Store**. Hak cipta dilindungi undang-undang.
