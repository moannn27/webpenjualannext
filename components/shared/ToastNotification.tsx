"use client";

import { useToastStore } from "@/store/useToastStore";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastNotification() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none p-4 sm:p-0"
    >
      {toasts.map((item) => {
        const isSuccess = item.type === "success";
        const isError = item.type === "error";
        const isWarning = item.type === "warning";
        const isInfo = item.type === "info";

        const Icon = isSuccess
          ? CheckCircle2
          : isError
          ? AlertCircle
          : isWarning
          ? AlertTriangle
          : Info;

        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5",
              isSuccess && "bg-card/95 text-foreground border-emerald-500/30 dark:border-emerald-500/40 shadow-emerald-500/5",
              isError && "bg-card/95 text-foreground border-rose-500/40 dark:border-rose-500/50 shadow-rose-500/5",
              isWarning && "bg-card/95 text-foreground border-amber-500/40 dark:border-amber-500/50 shadow-amber-500/5",
              isInfo && "bg-card/95 text-foreground border-blue-500/40 dark:border-blue-500/50 shadow-blue-500/5"
            )}
          >
            {/* Icon Box */}
            <div
              className={cn(
                "p-2 rounded-xl shrink-0 mt-0.5",
                isSuccess && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                isError && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                isWarning && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                isInfo && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              )}
            >
              <Icon className="size-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="font-bold text-sm text-foreground tracking-tight leading-tight">
                {item.title}
              </h4>
              {item.message && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">
                  {item.message}
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
              aria-label="Tutup notifikasi"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

