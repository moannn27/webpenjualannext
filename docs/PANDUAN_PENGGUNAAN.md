# Panduan aktivasi dan penggunaan Next Solution

Panduan ini mencatat langkah setup dan penggunaan supaya bisa diikuti lagi setelah project dipindahkan atau di-clone.

## 1. Persiapan project

Persyaratan: Node.js yang mendukung Next.js 16, npm, akun Supabase, dan akses ke repository GitHub.

```powershell
npm install
Copy-Item .env.example .env.local
```

Isi `.env.local` dengan kredensial project Supabase dari **Project Settings → API**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUPABASE-PUBLISHABLE-KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Gunakan publishable key atau legacy anon key. Jangan masukkan `service_role` key ke browser, variabel `NEXT_PUBLIC_*`, atau Git. File `.env.local` memang diabaikan oleh Git; `.env.example` hanya berisi nama variabel dan placeholder.

## 2. Hubungkan dan siapkan database Supabase

Login CLI satu kali, lalu hubungkan repository ke project yang benar:

```powershell
npx supabase login
npx supabase link --project-ref PROJECT-REF
```

Sebelum menerapkan perubahan, cocokkan riwayat database:

```powershell
npx supabase migration list
```

Jika migrasi lokal dan remote cocok, terapkan migrasi yang belum ada di remote:

```powershell
npm run db:push
```

Migrasi membuat/menyiapkan tabel, kebijakan akses, bucket gambar, konten landing page, dan setting toko. Jangan pakai `db reset` pada project hosted karena perintah itu mereset database lokal.

Untuk project Supabase yang benar-benar baru dan masih kosong, data katalog contoh dapat dimasukkan satu kali dari **SQL Editor** dengan isi `supabase/seed.sql`. Jangan jalankan seed pada database yang sudah memiliki katalog tanpa memeriksa isinya terlebih dahulu.

### Auth dan email

- Pastikan **Authentication → Providers → Email** aktif.
- Untuk testing lokal, konfirmasi email boleh dimatikan sementara. Untuk website publik, gunakan SMTP sendiri dan biarkan konfirmasi email aktif.
- Tambahkan URL produksi ke **Authentication → URL Configuration** dan redirect URL callback sesuai domain website.
- Email SMTP bawaan Supabase memiliki batas kirim. Jika email verifikasi tidak datang atau kena rate limit, atur SMTP pada project Supabase.

## 3. Buat akun super admin

1. Daftar melalui `/register` memakai email yang bisa diakses, lalu pastikan akun sudah muncul di **Authentication → Users**.
2. Buka **SQL Editor** pada project Supabase yang sama.
3. Jalankan query ini setelah mengganti email dengan email akun sendiri:

```sql
INSERT INTO public.users (id, full_name, role)
SELECT id, raw_user_meta_data->>'full_name', 'super_admin'::user_role
FROM auth.users
WHERE lower(email) = lower('EMAIL-ADMIN-ANDA')
ON CONFLICT (id)
DO UPDATE SET role = 'super_admin'::user_role;
```

4. Pastikan baris di **Table Editor → users** menunjukkan `role = super_admin`.
5. Keluar dari website dan masuk lagi. Super admin akan diarahkan ke `/admin` setelah login.

Role `admin` dapat mengelola katalog dan pesanan. Role `super_admin` juga mendapat akses ke pengaturan brand dan seluruh konten/tampilan halaman depan. Jangan membuat halaman publik untuk mengganti role.

## 4. Jalankan website

```powershell
npm run dev
```

Buka `http://localhost:3000`. Kalau baru mengubah environment variable, hentikan server dengan `Ctrl+C`, lalu jalankan kembali.

## 5. Penggunaan panel admin

Masuk dengan akun yang role-nya sudah diatur. Menu admin berada di sisi kiri; di layar kecil buka lewat tombol menu.

### Produk dan kategori

- **Admin → Products:** tambah/edit produk, harga normal, harga diskon, stok, status terbit, gambar, brand, kategori, dan tanda **Tampilkan sebagai best seller**.
- **Admin → Categories:** atur nama, deskripsi, dan gambar kategori.
- Produk yang dicari pelanggan harus berstatus **Terbit**. Rekomendasi chat hanya menampilkan produk berstok lebih dari nol.
- **Admin → Orders:** lihat pesanan. Hapus kategori/brand yang masih dipakai produk akan ditolak database.

### Brand dan homepage (super admin)

- **Admin → Brands:** atur nama brand serta logo. Upload PNG/JPG/WebP/AVIF atau masukkan URL HTTPS. Logo muncul di blok Brand Pilihan.
- **Admin → Landing page → Hero dan banner:** tambah slide utama dan banner promo, unggah gambar, ubah teks/tombol, urutan, dan status tayang.
- **Bagian halaman depan:** ubah judul/deskripsi dan tampil-sembunyi tiap section.
- **FAQ** dan **Testimoni pelanggan:** tambah, edit, hapus, atur urutan, dan tampil-sembunyi.
- **Informasi toko dan footer:** isi deskripsi, kontak, alamat umum, dan hak cipta.
- **Cabang toko:** tambah nama cabang, alamat lengkap, dan link HTTPS Google Maps. Link Maps tampil pada footer.
- Best seller dipilih dari checkbox di form produk, tidak dari urutan judul section.

Perubahan tampilan memerlukan row konten aktif. Jika carousel/banner belum ada, halaman depan menggunakan slide bawaan sampai konten pertama ditambahkan.

### Profil, tema, dan pencarian

- **Profil → Pengaturan:** simpan nama, email, nomor HP, dan alamat rumah. Perubahan email perlu dikonfirmasi melalui email sesuai konfigurasi Supabase.
- Tombol bulan/matahari di navbar mengganti mode gelap/terang dan pilihan disimpan di browser.
- Menu akun di kanan navbar menutup sendiri setelah 10 detik tanpa aktivitas.
- Pencarian mencocokkan nama produk, brand, kategori, SKU, dan deskripsi. Kata `FAQ`, `kategori`, `brand/merek`, dan `promo/diskon` membawa ke bagian yang sesuai.

### Chat rekomendasi AI (opsional)

Chat tetap dapat menyaring katalog ready-stock tanpa API key, menggunakan jawaban cadangan. Untuk jawaban yang ditulis AI, isi di `.env.local`:

```env
OPENAI_API_KEY=YOUR_SERVER_SIDE_API_KEY
OPENAI_MODEL=gpt-4.1-mini
```

Restart server setelah mengubah `.env.local`. Jangan beri prefix `NEXT_PUBLIC_` pada API key dan jangan pernah commit nilainya. Penggunaan AI memerlukan akses/billing API dari penyedia model.

## 6. Build dan publikasi

Sebelum publikasi, siapkan environment variable pada hosting (Supabase URL/key, site URL, dan opsional API key AI), tambahkan URL domain pada Supabase Auth, kemudian jalankan:

```powershell
npm run build
```

Untuk update GitHub dari branch `main`:

```powershell
git status
git add .
git commit -m "feat: add store admin and homepage management"
git push origin main
```

Pastikan `.env.local` dan kredensial rahasia tidak terlihat pada `git status` sebagai file yang akan ditambahkan.
