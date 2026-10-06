# Next Solution E-Commerce

Next Solution adalah platform e-commerce minimalis yang dibangun menggunakan **Next.js 16 App Router** dan **Supabase** (PostgreSQL). Proyek ini dilengkapi dengan fitur keranjang belanja real-time, autentikasi, serta checkout dengan transaksi database ACID untuk memastikan keamanan data inventaris.

## Setup Supabase Hosted (Tanpa Docker)

Aplikasi bisa memakai Supabase cloud; Docker tidak diperlukan. Buat project di [Supabase Dashboard](https://supabase.com/dashboard), lalu ambil **Project URL**, **publishable key** (atau legacy `anon` key), dan **project ref** dari halaman project.

### 1. Hubungkan aplikasi

Salin `.env.example` menjadi `.env.local`, lalu isi dengan URL dan publishable key dari Dashboard. Legacy `anon` key juga didukung dengan nama variabel `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Jangan masukkan `service_role` key ke variabel `NEXT_PUBLIC_*` atau commit secret ke Git.

### 2. Terapkan skema database

Login ke Supabase CLI dari terminal, lalu link project:
```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

Untuk project baru yang masih kosong, tinjau lalu terapkan migration:
```bash
npx supabase migration list
npm run db:push
```

Migration membuat tabel, RLS, RPC checkout, dan tarif ongkir. Jika project sudah berisi tabel/data atau pernah menerima migration versi lama, jangan langsung push: cocokkan riwayat migration dan backup dulu. Nama migration repo sudah dinormalisasi ke timestamp.

### 3. Isi data contoh

`db:push` hanya menerapkan migration, bukan seed. Untuk project hosted baru, buka **SQL Editor** di Supabase Dashboard dan jalankan isi `supabase/seed.sql` satu kali. Seed aman dijalankan ulang untuk data contoh yang sama.

### 4. Jalankan dan cek aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Untuk melihat data, gunakan **Table Editor** di Dashboard. Setelah checkout berhasil, query ini menampilkan order dan status pembayaran:
```sql
select
  o.order_number,
  o.status as order_status,
  o.total_amount,
  o.shipping_amount,
  o.grand_total,
  p.payment_method,
  p.status as payment_status
from public.orders o
left join public.payments p on p.order_id = o.id
order by o.created_at desc;
```

`npm run db:start`, `npm run db:reset`, dan `npm run db:test` adalah workflow Supabase lokal dan memerlukan Docker. `db:reset` menghapus database lokal; jangan gunakan pada project hosted.

Test aplikasi:
```bash
npm test
```

---

## 🛠️ Tech Stack
- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, RPC Transactions)
- **Styling:** Tailwind CSS v4, Shadcn UI
- **Validasi:** Zod
- **Ikon:** Lucide React
