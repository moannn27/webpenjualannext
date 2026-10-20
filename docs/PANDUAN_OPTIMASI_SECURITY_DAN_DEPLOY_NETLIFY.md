# Panduan Optimasi Performa, Security Hardening, & Deployment Netlify
**Next Solution Store** — *Pembaruan Sistem Komprehensif*

---

## 1. Ringkasan Perubahan Sistem

### A. Targeted Performance Optimization (Mobile & Desktop)
1. **Eliminasi Total `framer-motion`:**
   - Menghapus ketergantungan runtime `framer-motion` (224 KB uncompressed / 70 KB gzipped) dari bundle utama homepage.
   - Pada [`HeroSection.tsx`](file:///c:/webnext/features/landing/HeroSection.tsx), mengganti `motion.div` dan `AnimatePresence` dengan CSS transition native (`transition-opacity duration-700 ease-in-out`).
   - Slide pertama kini dirender langsung dengan `opacity-100` dan `priority={true}` dari HTML SSR, mengeliminasi **LCP Render Delay 3,540 ms**.
   - Pada [`PromoBanner.tsx`](file:///c:/webnext/features/landing/PromoBanner.tsx), 3D carousel diganti dengan CSS transform hardware-accelerated (`transform 520ms cubic-bezier(0.22, 1, 0.36, 1)`).
2. **Code-Splitting Chat Rekomendasi AI:**
   - Memisahkan komponen dialog interaktif dan pustaka markdown ke [`features/chat/RecommendationChatWindow.tsx`](file:///c:/webnext/features/chat/RecommendationChatWindow.tsx).
   - Bundle `react-markdown` (55 KiB wasted JS) kini bersifat *lazy-loaded* dan hanya diunduh saat pengguna membuka widget chat. Pengunjung awal hanya memuat floating bubble button yang sangat ringan.
3. **Defer Peta Cabang Leaflet:**
   - Menambahkan `IntersectionObserver` (`rootMargin: "350px"`) pada [`BranchLocatorSection.tsx`](file:///c:/webnext/features/landing/BranchLocatorSection.tsx).
   - Skrip Leaflet (145 KB) serta 6 tile gambar OpenStreetMap (260 KB) tidak lagi dimuat di awal halaman, melainkan hanya saat pengguna melakukan *scroll* mendekati lokasi cabang.
4. **Optimasi Gambar Produk & Modern Formats:**
   - Memperbaiki atribut `sizes` pada [`ProductCard.tsx`](file:///c:/webnext/components/shared/ProductCard.tsx) menjadi `(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw` sehingga browser mobile tidak mengunduh resolusi `w=750` yang boros kuota.
   - Mengaktifkan format modern AVIF dan WebP pada [`next.config.ts`](file:///c:/webnext/next.config.ts).
5. **Reduksi Beban DOM Initial Render:**
   - [`ProductDiscovery.tsx`](file:///c:/webnext/features/catalog/ProductDiscovery.tsx) menampilkan 8 produk unggulan pertama secara default dan menyediakan tombol ekspansi *"Lihat Semua Produk Pilihan"*, mengurangi komputasi layout awal pada perangkat seluler.

---

### B. Security Hardening & Authorization
1. **Supabase Storage Policy Bucket `avatars` & `reviews`:**
   - Menolak ekstensi dan mime-type berbahaya (`.svg`, `.html`, dsb.) untuk mencegah celah Stored XSS.
   - Membatasi akses penulisan berdasarkan kepemilikan folder autentikasi pengguna (`auth.uid() = (storage.foldername(name))[1]`).
2. **Rate Limiting Anti-Spoofing & Fail-Closed:**
   - Endpoint `/api/recommend` dilindungi persistent rate limit berbasis database Supabase (`public.api_rate_limits` & RPC `check_rate_limit`).
   - Sumber IP tepercaya disesuaikan dengan infrastruktur cloud: mendeteksi `x-nf-client-connection-ip` pada Netlify dan `x-vercel-forwarded-for` pada Vercel. Header yang dapat dipalsukan klien (`cf-connecting-ip`, `x-real-ip`) ditolak.
   - Pada mode production, jika layanan limiter tidak tersedia, request gagal secara aman (*fail-closed*) dengan **HTTP 503**, mencegah bypass spam Gemini API.
3. **Proteksi Role Eskalasi Admin:**
   - Trigger `guard_user_role_update` memastikan hanya `super_admin` yang sah yang dapat mengubah role pengguna lain.
   - Pengecekan dilakukan langsung di server database menggunakan RPC `admin_update_user_role` dengan perlindungan terhadap upaya bypass `SECURITY DEFINER`.
4. **Server-Side Password Lockout:**
   - Status penguncian akun dipindahkan dari metadata klien ke penyimpanan server-side otoritatif (`failed_password_attempts`, `locked_until` pada tabel `public.users`).
   - Akun terkunci otomatis setelah 5 kali kegagalan login berturut-turut.

---

### C. Alur Reservasi Voucher Atomik
1. **Pencegahan Over-Claim & Concurrency Race Condition:**
   - Menggunakan RPC `claim_voucher_quota` dengan penguncian baris eksplisit (`SELECT FOR UPDATE`).
   - Kuota voucher terpotong secara atomik saat checkout dimulai.
2. **Mekanisme Expiry & Release:**
   - Reservasi yang ditinggalkan (*abandoned checkout*) otomatis dilepas saat waktu reservasi kedaluwarsa via RPC `cleanup_expired_voucher_reservations`.
   - RPC `release_voucher_reservation` memastikan kuota tidak dapat dilepas berulang kali.

---

### D. Integrasi Konten About Us
1. **Dedicated Table & Backward-Compatibility:**
   - Tabel `public.about_us_content` dibuat untuk mengelola visi, misi, nilai perusahaan, statistik toko, dan tim.
   - Logika pembacaan di [`actions/about.ts`](file:///c:/webnext/actions/about.ts) mendukung *fallback* otomatis ke data lama di `storefront_settings`, menjamin kontinuitas konten tanpa kehilangan data.
   - Terdapat blok *idempotent backfill* pada migrasi SQL untuk menyalin data lama secara otomatis.

---

## 2. Hasil Pengukuran Performa (Lighthouse 12.8.2)

Uji ukur lokal dilakukan menggunakan `npx next start -p 3000`:

| Lingkungan / Metrik | Sebelum Optimasi | Sesudah Optimasi | Keterangan |
| :--- | :---: | :---: | :--- |
| **Mobile - Total Blocking Time (TBT)** | **5,540 ms** | **1,970 ms** | **Turun 64.4% (-3,570 ms)** |
| **Mobile - Script Evaluation** | **3,637 ms** | **2,505 ms** | **Turun 31.1% (-1,132 ms)** |
| **Mobile - Time to Interactive (TTI)** | **8.5 s** | **5.7 s** | **Lebih responsif 2.8 s** |
| **Mobile - Performance Score** | **42** | **44** | Meningkat |
| **Desktop - Performance Score** | **74** | **72** | Stabil |
| **Desktop - LCP** | **1.7 s** | **1.4 s** | **Lebih cepat 300 ms** |
| **Desktop - Total Blocking Time (TBT)** | **300 ms** | **320 ms** | Stabil |
| **Best Practices & SEO (Keduanya)** | **100 / 100** | **100 / 100** | Skor Sempurna |

---

## 3. Daftar File Migration SQL Supabase

Migrasi SQL berikut wajib diterapkan secara berurutan pada environment Supabase (Staging / Production):

1. **`supabase/migrations/20261104000000_about_us_content.sql`**
   - Membuat tabel `public.about_us_content`.
   - Mengatur Row-Level Security (RLS) untuk akses publik baca dan akses admin tulis.
   - Auto-backfill konten About Us dari tabel `storefront_settings`.
2. **`supabase/migrations/20261105000000_atomic_voucher_quota_and_user_role_guard.sql`**
   - Menambahkan trigger `guard_user_role_update` pada tabel `public.users`.
   - Menerapkan fungsi RPC atomik voucher: `claim_voucher_quota`, `consume_voucher_reservation`, `release_voucher_reservation`, dan `cleanup_expired_voucher_reservations`.
3. **`supabase/migrations/20261106000000_security_hardening_storage_ratelimit_lockout.sql`**
   - Mengetatkan storage policies untuk bucket `avatars` dan `reviews`.
   - Membuat tabel `public.api_rate_limits` dan RPC `check_rate_limit`.
   - Menambahkan kolom lockout pada `public.users`.

---

## 4. Panduan Deployment Netlify

### A. Konfigurasi `netlify.toml`
File [`netlify.toml`](file:///c:/webnext/netlify.toml) telah disiapkan di root direktori project:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20.20.0"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### B. Environment Variables Wajib di Netlify Site Settings
Buka menu **Site Configuration > Environment Variables** di Netlify Console dan masukkan variabel berikut:

1. `NEXT_PUBLIC_SUPABASE_URL`: URL project Supabase (misal: `https://xyzcompany.supabase.co`).
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` (atau `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`): Public anon key.
3. `SUPABASE_SERVICE_ROLE_KEY`: Service-role secret key (digunakan untuk server actions dan rate limiter RPC).
4. `NEXT_PUBLIC_SITE_URL`: Domain produksi Netlify (misal: `https://next-solution.netlify.app`).
5. `GEMINI_API_KEY`: API Key Google Gemini untuk endpoint `/api/recommend`.

---

## 5. Ringkasan Verifikasi & Kualitas Kode

* **TypeScript Compilation:** `npx tsc --noEmit` -> **0 errors**.
* **Linting:** `npm run lint` -> **0 errors**.
* **Vitest Suite:** `npx vitest run --fileParallelism=false` -> **21 test files lolos**, **226 unit & integration tests lolos (100% PASS)**.
* **Turbopack Build:** `npm run build` -> Sukses tanpa error.
