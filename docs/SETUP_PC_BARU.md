# Setup di PC baru (Windows)

Panduan ini untuk meng-clone dan menjalankan toko dari komputer lain, termasuk PC kantor. Database tetap memakai project Supabase hosted yang sama. Proyek ini tidak memerlukan Docker atau Supabase lokal.

## Yang perlu disiapkan

- Git for Windows
- Node.js 20.9 atau lebih baru (disarankan versi LTS) dan npm
- Akses repository GitHub
- Akses ke project Supabase yang dipakai aplikasi
- File environment lokal yang berisi URL dan publishable key Supabase

Periksa instalasi:

```powershell
git --version
node --version
npm --version
```

## Clone dan pasang dependency

Buka PowerShell di folder tempat project akan disimpan:

```powershell
git clone https://github.com/moannn27/webpenjualannext.git
Set-Location webpenjualannext
npm ci
```

`npm ci` memasang versi dependency persis dari `package-lock.json`. Saat mengambil perubahan berikutnya dari GitHub, jalankan `git pull` di branch `main`, lalu `npm ci` jika dependency berubah.

## Supabase: project, kredensial, dan layanan yang dipakai

Aplikasi ini menggunakan **Supabase hosted** sebagai backend utama: PostgreSQL menyimpan produk, kategori, brand, pengguna, pesanan, pembayaran, dan konten toko; Supabase Auth menangani login; Supabase Storage menyimpan foto. Browser dan server Next.js mengakses project melalui konfigurasi environment. Data tidak disimpan di komputer yang menjalankan Next.js.

Di Supabase Dashboard, pilih project toko yang benar. Pada **Project Settings → API** ambil:

- **Project URL** untuk `NEXT_PUBLIC_SUPABASE_URL`.
- **Publishable key** untuk `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (atau legacy `anon` key dengan variabel `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Project ref** dari URL/project settings untuk perintah `supabase link`.

Jangan menggunakan URL/key dari project lain, misalnya project uji coba, karena aplikasi akan membaca database dan file dari project tersebut. Publishable/anon key memang dipakai aplikasi web dan dilindungi oleh kebijakan Row Level Security (RLS). **Jangan pernah** memasukkan `service_role` key ke browser, variabel `NEXT_PUBLIC_*`, `.env.example`, atau Git.

Project hosted yang sama boleh dipakai dari beberapa komputer. Setiap komputer punya `.env.local` sendiri dengan URL/key yang sama; perubahan kode tidak membuat salinan database dan tidak menghapus data Supabase.

### Authentication dan Storage

- Di **Authentication → Providers**, pastikan Email aktif. Pendaftaran/login memakai Supabase Auth.
- Di **Authentication → URL Configuration**, alamat lokal biasanya `http://localhost:3000` dengan callback `/auth/callback`. Untuk domain publik, tambahkan domain dan callback produksi di pengaturan yang sama.
- Migration `20261005000200_storage_setup.sql` menyiapkan bucket `products`, `brands`, `banners`, `avatars`, `reviews`, dan `documents`. Bucket gambar katalog/brand/banner dapat dibaca publik; operasi upload diatur oleh policy admin.
- Upload produk/brand/banner memakai file WebP hasil kompresi di browser. Simpan file foto di bucket yang sesuai; jangan mengandalkan file lokal komputer kantor.

## Atur environment lokal

