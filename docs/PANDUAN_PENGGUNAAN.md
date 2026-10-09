# Panduan penggunaan Next Solution Store

Panduan ini menjelaskan setup Supabase dan penggunaan storefront/panel admin. Untuk instalasi di komputer baru, ikuti [Setup di PC baru](SETUP_PC_BARU.md).

## Setup Supabase

1. Buat atau pilih project Supabase hosted dan siapkan URL serta publishable key.
2. Isi `.env.local` berdasarkan `.env.example`; gunakan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, dan `NEXT_PUBLIC_SITE_URL`.
3. Jika database belum terhubung ke repo, jalankan `npx supabase login`, lalu `npx supabase link --project-ref PROJECT-REF`.
4. Periksa `npx supabase migration list` sebelum menerapkan perubahan. Jalankan `npm run db:push` hanya jika project yang terhubung benar dan migration lokal memang belum diterapkan.
5. Jalankan `npm run dev`, lalu buka <http://localhost:3000>.

> Jangan gunakan Docker, `supabase start`, atau `supabase db reset` pada alur kerja ini. `db:push` mengubah database hosted. Jangan jalankan seed pada database yang sudah berisi produk/pesanan.

### Supabase Auth

- Aktifkan Email pada Authentication → Providers.
- Untuk pengembangan lokal, redirect callback menggunakan `http://localhost:3000/auth/callback`.
- Untuk publikasi, tambahkan domain produksi dan URL callback pada Authentication → URL Configuration. Gunakan SMTP sendiri untuk email produksi.
- Jangan pernah menaruh `service_role` key pada variabel `NEXT_PUBLIC_*` atau Git.

### Akun super admin

Daftarkan akun sendiri lewat `/register`, lalu jalankan query ini dari SQL Editor Supabase. Ganti alamat email dengan email akun yang sudah terdaftar:

```sql
INSERT INTO public.users (id, full_name, role)
SELECT id, raw_user_meta_data->>'full_name', 'super_admin'::user_role
FROM auth.users
WHERE lower(email) = lower('EMAIL-ADMIN-ANDA')
ON CONFLICT (id)
DO UPDATE SET role = 'super_admin'::user_role;
```

Keluar dan masuk lagi setelah role diubah. `admin` mengelola katalog dan pesanan. `super_admin` juga mengelola brand, konten landing page, dan ukuran halaman katalog.

## Operasional panel admin

### Dashboard dan laporan

- Dashboard menampilkan ringkasan katalog, pelanggan, pesanan, omzet pesanan selesai, pesanan terbaru, stok menipis, dan grafik.
- Laporan memiliki filter 7, 30, 90, atau 365 hari serta ringkasan, grafik harian, produk terlaris/terendah, dan pelanggan dengan belanja tertinggi.
- Unduh laporan ringkas atau transaksi dalam CSV, laporan Word-compatible `.doc`, atau gunakan Cetak / Simpan PDF dari dialog print browser.
- Omzet adalah total `grand_total` dari order yang selesai; angka ini bukan laba bersih atau rekonsiliasi bank.

### Produk, foto, kategori, dan brand

