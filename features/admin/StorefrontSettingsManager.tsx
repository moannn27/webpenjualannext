"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getAdminProductOptionsAction, saveStorefrontSettingsAction } from "@/actions/admin";
import {
  DEFAULT_STOREFRONT_SETTINGS,
  normalizeStorefrontSettings,
  type StorefrontSettings,
  type StoreBranch,
  type OfficialMarketplace,
  type MarketplaceStore,
  type OfficialChannelPlatform,
  type BankTransferInfo,
} from "@/lib/storefront-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Share2,
  Clock,
  Phone,
  MessageCircle,
  Plus,
  Trash2,
  Compass,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { PlatformLogo } from "@/components/shared/BrandLogos";

const names: Record<string, string> = {
  categories: "Kategori",
  bestsellers: "Produk terlaris",
  promo: "Banner promo",
  newArrivals: "Produk terbaru",
  brands: "Brand",
  branches: "Cabang toko & peta interaktif",
  channels: "Official marketplace & partner store",
  whyUs: "Keunggulan toko",
  testimonials: "Testimoni",
  faq: "FAQ",
};

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Semarang: { lat: -6.9932, lng: 110.4203 },
  Yogyakarta: { lat: -7.7712, lng: 110.3892 },
  Surakarta: { lat: -7.5684, lng: 110.8284 },
  Solo: { lat: -7.5684, lng: 110.8284 },
  Surabaya: { lat: -7.2754, lng: 112.7562 },
  Purwokerto: { lat: -7.4243, lng: 109.2302 },
  Cirebon: { lat: -6.7214, lng: 108.5562 },
  Pekalongan: { lat: -6.8886, lng: 109.6753 },
  Kudus: { lat: -6.8048, lng: 110.8405 },
  Magelang: { lat: -7.4797, lng: 110.2177 },
  Madiun: { lat: -7.6298, lng: 111.5239 },
  Malang: { lat: -7.9497, lng: 112.6174 },
  Kediri: { lat: -7.818, lng: 112.0128 },
  Jember: { lat: -8.1845, lng: 113.6681 },
  Bandung: { lat: -6.9015, lng: 107.6186 },
  Jakarta: { lat: -6.1368, lng: 106.8272 },
  Denpasar: { lat: -8.6705, lng: 115.2126 },
};

