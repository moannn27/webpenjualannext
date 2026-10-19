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
  name?: string;
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
    email: "support@nextsolution.id",
    phone: "+62 812-3456-7890",
    whatsapp: "",
    copyright: "Hak cipta dilindungi.",
    branches: [],
  };

  const contactEmail =
    !store.email || store.email === "test@next.com"
      ? "support@nextsolution.id"
      : store.email;

  const contactPhone =
    !store.phone || store.phone === "1283017230891273"
      ? "+62 812-3456-7890"
      : store.phone;

  // Resolve active marketplaces
  const activeMarketplaces =
    marketplaces.length > 0
      ? marketplaces.filter(
          (m) => m.is_active !== false && (m.stores || []).some((s) => s.is_active !== false)
        )
      : [];

  const hasContact = Boolean(store.address || contactEmail || contactPhone || store.whatsapp || store.maps_url);
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
    <footer className="border-t border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-[#121318] pt-12 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Bordered Card Container */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#1A1C23] p-4 sm:p-7 lg:p-10 shadow-xs mb-8">
          <div className={`grid gap-6 sm:gap-8 pb-8 border-b border-slate-100 dark:border-white/5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${columnsClass}`}>
            {/* 1. Store Brand & Value Props */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-base">
                  NS
                </div>
                <Link href="/" className="text-2xl font-black tracking-tight text-foreground hover:text-primary transition-colors">
                  {store.name || "Next Solution"}
                </Link>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">{store.description}</p>
              
              <div className="pt-1 flex flex-col gap-2 text-xs">
                <span className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                  100% Produk Original & Bergaransi Resmi
                </span>
                <span className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                  Ambil di Toko Langsung / Kirim ke Seluruh Indonesia
                </span>
              </div>

              <div className="pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-all"
                >
                  Buat akun untuk mulai belanja →
                </Link>
              </div>
            </div>

            {/* Navigation Column Groups */}
            {groups.map((group) => (
              <nav key={group.title} aria-label={group.title} className="space-y-3.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-white/5">
                  <h2 className="text-xs font-black uppercase tracking-wider text-foreground">{group.title}</h2>
                </div>
                <ul className="space-y-2.5">
                  {group.links.map(([label, href]) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors hover:translate-x-0.5 inline-block"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            {/* Contact Information Card */}
            {hasContact && (
              <section className="space-y-3.5 sm:col-span-1">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-white/5">
                  <h2 className="text-xs font-black uppercase tracking-wider text-foreground">Hubungi Kami</h2>
                </div>
                <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] p-4 space-y-3 text-xs text-muted-foreground">
                  {store.address && (
                    <div>
                      <p className="font-semibold text-foreground line-clamp-2">{store.address}</p>
                      {mainMapsLink && (
                        <a
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                          href={mainMapsLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MapPin className="size-3" />
                          Buka di Google Maps <ExternalLink className="size-2.5" />
                        </a>
                      )}
                      <div className="mt-2.5 overflow-hidden rounded-xl border border-border shadow-2xs">
                        <iframe
                          title="Peta Lokasi Toko"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(
                            store.address
                          )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                          className="h-24 w-full border-0"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-white/5 text-[11px]">
                    {contactEmail && (
                      <p className="flex items-center justify-between gap-2">
                        <span>Email:</span>
                        <a className="font-semibold text-foreground hover:text-primary transition-colors" href={`mailto:${contactEmail}`}>
                          {contactEmail}
                        </a>
                      </p>
                    )}
                    {contactPhone && (
                      <p className="flex items-center justify-between gap-2">
                        <span>Telepon:</span>
                        <a className="font-semibold text-foreground hover:text-primary transition-colors" href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}>
                          {contactPhone}
                        </a>
                      </p>
                    )}
                    {store.whatsapp && (
                      <p className="flex items-center justify-between gap-2 pt-0.5">
                        <span>WhatsApp:</span>
                        <a
                          className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                          href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Chat WhatsApp ↗
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Branch Locator Section */}
            {hasBranches && (
              <section className="sm:col-span-1 space-y-3.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-white/5">
                  <h2 className="text-xs font-black uppercase tracking-wider text-foreground">Lokasi Cabang</h2>
                </div>
                <FooterBranchSelector branches={store.branches} />
              </section>
            )}
          </div>

          {/* Official Partner & Marketplace Bagan */}
          {hasMarketplaces && (
            <div className="pt-6">
              <div className="rounded-2xl border border-slate-200/70 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary block">Official Channels</span>
                  <h3 className="text-xs font-bold text-foreground mt-0.5">Official Partner & Marketplace Store</h3>
                  <p className="text-[11px] text-muted-foreground">Transaksi resmi lebih aman melalui partner terverifikasi kami</p>
                </div>
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
                        className="group relative flex size-12 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2028] p-2.5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md hover:ring-2 hover:ring-primary/20 cursor-pointer"
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
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
          <p>
            &copy; {new Date().getFullYear()} {store.name || "Next Solution Store"}. {store.copyright}
          </p>
          <p className="text-[11px] text-slate-400">
            Pusat Laptop & Komputer Terpercaya · Seluruh Hak Cipta Dilindungi
          </p>
        </div>
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
