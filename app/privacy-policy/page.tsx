import type { Metadata } from "next";
import { PrivacyPolicyClientView } from "@/features/legal/PrivacyPolicyClientView";

export const metadata: Metadata = {
  title: "Kebijakan Privasi (Privacy Policy)",
  description:
    "Kebijakan Privasi resmi Next Solution Store mengenai pengelolaan data akun, autentikasi Google, transaksi, analitik first-party, dan Asisten AI.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClientView />;
}
