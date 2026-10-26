import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-h-[55vh] flex-col items-center justify-center gap-3 px-4 text-center"
    >
      <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm font-medium text-muted-foreground">Memuat halaman...</p>
      <span className="sr-only">Mohon tunggu, halaman sedang dimuat.</span>
    </main>
  );
}
