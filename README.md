# Next Solution Store

Landing page dan toko ecommerce berbasis Next.js 16, React 19, Supabase Auth, PostgreSQL, dan Supabase Storage. Pengelolaan mencakup katalog, kategori, brand, konten homepage, pesanan, pelanggan, serta laporan penjualan.

## Mulai cepat (Windows)

```powershell
git clone https://github.com/moannn27/webpenjualannext.git
Set-Location webpenjualannext
npm ci
Copy-Item .env.example .env.local
notepad .env.local
npm run dev
```

Isi URL dan publishable key Supabase di `.env.local`, lalu buka <http://localhost:3000>. Tidak perlu Docker atau database lokal; aplikasi memakai Supabase hosted. Jangan commit `.env.local` atau secret.

## Dokumentasi

- [Setup di PC baru, database hosted, fitur admin, dan publish](docs/SETUP_PC_BARU.md)
- [Panduan aktivasi dan penggunaan toko](docs/PANDUAN_PENGGUNAAN.md)

## Validasi lokal

```powershell
npm test
npm run lint
npm run build
```

Migration Supabase ada di `supabase/migrations/`. Sebelum menjalankan `npm run db:push`, pastikan project ref dan riwayat migration remote benar. Jangan reset database yang berisi data.
