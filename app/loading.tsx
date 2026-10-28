import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3.5 px-4 text-center animate-in fade-in duration-200"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
        <LoaderCircle className="size-7 animate-spin" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground tracking-tight">
          Memuat Halaman...
        </h2>
        <p className="text-xs text-muted-foreground">
          Mohon tunggu sebentar, kami sedang menyiapkan data untuk Anda.
        </p>
      </div>
      <span className="sr-only">Mohon tunggu, halaman sedang dimuat.</span>
    </main>
  );
}
