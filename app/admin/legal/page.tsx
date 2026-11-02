import { redirect } from "next/navigation";
import { requireModulePermission } from "@/lib/auth/permissions";
import { getLegalContentAction } from "@/actions/legal";
import { LegalContentManager } from "@/features/admin/LegalContentManager";

export const metadata = {
  title: "Kelola Syarat, Ketentuan & Kebijakan Privasi | Admin Next Solution",
  description: "Pengaturan isi halaman Syarat & Ketentuan dan Kebijakan Privasi resmi toko.",
};

export default async function AdminLegalPage() {
  try {
    await requireModulePermission("content");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const [terms, privacy] = await Promise.all([
    getLegalContentAction("terms"),
    getLegalContentAction("privacy"),
  ]);

  return (
    <div className="w-full pb-16">
      <LegalContentManager initialTerms={terms} initialPrivacy={privacy} />
    </div>
  );
}

