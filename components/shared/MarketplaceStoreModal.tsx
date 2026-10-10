"use client";

import { useEffect } from "react";
import { X, ExternalLink, Store } from "lucide-react";
import type { OfficialMarketplace } from "@/lib/storefront-settings";
import { PlatformLogo } from "@/components/shared/BrandLogos";

type MarketplaceStoreModalProps = {
  marketplace: OfficialMarketplace | null;
  isOpen: boolean;
  onClose: () => void;
};

export function MarketplaceStoreModal({
  marketplace,
  isOpen,
  onClose,
}: MarketplaceStoreModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !marketplace) return null;

  const activeStores = (marketplace.stores || []).filter((s) => s.is_active !== false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl transition-all sm:p-7 z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <PlatformLogo
              platform={marketplace.platform}
              customIconUrl={marketplace.custom_icon_url}
              className="size-10 shrink-0"
            />
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Toko Resmi di {marketplace.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                Tersedia {activeStores.length} akun/cabang toko resmi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition"
            aria-label="Tutup modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Store List */}
        <div className="mt-4 max-h-[380px] overflow-y-auto space-y-3 pr-1">
          {activeStores.map((store) => (
            <a
              key={store.id}
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-2xl border border-border bg-muted/20 p-4 transition-all hover:border-primary/50 hover:bg-muted/50 hover:shadow-xs"
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                    {store.name}
                  </span>
                  {store.badge_text && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {store.badge_text}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground mt-1">
                  {store.url}
                </p>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground group-hover:bg-primary/90 transition shrink-0 shadow-2xs">
                <span>Kunjungi</span>
                <ExternalLink className="size-3" />
              </div>
            </a>
          ))}

          {!activeStores.length && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Store className="mx-auto size-8 text-muted-foreground/50 mb-2" />
              Belum ada link toko aktif untuk platform ini.
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-5 border-t border-border pt-4 text-center">
          <p className="text-[11px] text-muted-foreground">
            🛡️ Pastikan bertransaksi hanya melalui tautan toko resmi kami di atas.
          </p>
        </div>
      </div>
    </div>
  );
}

