"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layouts/Navbar";
import { Footer } from "@/components/layouts/Footer";
import { RecommendationChat } from "@/features/chat/RecommendationChat";
import { ProductCompareBar } from "@/features/catalog/ProductCompareBar";
import { ToastNotification } from "@/components/shared/ToastNotification";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { MobileStickyCartBar } from "@/components/layouts/MobileStickyCartBar";
import { useCartStore, type StoredCartItem } from "@/store/useCartStore";
import type { StorefrontSettings } from "@/lib/storefront-settings";
import { AlertTriangle } from "lucide-react";

export function StorefrontChrome({
  children,
  cartCount,
  currentUserId = null,
  initialCartItems = [],
  settings,
}: {
  children: React.ReactNode;
  cartCount: number;
  currentUserId?: string | null;
  initialCartItems?: StoredCartItem[];
  settings: StorefrontSettings;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const store = useCartStore.getState();
    if (!currentUserId) {
      if (store.userId || store.items.length > 0) {
        store.clearCart();
      }
    } else {
      if (store.userId !== currentUserId) {
        store.syncWithUser(currentUserId, initialCartItems);
      }
    }
  }, [currentUserId, initialCartItems]);

  if (pathname.startsWith("/admin") || pathname.includes("/invoice")) return <>{children}</>;

  const features = settings.features;

  return (
    <>
      {/* 1. Bar Pengumuman Atas (Announcement Bar) */}
      {features?.announcement_bar_enabled && features.announcement_bar_text && (
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-xs font-semibold tracking-wide shadow-xs">
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

      <Navbar cartCount={cartCount} currentUserId={currentUserId} settings={settings} />
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
      <ScrollToTopButton />
      <ToastNotification />
      <MobileStickyCartBar />
    </>
  );
}
