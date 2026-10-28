import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Mail, Phone, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Kebijakan Privasi (Privacy Policy)",
  description:
    "Kebijakan Privasi resmi Next Solution Store mengenai pengelolaan data akun, autentikasi Google, transaksi, analitik first-party, dan Asisten AI.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      {/* Header Banner */}
      <header className="mb-10 rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xs">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-3">
          <ShieldCheck className="size-4" />
          <span>Privasi &amp; Perlindungan Data Pengguna</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Kebijakan Privasi (Privacy Policy)
        </h1>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-3xl">
          Next Solution Store berkomitmen untuk melindungi privasi dan keamanan data pribadi pelanggan kami. 
          Halaman ini menjelaskan secara transparan data apa saja yang kami kumpulkan, bagaimana data tersebut digunakan 
          untuk mendukung layanan belanja, transaksi, dan akun Anda, serta hak-hak yang Anda miliki.
        </p>
        <p className="mt-2 text-xs font-medium text-muted-foreground/80">
          Terakhir diperbarui: 28 Oktober 2026 &bull; Berlaku untuk domain <strong>https://nextsolution.web.id</strong>
        </p>
      </header>

      {/* Konten Kebijakan */}
      <div className="space-y-8 text-foreground/90 leading-relaxed text-sm sm:text-base">
        {/* Bagian 1: Data Akun & Google Sign-In */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            1. Informasi Akun dan Autentikasi Google (Google Identity Services)
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Ketika Anda membuat akun atau masuk ke situs Next Solution Store, kami mengumpulkan data autentikasi berikut:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong>Login dengan Akun Google</strong>: Melalui Google Identity Services (GIS) / Google Sign-In, 
              kami hanya menerima data profil publik dasar yang Anda izinkan, yaitu: <em>nama lengkap</em>, <em>alamat email terverifikasi</em>, 
              <em>foto profil (avatar)</em>, dan <em>identifier akun Google unik (Google user ID)</em>.
            </li>
            <li>
              <strong>Tidak Mengakses Password Google</strong>: Kami <u>tidak pernah</u> meminta, melihat, atau menyimpan kata sandi 
              akun Google Anda. Proses autentikasi Google ditangani secara aman oleh Google Identity Services dan diverifikasi 
              oleh Supabase Auth.
            </li>
            <li>
              <strong>Pendaftaran Manual (Email &amp; Kata Sandi)</strong>: Jika mendaftar langsung, kami mencatat nama lengkap, 
              alamat email, nomor telepon/WhatsApp Indonesia yang valid, dan kata sandi yang telah di-hash secara kriptografis 
              (kami tidak menyimpan kata sandi dalam teks biasa).
            </li>
            <li>
              <strong>Sesi &amp; Cookies Autentikasi</strong>: Kami menggunakan cookie sesi first-party (HTTP-only dan aman) 
              agar sesi login Anda tetap aktif saat berpindah halaman dan tidak perlu login berulang kali.
            </li>
          </ul>
        </section>

        {/* Bagian 2: Data Transaksi & Pesanan */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            2. Data Transaksi, Pemesanan, dan Pengiriman
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Untuk memproses pesanan belanja perangkat komputer, laptop, dan aksesori di toko kami, kami mengumpulkan data operasional yang diperlukan:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong>Informasi Kontak &amp; Penerima</strong>: Nama penerima, nomor WhatsApp/telepon aktif, serta alamat tujuan 
              pengiriman lengkap (untuk opsi pengiriman kurir) atau penentuan gerai toko yang dipilih (untuk opsi Ambil Sendiri di Gerai Toko).
            </li>
            <li>
              <strong>Metode &amp; Verifikasi Pembayaran</strong>: Kami mencatat metode transaksi yang Anda pilih (Transfer Bank BCA, Mandiri, BRI, BNI, QRIS, atau Bayar Tunai di Gerai Toko). 
              Untuk metode transfer, Anda dapat mengunggah foto struk/bukti transfer yang diverifikasi oleh tim admin kami. Kami tidak mengumpulkan atau menyimpan kredensial kartu debit/kredit Anda.
            </li>
            <li>
              <strong>Riwayat Pesanan &amp; Faktur Penjualan</strong>: Nomor faktur, rincian produk (SKU, varian spesifikasi, kuantitas), 
              harga satuan, diskon voucher promo, catatan garansi, serta status transaksi (menunggu pembayaran, diproses, selesai, dibatalkan, atau direfund).
            </li>
          </ul>
        </section>

        {/* Bagian 3: Aktivitas Situs & Analitik First-Party */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            3. Aktivitas Website dan Analitik First-Party
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Untuk memahami kebutuhan pelanggan dan meningkatkan kenyamanan berbelanja, sistem kami mencatat metrik analitik internal:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong>Event Interaksi Belanja</strong>: Melacak kunjungan halaman (<em>page_view</em>), produk yang dilihat (<em>view_item</em>), 
              kata kunci pencarian katalog (<em>search</em>), penambahan ke keranjang (<em>add_to_cart</em>), inisiasi checkout (<em>begin_checkout</em>), 
              dan interaksi rekomendasi produk AI (<em>ai_recommendation_click</em>).
            </li>
            <li>
              <strong>Data Teknis Pseudonim</strong>: Pengenal acak pengunjung (<em>visitor_id</em>) dan sesi belanja (<em>session_id</em>), 
              kategori perangkat (<em>mobile</em>, <em>desktop</em>, atau <em>tablet</em>), domain perujuk (<em>referrer</em>), serta parameter kampanye iklan (<em>UTM Source/Medium</em>).
            </li>
            <li>
              <strong>Bebas Pelacak Pihak Ketiga</strong>: Sistem analitik ini berjalan secara first-party pada basis data kami sendiri. 
              Kami <strong>tidak menanamkan script pelacak pihak ketiga</strong> lintas situs (seperti Facebook Pixel atau data broker). 
              Data analitik disimpan secara pseudonim dan semata-mata digunakan untuk evaluasi performa toko Next Solution.
            </li>
          </ul>
        </section>

        {/* Bagian 4: Asisten Belanja AI */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            4. Asisten Rekomendasi Belanja AI
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Next Solution menyediakan fitur jendela obrolan pintar Asisten AI untuk membantu Anda menemukan laptop atau gadget 
            sesuai kebutuhan (misalnya kriteria spesifikasi, gaming, kebutuhan kantor, atau rentang budget):
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong>Pemrosesan Percakapan</strong>: Pesan pertanyaan yang Anda ketikkan dalam jendela chat dikirimkan melalui 
              server kami ke penyedia Large Language Model (Google Gemini API atau Groq API) bersama konteks katalog produk resmi toko kami.
            </li>
            <li>
              <strong>Privasi Percakapan</strong>: Percakapan ini diproses sesuai kebijakan pemrosesan data penyedia API terkait. 
              Kami mengimbau pelanggan untuk <strong>tidak membagikan informasi pribadi yang bersifat rahasia</strong> (seperti nomor PIN, 
              rekening bank, atau kata sandi) ke dalam obrolan asisten AI.
            </li>
          </ul>
        </section>

        {/* Bagian 5: Penyimpanan & Pihak Penerima Data */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            5. Penyimpanan Data dan Pihak Ketiga yang Terlibat
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Kami hanya membagikan data Anda kepada pihak ketiga tepercaya sejauh yang diperlukan untuk menjalankan operasional toko:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong>Supabase Inc.</strong>: Infrastruktur basis data cloud terenkripsi, penyimpanan sesi login, dan hosting file media 
              (foto produk dan bukti transfer).
            </li>
            <li>
              <strong>Google LLC (Google Identity Services)</strong>: Penyedia layanan otentikasi masuk satu-klik Google Sign-In.
            </li>
            <li>
              <strong>Penyedia Eksternal AI (Google Gemini &amp; Groq)</strong>: Pemrosesan kueri pencarian dan konsultasi produk pada chatbot.
            </li>
            <li>
              <strong>Jasa Ekspedisi / Kurir Pengantaran</strong>: Nama penerima, alamat pengiriman, dan nomor telepon diserahkan kepada kurir pengiriman resmi hanya untuk tujuan mengantarkan pesanan fisik ke alamat Anda.
            </li>
            <li>
              <strong>Tidak Memperjualbelikan Data</strong>: Kami tidak pernah dan tidak akan pernah menjual, menyewakan, atau memperdagangkan data pribadi pelanggan kepada pihak pengiklan atau pihak ketiga lainnya.
            </li>
          </ul>
        </section>

        {/* Bagian 6: Keamanan, Retensi, & Hak Pengguna */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            6. Keamanan Data, Masa Simpan, dan Hak Anda
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <strong>Keamanan Teknis</strong>: Seluruh lalu lintas data di situs kami dilindungi dengan enkripsi HTTPS / SSL tingkat industri. 
              Akses basis data internal dilindungi dengan Row Level Security (RLS) bertingkat.
            </li>
            <li>
              <strong>Retensi Data</strong>: Informasi akun dan transaksi disimpan selama akun Anda aktif atau selama diperlukan untuk 
              kepentingan administrasi garansi resmi distributor dan bukti perpajakan penjualan.
            </li>
            <li>
              <strong>Hak Koreksi dan Penghapusan Akun</strong>: Anda berhak melihat rincian akun Anda, memperbarui nomor kontak atau alamat 
              melalui menu Profil, atau mengajukan permohonan penutupan akun beserta penghapusan data dengan menghubungi tim dukungan kami.
            </li>
          </ul>
        </section>

        {/* Bagian 7: Perlindungan Anak & Perubahan Kebijakan */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3.5 shadow-2xs">
          <h2 className="text-xl font-bold text-foreground">
            7. Privasi Anak dan Perubahan Kebijakan
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Layanan Next Solution Store ditujukan untuk individu yang telah berusia minimal 18 tahun atau yang melakukan transaksi 
            dengan persetujuan dan pengawasan orang tua/wali sah. Kami berhak memperbarui Kebijakan Privasi ini dari waktu ke waktu 
            seiring penyempurnaan fitur website. Setiap pembaruan materiil akan dicantumkan tanggal revisinya pada bagian atas halaman ini.
          </p>
        </section>

        {/* Bagian 8: Kontak Resmi Pengelola */}
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            <span>8. Saluran Kontak Resmi Next Solution Store</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, penggunaan data Google, permohonan pembaruan data, 
            atau klaim transaksi, silakan hubungi kami melalui saluran resmi berikut:
          </p>

          <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm pt-1">
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
              <Phone className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">WhatsApp &amp; Telepon</span>
                <a href="https://wa.me/628112238310" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  +62 811-2238-310
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
              <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Alamat Gerai Toko Fisik</span>
                <span className="text-muted-foreground">
                  Jl. Kartini No. 9, Bandung / Jl. Pajajaran No. 42, Kota Bandung, Jawa Barat
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border">
              <Clock className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Jam Operasional Layanan</span>
                <span className="text-muted-foreground">
                  Senin &ndash; Sabtu: 09.00 &ndash; 18.00 WIB
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Kunjungi juga halaman{" "}
            <Link href="/about" className="font-semibold text-primary underline underline-offset-4">
              Tentang Kami (About Us)
            </Link>{" "}
            atau{" "}
            <Link href="/terms" className="font-semibold text-primary underline underline-offset-4">
              Syarat &amp; Ketentuan (Terms of Service)
            </Link>.
          </p>
        </section>
      </div>
    </main>
  );
}

