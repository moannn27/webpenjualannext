"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMountedCart } from "@/store/useCartStore";
import { useProductCompareStore } from "@/store/useProductCompareStore";
import { getFloatingControlBottom } from "@/components/layouts/floating-positions";

const RecommendationChatWindow = dynamic(
  () => import("./RecommendationChatWindow").then((m) => m.RecommendationChatWindow),
  { ssr: false }
);

export function RecommendationChat({ whatsappNumber }: { whatsappNumber: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { mounted, totalItems } = useMountedCart();
  const compareIds = useProductCompareStore((state) => state.ids);
  const hasCartBar = mounted && totalItems > 0 && !pathname.startsWith("/cart") && !pathname.startsWith("/checkout");
  const hasCompareBar = pathname !== "/compare" && compareIds.length > 0;
  const launcherBottom = getFloatingControlBottom(hasCartBar || hasCompareBar, "chat");
  const normalizedWhatsapp = whatsappNumber.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${normalizedWhatsapp}?text=${encodeURIComponent(
    "Halo Next Solution, saya ingin bertanya tentang produk."
  )}`;

  return (
    <>
      {!open && (
        <Button
          className={`fixed ${launcherBottom} right-5 z-50 size-14 rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 hover:bg-primary/90 active:scale-95 cursor-pointer sm:bottom-5`}
          aria-label="Buka chat rekomendasi"
          onClick={() => setOpen(true)}
        >
          <div className="relative">
            <MessageCircle className="size-6" />
            <span className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-background" />
          </div>
        </Button>
      )}

      {open && (
        <RecommendationChatWindow
          whatsappHref={whatsappHref}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
