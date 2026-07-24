# Next Solution E-Commerce

Next Solution adalah platform e-commerce minimalis yang dibangun menggunakan **Next.js 15 App Router** dan **Supabase** (PostgreSQL). Proyek ini dilengkapi dengan fitur keranjang belanja real-time, autentikasi, serta checkout dengan transaksi database ACID untuk memastikan keamanan data inventaris.

## 🚀 Panduan Setup Lokal (Wajib Dibaca)

Aplikasi ini sangat bergantung pada backend **Supabase Lokal** untuk manajemen database, autentikasi, dan Server Actions. 

Ikuti panduan berikut agar aplikasi bisa berjalan tanpa error (terutama error `Your project's URL and Key are required to create a Supabase client!`).

### 1. Menjalankan Docker & Supabase Lokal
1. Pastikan **Docker Desktop** sudah terinstall dan dalam keadaan **berjalan** (Indikator berwarna hijau / Engine Running).
2. Buka terminal di folder proyek ini (`c:\WEBPENJUALAN`) dan jalankan perintah:
   ```bash
   npx supabase start
   ```
   *(Proses ini mungkin memakan waktu agak lama pada percobaan pertama karena akan mengunduh image Docker Supabase).*

3. Setelah Supabase menyala, terminal akan menampilkan **API URL** dan **anon key**. Jangan tutup terminal ini.

### 2. Mengisi `.env.local`
Untuk menghubungkan Next.js dengan Supabase lokal:
1. Buat file bernama `.env.local` di folder *root* proyek ini.
2. Salin dan tempel **API URL** dan **anon key** yang Anda dapatkan di Langkah 1 ke dalam file tersebut seperti contoh berikut:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb... (salin dari terminal Anda)
   ```

### 3. Migrasi Database (Wajib)
Supabase lokal masih dalam keadaan kosong. Masukkan skema tabel, fungsi checkout RPC (Transaksi ACID), dan data bohongan (*seed data*) ke dalam database dengan perintah:
```bash
npx supabase db push
```

### 4. Jalankan Aplikasi
Sekarang aplikasi Anda siap dijalankan!
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🛠️ Tech Stack
- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, RPC Transactions)
- **Styling:** Tailwind CSS v4, Shadcn UI
- **Validasi:** Zod
- **Ikon:** Lucide React
