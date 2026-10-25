import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Informasi tentang penggunaan data saat menggunakan Next Solution Store.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privasi Anda"
      title="Kebijakan Privasi"
      intro="Ringkasan data yang digunakan untuk menyediakan akun, keranjang, pemesanan, dan bantuan pelanggan di situs ini."
      sections={[
        {
          title: "Data yang digunakan",
          paragraphs: [
            "Saat Anda menggunakan layanan, data dapat mencakup informasi akun dan kontak yang Anda berikan, detail alamat dan pesanan, serta informasi sesi yang diperlukan agar fitur situs berfungsi.",
          ],
        },
        {
          title: "Cara data digunakan",
          paragraphs: [
            "Informasi digunakan untuk mengelola akun, menyimpan keranjang, memproses dan menampilkan status pesanan, membantu menjawab pertanyaan, serta menjaga keamanan layanan.",
            "Informasi yang diperlukan dapat diproses oleh penyedia layanan yang mendukung fungsi situs dan pemenuhan pesanan. Kami tidak meminta kata sandi akun Google Anda.",
          ],
        },
        {
          title: "Sesi dan pengelolaan akun",
          paragraphs: [
            "Situs menggunakan penyimpanan sesi agar login dan fitur akun tetap berjalan. Anda dapat keluar dari akun melalui menu akun, dan memperbarui informasi profil melalui halaman Profil jika fitur tersebut tersedia.",
          ],
        },
        {
          title: "Pertanyaan atau pembaruan data",
          paragraphs: [
            "Jika Anda memiliki pertanyaan atau ingin meminta bantuan terkait informasi akun, hubungi Next Solution melalui kanal yang tercantum di halaman Tentang Kami.",
          ],
        },
      ]}
    />
  );
}
