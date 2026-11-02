"use client";

import { useEffect, useRef } from "react";
import { useConfirmStore } from "@/store/useConfirmStore";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, HelpCircle, Info, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConfirmDialog() {
  const { isOpen, options, closeConfirm } = useConfirmStore();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus confirm button when dialog opens
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeConfirm(false);
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        closeConfirm(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeConfirm]);

  if (!isOpen) return null;

  const isDanger = options.variant === "danger";
  const isWarning = options.variant === "warning";

  // Pick appropriate icon
  const renderIcon = () => {
    if (options.icon === "trash" || (isDanger && !options.icon)) {
      return <Trash2 className="size-6 text-rose-600 dark:text-rose-400" />;
    }
    if (options.icon === "alert" || isWarning) {
      return <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />;
    }
    if (options.icon === "check") {
      return <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />;
    }
    if (options.icon === "info") {
      return <Info className="size-6 text-blue-600 dark:text-blue-400" />;
    }
    return <HelpCircle className="size-6 text-blue-600 dark:text-blue-400" />;
  };

  const iconBg = isDanger
    ? "bg-rose-100 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/50"
    : isWarning
    ? "bg-amber-100 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/50"
    : "bg-blue-100 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/50";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Dimmed Blurred Backdrop */}
      <div
        onClick={() => closeConfirm(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Dialog Box Card */}
      <div
        className={cn(
          "relative w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl transition-all",
          "border-border/80 dark:border-white/10 dark:bg-[#1E2028]",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={() => closeConfirm(false)}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition cursor-pointer"
          aria-label="Tutup dialog"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-4">
          {/* Icon Badge */}
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl border shadow-xs",
              iconBg
            )}
          >
            {renderIcon()}
          </div>

          {/* Title & Message */}
          <div className="space-y-1.5 flex-1 pr-4">
            <h3
              id="confirm-dialog-title"
              className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug"
            >
              {options.title}
            </h3>
            <p
              id="confirm-dialog-desc"
              className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
            >
              {options.message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-border/60 dark:border-white/5">
          {options.showCancel !== false && (
            <Button
              type="button"
              variant="outline"
              onClick={() => closeConfirm(false)}
              className="rounded-xl border-border px-4 text-xs font-semibold cursor-pointer hover:bg-muted"
            >
              {options.cancelText || "Batal"}
            </Button>
          )}

          <Button
            ref={confirmButtonRef}
            type="button"
            variant={isDanger ? "destructive" : "default"}
            onClick={() => closeConfirm(true)}
            className={cn(
              "rounded-xl px-5 text-xs font-bold cursor-pointer shadow-sm",
              isDanger
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/25"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25"
            )}
          >
            {options.confirmText || "Ya, Lanjutkan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