- Produk memiliki SKU, harga normal/promo, stok, status draft/terbit/arsip, kategori, brand, deskripsi, penanda terlaris/terbaru, spesifikasi, varian warna/RAM/storage dengan stok dan SKU masing-masing, serta galeri hingga 8 foto.
- Admin dapat memakai **Upload produk massal** dengan satu template CSV yang sama untuk Excel `.xlsx`, CSV, Word `.docx`, atau PDF. Isi satu baris untuk produk tanpa varian, atau ulangi data produk per kombinasi varian. SKU produk yang sama menggabungkan beberapa baris. Kategori dan brand harus sudah ada. Preview memvalidasi semua baris sebelum impor transaksional; foto diimpor melalui URL HTTPS.
- Word dan PDF harus berisi tabel dengan header template yang diunduh dari panel. PDF harus memiliki teks yang dapat dibaca dan tabel bergaris, bukan hasil scan. Format `.doc` lama tidak didukung.
- Foto yang diunggah dikompres di browser menjadi WebP maksimal 800 KB dan sisi terpanjang maksimal 1440 px. Foto pertama di galeri menjadi foto utama.
- File sumber upload maksimal 15 MB. Storage memakai bucket publik `products`, `brands`, dan `banners`; upload dibatasi ke admin melalui policy Supabase.
- Katalog storefront memakai pencarian, filter kategori/brand/promo, sorting, dan pagination. Super admin dapat memilih 24, 48, 100, atau 200 produk per halaman; angka ini tidak membatasi jumlah total produk.
- Kategori dan brand yang masih dipakai produk tidak dapat dihapus sampai relasinya tidak digunakan.

### Pesanan dan stok

- Checkout memeriksa dan mengurangi stok produk/varian melalui transaksi database; detail varian disimpan pada pesanan.
- Pelanggan dapat memilih pengiriman standar/express atau ambil di toko tanpa ongkir. Pengambilan tetap menunggu konfirmasi pembayaran dan admin.
- Nomor order dibuat aman terhadap checkout bersamaan, memakai tanggal Jakarta dan format `ORD-YYYYMMDD-NN` (urutan harian mulai `01`).
- Pembayaran perlu dikonfirmasi sukses sebelum order diproses, dikirim, atau ditandai selesai.
- Jika pembayaran sempat ditandai gagal, admin masih dapat mengonfirmasinya setelah memeriksa ulang bukti transfer.
- Alur status: menunggu → diproses → dikirim → selesai. Order juga dapat dibatalkan sebelum selesai. Order batal terminal; buat order baru jika perlu.
- Pembatalan mengembalikan stok satu kali.
- Super Admin dapat mengoreksi status pesanan yang keliru, termasuk pesanan selesai. Koreksi perlu konfirmasi; membuka pesanan batal kembali memerlukan stok yang cukup dan tidak bisa dilakukan setelah refund.
- Super Admin dapat mengoreksi metode pengiriman menjadi ambil di toko. Jika pembayaran belum sukses, ongkir dan nominal tagihan disesuaikan menjadi gratis; jika sudah sukses, nilai pembayaran tetap tercatat dan pengembalian ongkir perlu diproses terpisah.

### Konten storefront (super admin)

- **Landing page:** atur visibilitas, judul, dan deskripsi section homepage.
- **Hero dan banner promo:** unggah gambar, ubah headline, tombol, tautan, urutan, dan status tayang.
- **FAQ dan testimoni:** CRUD, urutan, dan visibilitas.
- **Brand:** atur logo/nama, ditampilkan di bagian brand toko.
- **Informasi toko:** atur deskripsi, kontak, footer, dan cabang beserta link Google Maps.
- Perubahan section hanya terlihat jika konten/section terkait aktif. Jika banner belum tersedia, halaman dapat memakai konten fallback.

## Akun pelanggan dan fitur tambahan

- Pelanggan dapat mengelola profil, alamat, keranjang, wishlist, dan ulasan produk.
- Tema terang/gelap disimpan di browser. Menu navigasi admin dapat diciutkan dan dibuka kembali; pada layar kecil gunakan tombol menu.
- Chat rekomendasi tetap menyediakan penyaringan katalog tanpa API key. Untuk jawaban AI, isi `OPENAI_API_KEY` dan opsional `OPENAI_MODEL` di `.env.local`, lalu restart server. Jangan beri prefix `NEXT_PUBLIC_` pada key tersebut.

## Periksa aplikasi sebelum dibagikan

```powershell
npm test
npm run lint
npm run build
```

Jika laporan menampilkan pemberitahuan migration, periksa status lokal/remote dan terapkan migration yang sesuai. Jangan menyelesaikan masalah dengan reset database yang berisi data.
