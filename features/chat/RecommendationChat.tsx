"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const RecommendationChatWindow = dynamic(
  () => import("./RecommendationChatWindow").then((m) => m.RecommendationChatWindow),
  { ssr: false }
);

export function RecommendationChat({ whatsappNumber }: { whatsappNumber: string }) {
  const [open, setOpen] = useState(false);
  const normalizedWhatsapp = whatsappNumber.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${normalizedWhatsapp}?text=${encodeURIComponent(
    "Halo Next Solution, saya ingin bertanya tentang produk."
  )}`;

  return (
    <>
      {!open && (
        <Button
          className="fixed bottom-5 right-5 z-50 size-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-transform hover:scale-105 active:scale-95 cursor-pointer"
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
