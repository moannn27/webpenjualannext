import { redirect } from "next/navigation";
import { requireModulePermission } from "@/lib/auth/permissions";
import { getAboutUsContentAction } from "@/actions/about";
import { AboutUsManager } from "@/features/admin/AboutUsManager";

export const metadata = {
  title: "Kelola Halaman Tentang Kami | Admin Next Solution",
  description: "Pengaturan konten halaman Tentang Kami (About Us) dan tata letak foto.",
};

export default async function AdminAboutPage() {
  try {
    await requireModulePermission("content");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const content = await getAboutUsContentAction();

  return (
    <div className="w-full pb-16">
      <AboutUsManager initialContent={content} />
    </div>
  );
}

