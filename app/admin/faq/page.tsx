import { redirect } from "next/navigation";
import { requireModulePermission } from "@/lib/auth/permissions";
import { getAdminHomepageItemsAction } from "@/actions/admin";
import { FaqManager, type FAQItem } from "@/features/admin/FaqManager";

export const metadata = {
  title: "Kelola Tanya Jawab (FAQ) | Admin Next Solution",
  description: "Pengaturan pertanyaan umum (FAQ) dan jawaban seputar layanan toko.",
};

export default async function AdminFaqPage() {
  try {
    await requireModulePermission("content");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const { faqs } = await getAdminHomepageItemsAction();

  return (
    <div className="w-full pb-16">
      <FaqManager initialFaqs={(faqs as FAQItem[]) || []} />
    </div>
  );
}