Buat `.env.local` dari contoh:

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Isi variabel Supabase dari project yang benar:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUPABASE-PUBLISHABLE-KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Gunakan publishable key (atau legacy anon key dengan nama `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Jangan pernah menaruh `service_role` key di variabel `NEXT_PUBLIC_*` atau Git. `.env.local` diabaikan oleh Git; tiap komputer mengatur file ini sendiri. `OPENAI_API_KEY` hanya diperlukan untuk jawaban AI, fitur rekomendasi dasar tetap berjalan tanpa API key.

## Supabase CLI dan database

Untuk sekadar menjalankan aplikasi pada PC baru, gunakan URL/key project hosted yang sama. Data produk, pelanggan, pesanan, dan gambar akan tetap berasal dari project itu. Login ke Supabase CLI hanya diperlukan jika perlu menerapkan migration:

```powershell
npx supabase login
npx supabase link --project-ref PROJECT-REF
npx supabase migration list
```

Pastikan project ref pada `link` benar dan periksa status migration lokal/remote. Untuk menerapkan migration repo yang memang belum ada di database:

```powershell
npm run db:push
```

Jalankan `db:push` hanya setelah memastikan target project dan riwayat migration cocok. Jangan jalankan `supabase db reset`, `supabase start`, atau perintah Docker pada alur kerja ini. Jangan jalankan `supabase/seed.sql` pada toko yang sudah berisi data. Seed hanya untuk project baru yang kosong, setelah ditinjau.

Migrations di repo berjalan berurutan dari `20261005000000_initial_schema.sql` sampai migration terbaru, termasuk varian produk, impor produk massal, dan koreksi metode pickup oleh Super Admin. Perubahan berikutnya ditambahkan sebagai file migration baru, bukan dengan mengedit migration yang sudah pernah diterapkan.

Jika hanya meng-clone untuk menjalankan aplikasi pada database kantor yang sudah siap, migration tidak perlu dijalankan ulang. Jika ada migration baru, pastikan remote sudah terhubung ke project ref yang benar, bandingkan daftar migration lokal dan remote, lalu terapkan hanya migration yang belum diterapkan. `npm run db:push` mengubah database hosted; periksa perubahan dan backup database sebelum menerapkannya pada toko aktif. Jika riwayat lokal/remote tidak cocok, hentikan dulu dan selesaikan rekonsiliasi migration—jangan mengatasi ketidakcocokan dengan reset.

## Jalankan, cek, dan build

```powershell
npm run dev
```

Buka <http://localhost:3000>. Untuk berhenti, tekan `Ctrl+C`. Setelah mengubah `.env.local`, restart dev server.

Sebelum membagikan perubahan atau publish:

```powershell
npm test
npm run lint
npm run build
```

## Fitur yang tersedia

- **Katalog:** pencarian, filter kategori/brand/promo, pengurutan, pagination, dan ukuran halaman 24/48/100/200 yang diatur super admin di pengaturan landing page. Jumlah produk di database tidak dibatasi oleh angka tersebut.
- **Produk:** CRUD produk, SKU, kategori, brand, harga dan harga promo, spesifikasi, varian warna/RAM/storage dengan stok per varian, status tayang, tanda produk terlaris/terbaru, serta galeri sampai 8 gambar. Upload massal menerima XLSX, CSV, DOCX, atau PDF memakai template tabel yang sama dan menampilkan preview sebelum disimpan. Gambar upload dikompres di browser menjadi WebP maksimal 800 KB dan sisi terpanjang maksimal 1440 px.
- **Kategori, brand, dan konten landing:** CRUD dan preview gambar. Upload sumber gambar maksimal 15 MB; foto disimpan pada Supabase Storage bucket `products`, `brands`, atau `banners`. Bucket publik untuk pembacaan gambar, sedangkan upload membutuhkan admin.
- **Pesanan:** nomor pesanan dibuat per tanggal Jakarta dalam format `ORD-YYYYMMDD-NN` dan nomor urut bertambah otomatis. Status pesanan hanya mengikuti alur yang diizinkan; pembayaran sukses diperlukan sebelum pesanan diproses/dikirim. Pembatalan memulihkan stok satu kali.
- Checkout mendukung pengiriman standar/express dan ambil di toko tanpa ongkir. Pilihan ambil di toko tetap menunggu konfirmasi pembayaran dan admin.
- **Dashboard/laporan:** ringkasan pesanan, omzet dari transaksi selesai, grafik penjualan, produk terlaris/terendah, dan pelanggan. Laporan bisa diunduh CSV, CSV transaksi, Word-compatible `.doc`, atau dicetak/disimpan sebagai PDF dari dialog print browser.
- **Konten halaman depan:** section bisa diatur judul, deskripsi, urutan/visibilitas serta konten hero/banner, FAQ, testimoni, informasi toko, dan cabang. Pengelolaan konten dan brand dibatasi untuk super admin.

Angka laporan penjualan memakai pesanan berstatus selesai dan bukan laporan laba bersih atau rekonsiliasi bank. Periode laporan bisa dipilih 7, 30, 90, atau 365 hari.

## Buat atau pulihkan akses admin

Daftarkan akun lewat `/register`, kemudian jadikan akun super admin melalui SQL Editor Supabase. Ganti email contoh dengan email akun yang sudah terdaftar:

```sql
INSERT INTO public.users (id, full_name, role)
SELECT id, raw_user_meta_data->>'full_name', 'super_admin'::user_role
FROM auth.users
WHERE lower(email) = lower('EMAIL-ADMIN-ANDA')
ON CONFLICT (id)
DO UPDATE SET role = 'super_admin'::user_role;
```

Keluar lalu login kembali. Berikan role admin hanya kepada staf yang perlu mengelola produk/pesanan; role super admin juga dapat mengubah konten halaman depan, brand, dan pengaturan katalog.

## Kirim perubahan ke GitHub

Setelah perubahan lokal selesai:

```powershell
git status
git add .
git commit -m "jelaskan perubahan"
git push origin main
```

Periksa `git status` sebelum `git add`; pastikan `.env.local`, file credential, dan export data pribadi tidak masuk commit. Setelah push, PC lain mengambil commit dengan:

```powershell
git pull origin main
npm ci
```

## Jika nanti dipublikasikan

Atur environment variable di hosting (`NEXT_PUBLIC_SUPABASE_URL`, publishable key, `NEXT_PUBLIC_SITE_URL`, dan opsional API key AI). Tambahkan domain produksi pada Supabase Authentication URL Configuration dan callback `/auth/callback`. Supabase project yang dipakai harus sama dengan yang sudah memiliki migration dan data toko. Jangan menyalin `.env.local` melalui GitHub.
