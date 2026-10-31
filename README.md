<div align="center">

<img src="public/logo.png" alt="Next Solution Logo" width="120" />

# Next Solution Store

**Platform E-Commerce Toko Laptop & Elektronik berbasis Next.js + Supabase**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest-6E9F18?logo=vitest)](https://vitest.dev/)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify)](https://netlify.com/)

</div>

---

## 📋 Deskripsi Proyek

**Next Solution Store** adalah aplikasi web e-commerce lengkap untuk toko komputer, laptop, dan aksesori elektronik. Dibangun dengan teknologi modern (Next.js App Router, React 19, TypeScript, Supabase), platform ini mencakup:

- 🛍️ **Storefront publik** — halaman belanja yang lengkap dan responsif
- ⚙️ **Admin Panel** — manajemen produk, pesanan, voucher, konten, dan laporan bisnis
- 🤖 **AI Chatbot** — asisten rekomendasi produk berbasis Gemini & Groq LLM
- 🔒 **Keamanan berlapis** — RLS Supabase, SSRF protection, server-side validation

---

## ✨ Fitur Utama

### 🏪 Storefront (Halaman Publik)

| Fitur | Keterangan |
|---|---|
| **Landing Page** | Hero banner carousel, Promo Pilihan, Kategori, Produk Terbaru & Terlaris, Tentang Kami |
| **Katalog Produk** | Filter kategori, brand, harga, spesifikasi (Processor, RAM, Storage, GPU, Display) |
| **Pencarian** | Full-text search berdasarkan nama, SKU, brand, spesifikasi, dan label badge |
| **Badge Produk** | Label **Baru**, **Terlaris**, **Promo** dengan tampilan visual |
| **Halaman Promo** | Halaman khusus `/promo` menampilkan semua produk dengan tag Promo |
| **Detail Produk** | Galeri gambar + lightbox, varian (warna/RAM/storage), spesifikasi, ulasan pelanggan |
| **Perbandingan** | Bandingkan hingga 3 produk secara berdampingan |
| **Wishlist** | Simpan produk favorit |
| **Keranjang** | Manajemen item keranjang belanja |

### 🛒 Checkout & Pembayaran

| Fitur | Keterangan |
|---|---|
| **3-Step Wizard** | Keranjang → Pengiriman & Pembayaran → Selesai |
| **Metode Pengiriman** | Ambil di Toko (Pickup) atau Kirim (Delivery) |
| **Metode Pembayaran** | Transfer Bank, Pembayaran QRIS, Bayar Tunai di Kasir |
| **Voucher / Diskon** | Kode kupon dengan validasi server-side |
| **Invoice / Faktur** | Auto-generate faktur penjualan per pesanan |
| **Informasi Pembayaran** | Ditampilkan sesuai metode: rekening bank / QR code / info kasir |
| **Konfirmasi WhatsApp** | Tombol kirim bukti transfer langsung ke WhatsApp Admin |

### ⚙️ Admin Panel (`/admin`)

| Modul | Fitur |
|---|---|
| **Dashboard** | Statistik ringkas: total pesanan, pendapatan, produk, pelanggan |
| **Analitik & Laporan** | Grafik penjualan, laporan produk terlaris, ekspor laporan |
| **Manajemen Produk** | CRUD lengkap, varian, galeri gambar, badge, harga |
| **Import Massal** | Upload pricelist Excel (Lenovo, ASUS, dll.) dengan mapping otomatis |
| **Sinkronisasi Stok** | Sync stok dari file Excel pricelist brand |
| **Kategori & Brand** | Manajemen kategori, brand dengan logo |
| **Pesanan** | Daftar pesanan, filter status, update status, detail pesanan |
| **Faktur Manual** | Buat faktur manual untuk transaksi offline |
| **Voucher** | Buat & kelola kode diskon dengan batas penggunaan & masa berlaku |
| **Pelanggan & Staf** | Manajemen akun pelanggan dan staf |
| **Landing Page** | Edit konten hero banner, promo pilihan, seksi, banner |
| **Fitur & Pengaturan** | Nomor WhatsApp, QRIS, info pickup, rekening bank, pengaturan toko |
| **Log Aktivitas** | Rekam semua aktivitas admin |

### 🤖 AI Chatbot

- Asisten rekomendasi produk berbasis **Groq LLM** (primary) + **Google Gemini** (fallback)
- Context-aware: chatbot memahami percakapan sebelumnya
- Pengetahuan multi-brand: Lenovo, ASUS, dan lainnya

### 🔐 Keamanan

- **Row Level Security (RLS)** Supabase — setiap query tervalidasi di level database
- **SSRF Protection** — validasi URL pada saat download gambar eksternal
- **SVG XSS Scanning** — sanitasi file SVG sebelum disimpan
- **Server-side Checkout Validation** — harga & stok divalidasi ulang di server
- **Role-based Access** — customer / admin / super-admin
- **Security Headers** — CSP, X-Frame-Options, HSTS via `next.config.ts`

### ⚡ Performa

- **Next.js Image Optimization** — AVIF/WebP, cache 30 hari
- **Lazy loading** pada product card
- **Graceful image fallback** ketika gambar gagal dimuat
- **Framer Motion** untuk animasi yang ringan dan smooth

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **Animasi** | Framer Motion |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth + Google OAuth (GIS) |
| **Storage** | Supabase Storage (gambar produk, QRIS, logo) |
| **State Management** | Zustand |
| **Form Handling** | React Hook Form + Zod |
| **Rich Text Editor** | Tiptap |
| **AI / LLM** | Groq API + Google Gemini API |
| **Excel Import** | ExcelJS |
| **Testing** | Vitest |
| **Deployment** | Netlify |

---

## 📁 Struktur Folder

```
c:\webnext\
├── app/                        # Next.js App Router
│   ├── (public routes)
│   │   ├── page.tsx            # Landing page
│   │   ├── products/           # Katalog produk
│   │   ├── product/[slug]/     # Detail produk
│   │   ├── promo/              # Halaman promo
│   │   ├── brands/             # Halaman brand
│   │   ├── category/           # Halaman kategori
│   │   ├── cart/               # Keranjang belanja
│   │   ├── checkout/           # Alur checkout 3-step
│   │   ├── orders/             # Riwayat pesanan
│   │   ├── wishlist/           # Wishlist
│   │   ├── compare/            # Perbandingan produk
│   │   ├── profile/            # Profil pengguna
│   │   ├── login/              # Login
│   │   ├── register/           # Register
│   │   └── about/              # Tentang Kami
│   ├── admin/                  # Admin Panel (protected)
│   │   ├── page.tsx            # Dashboard admin
│   │   ├── products/           # Manajemen produk
│   │   ├── orders/             # Manajemen pesanan
│   │   ├── vouchers/           # Manajemen voucher
│   │   ├── customers/          # Manajemen pelanggan
│   │   ├── brands/             # Manajemen brand
│   │   ├── categories/         # Manajemen kategori
│   │   ├── invoices/           # Faktur manual
│   │   ├── stock-sync/         # Sinkronisasi stok
│   │   ├── reports/            # Laporan bisnis
│   │   ├── content/            # Manajemen konten landing
│   │   ├── logs/               # Log aktivitas
│   │   └── about/              # Tentang toko
│   └── api/                    # API Routes (server-side)
├── components/                 # Komponen React reusable
├── lib/                        # Utility functions, Supabase clients
├── hooks/                      # Custom React hooks
├── stores/                     # Zustand state stores
├── types/                      # TypeScript type definitions
├── supabase/
│   └── migrations/             # SQL migration files
├── public/                     # Static assets
├── scripts/                    # Node.js helper scripts
├── .env.example                # Template environment variables
├── netlify.toml                # Konfigurasi deployment Netlify
└── next.config.ts              # Konfigurasi Next.js
```

---

## 🚀 Instalasi & Setup Lokal

### Prasyarat

Pastikan sudah terinstall:

- **Node.js** v20 atau lebih baru — [nodejs.org](https://nodejs.org/)
- **npm** v10+ (sudah termasuk bersama Node.js)
- **Git** — [git-scm.com](https://git-scm.com/)
- **Akun Supabase** (gratis) — [supabase.com](https://supabase.com/)
- **Supabase CLI** (opsional, untuk push migrasi) — [Install Supabase CLI](https://supabase.com/docs/guides/cli)

---

### Langkah 1 — Clone Repository

```bash
git clone https://github.com/moannn27/webpenjualannext.git
cd webpenjualannext
```

### Langkah 2 — Install Dependencies

```bash
npm install
```

### Langkah 3 — Setup Environment Variables

Salin file template environment:

```bash
cp .env.example .env.local
```

Buka `.env.local` dan isi semua nilai yang diperlukan (lihat tabel di bawah).

### Langkah 4 — Setup Project Supabase

1. Buka [supabase.com](https://supabase.com/) → buat project baru
2. Pergi ke **Project Settings → API** dan salin:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon (public) key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### Langkah 5 — Jalankan Migrasi Database

Pastikan Supabase CLI sudah terinstall dan sudah login (`supabase login`), lalu hubungkan project:

```bash
supabase link --project-ref <your-project-ref>
npm run db:push
```

Perintah ini akan menjalankan semua file migrasi di folder `supabase/migrations/` secara berurutan, termasuk:
- `initial_schema` — Tabel utama (produk, pesanan, pelanggan, dll.)
- `checkout_rpc` — Stored procedure untuk proses checkout
- `storage_setup` — Konfigurasi bucket Supabase Storage
- `rls_setup` — Row Level Security policies
- `vouchers_indexes_setup` — Index untuk performa query voucher

### Langkah 6 — Setup Admin Pertama

1. Setelah migrasi berjalan, daftarkan akun baru melalui `/register`
2. Di Supabase Dashboard → **Table Editor → `profiles`**, ubah kolom `role` akun tersebut menjadi `super_admin`
3. Login kembali, lalu akses `/admin`

### Langkah 7 — Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 🔑 Variabel Environment

| Variable | Keterangan | Wajib |
|---|---|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase kamu | ✅ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon/public key Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | ✅ |
| `NEXT_PUBLIC_SITE_URL` | URL publik website (e.g. `http://localhost:3000`) | ✅ |
| `GROQ_API_KEY` | API key Groq untuk AI Chatbot (primary LLM) | Opsional |
| `GROQ_MODEL` | Model Groq yang digunakan | Opsional |
| `GEMINI_API_KEY` | API key Google Gemini (fallback LLM) | Opsional |
| `GEMINI_MODEL` | Model Gemini yang digunakan | Opsional |
| `LLM_PROVIDER_ORDER` | Urutan provider LLM (e.g. `groq,gemini`) | Opsional |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google Client ID untuk login Google (GIS) | Opsional |

> **⚠️ Perhatian:** Jangan pernah menggunakan prefix `NEXT_PUBLIC_` untuk `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, atau `GEMINI_API_KEY`. Variabel tersebut hanya boleh diakses di sisi server.

---

## 🧪 Menjalankan Test

```bash
npm test
```

Atau dengan detail output:

```bash
npx vitest run --reporter=verbose
```

Proyek ini mencakup **40+ test suite** dengan pengujian unit dan integrasi menggunakan Vitest.

---

## 🌐 Deployment ke Netlify

Project ini sudah dikonfigurasi untuk Netlify via `netlify.toml`.

**Langkah deploy:**

1. Push repository ke GitHub
2. Login ke [netlify.com](https://netlify.com/) dan klik **Add new site → Import from Git**
3. Pilih repository ini
4. Netlify akan otomatis mendeteksi konfigurasi build dari `netlify.toml`
5. Di **Site Settings → Environment Variables**, tambahkan semua variabel dari `.env.example` dengan nilai production
6. Klik **Deploy Site**

> **Catatan:** Pastikan `NEXT_PUBLIC_SITE_URL` diisi dengan URL production (bukan localhost) sebelum deploy.

---

## 🔧 Scripts yang Tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk production |
| `npm start` | Jalankan server production |
| `npm run lint` | Jalankan ESLint |
| `npm test` | Jalankan semua test (Vitest) |
| `npm run db:push` | Push semua migrasi ke Supabase |
| `npm run catalog:images:audit` | Audit gambar produk (verifikasi URL) |
| `npm run catalog:images:sync` | Sinkronisasi gambar produk dari seed |

---

## 👤 Akses Admin Panel

Setelah setup selesai:

1. Buka `/admin` — akan redirect ke halaman login jika belum authenticated
2. Login dengan akun yang sudah di-set sebagai `admin` atau `super_admin`
3. Gunakan sidebar untuk navigasi antar modul

**Pengaturan awal yang dianjurkan setelah login pertama:**
- **Fitur & Pengaturan** → isi nomor WhatsApp, upload QRIS, tambah rekening bank, atur info pickup
- **Brand** → tambah brand yang dijual
- **Kategori** → tambah kategori produk
- **Produk** → tambah produk pertama atau gunakan **Upload Massal** dari file Excel pricelist

---

## 📄 Lisensi

Proyek ini bersifat **privat** dan dikembangkan untuk keperluan internal **Next Solution**.  
Semua hak cipta dilindungi © 2026 Next Solution.

---

<div align="center">
  <strong>Next Solution</strong> — Pusat Komputer, Laptop & Solusi Elektronik Resmi<br/>
  Jl. Kartini No.09 · <a href="mailto:support@nextsolution.id">support@nextsolution.id</a>
</div>
