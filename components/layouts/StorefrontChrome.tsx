"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layouts/Navbar";
import { Footer } from "@/components/layouts/Footer";
import { RecommendationChat } from "@/features/chat/RecommendationChat";
import { ProductCompareBar } from "@/features/catalog/ProductCompareBar";
import { ToastNotification } from "@/components/shared/ToastNotification";
import type { StorefrontSettings } from "@/lib/storefront-settings";
import { AlertTriangle, Sparkles } from "lucide-react";

export function StorefrontChrome({
  children,
  cartCount,
  settings,
}: {
  children: React.ReactNode;
  cartCount: number;
  settings: StorefrontSettings;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.includes("/invoice")) return <>{children}</>;

  const features = settings.features;

  return (
    <>
      {/* 1. Bar Pengumuman Atas (Announcement Bar) */}
      {features?.announcement_bar_enabled && features.announcement_bar_text && (
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-xs font-semibold tracking-wide shadow-xs flex items-center justify-center gap-2">
          <Sparkles className="size-3.5 shrink-0" />
          <span>{features.announcement_bar_text}</span>
        </div>
      )}

      {/* 2. Banner Pemberitahuan Toko Libur / Maintenance */}
      {features?.store_maintenance_mode && features.store_maintenance_message && (
        <div className="bg-amber-500 text-amber-950 py-2 px-4 text-center text-xs font-bold border-b border-amber-600/30 flex items-center justify-center gap-2 shadow-xs">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{features.store_maintenance_message}</span>
        </div>
      )}

      <Navbar cartCount={cartCount} />
      <main className="flex-1">{children}</main>
      <Footer
        settings={settings.store}
        marketplaces={settings.official_marketplaces}
        channels={settings.official_channels}
      />
      {features?.compare_enabled !== false && <ProductCompareBar />}
      {features?.ai_recommendation_chat !== false && (
        <RecommendationChat whatsappNumber={settings.store.whatsapp || ""} />
      )}
      <ToastNotification />
    </>
  );
}
