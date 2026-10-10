"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layouts/Navbar";
import { Footer } from "@/components/layouts/Footer";
import { RecommendationChat } from "@/features/chat/RecommendationChat";
import { ProductCompareBar } from "@/features/catalog/ProductCompareBar";
import type { StorefrontSettings } from "@/lib/storefront-settings";

export function StorefrontChrome({ children, cartCount, settings }: { children: React.ReactNode; cartCount: number; settings: StorefrontSettings }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;
  return <>
    <Navbar cartCount={cartCount} />
    <main className="flex-1">{children}</main>
    <Footer settings={settings.store} marketplaces={settings.official_marketplaces} channels={settings.official_channels} />
    <ProductCompareBar />
    <RecommendationChat whatsappNumber={settings.store.whatsapp} />
  </>;
}
