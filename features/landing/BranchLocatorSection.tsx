"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, MessageCircle, MapPin, ExternalLink, Clock, Phone, ChevronRight } from "lucide-react";
import type { StoreBranch, StoreSectionSetting } from "@/lib/storefront-settings";
import { extractCoordinatesFromLocation } from "@/lib/storefront-settings";

// Dynamically import Leaflet with ssr: false
const LeafletBranchMap = dynamic(() => import("./LeafletBranchMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[380px] sm:h-[460px] lg:h-[500px] w-full animate-pulse flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
      <MapPin className="size-10 animate-bounce mb-3 text-primary" />
      <p className="text-sm font-semibold">Memuat peta lokasi...</p>
    </div>
  ),
});

type BranchLocatorSectionProps = {
  sectionSetting?: StoreSectionSetting;
  branches: StoreBranch[];
  storeWhatsApp?: string;
  storeAddress?: string;
  storeMapsUrl?: string;
  storeLatitude?: number;
  storeLongitude?: number;
  storeCity?: string;
  storeName?: string;
};

export function BranchLocatorSection({
  sectionSetting,
  branches = [],
  storeWhatsApp = "6281234567890",
  storeAddress = "",
  storeMapsUrl = "",
  storeLatitude,
  storeLongitude,
  storeCity,
  storeName = "Next Solution",
}: BranchLocatorSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const sectionRef = useRef<HTMLElement>(null);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setMapVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setMapVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "350px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeBranches = useMemo(() => {
    return branches.filter((b) => b.is_active !== false);
  }, [branches]);

  // If no branch is created yet in admin panel, use the main store (Pusat) as location
  const displayBranches = useMemo(() => {
    if (activeBranches.length > 0) return activeBranches;
    if (storeAddress?.trim()) {
      const extracted = extractCoordinatesFromLocation(storeMapsUrl, storeAddress, storeCity);
      const lat =
        typeof storeLatitude === "number" && !isNaN(storeLatitude) && storeLatitude !== 0
          ? storeLatitude
          : extracted.lat;
      const lng =
        typeof storeLongitude === "number" && !isNaN(storeLongitude) && storeLongitude !== 0
          ? storeLongitude
          : extracted.lng;
      const city = storeCity?.trim() || extracted.detectedCity || "Bandung";

      return [
        {
          id: "store-main-pusat",
          name: `${storeName} (Pusat)`,
          city,
          address: storeAddress,
          latitude: lat,
          longitude: lng,
          whatsapp: storeWhatsApp,
          operating_hours: "09:00 - 21:00 WIB",
          maps_url: storeMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${storeName} ${storeAddress}`)}`,
          is_active: true,
        },
      ];
    }
    return [];
  }, [activeBranches, storeAddress, storeMapsUrl, storeLatitude, storeLongitude, storeCity, storeName, storeWhatsApp]);

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // Derived selected branch based on selectedBranchId or first available
  const selectedBranch = useMemo(() => {
    if (selectedBranchId) {
      const match = displayBranches.find((b) => b.id === selectedBranchId);
      if (match) return match;
    }
    return displayBranches[0] ?? null;
  }, [displayBranches, selectedBranchId]);

  // Filtered branches based on user search query (city, name, address)
  const filteredBranches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return displayBranches;
    return displayBranches.filter(
      (b) =>
        b.city.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q)
    );
  }, [displayBranches, searchQuery]);

  // Extract unique cities from actual displayBranches
  const availableCities = useMemo(() => {
    const cities = Array.from(new Set(displayBranches.map((b) => b.city))).filter((c) => c && c !== "Pusat");
    return cities.slice(0, 8);
  }, [displayBranches]);

  const handleSelectBranch = (branch: StoreBranch) => {
    setSelectedBranchId(branch.id);
  };

  const handleCityPillClick = (city: string) => {
    setSearchQuery(city);
    const match = displayBranches.find((b) => b.city.toLowerCase() === city.toLowerCase());
    if (match) setSelectedBranchId(match.id);
  };

  const targetWaNumber = (selectedBranch?.whatsapp || storeWhatsApp).replace(/\D/g, "");
  const waChatUrl = `https://wa.me/${targetWaNumber}?text=${encodeURIComponent(
    `Halo ${selectedBranch ? selectedBranch.name : storeName}, saya ingin konsultasi dan menanyakan ketersediaan produk di toko.`
  )}`;

  const badgeText =
    activeBranches.length > 0
      ? `${activeBranches.length} Cabang`
      : storeAddress?.trim()
      ? "Toko Utama (Pusat)"
      : "0 Cabang";

  const sectionTag = sectionSetting?.tag || "LOKASI TOKO";
  const sectionTitle =
    sectionSetting?.title ||
    (activeBranches.length > 0 ? `Temukan Cabang ${storeName} Terdekat` : `Lokasi Toko ${storeName}`);
  const sectionSubtitle =
    sectionSetting?.subtitle ||
    "Temukan lokasi toko terdekat beserta informasi kontak, jam operasional, dan petunjuk arah.";

  return (
    <section ref={sectionRef} id="cabang" className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Outer White Card Container */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1E2028] p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-100 dark:border-white/5">
        {/* Top Header */}
        <div className="mb-6 sm:mb-8 max-w-4xl">
          <span className="inline-block text-xs font-bold tracking-wider text-primary uppercase mb-2">
            {sectionTag}
          </span>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {sectionTitle}
            </h2>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs sm:text-sm font-bold text-primary">
              {badgeText}
            </span>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
            {sectionSubtitle}
          </p>
        </div>

        {/* Search Bar & WhatsApp Action Button */}
        <div className="mb-8 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (val.trim()) {
                    const firstMatch = displayBranches.find(
                      (b) =>
                        b.city.toLowerCase().includes(val.toLowerCase()) ||
                        b.name.toLowerCase().includes(val.toLowerCase())
                    );
                    if (firstMatch) setSelectedBranchId(firstMatch.id);
                  }
                }}
                placeholder="Ketik kota atau nama cabang..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 py-3 pl-12 pr-16 text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder:text-muted-foreground shadow-2xs hover:border-slate-400 dark:hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  Reset
                </button>
              )}
            </div>
            <a
              href={waChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#128C7E] hover:bg-[#0e7064] px-6 py-3 text-sm sm:text-base font-bold text-white shadow-sm transition hover:scale-[1.01] active:scale-95 shrink-0 cursor-pointer"
            >
              <MessageCircle className="size-5 fill-white text-[#128C7E]" />
              <span>Chat WhatsApp</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {activeBranches.length > 0
                ? "Ketik kota atau lokasi Anda di atas untuk mencari cabang terdekat."
                : "Informasi lokasi toko utama kami saat ini. Cabang baru dapat ditambahkan melalui panel admin."}
            </span>
            {/* Quick City Filter Pills if multiple cities exist */}
            {availableCities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400">Pilih Kota:</span>
                {availableCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleCityPillClick(city)}
                    className={`rounded-lg px-3 py-1.5 text-xs min-h-[32px] inline-flex items-center justify-center font-medium transition cursor-pointer ${
                      searchQuery.toLowerCase() === city.toLowerCase()
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-[#F8F9FA] dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-[#F2F4F7]"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map & Branch List Layout */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Main Leaflet Map View */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-2xs">
            {mapVisible ? (
              <LeafletBranchMap
                branches={filteredBranches}
                selectedBranch={selectedBranch}
                onSelectBranch={handleSelectBranch}
              />
            ) : (
              <div className="flex h-[380px] sm:h-[460px] lg:h-[500px] w-full items-center justify-center rounded-2xl border border-border bg-muted/30 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <MapPin className="size-8 text-primary/70" />
                  <p className="text-xs font-semibold">Peta Lokasi Toko & Cabang</p>
                </div>
              </div>
            )}
          </div>

          {/* Selected Branch Detail & Quick List */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Selected Branch Spotlight Card */}
            {selectedBranch ? (
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-[#F8F9FA] dark:bg-white/5 p-5 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary uppercase tracking-wide">
                    📍 {selectedBranch.city}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {activeBranches.length > 0 ? "Cabang Terpilih" : "Toko Utama"}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {selectedBranch.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                  {selectedBranch.address || "Alamat toko belum diatur."}
                </p>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-white/10 pt-3 mb-4">
                  {selectedBranch.operating_hours && (
                    <div className="flex items-center gap-2">
                      <Clock className="size-3.5 text-primary shrink-0" />
                      <span>{selectedBranch.operating_hours}</span>
                    </div>
                  )}
                  {selectedBranch.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-primary shrink-0" />
                      <span>{selectedBranch.phone}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={selectedBranch.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedBranch.name} ${selectedBranch.address}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-white/10 px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-800 dark:text-slate-200 transition shadow-2xs"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Petunjuk Arah</span>
                  </a>
                  <a
                    href={`https://wa.me/${(selectedBranch.whatsapp || storeWhatsApp).replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Halo ${selectedBranch.name}, saya ingin menanyakan produk di toko ini.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-3 py-2 min-h-[38px] text-xs font-bold text-primary-foreground transition shadow-xs"
                  >
                    <MessageCircle className="size-3.5" />
                    <span>Chat WhatsApp</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-xs text-slate-400">
                Belum ada lokasi toko atau cabang yang dikonfigurasi. Atur melalui Admin Panel.
              </div>
            )}

            {/* List of matching branches */}
            {displayBranches.length > 1 && (
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-[#F8F9FA] dark:bg-white/5 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white mb-3 px-1">
                  <span>Daftar Cabang ({filteredBranches.length})</span>
                  {filteredBranches.length !== displayBranches.length && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      Tampilkan Semua
                    </button>
                  )}
                </div>
                <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                  {filteredBranches.map((branch) => {
                    const isCur = selectedBranch?.id === branch.id;
                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => handleSelectBranch(branch)}
                        className={`w-full text-left rounded-xl p-3 transition flex items-center justify-between gap-3 border cursor-pointer ${
                          isCur
                            ? "border-primary/50 bg-primary/10 text-primary font-medium shadow-2xs"
                            : "border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-900/60 hover:bg-[#F2F4F7] text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${
                                isCur ? "bg-primary text-primary-foreground" : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {branch.city}
                            </span>
                            <span className="truncate text-xs font-bold">{branch.name}</span>
                          </div>
                          <p className="truncate text-[11px] mt-1 text-slate-500 dark:text-slate-400">
                            {branch.address}
                          </p>
                        </div>
                        <ChevronRight
                          className={`size-4 shrink-0 ${
                            isCur ? "text-primary" : "text-slate-400"
                          }`}
                        />
                      </button>
                    );
                  })}
                  {!filteredBranches.length && (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Tidak ada cabang yang cocok dengan pencarian &quot;{searchQuery}&quot;.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
