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

export function WhatsAppFloatingButton({ whatsappNumber }: { whatsappNumber: string }) {
  const pathname = usePathname();
  const { mounted, totalItems } = useMountedCart();
  const compareIds = useProductCompareStore((state) => state.ids);
  const hasCartBar = mounted && totalItems > 0 && !pathname.startsWith("/cart") && !pathname.startsWith("/checkout");
  const hasCompareBar = pathname !== "/compare" && compareIds.length > 0;
  const launcherBottom = getFloatingControlBottom(hasCartBar || hasCompareBar, "chat");
  const normalizedWhatsapp = (whatsappNumber || "628112238310").replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${normalizedWhatsapp}?text=${encodeURIComponent(
    "Halo Next Solution Store, saya ingin bertanya tentang produk dan layanan toko."
  )}`;

  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed ${launcherBottom} right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform hover:scale-110 hover:bg-[#20bd5a] active:scale-95 cursor-pointer sm:bottom-5`}
      aria-label="Hubungi Admin via WhatsApp"
      title="Hubungi Admin via WhatsApp"
    >
      <div className="relative flex items-center justify-center">
        <svg className="size-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      </div>
    </a>
  );
}
