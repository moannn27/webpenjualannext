"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useShareStore, type ShareProductPayload } from "@/store/useShareStore";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/useToastStore";
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
  Send,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareDialogContentProps {
  product: ShareProductPayload;
  onClose: () => void;
}

function ShareDialogContent({ product, onClose }: ShareDialogContentProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare] = useState(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function"
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const shareUrl = useMemo(() => {
    if (product.url) return product.url;
    if (typeof window !== "undefined") {
      return `${window.location.origin}/product/${product.id}`;
    }
    return `https://nextsolution.web.id/product/${product.id}`;
  }, [product]);

  const formattedPrice = useMemo(() => {
    if (product.formattedPrice) return product.formattedPrice;
    if (product.price != null && !isNaN(product.price)) {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(product.price);
    }
    return "";
  }, [product]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Tautan Disalin", "Tautan produk berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Gagal Menyalin", "Tidak dapat menyalin tautan secara otomatis.");
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: product.name,
        text: `Cek produk ${product.name} di Next Solution Store!`,
        url: shareUrl,
      });
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.info("Tautan Siap", "Gunakan tombol WhatsApp atau Salin Tautan.");
      }
    }
  };

  const waText = encodeURIComponent(
    `Halo! Cek produk ini di Next Solution Store:\n*${product.name}*\n${
      formattedPrice ? `Harga: ${formattedPrice}\n` : ""
    }${product.specs ? `Spesifikasi: ${product.specs}\n` : ""}\nLihat selengkapnya di:\n${shareUrl}`
  );

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    shareUrl
  )}&text=${encodeURIComponent(
    `Cek ${product.name} di Next Solution Store! ${formattedPrice ? `(${formattedPrice})` : ""}`
  )}`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Cek ${product.name} di Next Solution Store!`
  )}&url=${encodeURIComponent(shareUrl)}`;

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    shareUrl
  )}`;

  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
    shareUrl
  )}`;

  const emailUrl = `mailto:?subject=${encodeURIComponent(
    `Rekomendasi Produk: ${product.name}`
  )}&body=${encodeURIComponent(
    `Halo! Cek produk menarik ini di Next Solution Store:\n${product.name}\n${formattedPrice ? `Harga: ${formattedPrice}\n` : ""}\nLihat selengkapnya di:\n${shareUrl}`
  )}`;

  const handleInstagramShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Tautan Disalin!", "Tautan disalin ke clipboard. Membuka Instagram...");
      setTimeout(() => {
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      }, 500);
    } catch {
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Content */}
      <div
        className={cn(
          "relative w-full max-w-lg rounded-3xl border bg-card p-6 shadow-2xl transition-all",
          "border-border/80 dark:border-white/10 dark:bg-[#1E2028]",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/70 dark:border-white/5">
          <div className="flex items-center gap-2 text-foreground font-bold text-base sm:text-lg">
            <Share2 className="size-5 text-blue-600 dark:text-blue-400" />
            <h2 id="share-modal-title">Bagikan Produk</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Product Preview Card */}
        <div className="my-5 flex items-center gap-4 rounded-2xl border border-border/70 dark:border-white/5 bg-muted/30 p-3 sm:p-4">
          <div className="relative size-18 sm:size-20 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-background flex items-center justify-center p-1">
            <Image
              src={product.image || "/product-image-unavailable.svg"}
              alt={product.name}
              fill
              className="object-contain p-1"
              sizes="80px"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {product.brand && (
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary">
                {product.brand}
              </span>
            )}
            <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug">
              {product.name}
            </h3>
            {formattedPrice && (
              <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                {formattedPrice}
              </p>
            )}
          </div>
        </div>

        {/* Share Channels */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground">
            Pilih media untuk membagikan:
          </p>

          {canNativeShare && (
            <Button
              type="button"
              variant="outline"
              onClick={handleNativeShare}
              className="w-full rounded-2xl gap-2 font-semibold text-xs h-10 border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100/70 dark:hover:bg-blue-900/30 cursor-pointer shadow-xs transition-all"
            >
              <Share2 className="size-4" />
              <span>Bagikan ke Aplikasi Lain (Instagram Stories, TikTok, Chat...)</span>
            </Button>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-center transition-all hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                <MessageCircle className="size-5" />
              </div>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                WhatsApp
              </span>
            </a>

            {/* Instagram */}
            <button
              type="button"
              onClick={handleInstagramShare}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 p-3 text-center transition-all hover:bg-rose-100/70 dark:hover:bg-rose-950/40 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="size-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                IG
              </div>
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                Instagram
              </span>
            </button>

            {/* Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-50/50 dark:bg-sky-950/20 p-3 text-center transition-all hover:bg-sky-100/70 dark:hover:bg-sky-950/40 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="size-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm">
                <Send className="size-5" />
              </div>
              <span className="text-xs font-bold text-sky-800 dark:text-sky-300">
                Telegram
              </span>
            </a>

            {/* Twitter / X */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-300/40 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 p-3 text-center transition-all hover:bg-slate-200/60 dark:hover:bg-white/10 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="size-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shadow-sm">
                𝕏
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Twitter (X)
              </span>
            </a>

            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 p-3 text-center transition-all hover:bg-blue-100/70 dark:hover:bg-blue-950/40 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="size-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                f
              </div>
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
                Facebook
              </span>
            </a>

            {/* LinkedIn */}
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-sky-600/20 bg-sky-50/40 dark:bg-sky-950/20 p-3 text-center transition-all hover:bg-sky-100/70 dark:hover:bg-sky-950/40 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="size-10 rounded-full bg-[#0A66C2] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                in
              </div>
              <span className="text-xs font-bold text-sky-900 dark:text-sky-300">
                LinkedIn
              </span>
            </a>

            {/* Line */}
            <a
              href={lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-600/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 text-center transition-all hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="size-10 rounded-full bg-[#06C755] text-white flex items-center justify-center font-bold text-[10px] tracking-tighter shadow-sm">
                LINE
              </div>
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                LINE
              </span>
            </a>

            {/* Email */}
            <a
              href={emailUrl}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-300/40 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 p-3 text-center transition-all hover:bg-slate-200/60 dark:hover:bg-white/10 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="size-10 rounded-full bg-slate-700 text-white flex items-center justify-center shadow-sm">
                <Mail className="size-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Email
              </span>
            </a>
          </div>

          {/* Copy Link Input Bar */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Atau salin tautan langsung:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="h-10 flex-1 rounded-xl border border-border/80 bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 select-all font-mono"
              />
              <Button
                type="button"
                onClick={handleCopyLink}
                className={cn(
                  "h-10 px-4 rounded-xl gap-1.5 font-bold text-xs cursor-pointer transition-all",
                  copied
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                )}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Native Share Option (Mobile) */}
          {canNativeShare && (
            <div className="pt-2 border-t border-border/60 dark:border-white/5">
              <Button
                type="button"
                variant="outline"
                onClick={handleNativeShare}
                className="w-full h-10 rounded-xl gap-2 text-xs font-semibold cursor-pointer border-border/80 hover:bg-muted"
              >
                <ExternalLink className="size-3.5 text-primary" />
                <span>Buka Opsi Berbagi Sistem (Aplikasi Lainnya)</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductShareModal() {
  const { isOpen, product, closeShare } = useShareStore();

  if (!isOpen || !product) return null;

  return <ShareDialogContent key={product.id} product={product} onClose={closeShare} />;
}
