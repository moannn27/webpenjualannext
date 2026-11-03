export default function Loading() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="container mx-auto min-h-[60vh] px-4 py-8 sm:py-12 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300"
    >
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-48 sm:w-64 rounded-2xl bg-slate-200/80 dark:bg-white/10 animate-pulse" />
        <div className="h-4 w-72 sm:w-96 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
      </div>

      {/* Product Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-[#1E2028] p-4 space-y-3 shadow-2xs"
          >
            <div className="aspect-square w-full rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
            <div className="h-4 w-3/4 rounded-lg bg-slate-200/80 dark:bg-white/10 animate-pulse" />
            <div className="h-3.5 w-1/2 rounded bg-slate-100 dark:bg-white/5 animate-pulse" />
            <div className="flex items-center justify-between pt-2">
              <div className="h-5 w-24 rounded-lg bg-slate-200/80 dark:bg-white/10 animate-pulse" />
              <div className="size-8 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Memuat halaman...</span>
    </main>
  );
}
