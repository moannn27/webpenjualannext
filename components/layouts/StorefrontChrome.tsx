"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layouts/Navbar";
import { Footer } from "@/components/layouts/Footer";
import { RecommendationChat } from "@/features/chat/RecommendationChat";
import type { StorefrontSettings } from "@/lib/storefront-settings";
import { MessageCircle } from "lucide-react";

export function StorefrontChrome({ children, cartCount, settings }: { children: React.ReactNode; cartCount: number; settings: StorefrontSettings }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;
  return <>
    <Navbar cartCount={cartCount} />
    <main className="flex-1">{children}</main>
    <Footer settings={settings.store} />
    <RecommendationChat />
    {settings.store.whatsapp && (
      <a
        href={`https://wa.me/${settings.store.whatsapp.replace(/\D/g, '')}?text=Halo%20Next%20Solution%2C%20saya%20ingin%20bertanya%20tentang%20produk.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Hubungi kami via WhatsApp"
        className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
      >
        <MessageCircle className="size-6" />
      </a>
    )}
  </>;
}
