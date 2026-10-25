import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description: "Syarat penggunaan situs dan layanan Next Solution Store.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Informasi layanan"
      title="Syarat & Ketentuan"
      intro="Ketentuan umum untuk menggunakan situs dan melakukan pemesanan di Next Solution Store."
      sections={[
        {
          title: "Informasi produk dan ketersediaan",
          paragraphs: [
            "Kami berupaya menampilkan informasi produk, pilihan varian, harga, dan ketersediaan dengan jelas. Pastikan varian dan detail pesanan sudah sesuai sebelum melanjutkan checkout.",
            "Harga dan stok dapat berubah mengikuti ketersediaan. Jika ada perbedaan informasi yang memengaruhi pesanan, konfirmasi akan diberikan sebelum pesanan diproses lebih lanjut.",
          ],
        },
        {
          title: "Akun dan pemesanan",
          paragraphs: [
            "Gunakan informasi kontak dan alamat yang benar saat membuat akun atau pesanan. Anda bertanggung jawab menjaga akses ke akun dan memeriksa ringkasan pesanan sebelum mengirimkannya.",
            "Metode pembayaran, pengiriman, atau pengambilan yang tersedia mengikuti pilihan yang ditampilkan saat checkout. Status pesanan dapat dilihat melalui akun Anda.",
          ],
        },
        {
          title: "Garansi dan bantuan setelah pembelian",
          paragraphs: [
            "Cakupan dan masa garansi mengikuti informasi produk serta ketentuan resmi dari produsen atau distributor yang berlaku untuk unit tersebut. Simpan bukti pembelian untuk membantu proses layanan.",
            "Untuk pertanyaan tentang pesanan atau produk, sampaikan nomor pesanan dan detail kendala melalui kanal kontak pada halaman Tentang Kami.",
          ],
        },
        {
          title: "Penggunaan situs",
          paragraphs: [
            "Gunakan situs secara wajar dan jangan mencoba mengganggu keamanan, ketersediaan, atau penggunaan layanan oleh pelanggan lain.",
          ],
        },
      ]}
    />
  );
}
