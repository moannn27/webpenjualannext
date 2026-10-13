# Panduan Fitur Mass Upload, Skema Harga, dan Pengaturan Branding

Dokumen ini menjelaskan alur kerja, pengoperasian teknis, serta fitur-fitur baru pada **Next Solution Store**, khususnya pada modul **Mass Upload Produk** dan **Pengaturan Branding / Identitas Toko**.

---

## 1. Modul Mass Upload Produk (`/admin/products`)

Modul Mass Upload memungkinkan admin mengunggah ratusan produk sekaligus dari file spreadsheet atau pricelist pabrikan (seperti format Lenovo) secara transaksional ke database toko.

### A. Format File yang Didukung
* **XLSX (.xlsx):** Mendukung seluruh worksheet/lembar kerja, otomatis mendeteksi sheet yang berisi tabel data produk dan melewati sheet non-tabel (cover, terms & conditions, daftar servis).
* **CSV (.csv):** Format teks standar berpemisah koma atau titik koma (UTF-8).
* **DOCX (.docx):** Dokumen Word yang memuat tabel data produk sesuai format header.
* **PDF (.pdf):** Dokumen PDF yang memuat tabel data berbasis teks asli (bukan gambar/foto hasil scan).

### B. Fleksibilitas Skema Harga (Normal vs Promo)
Admin tidak perlu menyetujui atau mencentang harga satu per satu pada puluhan produk:
1. **Skema Harga Normal Saja (Tanpa Promo):**
   * Menggunakan nilai kolom harga retail/SRP utama (misal: *NEW PRICE USER/SRP* atau *price*).
   * Status diskon disetel ke *"Tanpa harga promo"*, sehingga produk tayang di katalog dengan harga normal tanpa harga coret.
   * Dapat diterapkan dalam 1 klik via tombol **"Harga Normal Saja"** di toolbar atau opsi popup.
2. **Skema Promo (+ Harga Normal):**
   * Mengaktifkan kolom harga diskon/promo (misal: *HARGA JUAL* atau *discount_price*) sebagai harga jual aktif.
   * Harga reguler/SRP otomatis menjadi harga coret di katalog toko.
   * Produk yang tidak memiliki kolom diskon tetap otomatis menggunakan harga normal reguler.
   * Dapat diterapkan dalam 1 klik via tombol **"Gunakan Promo"** di toolbar atau opsi popup.

### C. Alur Konfirmasi Impor Interaktif (Alert Dialog)
* Tombol **"Konfirmasi impor (X)"** di bagian bawah tetap dapat diklik selama tidak ada error fatal pada baris data.
* Jika masih ada produk yang belum ditentukan skema harganya, mengklik tombol ini akan memunculkan dialog verifikasi:
  * 🔘 **Gunakan Harga Normal Saja (Tanpa Promo)**
  * 🔘 **Gunakan Harga Promo (Jika Ada) + Harga Normal**
* Admin cukup memilih salah satu opsi lalu klik **"Terapkan & Lanjutkan Impor"**. Sistem otomatis memvalidasi seluruh produk dan melanjutkan proses impor tanpa hambatan.

### D. Deteksi & Pembuatan Otomatis Kategori & Brand Baru
* Jika file memuat kategori atau brand yang belum terdaftar di database master toko, sistem tidak akan menolak berkas.
* Sistem memunculkan dialog konfirmasi:
  * Menampilkan daftar kategori baru dan brand baru yang terdeteksi.
  * Menyediakan tombol **"Ya, Buat Kategori/Brand & Lanjutkan Impor"** yang secara otomatis membuat master data kategori dan brand beserta *slug URL*-nya sebelum menyimpan produk ke katalog.

### E. Isolasi dan Filter Segmen Produk
* **Filter Tipe:** Filter cepat satu klik untuk melihat produk **Desktop**, **Laptop**, **Tablet**, atau **Promo Saja**.
* **Filter Dropdown Kategori:** Memfilter daftar preview berdasarkan kategori tertentu.
* **Tindakan Per Segmen:**
  * Tombol *"Hanya X Ini (Lewati Lainnya)"* untuk hanya mengimpor segmen yang sedang difilter dan menyetel produk lainnya ke status *Lewati*.
  * Opsi ubah tindakan massal (*Produk baru*, *Update produk cocok*, atau *Lewati*).

