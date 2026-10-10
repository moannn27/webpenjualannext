"use client";

import { useState } from "react";
import { ExternalLink, ShieldCheck, ChevronRight, Layers } from "lucide-react";
import type { OfficialMarketplace, StoreSectionSetting } from "@/lib/storefront-settings";
import { PlatformLogo } from "@/components/shared/BrandLogos";
import { MarketplaceStoreModal } from "@/components/shared/MarketplaceStoreModal";

type OfficialChannelsSectionProps = {
  sectionSetting?: StoreSectionSetting;
  marketplaces?: OfficialMarketplace[];
  storeName?: string;
};

export function OfficialChannelsSection({
  sectionSetting,
  marketplaces = [],
  storeName = "Next Solution",
}: OfficialChannelsSectionProps) {
  const [selectedMarketplace, setSelectedMarketplace] = useState<OfficialMarketplace | null>(null);

  const activeMarketplaces = marketplaces.filter(
    (m) => m.is_active !== false && (m.stores || []).some((s) => s.is_active !== false)
  );

  if (!activeMarketplaces.length) return null;

  const sectionTag = sectionSetting?.tag || "OFFICIAL MARKETPLACE";
  const sectionTitle = sectionSetting?.title || `Official Store & Partner ${storeName}`;
  const noticeText =
    sectionSetting?.notice ||
    `Belanja dan ikuti update resmi ${storeName} hanya melalui toko partner resmi terverifikasi agar transaksi lebih aman dan terpercaya.`;

  const handleCardClick = (marketplace: OfficialMarketplace, e: React.MouseEvent) => {
    const validStores = (marketplace.stores || []).filter((s) => s.is_active !== false);
    if (validStores.length === 1) {
      // Direct open if only 1 store
      window.open(validStores[0].url, "_blank", "noopener,noreferrer");
    } else {
      // Open modal selector if multiple stores exist
      e.preventDefault();
      setSelectedMarketplace(marketplace);
    }
  };

  return (
    <section id="official-channel" className="border-t bg-card/40 py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header & Notice Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <span className="inline-block text-xs font-bold tracking-wider text-primary uppercase mb-2">
              {sectionTag}
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {sectionTitle}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pilih marketplace resmi kami. Klik untuk melihat daftar toko dan cabang etalase resmi.
            </p>
          </div>

          {/* Transaksi Lebih Aman Notice Box */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 max-w-lg shadow-2xs">
            <div className="flex items-start gap-3">
              <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Transaksi Lebih Aman
                </h4>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {noticeText}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Grouped Marketplace Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {activeMarketplaces.map((marketplace) => {
            const validStores = (marketplace.stores || []).filter((s) => s.is_active !== false);
            const hasMultiple = validStores.length > 1;

            return (
              <button
                key={marketplace.id}
                type="button"
                onClick={(e) => handleCardClick(marketplace, e)}
                className="group relative flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <PlatformLogo
                    platform={marketplace.platform}
                    customIconUrl={marketplace.custom_icon_url}
                    className="size-11 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="block truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {marketplace.name}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary mt-1">
                      {hasMultiple ? (
                        <>
                          <Layers className="size-3" />
                          <span>{validStores.length} Toko Resmi</span>
                        </>
                      ) : (
                        <span>{validStores[0]?.badge_text || "Official Store"}</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                  {hasMultiple ? (
                    <ChevronRight className="size-4.5" />
                  ) : (
                    <ExternalLink className="size-4" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Store Selector Modal */}
      <MarketplaceStoreModal
        marketplace={selectedMarketplace}
        isOpen={Boolean(selectedMarketplace)}
        onClose={() => setSelectedMarketplace(null)}
      />
    </section>
  );
}
