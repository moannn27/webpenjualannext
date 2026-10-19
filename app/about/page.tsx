import type { Metadata } from "next";
import { getAboutUsContentAction } from "@/actions/about";
import { AboutUsView } from "@/features/about/AboutUsView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getAboutUsContentAction();

  return {
    title: content.meta_title || "Tentang Kami - Next Solution Store",
    description:
      content.meta_description ||
      "Pusat belanja laptop bisnis, gaming, PC all-in-one dan gadget bergaransi resmi dengan konsultasi spesifikasi jujur dan layanan purna jual andal.",
    openGraph: {
      title: content.meta_title || "Tentang Kami - Next Solution Store",
      description: content.meta_description,
      images: content.og_image ? [{ url: content.og_image }] : undefined,
    },
    alternates: {
      canonical: "/about",
    },
  };
}

export default async function AboutPage() {
  const content = await getAboutUsContentAction();

  return (
    <main className="min-h-screen">
      <AboutUsView content={content} />
    </main>
  );
}

