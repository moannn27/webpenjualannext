"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { playOrderNotificationChime } from "@/lib/sound/order-chime";
import { useAdminSoundStore } from "@/store/useAdminSoundStore";
import {
  BellRing,
  ShoppingBag,
  ArrowRight,
  X,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IncomingOrderAlert {
  id: string;
  orderNumber: string;
  grandTotal: number;
  courier?: string;
  timestamp: number;
}

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AdminRealtimeOrderNotifier() {
  const [activeAlert, setActiveAlert] = useState<IncomingOrderAlert | null>(null);
  const soundEnabled = useAdminSoundStore((s) => s.soundEnabled);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const raw = payload.new as {
            id?: string;
            order_number?: string;
            grand_total?: number;
            courier?: string;
          };

          if (!raw || !raw.id) return;

          // 1. Play sound chime if enabled
          if (useAdminSoundStore.getState().soundEnabled) {
            playOrderNotificationChime();
          }

          // 2. Set active alert
          const alertData: IncomingOrderAlert = {
            id: String(raw.id),
            orderNumber: String(raw.order_number || "Pesanan Baru"),
            grandTotal: Number(raw.grand_total || 0),
            courier: raw.courier,
            timestamp: Date.now(),
          };

          setActiveAlert(alertData);

          // 3. Optional native Web Notification
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification("Pesanan Baru Masuk! - Next Solution Store", {
                body: `Pesanan #${alertData.orderNumber} senilai ${formatIdr(
                  alertData.grandTotal
                )} baru saja masuk.`,
                icon: "/icon.png",
              });
            } catch {
              // ignore
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // Auto dismiss alert after 10 seconds
  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  if (!activeAlert) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-5 right-5 z-[10000] max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300"
    >
      <div
        className={cn(
          "rounded-3xl border bg-card/95 backdrop-blur-md p-4 shadow-2xl transition-all",
          "border-blue-500/30 dark:border-blue-400/30 dark:bg-[#1E2028]",
          "ring-2 ring-blue-500/20"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="size-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md animate-bounce">
              <BellRing className="size-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                <ShoppingBag className="size-3.5" />
                <span>PESANAN BARU MASUK!</span>
                {soundEnabled && <Volume2 className="size-3 text-emerald-500 ml-1" />}
              </div>
              <h4 className="text-sm font-black text-foreground truncate">
                #{activeAlert.orderNumber}
              </h4>
              <p className="text-xs font-extrabold text-foreground tabular-nums">
                Total: {formatIdr(activeAlert.grandTotal)}
              </p>
              {activeAlert.courier === "pickup" ? (
                <span className="inline-block text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  • Ambil Langsung di Gerai Toko
                </span>
              ) : (
                <span className="inline-block text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  • Pengiriman Kurir ({activeAlert.courier?.toUpperCase() || "EKSPEDISI"})
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveAlert(null)}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
            aria-label="Tutup notifikasi pesanan baru"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Notifikasi real-time aktif
          </span>
          <Link
            href={`/admin/orders?search=${encodeURIComponent(activeAlert.orderNumber)}`}
            onClick={() => setActiveAlert(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <span>Buka Pesanan</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

