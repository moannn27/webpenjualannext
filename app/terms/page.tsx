import type { Metadata } from "next";
import { TermsClientView } from "@/features/legal/TermsClientView";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan (Terms & Conditions)",
  description:
    "Syarat & Ketentuan resmi penggunaan situs, akun, pemesanan produk laptop/komputer, metode pembayaran, garansi resmi, dan layanan Next Solution Store.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <TermsClientView />;
}
