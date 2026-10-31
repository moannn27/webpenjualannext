"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMountedCart } from "@/store/useCartStore";
import { useProductCompareStore } from "@/store/useProductCompareStore";
import { getFloatingControlBottom } from "@/components/layouts/floating-positions";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const { mounted, totalItems } = useMountedCart();
  const compareIds = useProductCompareStore((state) => state.ids);
  const hasCartBar = mounted && totalItems > 0 && !pathname.startsWith("/cart") && !pathname.startsWith("/checkout");
  const hasCompareBar = pathname !== "/compare" && compareIds.length > 0;
  const buttonBottom = getFloatingControlBottom(hasCartBar || hasCompareBar, "back-to-top");

  useEffect(() => {
    let ticking = false;
    const toggleVisibility = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (typeof window !== "undefined") {
            setVisible(window.scrollY > 350);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    toggleVisibility();
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Kembali ke atas"
      title="Kembali ke paling atas"
      className={`group fixed ${buttonBottom} right-5 z-40 flex size-11 items-center justify-center rounded-full border border-border/80 bg-card/95 text-foreground shadow-lg backdrop-blur-md transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 animate-in fade-in zoom-in-75 sm:bottom-24 sm:right-6 sm:size-12`}
    >
      <ArrowUp className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  );
}

