"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuickSearchStore } from "@/store/useQuickSearchStore";
import { searchProductsAction } from "@/actions/product";
import { getStoreSearchHref } from "@/lib/search-intent";
import {
  Search,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
  Tag,
  HelpCircle,
  ShieldCheck,
  GitCompareArrows,
  Flame,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchProductItem {
  id: string;
  name: string;
  price: number;
  discount_price?: number | null;
  stock: number;
  brands?: { name: string } | null;
  brand?: string;
  categories?: { name: string } | null;
  category?: string;
  product_images?: { url: string; is_primary?: boolean }[];
  image?: string;
}

export const DEFAULT_POPULAR_SEARCHES = [
  // default fallback

  "Laptop Gaming",
  "Lenovo IdeaPad",
  "ASUS ROG",
  "Apple MacBook",
  "Core i5",
  "SSD NVMe",
  "RAM 16GB",
  "RTX",
];

const QUICK_LINKS = [
  { label: "Katalog Lengkap", href: "/products", icon: Tag, color: "text-blue-500" },
  { label: "Promo & Diskon", href: "/promo", icon: Flame, color: "text-amber-500" },
  { label: "Bandingkan Laptop", href: "/compare", icon: GitCompareArrows, color: "text-purple-500" },
  { label: "Pusat Bantuan (FAQ)", href: "/faq", icon: HelpCircle, color: "text-emerald-500" },
  { label: "Syarat & Ketentuan", href: "/terms", icon: ShieldCheck, color: "text-sky-500" },
  { label: "Tentang Kami", href: "/about", icon: Info, color: "text-indigo-500" },
];

function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface QuickSearchDialogProps {
  initialQuery: string;
  popularKeywords?: string[];
  onClose: () => void;
}

function QuickSearchDialog({ initialQuery, popularKeywords, onClose }: QuickSearchDialogProps) {
  const activeKeywords = popularKeywords && popularKeywords.length > 0 ? popularKeywords : DEFAULT_POPULAR_SEARCHES;
  const router = useRouter();
  const [query, setLocalQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchProductItem[]>([]);
  const [isSearching, startTransition] = useTransition();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const raw = await searchProductsAction(trimmed);
          if (Array.isArray(raw)) {
            setResults(raw.slice(0, 6) as SearchProductItem[]);
          }
        } catch {
          setResults([]);
        }
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleNavigate = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  const trimmed = query.trim();
  const visibleResults = trimmed ? results : [];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedIndex >= 0 && visibleResults[selectedIndex]) {
      handleNavigate(`/product/${visibleResults[selectedIndex].id}`);
      return;
    }
    if (trimmed) {
      handleNavigate(getStoreSearchHref(trimmed));
    } else {
      handleNavigate("/products");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (visibleResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < visibleResults.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : visibleResults.length - 1));
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian Cepat Toko"
      className="fixed inset-0 z-[100000] flex items-start justify-center p-3 sm:p-6 md:pt-20 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          "relative w-full max-w-2xl rounded-3xl border bg-card shadow-2xl transition-all overflow-hidden",
          "border-border/80 dark:border-white/10 dark:bg-[#181A20]",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        {/* Search Header Input Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center border-b border-border/80 dark:border-white/10 px-4 py-3 sm:py-3.5 bg-background/50">
          <Search className="size-5 text-muted-foreground shrink-0 ml-1 mr-3" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Cari laptop, PC, spesifikasi (Core i7, RTX, RAM 16GB)..."
            className="w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Ketik kata kunci pencarian"
          />
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {isSearching ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setLocalQuery("");
                  setSelectedIndex(-1);
                }}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                aria-label="Hapus teks pencarian"
              >
                <X className="size-4" />
              </button>
            ) : null}
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>
        </form>

        {/* Modal Body */}
        <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* 1. Live Product Search Results */}
          {trimmed.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Hasil Produk ({visibleResults.length})</span>
                <span className="text-[11px] font-normal">Gunakan panah ↑ ↓ dan Enter</span>
              </div>

              {visibleResults.length > 0 ? (
                <div className="divide-y divide-border/60 dark:divide-white/5 rounded-2xl border border-border/70 dark:border-white/5 bg-background/60 overflow-hidden">
                  {visibleResults.map((product, idx) => {
                    const primaryImg =
                      product.product_images?.find((i) => i.is_primary)?.url ||
                      product.product_images?.[0]?.url ||
                      product.image ||
                      "/product-image-unavailable.svg";

                    const brandName = product.brands?.name || product.brand;
                    const payablePrice = product.discount_price ?? product.price;
                    const isSelected = selectedIndex === idx;

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleNavigate(`/product/${product.id}`)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          "flex items-center justify-between gap-3 p-3 transition-colors cursor-pointer group",
                          isSelected
                            ? "bg-primary/10 dark:bg-primary/20 text-foreground"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-card p-1">
                            <Image
                              src={primaryImg}
                              alt={product.name}
                              fill
                              className="object-contain p-0.5"
                              sizes="48px"
                            />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            {brandName && (
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-primary">
                                {brandName}
                              </span>
                            )}
                            <h4 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                                {formatIdr(payablePrice)}
                              </span>
                              {product.stock > 0 ? (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  • Tersedia ({product.stock})
                                </span>
                              ) : (
                                <span className="text-[10px] text-rose-500 font-semibold">
                                  • Stok Habis
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    );
                  })}
                </div>
              ) : !isSearching ? (
                <div className="flex flex-col items-center justify-center py-8 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 space-y-2">
                  <Search className="size-8 text-muted-foreground/50" />
                  <p className="text-sm font-semibold text-foreground">
                    Tidak ada produk untuk &ldquo;{trimmed}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Coba kata kunci yang lebih umum seperti nama brand (Lenovo, ASUS) atau jenis komponen (SSD, RAM).
                  </p>
                </div>
              ) : null}

              {/* View all results button */}
              <button
                type="button"
                onClick={() => handleNavigate(getStoreSearchHref(trimmed))}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/80 dark:border-white/10 hover:bg-muted text-xs font-bold text-primary transition cursor-pointer"
              >
                <span>Lihat semua hasil katalog untuk &ldquo;{trimmed}&rdquo;</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          ) : null}

          {/* 2. Popular Quick Searches */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Pencarian Cepat Populer</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeKeywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => {
                    setLocalQuery(keyword);
                    setSelectedIndex(-1);
                  }}
                  className="rounded-xl border border-border/70 dark:border-white/10 bg-muted/40 hover:bg-muted hover:border-primary/40 px-3 py-1.5 text-xs font-medium text-foreground transition cursor-pointer"
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Quick Navigation Links */}
          <div className="space-y-2.5 pt-2 border-t border-border/70 dark:border-white/5">
            <span className="block text-xs font-semibold text-muted-foreground">
              Navigasi Halaman Cepat
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => handleNavigate(link.href)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 dark:border-white/5 bg-background hover:bg-muted/50 text-left transition cursor-pointer group"
                  >
                    <div className={cn("size-7 rounded-lg bg-muted flex items-center justify-center shrink-0", link.color)}>
                      <Icon className="size-4" />
                    </div>
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary truncate">
                      {link.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border/80 dark:border-white/10 px-4 py-2.5 bg-muted/30 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              Tekan <kbd className="font-semibold text-foreground">↵ Enter</kbd> untuk mencari
            </span>
            <span>•</span>
            <span>
              Tekan <kbd className="font-semibold text-foreground">ESC</kbd> untuk menutup
            </span>
          </div>
          <span className="hidden sm:inline font-bold text-primary">
            Next Solution Quick Search
          </span>
        </div>
      </div>
    </div>
  );
}

export function QuickSearchModal({ popularKeywords }: { popularKeywords?: string[] } = {}) {
  const { isOpen, query, closeSearch, openSearch } = useQuickSearchStore();

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (useQuickSearchStore.getState().isOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [openSearch, closeSearch]);

  if (!isOpen) return null;

  return <QuickSearchDialog initialQuery={query} popularKeywords={popularKeywords} onClose={closeSearch} />;
}
