"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function OrderRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isPending}
      title="Segarkan daftar pesanan & metrik"
      aria-label="Segarkan daftar pesanan & metrik"
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#1E2028] px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5 transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed",
        isPending && "border-blue-400 text-[#2563EB]"
      )}
    >
      <RefreshCw
        className={cn(
          "size-4 text-slate-500 dark:text-slate-400 transition-transform",
          isPending && "animate-spin text-[#2563EB]"
        )}
      />
      <span className="hidden sm:inline">
        {isPending ? "Menyegarkan..." : "Segarkan"}
      </span>
    </button>
  );
}

