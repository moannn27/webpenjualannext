import { LoaderCircle } from "lucide-react";

export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-7xl space-y-6 animate-in fade-in duration-200"
    >
      {/* Header Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 dark:border-white/5 pb-4">
        <div className="space-y-2">
          <div className="h-7 w-48 sm:w-64 rounded-xl bg-slate-200/80 dark:bg-white/10 animate-pulse" />
          <div className="h-4 w-72 sm:w-96 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/20 px-3.5 py-1.5 text-xs font-semibold text-primary">
            <LoaderCircle className="size-3.5 animate-spin" />
            <span>Memuat data modul...</span>
          </div>
          <div className="h-9 w-24 rounded-xl bg-slate-200/80 dark:bg-white/10 animate-pulse" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-slate-100 dark:bg-white/5 animate-pulse" />
              <div className="size-8 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
            </div>
            <div className="h-7 w-32 rounded-lg bg-slate-200/80 dark:bg-white/10 animate-pulse" />
            <div className="h-2.5 w-40 rounded bg-slate-100 dark:bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-[#1E2028] shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="h-5 w-40 rounded-lg bg-slate-200/80 dark:bg-white/10 animate-pulse" />
          <div className="h-8 w-28 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/60 dark:border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3.5 w-36 sm:w-48 rounded bg-slate-200/80 dark:bg-white/10 animate-pulse" />
                  <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/5 animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-20 rounded bg-slate-100 dark:bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Mohon tunggu, modul admin sedang dimuat.</span>
    </div>
  );
}