---

## 2. Pengaturan Branding, Logo & Foto Profil Admin (`/admin/content?tab=branding`)

Pengaturan identitas visual toko dan akun admin kini dapat dikelola langsung dari panel admin tanpa perlu mengubah kode sumber (*code-free*).

### A. Identitas dan Logo Toko
* **Nama Toko / Brand:** Mengubah nama toko secara dinamis (default: *Next Solution*). Perubahan nama otomatis tecermin di judul halaman, Navbar, Footer, dan email/faktur.
* **Logo Toko:**
  * Admin dapat memasukkan URL gambar langsung (HTTPS) atau mengklik tombol **"Upload Logo"** untuk memilih berkas dari komputer (PNG transparan, SVG, WebP, JPG).
* **Mode Tampilan Header & Navbar:**
  Tersedia 3 pilihan fleksibel:
  1. 🔘 **Logo + Tulisan:** Menampilkan gambar logo dan teks nama toko berdampingan.
  2. 🔘 **Hanya Logo:** Hanya menampilkan gambar logo toko tanpa teks nama.
  3. 🔘 **Hanya Tulisan:** Hanya menampilkan teks nama toko tanpa gambar logo.

### B. Logo Khusus Admin Panel
* Admin dapat menentukan logo terpisah khusus untuk sidebar dashboard admin jika ingin tampilan panel yang berbeda dengan storefront publik.

### C. Foto Profil Akun Admin (Avatar)
* Admin dapat memasukkan URL foto profil atau mengklik tombol **"Upload Foto"**.
* Foto profil admin langsung disimpan ke akun admin di database (`public.users.avatar_url`).
* Foto langsung tampil pada avatar di pojok kanan atas header panel admin (`AdminHeader`), menggantikan inisial nama.

---

## 3. Fitur Tambahan Terintegrasi

### A. Lokasi Ambil di Toko (Pickup Info)
* Dikelola di menu **Pengaturan Toko** (`/admin/content?tab=store`).
* Admin dapat mengisi nama lokasi toko, alamat lengkap pengambilan barang, dan link Google Maps.
* Informasi ini otomatis tampil pada halaman checkout saat pelanggan memilih opsi pengiriman *"Ambil di Toko"*.

### B. Rekening Pembayaran Transfer Bank
* Dikelola di menu **Pengaturan Toko** (`/admin/content?tab=store`).
* Admin dapat menambah beberapa rekening bank resmi (Nama Bank, Nomor Rekening, Atas Nama).
* Informasi rekening otomatis tampil pada invoice dan instruksi pembayaran pelanggan.

### C. Tombol WhatsApp Mengambang (Floating Action Button)
* Ditampilkan secara otomatis di pojok kanan bawah seluruh halaman storefront publik jika nomor WhatsApp toko telah diisi di pengaturan.
* Saat diklik oleh pengunjung, langsung membuka aplikasi WhatsApp dengan pesan pembuka resmi.

### D. Filter dan Pencarian Pesanan Admin (`/admin/orders`)
* Tab filter status pesanan interaktif (*Semua, Menunggu, Diproses, Dikirim, Siap Diambil, Selesai, Dibatalkan*) lengkap dengan *badge counter*.
* Kolom pencarian instan berdasarkan nomor pesanan (`ORD-...`) atau nama pelanggan.

---

## 4. Validasi Teknis & Integritas Kode

Seluruh pembaruan di atas telah melalui pengujian kualitas:
* **TypeScript:** `npx tsc --noEmit` lulus dengan 0 kesalahan tipe data.
* **Unit Testing:** `npm test` lulus 100% (79 test di 10 file pengujian).
* **ESLint:** `npm run lint` bersih dengan 0 error.
* **Production Build:** `npm run build` sukses mengompilasi 34 rute aplikasi Next.js (Turbopack).

