import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Mail, Phone, MapPin, Clock, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan (Terms & Conditions)",
  description:
    "Syarat & Ketentuan resmi penggunaan situs, akun, pemesanan produk laptop/komputer, metode pembayaran, garansi resmi, dan layanan Next Solution Store.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {/* Header Banner */}
      <header className="mb-10 rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xs">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-3">
          <FileText className="size-4" />
          <span>Ketentuan Layanan E-Commerce</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Syarat &amp; Ketentuan (Terms &amp; Conditions)
        </h1>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-3xl">
          Selamat datang di Next Solution Store (<strong>https://nextsolution.web.id</strong>). 
          Syarat &amp; Ketentuan ini mengatur penggunaan situs web, pembuatan akun, pemesanan produk komputer dan laptop, 
          metode pembayaran, pengiriman, serta klaim garansi di toko kami. Dengan mengakses atau berbelanja di situs ini, 
          Anda menyetujui seluruh ketentuan di bawah ini.
        </p>
        <p className="mt-2 text-xs font-medium text-muted-foreground/80">
          Terakhir diperbarui: 28 Oktober 2026 &bull; Berlaku untuk seluruh transaksi di Next Solution Store
        </p>
      </header>

      {/* Konten Ketentuan */}
      <div className="space-y-8 text-foreground/90 leading-relaxed text-sm sm:text-base">
        {/* Bagian 1: Akun & Keamanan */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            1. Pendaftaran Akun dan Autentikasi Pengguna
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong>Pilihan Pendaftaran</strong>: Anda dapat membuat akun menggunakan email dan kata sandi mandiri, 
              atau menggunakan fitur login cepat satu-klik dengan Akun Google (Google Identity Services).
            </li>
            <li>
              <strong>Keakuratan Informasi</strong>: Anda wajib memberikan data kontak yang benar dan aktif 
              (nama lengkap, alamat email, dan nomor WhatsApp/telepon) guna kelancaran konfirmasi transaksi dan pengiriman pesanan.
            </li>
            <li>
              <strong>Keamanan Akun</strong>: Anda bertanggung jawab penuh untuk menjaga kerahasiaan kredensial akun Anda. 
              Segera hubungi tim dukungan kami jika mencurigai adanya akses tidak sah terhadap akun Anda.
            </li>
            <li>
              <strong>Hak Penghentian Layanan</strong>: Kami berhak menonaktifkan atau membatasi akses akun yang terbukti 
              melakukan tindakan kecurangan, manipulasi promo, atau pelanggaran hukum yang berlaku.
            </li>
          </ul>
        </section>

        {/* Bagian 2: Produk, Varian, & Harga */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            2. Informasi Produk, Spesifikasi, Varian, dan Harga
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong>Keaslian Produk</strong>: Seluruh unit laptop dan perangkat teknologi yang dijual di Next Solution Store 
              adalah 100% produk baru, original, dan bergaransi resmi distributor Indonesia.
            </li>
            <li>
              <strong>Spesifikasi &amp; Varian</strong>: Rincian spesifikasi teknis (prosesor, RAM, penyimpanan SSD, grafis, layar, 
              serta pilihan varian warna) dicantumkan pada setiap halaman produk. Mohon memeriksa kesesuaian varian sebelum melanjutkan proses pembayaran.
            </li>
            <li>
              <strong>Mata Uang &amp; Harga Efektif</strong>: Seluruh harga tercantum dalam mata uang Rupiah (IDR). Kami berupaya 
              memastikan akurasi harga dan ketersediaan stok secara real-time. Jika terjadi kesalahan sistematis yang nyata pada pencantuman harga atau stok, 
              kami akan menghubungi Anda terlebih dahulu untuk konfirmasi pembatalan atau penyesuaian pesanan.
            </li>
          </ul>
        </section>

        {/* Bagian 3: Pemesanan & Pembayaran */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            3. Alur Pemesanan dan Metode Pembayaran
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Pesanan dibuat melalui proses checkout keranjang belanja di website. Metode pembayaran resmi yang didukung meliputi:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong>Transfer Bank</strong>: Rekening resmi BCA, Mandiri, BRI, atau BNI atas nama toko. 
              Pelanggan mengunggah bukti transfer yang valid melalui website untuk diverifikasi oleh admin.
            </li>
            <li>
              <strong>QRIS (All Payment)</strong>: Pembayaran instan melalui pemindaian kode QRIS resmi dengan verifikasi status pembayaran otomatis/manual.
            </li>
            <li>
              <strong>Tunai / Cash di Gerai Toko</strong>: Pembayaran tunai saat unit diambil langsung di gerai fisik Next Solution 
              (khusus opsi Ambil Sendiri di Gerai Toko).
            </li>
            <li>
              <strong>Status Pesanan</strong>: Status transaksi dapat dipantau real-time pada menu Akun / Pesanan: 
              <em>Menunggu Pembayaran</em>, <em>Diproses (Packing &amp; QC)</em>, <em>Siap Diambil / Dikirim</em>, <em>Selesai</em>, atau <em>Dibatalkan</em>.
            </li>
          </ul>
        </section>

        {/* Bagian 4: Pengiriman & Ambil Sendiri */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            4. Pengiriman Kurir dan Pengambilan Mandiri di Gerai Toko
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong>Ambil Sendiri di Gerai Toko (Pickup)</strong>: Anda dapat memilih gerai toko Next Solution yang tersedia 
              (misalnya gerai Bandung di Jl. Kartini No. 9 atau Jl. Pajajaran No. 42). Saat mengambil pesanan, mohon tunjukkan 
              nomor faktur/pesanan dan kartu identitas pemesan. Tidak dikenakan ongkos kirim untuk opsi ini.
            </li>
            <li>
              <strong>Pengiriman ke Alamat (Delivery)</strong>: Pesanan dikemas secara aman dengan bubble wrap tebal dan opsi packing kayu 
              jika diperlukan. Pengiriman diserahkan kepada jasa ekspedisi resmi terpercaya. Estimasi waktu tiba mengikuti jadwal operasional kurir pengiriman.
            </li>
          </ul>
        </section>

        {/* Bagian 5: Garansi Resmi & Kebijakan Retur */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <span>5. Ketentuan Garansi Resmi dan Kebijakan Ganti Baru Toko</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong>Garansi Resmi Distributor</strong>: Seluruh unit laptop dilindungi garansi resmi dari distributor/prinsipal 
              resmi di Indonesia (antara 1 hingga 3 tahun tergantung merek dan model). Klaim perbaikan dapat dilakukan di seluruh service center resmi brand tersebut di Indonesia.
            </li>
            <li>
              <strong>Garansi Toko 14 Hari Ganti Unit Baru</strong>: Next Solution memberikan jaminan perlindungan ekstra berupa 
              <strong> penggantian unit baru dalam waktu 14 hari</strong> kalender sejak tanggal penerimaan apabila produk mengalami kendala cacat produksi pabrik (*factory defect*).
            </li>
            <li>
              <strong>Syarat Mutlak Klaim Cacat Pabrik</strong>:
              <ol className="list-decimal pl-5 mt-1 space-y-1">
                <li>Segel unit, segel toko, dan segel distributor dalam kondisi utuh dan tidak rusak.</li>
                <li>Wajib menyertakan nota / faktur penjualan resmi dari Next Solution Store.</li>
                <li><strong>Wajib menyertakan video unboxing lengkap tanpa jeda (cut/pause/edit)</strong> mulai dari paket masih terbungkus rapat hingga unit dihidupkan pertama kali.</li>
                <li>Kelengkapan kotak, kartu garansi, manual, dan adaptor charger lengkap dalam kondisi mulus.</li>
              </ol>
            </li>
            <li>
              <strong>Pengecualian Garansi</strong>: Garansi tidak mencakup kerusakan akibat kelalaian fisik pengguna (jatuh, retak/pecah, 
              terkena cairan, bencana alam, korsleting akibat instalasi listrik rumah yang tidak stabil, atau modifikasi software/hardware yang melanggar ketentuan pabrik).
            </li>
            <li>
              <strong>Pengembalian Stok Otomatis</strong>: Jika pesanan dibatalkan atau refund disetujui secara resmi oleh tim admin, 
              stok unit yang bersangkutan akan dikembalikan ke inventaris toko secara otomatis oleh sistem.
            </li>
          </ul>
        </section>

        {/* Bagian 6: Voucher & Kode Promo */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            6. Penggunaan Voucher Diskon dan Kode Promo
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              Kode voucher promosi hanya dapat diterapkan pada transaksi yang memenuhi syarat ketentuan minimum belanja dan kategori produk yang ditentukan.
            </li>
            <li>
              Setiap voucher memiliki batas kuota pemakaian dan masa berlaku aktif. Voucher tidak dapat ditukarkan dengan uang tunai.
            </li>
            <li>
              Jika pesanan yang menggunakan voucher dibatalkan karena kelalaian pembeli, kuota voucher yang sudah terpakai tidak dapat dikembalikan secara otomatis.
            </li>
          </ul>
        </section>

        {/* Bagian 7: Hak Kekayaan Intelektual & Batasan */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            7. Hak Kekayaan Intelektual dan Penggunaan yang Dilarang
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Seluruh merek dagang, logo brand Next Solution, materi gambar katalog, desain antarmuka, dan kode sumber website 
            adalah hak kekayaan intelektual milik Next Solution Store atau pemegang lisensi resmi kami. Pengguna dilarang keras untuk:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>Menyalin, menduplikasi, atau menyebarluaskan aset visual dan konten katalog untuk kepentingan komersial tanpa izin tertulis.</li>
            <li>Melakukan tindakan pengujian celah keamanan tanpa izin, serangan Denial of Service (DoS), atau scraping data secara agresif.</li>
            <li>Mengunggah file berbahaya, virus, atau bukti transaksi palsu pada sistem pembayaran kami.</li>
          </ul>
        </section>

        {/* Bagian 8: Saluran Kontak Resmi */}
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            <span>8. Hubungi Kami untuk Bantuan Transaksi &amp; Layanan</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tim dukungan Next Solution siap membantu Anda jika memiliki pertanyaan mengenai pemesanan, konfirmasi faktur, 
            pengambilan gerai, atau bantuan klaim garansi:
          </p>

          <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm pt-1">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
              <Phone className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">WhatsApp &amp; Telepon</span>
                <a href="https://wa.me/628112238310" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  +62 811-2238-310
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
              <Mail className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Email Dukungan Pelanggan</span>
                <a href="mailto:support@nextsolution.id" className="text-primary hover:underline">
                  support@nextsolution.id
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
              <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Gerai Toko Resmi</span>
                <span className="text-muted-foreground">
                  Jl. Kartini No. 9, Bandung / Jl. Pajajaran No. 42, Kota Bandung, Jawa Barat
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
              <Clock className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Jam Layanan Operasional</span>
                <span className="text-muted-foreground">
                  Senin &ndash; Sabtu: 09.00 &ndash; 18.00 WIB
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Baca juga{" "}
            <Link href="/privacy-policy" className="font-semibold text-primary underline underline-offset-4">
              Kebijakan Privasi (Privacy Policy)
            </Link>{" "}
            kami untuk memahami bagaimana kami menjaga keamanan data Anda.
          </p>
        </section>
      </div>
    </main>
  );
}
