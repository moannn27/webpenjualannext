export const ALL_ADMIN_MODULES = [
  { key: 'products', label: 'Produk', description: 'Kelola katalog produk, stok, varian, dan impor data' },
  { key: 'categories', label: 'Kategori', description: 'Kelola kategori produk toko' },
  { key: 'brands', label: 'Brand', description: 'Kelola brand & merek partner' },
  { key: 'orders', label: 'Pesanan', description: 'Kelola pesanan, update status, dan verifikasi transfer' },
  { key: 'vouchers', label: 'Voucher / Kupon', description: 'Buat dan kelola kupon diskon serta promo checkout' },
  { key: 'content', label: 'Konten & Toko', description: 'Kelola banner landing page, review produk, cabang & official marketplace' },
  { key: 'customers', label: 'Pelanggan & Staf', description: 'Kelola akun pengguna, tambah staf admin, dan atur izin akses' },
  { key: 'reports', label: 'Laporan & Analitik', description: 'Lihat analitik penjualan, omzet toko, dan ekspor laporan CSV' },
] as const;

export type AdminModuleKey = typeof ALL_ADMIN_MODULES[number]['key'];

export const DEFAULT_ADMIN_PERMISSIONS: AdminModuleKey[] = ['products', 'categories', 'orders'];

