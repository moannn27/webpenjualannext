"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, ExternalLink } from "lucide-react";
import type { StoreBranch, OfficialMarketplace, OfficialChannel } from "@/lib/storefront-settings";
import { PlatformLogo } from "@/components/shared/BrandLogos";
import { FooterBranchSelector } from "@/components/layouts/FooterBranchSelector";
import { MarketplaceStoreModal } from "@/components/shared/MarketplaceStoreModal";

const groups = [
  {
    title: "Belanja",
    links: [
      ["Semua produk", "/products"],
      ["Kategori", "/category"],
      ["Brand", "/brands"],
      ["Promo", "/promo"],
    ],
  },
  {
    title: "Akun",
    links: [
      ["Profil", "/profile"],
      ["Wishlist", "/wishlist"],
      ["Keranjang", "/cart"],
    ],
  },
  {
    title: "Bantuan",
    links: [
      ["FAQ", "/faq"],
      ["Login", "/login"],
      ["Buat akun", "/register"],
    ],
  },
];

type FooterStoreSettings = {
  description: string;
  address: string;
  maps_url?: string;
  email: string;
  phone: string;
  whatsapp: string;
  copyright: string;
  branches: StoreBranch[];
};

export function Footer({
  settings,
  marketplaces = [],
  channels = [],
}: {
  settings?: FooterStoreSettings;
  marketplaces?: OfficialMarketplace[];
  channels?: OfficialChannel[];
}) {
  const [selectedMarketplace, setSelectedMarketplace] = useState<OfficialMarketplace | null>(null);

  const store = settings ?? {
    description: "Temukan perangkat elektronik dan aksesori pilihan untuk kebutuhanmu.",
    address: "",
    maps_url: "",
    email: "",
    phone: "",
    whatsapp: "",
    copyright: "Hak cipta dilindungi.",
    branches: [],
  };

  // Resolve active marketplaces
  const activeMarketplaces =
    marketplaces.length > 0
      ? marketplaces.filter(
          (m) => m.is_active !== false && (m.stores || []).some((s) => s.is_active !== false)
        )
      : [];

  const hasContact = Boolean(store.address || store.email || store.phone || store.whatsapp || store.maps_url);
  const hasBranches = Boolean(store.branches?.length);
  const hasMarketplaces = activeMarketplaces.length > 0;

  const columnCount = 4 + Number(hasContact) + Number(hasBranches);
  const columnsClass =
    columnCount >= 6
      ? "lg:grid-cols-6"
      : columnCount === 5
      ? "lg:grid-cols-5"
      : "lg:grid-cols-4";

  const mainMapsLink =
    store.maps_url ||
    (store.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`
      : "");

  const handleMarketplaceClick = (mp: OfficialMarketplace) => {
    const validStores = (mp.stores || []).filter((s) => s.is_active !== false);
    if (validStores.length === 1) {
      window.open(validStores[0].url, "_blank", "noopener,noreferrer");
    } else {
      setSelectedMarketplace(mp);
    }
  };

  return (
    <footer className="border-t bg-background pt-12 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid gap-8 border-b border-border pb-10 sm:grid-cols-2 ${columnsClass}`}>
          <div>
            <Link href="/" className="mb-4 inline-block text-2xl font-bold tracking-tight text-primary">
              Next Solution
            </Link>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">{store.description}</p>
            <Link href="/register" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">
              Buat akun untuk mulai belanja
            </Link>
          </div>

          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="mb-4 font-semibold">{group.title}</h2>
              <ul className="space-y-3">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {hasContact && (
            <section>
              <h2 className="mb-4 font-semibold">Hubungi kami</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {store.address && (
                  <li className="space-y-1">
                    <p>{store.address}</p>
                    {mainMapsLink && (
                      <a
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        href={mainMapsLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MapPin className="size-3.5 shrink-0" />
                        Buka di Google Maps <ExternalLink className="size-3" />
                      </a>
                    )}
                    <div className="mt-2 overflow-hidden rounded-lg border border-border shadow-sm">
                      <iframe
                        title="Peta Lokasi Toko"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(
                          store.address
                        )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        className="h-28 w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </li>
                )}
                {store.email && (
                  <li>
                    <a className="hover:text-primary" href={`mailto:${store.email}`}>
                      {store.email}
                    </a>
                  </li>
                )}
                {store.phone && (
                  <li>
                    <a className="hover:text-primary" href={`tel:${store.phone}`}>
                      {store.phone}
                    </a>
                  </li>
                )}
                {store.whatsapp && (
                  <li>
                    <a
                      className="hover:text-primary"
                      href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </section>
          )}

          {hasBranches && (
            <section className="sm:col-span-1">
              <h2 className="mb-4 font-semibold">Lokasi cabang</h2>
              <FooterBranchSelector branches={store.branches} />
            </section>
          )}
        </div>

        {/* Unique Partner Marketplace Icons in Footer */}
        {hasMarketplaces && (
          <div className="flex flex-col items-center justify-center border-b border-border py-8 text-center">
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">
              Official Partner & Marketplace
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {activeMarketplaces.map((marketplace) => {
                const storeCount = (marketplace.stores || []).filter((s) => s.is_active !== false).length;
                return (
                  <button
                    key={marketplace.id}
                    type="button"
                    onClick={() => handleMarketplaceClick(marketplace)}
                    title={`${marketplace.name} (${storeCount} toko resmi)`}
                    aria-label={`Official Store di ${marketplace.name}`}
                    className="group relative flex size-12 items-center justify-center rounded-2xl border border-border bg-card p-2.5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md hover:ring-2 hover:ring-primary/20 cursor-pointer"
                  >
                    <PlatformLogo
                      platform={marketplace.platform}
                      customIconUrl={marketplace.custom_icon_url}
                      className="size-7 transition-transform group-hover:scale-110"
                    />
                    {storeCount > 1 && (
                      <span className="absolute -top-1.5 -right-1.5 grid size-4.5 place-items-center rounded-full bg-primary text-[9px] font-black text-primary-foreground shadow-xs">
                        {storeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Next Solution Store. {store.copyright}
        </p>
      </div>

      {/* Shared Store Selector Modal for Footer */}
      <MarketplaceStoreModal
        marketplace={selectedMarketplace}
        isOpen={Boolean(selectedMarketplace)}
        onClose={() => setSelectedMarketplace(null)}
      />
    </footer>
  );
}
