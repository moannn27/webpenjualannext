# Galeri Produk, Varian, dan Manifest Gambar

Dokumen ini menjelaskan alur katalog yang tersedia di aplikasi dan cara meninjau perubahan gambar dengan aman.

## Galeri produk dan varian

- Foto induk produk disimpan di `product_images`.
- Setiap varian diidentifikasi dengan `product_variants.id` dan SKU pada kolom `product_variants.sku`.
- Foto utama varian memakai `product_variants.image_url` untuk kompatibilitas alur lama. Urutan galeri varian disimpan di `product_variant_images.display_order`.
- Halaman detail menampilkan galeri varian aktif. Jika galeri varian kosong, halaman memakai galeri produk induk yang terkait; foto milik varian lain tidak digunakan sebagai fallback.
- Pilihan varian yang sama membawa SKU, harga, stok, dan identitas varian ke data keranjang.

## Input gambar

Admin dapat memasukkan URL gambar HTTPS lewat pemilih gambar produk atau varian. Mass Upload tetap menerima arsip ZIP; nama file yang mengandung SKU/MTM digunakan untuk mencocokkan gambar dengan produk atau varian. Periksa hasil preview sebelum konfirmasi upload. Jangan mengonfirmasi jika SKU tidak cocok atau target gambar ambigu.

Galeri varian mempertahankan urutan file yang dikonfirmasi. Gambar pertama menjadi gambar utama legacy (`image_url`). Kegagalan simpan harus menghentikan proses dan melakukan rollback pada perubahan yang sudah dibuat sejauh memungkinkan.

## Manifest audit gambar

File audit utama:

- `data/product-image-audit-manifest.json` menyimpan identitas, sumber, kandidat URL gambar, dan status review.
- `data/product-identity-reconciliation.csv` menyimpan rekonsiliasi identitas produk/varian serta alasan item yang belum dapat dipastikan.

Status `verified` harus didukung oleh kecocokan model dan SKU/MTM serta pemeriksaan isi gambar. Status HTTP 200 saja bukan bukti kecocokan. Item tanpa bukti cukup harus tetap `needs_review`; gambar terbukti salah dapat ditandai `known_invalid`.

## Meninjau sinkronisasi

Perintah berikut memeriksa URL gambar dan membuat ringkasan perubahan yang direncanakan. Mode bawaan tidak menulis ke database:

```powershell
npm run catalog:images:sync
```

Dry-run membutuhkan `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` dari konfigurasi lokal untuk membaca keadaan produk dan galeri yang ada, selain memeriksa URL gambar. Jangan menyalin atau mencetak nilai rahasia. Perintah tersebut melakukan pembacaan database; jangan jalankan jika target konfigurasi lokal belum dipastikan.

Mode `--apply` menulis perubahan ke database dan tidak dijalankan sebagai bagian dari prosedur review biasa. Sebelum mempertimbangkannya, pastikan target Supabase benar, periksa ringkasan dry-run, tinjau seluruh mapping, dan siapkan persetujuan terpisah. Jangan jalankan terhadap production tanpa prosedur rilis yang disetujui.

## Halaman bantuan

- `/faq` menampilkan FAQ aktif dari pengelolaan konten, dikelompokkan berdasarkan kategori.
- `/terms` dan `/privacy` adalah halaman informasi umum yang ditautkan dari formulir pendaftaran dan footer.
- Materi legal perlu disesuaikan dan disetujui pemilik toko agar mencerminkan kebijakan operasional dan praktik privasi yang berlaku.