function GoogleMapsPreviewBox({ address, mapsUrl, label }: { address?: string; mapsUrl?: string; label: string }) {
  const cleanAddress = address?.trim() || "";
  const cleanMapsUrl = mapsUrl?.trim() || "";
  const hasLocation = Boolean(cleanAddress || cleanMapsUrl);
  if (!hasLocation) return null;

  const targetMapsLink =
    cleanMapsUrl ||
    (cleanAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}` : "");

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <MapPin className="size-3.5 text-primary shrink-0" />
          {label}
        </span>
        {targetMapsLink && (
          <a
            href={targetMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Buka di Google Maps <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      {cleanAddress ? (
        <div className="relative overflow-hidden rounded-lg border border-border shadow-sm">
          <iframe
            title={label}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(cleanAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            className="h-44 w-full border-0 sm:h-52"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Isi alamat lengkap di atas untuk memunculkan tampilan peta interaktif Google Maps secara otomatis.
        </p>
      )}
    </div>
  );
}

export function StorefrontSettingsManager({ initialSettings }: { initialSettings: unknown }) {
  const [settings, setSettings] = useState<StorefrontSettings>(() =>
    normalizeStorefrontSettings(initialSettings ?? DEFAULT_STOREFRONT_SETTINGS)
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, startTransition] = useTransition();
  const [products, setProducts] = useState<{ id: string; name: string; brand: string; category: string }[]>([]);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    getAdminProductOptionsAction()
      .then((rows) =>
        setProducts(
          rows.map((product) => ({
            id: product.id,
            name: product.name,
            brand: product.brands?.[0]?.name ?? "",
            category: product.categories?.[0]?.name ?? "",
          }))
        )
      )
      .catch(() => setProducts([]));
  }, []);

  const updateSection = (
    key: string,
    field: "visible" | "title" | "subtitle" | "productIds" | "tag" | "notice",
    value: string | boolean | string[]
  ) =>
    setSettings((current) => ({
      ...current,
      sections: { ...current.sections, [key]: { ...current.sections[key], [field]: value } },
    }));

  const updateStore = (field: Exclude<keyof StorefrontSettings["store"], "branches">, value: string) =>
    setSettings((current) => ({ ...current, store: { ...current.store, [field]: value } }));

  const updateCatalogPageSize = (value: number) =>
    setSettings((current) => ({ ...current, admin: { ...current.admin, catalogPageSize: value } }));

  // Branch CRUD
  const updateBranch = <K extends keyof StoreBranch>(id: string, field: K, value: StoreBranch[K]) =>
    setSettings((current) => ({
      ...current,
      store: {
        ...current.store,
        branches: current.store.branches.map((branch) => (branch.id === id ? { ...branch, [field]: value } : branch)),
      },
    }));

  const addBranch = () =>
    setSettings((current) => ({
      ...current,
      store: {
        ...current.store,
        branches: [
          ...current.store.branches,
          {
            id: crypto.randomUUID(),
            name: "",
            city: "Pusat",
            address: "",
            latitude: -6.9932,
            longitude: 110.4203,
            phone: "",
            whatsapp: current.store.whatsapp || "6281234567890",
            operating_hours: "09:00 - 21:00 WIB",
            maps_url: "",
            is_active: true,
          },
        ],
      },
    }));

  const removeBranch = (id: string) =>
    setSettings((current) => ({
      ...current,
      store: {
        ...current.store,
        branches: current.store.branches.filter((branch) => branch.id !== id),
      },
    }));

  // Hierarchical Marketplace CRUD
  const updateMarketplace = <K extends keyof OfficialMarketplace>(
    id: string,
    field: K,
    value: OfficialMarketplace[K]
  ) =>
    setSettings((current) => ({
      ...current,
      official_marketplaces: (current.official_marketplaces || []).map((mp) =>
        mp.id === id ? { ...mp, [field]: value } : mp
      ),
    }));

  const addMarketplace = () =>
    setSettings((current) => ({
      ...current,
      official_marketplaces: [
        ...(current.official_marketplaces || []),
        {
          id: crypto.randomUUID(),
          platform: "tokopedia",
          name: "Tokopedia",
          custom_icon_url: "",
          is_active: true,
          stores: [
            {
              id: crypto.randomUUID(),
              name: "Toko Baru",
              url: "https://www.tokopedia.com/",
              badge_text: "Official Store",
              is_active: true,
            },
          ],
        },
      ],
    }));

  const removeMarketplace = (id: string) =>
    setSettings((current) => ({
      ...current,
      official_marketplaces: (current.official_marketplaces || []).filter((mp) => mp.id !== id),
    }));

  const addStoreToMarketplace = (marketplaceId: string) =>
    setSettings((current) => ({
      ...current,
      official_marketplaces: (current.official_marketplaces || []).map((mp) => {
        if (mp.id !== marketplaceId) return mp;
        return {
          ...mp,
          stores: [
            ...mp.stores,
            {
              id: crypto.randomUUID(),
              name: "",
              url: "",
              badge_text: "Official Store",
              is_active: true,
            },
          ],
        };
      }),
    }));

  const updateStoreInMarketplace = <K extends keyof MarketplaceStore>(
    marketplaceId: string,
    storeId: string,
    field: K,
    value: MarketplaceStore[K]
  ) =>
    setSettings((current) => ({
      ...current,
      official_marketplaces: (current.official_marketplaces || []).map((mp) => {
        if (mp.id !== marketplaceId) return mp;
        return {
          ...mp,
          stores: mp.stores.map((s) => (s.id === storeId ? { ...s, [field]: value } : s)),
        };
      }),
    }));

  const removeStoreFromMarketplace = (marketplaceId: string, storeId: string) =>
    setSettings((current) => ({
      ...current,
      official_marketplaces: (current.official_marketplaces || []).map((mp) => {
        if (mp.id !== marketplaceId) return mp;
        return {
          ...mp,
          stores: mp.stores.filter((s) => s.id !== storeId),
        };
      }),
    }));

  const updatePickupInfo = (field: keyof StorefrontSettings["pickup_info"], value: string) =>
    setSettings((current) => ({ ...current, pickup_info: { ...current.pickup_info, [field]: value } }));

  const updateBankTransfer = (index: number, field: keyof BankTransferInfo, value: string) =>
    setSettings((current) => {
      const arr = [...current.bank_transfer];
      arr[index] = { ...arr[index], [field]: value };
      return { ...current, bank_transfer: arr };
    });

  const addBankAccount = () =>
    setSettings((current) => ({
      ...current,
      bank_transfer: [...current.bank_transfer, { bank_name: "", account_number: "", account_holder: "" }],
    }));

  const removeBankAccount = (index: number) =>
    setSettings((current) => ({ ...current, bank_transfer: current.bank_transfer.filter((_, i) => i !== index) }));

  const save = () => {
    setError("");
    setNotice("");
    startTransition(async () => {
      try {
        await saveStorefrontSettingsAction(settings);
        setNotice("Pengaturan halaman depan & toko berhasil disimpan!");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Pengaturan gagal disimpan.");
      }
    });
  };

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 sm:p-6">
      {/* Sticky Top Bar for Instant Saving */}
      <div className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-background/95 p-3.5 shadow-md backdrop-blur sm:p-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Save className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold leading-tight text-foreground">
              Pengaturan Toko, Cabang & Official Marketplace
            </h3>
            <p className="text-xs text-muted-foreground">
              Perubahan langsung tersimpan ke database toko Anda.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={busy} className="gap-2 shadow-sm font-medium">
            {busy ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
            {busy ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setSettings(DEFAULT_STOREFRONT_SETTINGS)}>
            Reset Default
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3.5 text-sm text-green-800">
          <CheckCircle2 className="size-4 shrink-0 text-green-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Bagian Halaman Depan */}
      <div>
        <h2 className="text-xl font-semibold">Tampilan & Section Halaman Depan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur status tampilan, judul, dan deskripsi section yang muncul di halaman beranda.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(settings.sections).map(([key, section]) => (
          <article key={key} className="min-w-0 space-y-3 rounded-xl border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-primary">{names[key] ?? key}</h3>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={section.visible}
                  onChange={(event) => updateSection(key, "visible", event.target.checked)}
                />
                Tampilkan
              </label>
            </div>
            {section.tag !== undefined && (
              <label className="block space-y-1 text-xs">
                Tag / Subjudul Kecil (Atas)
                <Input
                  value={section.tag}
                  onChange={(event) => updateSection(key, "tag", event.target.value)}
                  placeholder="Contoh: CABANG RESMI / OFFICIAL CHANNEL"
                />
              </label>
            )}
            <label className="block space-y-1 text-sm">
              Judul
              <Input
                value={section.title}
                onChange={(event) => updateSection(key, "title", event.target.value)}
                maxLength={100}
              />
            </label>
            <label className="block space-y-1 text-sm">
              Deskripsi singkat
              <Input
                value={section.subtitle}
                onChange={(event) => updateSection(key, "subtitle", event.target.value)}
                maxLength={180}
              />
            </label>
            {section.notice !== undefined && (
              <label className="block space-y-1 text-xs">
                Teks Keamanan Transaksi (Notice)
                <Input
                  value={section.notice}
                  onChange={(event) => updateSection(key, "notice", event.target.value)}
                />
              </label>
            )}
            {["bestsellers", "newArrivals", "promo"].includes(key) && (
              <fieldset className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between gap-3">
                  <legend className="text-sm font-medium">Pilih produk</legend>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {(section.productIds ?? []).length}/8 dipilih
                  </span>
                </div>
                <Input
                  aria-label={`Cari produk untuk ${names[key] ?? key}`}
                  value={productSearch[key] ?? ""}
                  onChange={(event) => setProductSearch((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder="Cari nama produk, brand, kategori..."
                />
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border bg-card p-2">
                  {products
                    .filter((product) =>
                      `${product.name} ${product.brand} ${product.category}`
                        .toLocaleLowerCase("id-ID")
                        .includes((productSearch[key] ?? "").trim().toLocaleLowerCase("id-ID"))
                    )
                    .map((product) => {
                      const selected = section.productIds ?? [];
                      const checked = selected.includes(product.id);
                      return (
                        <label key={product.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted">
                          <input
                            className="mt-0.5"
                            type="checkbox"
                            checked={checked}
                            disabled={!checked && selected.length >= 8}
                            onChange={(event) =>
                              updateSection(
                                key,
                                "productIds",
                                event.target.checked
                                  ? [...selected, product.id].slice(0, 8)
                                  : selected.filter((id) => id !== product.id)
                              )
                            }
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{product.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[product.brand, product.category].filter(Boolean).join(" · ") || "Tanpa brand/kategori"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              </fieldset>
            )}
          </article>
        ))}
      </div>

      {/* SECTION: Official Marketplace & Toko Online (Screenshot 2 Berkelompok) */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Share2 className="size-5 text-primary" />
              <h2 className="text-xl font-bold">Official Marketplace & Akun Toko Resmi</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola marketplace resmi (Tokopedia, Shopee, TikTok Shop, dll). Setiap marketplace bisa memiliki beberapa cabang/akun toko.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addMarketplace} className="gap-1.5">
              <Plus className="size-4" />
              Tambah Platform Marketplace
            </Button>
            <Button onClick={save} disabled={busy} size="sm" className="gap-1.5 shadow-sm">
              <Save className="size-3.5" />
              {busy ? "Menyimpan..." : "Simpan Marketplace"}
            </Button>
          </div>
        </div>

        {/* Grouped Marketplace Platforms List */}
        <div className="space-y-4">
          {(settings.official_marketplaces || []).map((marketplace) => (
            <article
              key={marketplace.id}
              className="rounded-2xl border border-border bg-background p-4 sm:p-5 shadow-sm space-y-4"
            >
              {/* Header Platform */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-3">
                  <PlatformLogo
                    platform={marketplace.platform}
                    customIconUrl={marketplace.custom_icon_url}
                    className="size-8"
                  />
                  <div>
                    <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                      <span>{marketplace.name}</span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                        {marketplace.stores.length} Toko Terdaftar
                      </span>
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketplace.is_active !== false}
                      onChange={(e) => updateMarketplace(marketplace.id, "is_active", e.target.checked)}
                    />
                    Tampilkan di Website
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMarketplace(marketplace.id)}
                    className="h-8 px-2 text-destructive hover:bg-destructive/10 text-xs gap-1"
                  >
                    <Trash2 className="size-3.5" />
                    Hapus Platform
                  </Button>
                </div>
              </div>

              {/* Platform Settings Row */}
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-xs">
                  Platform
                  <select
                    value={marketplace.platform}
                    onChange={(e) => {
                      const plat = e.target.value as OfficialChannelPlatform;
                      updateMarketplace(marketplace.id, "platform", plat);
                      if (plat === "tokopedia") updateMarketplace(marketplace.id, "name", "Tokopedia");
                      else if (plat === "shopee") updateMarketplace(marketplace.id, "name", "Shopee");
                      else if (plat === "tiktok") updateMarketplace(marketplace.id, "name", "TikTok Shop");
                      else if (plat === "instagram") updateMarketplace(marketplace.id, "name", "Instagram");
                    }}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium"
                  >
                    <option value="tokopedia">Tokopedia</option>
                    <option value="shopee">Shopee</option>
                    <option value="tiktok">TikTok Shop</option>
                    <option value="instagram">Instagram</option>
                    <option value="whatsapp">WhatsApp Channel</option>
                    <option value="lazada">Lazada</option>
                    <option value="blibli">Blibli</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                    <option value="other">Custom / Lainnya</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs">
                  Nama Tampilan Platform
                  <Input
                    value={marketplace.name}
                    onChange={(e) => updateMarketplace(marketplace.id, "name", e.target.value)}
                    placeholder="Contoh: Tokopedia"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="size-3 text-primary" />
                    URL Gambar / Icon Kustom (Opsional)
                  </span>
                  <Input
                    type="url"
                    value={marketplace.custom_icon_url ?? ""}
                    onChange={(e) => updateMarketplace(marketplace.id, "custom_icon_url", e.target.value)}
                    placeholder="https://.../logo-toko.png (Kosongkan untuk icon standar)"
                  />
                </label>
              </div>

              {/* Nested Stores List Under This Platform */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Daftar Toko & Cabang di {marketplace.name}
                    </h5>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addStoreToMarketplace(marketplace.id)}
                    className="h-7 text-xs gap-1 bg-background"
                  >
                    <Plus className="size-3" />
                    Tambah Toko di {marketplace.name}
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {marketplace.stores.map((store, sIdx) => (
                    <div
                      key={store.id}
                      className="grid gap-2 sm:grid-cols-12 items-center rounded-xl border border-border bg-card p-3 shadow-2xs"
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-muted-foreground mb-0.5">
                          Nama Toko / Cabang #{sIdx + 1}
                        </label>
                        <Input
                          value={store.name}
                          onChange={(e) =>
                            updateStoreInMarketplace(marketplace.id, store.id, "name", e.target.value)
                          }
                          placeholder="Next Solution Official Store"
                          className="h-8 text-xs font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-muted-foreground mb-0.5">
                          Tautan URL Toko
                        </label>
                        <Input
                          type="url"
                          value={store.url}
                          onChange={(e) =>
                            updateStoreInMarketplace(marketplace.id, store.id, "url", e.target.value)
                          }
                          placeholder="https://www.tokopedia.com/nextsolution"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-muted-foreground mb-0.5">
                          Badge / Keterangan
                        </label>
                        <Input
                          value={store.badge_text ?? ""}
                          onChange={(e) =>
                            updateStoreInMarketplace(marketplace.id, store.id, "badge_text", e.target.value)
                          }
                          placeholder="Official Store"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-4">
                        <label className="flex items-center gap-1 text-[11px] font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={store.is_active !== false}
                            onChange={(e) =>
                              updateStoreInMarketplace(marketplace.id, store.id, "is_active", e.target.checked)
                            }
                          />
                          Aktif
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStoreFromMarketplace(marketplace.id, store.id)}
                          className="size-7 p-0 text-destructive hover:bg-destructive/10"
                          title="Hapus Toko"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {!marketplace.stores.length && (
                    <p className="py-3 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      Belum ada toko yang ditambahkan di {marketplace.name}. Klik tombol "+ Tambah Toko" di atas.
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}

          {!settings.official_marketplaces?.length && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada marketplace resmi yang dikonfigurasi. Klik "+ Tambah Platform Marketplace" di atas.
            </p>
          )}
        </div>
      </div>

      {/* SECTION: Cabang Toko & Peta Interaktif (Screenshot 1) */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="size-5 text-primary" />
              <h2 className="text-xl font-bold">Cabang Toko & Peta Interaktif (Screenshot 1)</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola titik cabang untuk fitur pencarian cabang terdekat dan peta Leaflet OpenStreetMap.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addBranch} className="gap-1.5">
              <Plus className="size-4" />
              Tambah Cabang
            </Button>
            <Button onClick={save} disabled={busy} size="sm" className="gap-1.5 shadow-sm">
              <Save className="size-3.5" />
              {busy ? "Menyimpan..." : "Simpan Cabang"}
            </Button>
          </div>
        </div>

        {/* List of Branches */}
        <div className="space-y-4">
          {settings.store.branches.map((branch, index) => (
            <article key={branch.id} className="rounded-xl border bg-background p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    #{index + 1}
                  </span>
                  <h4 className="font-bold text-base text-foreground">
                    {branch.name || `Cabang Baru ${index + 1}`}
                  </h4>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {branch.city || "Kota"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={branch.is_active !== false}
                      onChange={(e) => updateBranch(branch.id, "is_active", e.target.checked)}
                    />
                    Tampilkan di Peta & Website
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBranch(branch.id)}
                    className="text-destructive hover:bg-destructive/10 h-8 px-2.5 text-xs gap-1"
                  >
                    <Trash2 className="size-3.5" />
                    Hapus
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1 text-xs">
                  Nama Cabang
                  <Input
                    value={branch.name}
                    onChange={(event) => updateBranch(branch.id, "name", event.target.value)}
                    placeholder="Contoh: Next Solution Semarang (Pusat)"
                  />
                </label>

                <div className="space-y-1 text-xs">
                  <label className="block">Kota / Wilayah</label>
                  <Input
                    value={branch.city}
                    onChange={(event) => {
                      const cityVal = event.target.value;
                      updateBranch(branch.id, "city", cityVal);
                      if (CITY_COORDINATES[cityVal]) {
                        updateBranch(branch.id, "latitude", CITY_COORDINATES[cityVal].lat);
                        updateBranch(branch.id, "longitude", CITY_COORDINATES[cityVal].lng);
                      }
                    }}
                    placeholder="Contoh: Semarang / Yogyakarta"
                  />
                </div>

                <label className="space-y-1 text-xs">
                  Jam Operasional
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      value={branch.operating_hours ?? "09:00 - 21:00 WIB"}
                      onChange={(event) => updateBranch(branch.id, "operating_hours", event.target.value)}
                      className="pl-8"
                      placeholder="09:00 - 21:00 WIB"
                    />
                  </div>
                </label>

                <label className="space-y-1 text-xs sm:col-span-2">
                  Alamat Lengkap Cabang
                  <Input
                    value={branch.address}
                    onChange={(event) => updateBranch(branch.id, "address", event.target.value)}
                    placeholder="Jl. Pandanaran No. 58, Pleburan, Semarang"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  WhatsApp Cabang (Untuk Tombol Chat)
                  <div className="relative">
                    <MessageCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={branch.whatsapp ?? ""}
                      onChange={(event) => updateBranch(branch.id, "whatsapp", event.target.value)}
                      className="pl-8"
                      placeholder="6281234567890"
                    />
                  </div>
                </label>

                <label className="space-y-1 text-xs">
                  Nomor Telepon Kantor
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={branch.phone ?? ""}
                      onChange={(event) => updateBranch(branch.id, "phone", event.target.value)}
                      className="pl-8"
                      placeholder="024-8412345"
                    />
                  </div>
                </label>

                <label className="space-y-1 text-xs">
                  Latitude (Titik Peta)
                  <Input
                    type="number"
                    step="any"
                    value={branch.latitude}
                    onChange={(event) => updateBranch(branch.id, "latitude", parseFloat(event.target.value) || 0)}
                    placeholder="-6.9932"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  Longitude (Titik Peta)
                  <Input
                    type="number"
                    step="any"
                    value={branch.longitude}
                    onChange={(event) => updateBranch(branch.id, "longitude", parseFloat(event.target.value) || 0)}
                    placeholder="110.4203"
                  />
                </label>

                <label className="space-y-1 text-xs sm:col-span-2 lg:col-span-3">
                  Link Google Maps (Untuk Petunjuk Arah)
                  <Input
                    type="url"
                    value={branch.maps_url}
                    onChange={(event) => updateBranch(branch.id, "maps_url", event.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                  />
                </label>
              </div>

              {/* Quick Preset Coordinates Pill Helper */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <span className="text-[11px] font-semibold">Isi Koordinat Cepat:</span>
                {Object.keys(CITY_COORDINATES).slice(0, 10).map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      updateBranch(branch.id, "city", city);
                      updateBranch(branch.id, "latitude", CITY_COORDINATES[city].lat);
                      updateBranch(branch.id, "longitude", CITY_COORDINATES[city].lng);
                    }}
                    className="rounded bg-muted px-2 py-0.5 text-[10px] hover:bg-muted-foreground/20 transition font-medium"
                  >
                    {city}
                  </button>
                ))}
              </div>

              <GoogleMapsPreviewBox
                address={branch.address}
                mapsUrl={branch.maps_url}
                label={`Pratinjau Peta Cabang ${index + 1}: ${branch.name || "Cabang"}`}
              />
            </article>
          ))}
          {!settings.store.branches.length && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada cabang toko yang ditambahkan. Klik "Tambah Cabang" di atas.
            </p>
          )}
        </div>
      </div>

      {/* Informasi Toko Utama & Footer */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Informasi Toko Utama & Footer</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Alamat utama, kontak CS, dan link Google Maps ini akan tampil di bagian bawah website.
            </p>
          </div>
          <Button onClick={save} disabled={busy} size="sm" className="gap-1.5 shadow-sm">
            <Save className="size-3.5" />
            {busy ? "Menyimpan..." : "Simpan Info Toko"}
          </Button>
        </div>

        <label className="block space-y-1 text-sm">
          Deskripsi toko
          <textarea
            value={settings.store.description}
            onChange={(event) => updateStore("description", event.target.value)}
            maxLength={300}
            className="min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm"
          />
        </label>
        <label className="block space-y-1 text-sm">
          Alamat toko utama
          <textarea
            value={settings.store.address}
            onChange={(event) => updateStore("address", event.target.value)}
            maxLength={400}
            placeholder="Alamat lengkap toko fisik utama"
            className="min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <MapPin className="size-3.5 text-primary" />
            Link Google Maps toko utama
          </span>
          <Input
            type="url"
            value={settings.store.maps_url}
            onChange={(event) => updateStore("maps_url", event.target.value)}
            placeholder="https://maps.google.com/... atau https://share.google/..."
          />
        </label>

        <GoogleMapsPreviewBox
          address={settings.store.address}
          mapsUrl={settings.store.maps_url}
          label="Pratinjau Peta Toko Utama (Footer)"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Email toko
            <Input
              type="email"
              value={settings.store.email}
              onChange={(event) => updateStore("email", event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            Nomor telepon CS
            <Input value={settings.store.phone} onChange={(event) => updateStore("phone", event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            WhatsApp admin untuk konfirmasi pembayaran
            <Input
              type="tel"
              inputMode="tel"
              value={settings.store.whatsapp}
              onChange={(event) => updateStore("whatsapp", event.target.value)}
              placeholder="6281234567890"
            />
          </label>
          <label className="space-y-1 text-sm">
            Teks hak cipta
            <Input
              value={settings.store.copyright}
              onChange={(event) => updateStore("copyright", event.target.value)}
              maxLength={120}
            />
          </label>
        </div>
      </div>

      {/* Lokasi Ambil di Toko */}
      <div className="space-y-4 border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Lokasi Ambil di Toko (Pickup)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Alamat dan link Maps tampil di checkout saat pembeli memilih opsi Ambil di Toko.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {settings.store.address.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  updatePickupInfo("store_address", settings.store.address);
                  if (settings.store.maps_url) updatePickupInfo("maps_url", settings.store.maps_url);
                }}
              >
                Gunakan Alamat Toko Utama
              </Button>
            )}
            <Button onClick={save} disabled={busy} size="sm" className="gap-1.5 shadow-sm">
              <Save className="size-3.5" />
              {busy ? "Menyimpan..." : "Simpan Lokasi Pickup"}
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Nama toko
            <Input
              value={settings.pickup_info.store_name}
              onChange={(e) => updatePickupInfo("store_name", e.target.value)}
              placeholder="Toko Next Solution"
              maxLength={80}
            />
          </label>
          <label className="space-y-1 text-sm">
            Link Google Maps
            <Input
              type="url"
              value={settings.pickup_info.maps_url}
              onChange={(e) => updatePickupInfo("maps_url", e.target.value)}
              placeholder="https://maps.google.com/..."
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            Alamat toko
            <textarea
              value={settings.pickup_info.store_address}
              onChange={(e) => updatePickupInfo("store_address", e.target.value)}
              maxLength={300}
              placeholder={settings.store.address ? `Otomatis: ${settings.store.address}` : "Jl. Pandanaran No. 58"}
              className="min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm"
            />
          </label>
          <div className="sm:col-span-2">
            <GoogleMapsPreviewBox
              address={settings.pickup_info.store_address.trim() || settings.store.address}
              mapsUrl={settings.pickup_info.maps_url.trim() || settings.store.maps_url}
              label="Pratinjau Peta Lokasi Ambil di Toko (Pickup)"
            />
          </div>
        </div>
      </div>

      {/* Rekening Transfer */}
      <div className="space-y-4 border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Rekening transfer</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rekening ini tampil di halaman checkout saat pelanggan akan transfer.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addBankAccount}>
              Tambah rekening
            </Button>
            <Button onClick={save} disabled={busy} size="sm" className="gap-1.5 shadow-sm">
              <Save className="size-3.5" />
              {busy ? "Menyimpan..." : "Simpan Rekening"}
            </Button>
          </div>
        </div>
        {settings.bank_transfer.map((account, index) => (
          <article key={index} className="grid gap-3 rounded-xl border bg-background p-4 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-2 sm:col-span-3">
              <h4 className="font-medium">Rekening {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeBankAccount(index)}
                className="text-destructive hover:bg-destructive/10"
              >
                Hapus
              </Button>
            </div>
            <label className="space-y-1 text-sm">
              Nama bank
              <Input
                value={account.bank_name}
                onChange={(e) => updateBankTransfer(index, "bank_name", e.target.value)}
                placeholder="BCA"
              />
            </label>
            <label className="space-y-1 text-sm">
              Nomor rekening
              <Input
                value={account.account_number}
                onChange={(e) => updateBankTransfer(index, "account_number", e.target.value)}
                placeholder="1234567890"
              />
            </label>
            <label className="space-y-1 text-sm">
              Atas nama
              <Input
                value={account.account_holder}
                onChange={(e) => updateBankTransfer(index, "account_holder", e.target.value)}
                placeholder="Next Solution"
              />
            </label>
          </article>
        ))}
        {!settings.bank_transfer.length && (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Belum ada rekening yang ditambahkan.
          </p>
        )}
      </div>

      {/* Pengaturan Katalog Admin */}
      <div className="space-y-2 border-t pt-5">
        <div>
          <h2 className="text-xl font-semibold">Pengaturan katalog admin</h2>
          <p className="text-sm text-muted-foreground">
            Hanya super admin yang bisa mengubah banyaknya produk per halaman katalog.
          </p>
        </div>
        <label className="block max-w-sm space-y-1 text-sm">
          Produk per halaman
          <select
            value={settings.admin.catalogPageSize}
            onChange={(event) => updateCatalogPageSize(Number(event.target.value))}
            className="h-10 w-full rounded-lg border border-input bg-background px-3"
          >
            <option value={24}>24 produk</option>
            <option value={48}>48 produk</option>
            <option value={100}>100 produk</option>
            <option value={200}>200 produk</option>
          </select>
        </label>
      </div>

      {/* Bottom Save Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={busy} size="lg" className="gap-2 font-medium shadow-md">
            {busy ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
            {busy ? "Menyimpan perubahan..." : "Simpan semua pengaturan"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => setSettings(DEFAULT_STOREFRONT_SETTINGS)}>
            Kembalikan default
          </Button>
        </div>
        {notice && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
            <CheckCircle2 className="size-4" />
            Semua perubahan telah disimpan!
          </span>
        )}
      </div>
    </section>
  );
}
