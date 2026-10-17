import Link from "next/link";
import { Home, Search, ShoppingBag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-xs sm:size-24">
        <Search className="size-10 sm:size-12" aria-hidden="true" />
      </div>

      <span className="mt-6 rounded-full bg-muted px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Error 404
      </span>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
        Halaman atau Produk Tidak Ditemukan
      </h1>

      <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
        Maaf, produk atau halaman yang Anda cari tidak ditemukan, sedang tidak tersedia, atau URL yang Anda tuju salah.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/products"
          className={cn(buttonVariants({ size: "lg" }), "rounded-xl shadow-xs gap-2")}
        >
          <ShoppingBag className="size-4" />
          Jelajahi Katalog Produk
        </Link>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-xl gap-2")}
        >
          <Home className="size-4" />
          Ke Beranda
        </Link>
      </div>
    </main>
  );
}

