"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  Store,
  CreditCard,
  Truck,
  HelpCircle,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import {
  buildOrderWhatsAppLinks,
  type OrderWhatsAppPayload,
} from "@/lib/orders/whatsapp-templates";
import { cn } from "@/lib/utils";

interface OrderWhatsAppButtonProps {
  payload: OrderWhatsAppPayload;
  variant?: "icon" | "button";
}

export function OrderWhatsAppButton({
  payload,
  variant = "icon",
}: OrderWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const links = buildOrderWhatsAppLinks(payload);
  const hasPhone = Boolean(links.phone);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!hasPhone) {
    return (
      <span
        title="Nomor WhatsApp pembeli tidak tercatat"
        className={cn(
          "inline-flex items-center justify-center opacity-40 cursor-not-allowed",
          variant === "icon"
            ? "size-8 rounded-xl border border-border/60 bg-muted/30 text-muted-foreground"
            : "px-3 py-1.5 rounded-xl border border-border/60 text-xs text-muted-foreground"
        )}
      >
        <MessageCircle className="size-3.5" />
      </span>
    );
  }

  const options = [
    {
      key: "pickup",
      label: links.pickup.title,
      icon: Store,
      url: links.pickup.url,
      badge: payload.isPickup ? "Rekomendasi Toko" : undefined,
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40",
    },
    {
      key: "payment",
      label: links.payment.title,
      icon: CreditCard,
      url: links.payment.url,
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
    },
    {
      key: "shipping",
      label: links.shipping.title,
      icon: Truck,
      url: links.shipping.url,
      badge: !payload.isPickup ? "Rekomendasi Kirim" : undefined,
      color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40",
    },
    {
      key: "support",
      label: links.support.title,
      icon: HelpCircle,
      url: links.support.url,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
    },
  ];

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          title={`Follow-up WhatsApp ${payload.customerName}`}
          aria-expanded={open}
          aria-label={`Opsi follow-up WhatsApp pesanan ${payload.orderNumber}`}
          className={cn(
            "size-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs",
            open
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#23252C] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          )}
        >
          <MessageCircle className="size-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <MessageCircle className="size-3.5 text-emerald-600" />
          <span>Follow-up WhatsApp</span>
          <ChevronDown className="size-3 ml-0.5 opacity-70" />
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-10 z-[100] w-72 rounded-2xl border border-border/80 bg-popover p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-border/60">
            <p className="text-xs font-bold text-foreground">
              Follow-up WhatsApp
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              Kepada: {payload.customerName} ({links.phone})
            </p>
          </div>

          <div className="py-1 space-y-1">
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <a
                  key={opt.key}
                  href={opt.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-2.5 p-2 rounded-xl text-left hover:bg-muted/70 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "size-7 rounded-lg flex items-center justify-center shrink-0",
                        opt.color
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-foreground group-hover:text-primary truncate">
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span className="inline-block text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary shrink-0" />
                </a>
              );
            })}
          </div>

          <div className="pt-1.5 pb-0.5 border-t border-border/60 text-center">
            <span className="text-[10px] text-muted-foreground">
              Format template rapi otomatis terisi
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

