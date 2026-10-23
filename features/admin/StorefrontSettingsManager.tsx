"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminProductOptionsAction,
  saveStorefrontSettingsAction,
  uploadAdminImageAction,
  updateAdminAvatarAction,
  getCurrentAdminAvatarAction,
} from "@/actions/admin";
import { prepareImageUpload } from "@/features/admin/prepare-image-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAllReviewsForAdminAction, type AdminReviewWithDetails } from "@/actions/review";
import {
  DEFAULT_STOREFRONT_SETTINGS,
  DEFAULT_FEATURED_REVIEWS,
  CITY_COORDINATES,
  extractCoordinatesFromLocation,
  normalizeStorefrontSettings,
  type StorefrontSettings,
  type StoreBranch,
  type OfficialMarketplace,
  type MarketplaceStore,
  type OfficialChannelPlatform,
  type BankTransferInfo,
  type FeaturedReviewItem,
  type StoreFeaturesSettings,
} from "@/lib/storefront-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  MessageSquareQuote,
  Star,
  Sparkles,
  SlidersHorizontal,
  Truck,
  Store,
  Banknote,
  QrCode,
  CreditCard,
  Scale,
  Heart,
  ShieldCheck,
  Tag,
  Bot,
  Building2,
  UserRound,
  Search,
  Package,
  FileText,
} from "lucide-react";
import { PlatformLogo } from "@/components/shared/BrandLogos";

const names: Record<string, string> = {
  categories: "Kategori",
  bestsellers: "Produk terlaris",
  promo: "Banner promo",
  newArrivals: "Produk terbaru",
  featuredDiscovery: "Pilihan Produk Unggulan (Live Search & Filter)",
  brands: "Brand",
  branches: "Cabang toko & peta interaktif",
  reviews: "Ulasan produk pelanggan (Slider Beranda)",
  channels: "Official marketplace & partner store",
  whyUs: "Keunggulan toko",
  testimonials: "Testimoni",
  faq: "FAQ",
};

function GoogleMapsPreviewBox({
  address,
  mapsUrl,
  lat,
  lng,
  city,
  label,
}: {
  address?: string;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
  city?: string;
  label: string;
}) {
  const cleanAddress = address?.trim() || "";
  const cleanMapsUrl = mapsUrl?.trim() || "";
  const hasCoords = typeof lat === "number" && !isNaN(lat) && typeof lng === "number" && !isNaN(lng) && (lat !== 0 || lng !== 0);
  const hasLocation = Boolean(cleanAddress || cleanMapsUrl || hasCoords);
  if (!hasLocation) return null;

  const targetMapsLink =
    cleanMapsUrl ||
    (hasCoords
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : cleanAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`
      : "");

  const embedQuery = hasCoords
    ? `${lat},${lng}`
    : cleanAddress
    ? cleanAddress.toLowerCase().includes("bandung")
      ? cleanAddress
      : `${cleanAddress}, ${city || "Bandung"}`
    : cleanMapsUrl;

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
      <div className="relative overflow-hidden rounded-lg border border-border shadow-sm">
        <iframe
          title={label}
          src={`https://maps.google.com/maps?q=${encodeURIComponent(embedQuery)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
          className="h-44 w-full border-0 sm:h-52"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      {hasCoords && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="size-3 text-emerald-500" />
          Titik koordinat aktif: <strong>{lat}, {lng}</strong> {city ? `(${city})` : ""}
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
  const [products, setProducts] = useState<
    { id: string; name: string; brand: string; category: string; image?: string }[]
  >([]);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const router = useRouter();

  const [activeSettingsTab, setActiveSettingsTab] = useState<
    "all" | "branding" | "features" | "sections" | "marketplaces" | "branches" | "reviews" | "store" | "invoice"
  >("all");
  const [adminReviews, setAdminReviews] = useState<AdminReviewWithDetails[]>([]);
  const [adminAvatarUrl, setAdminAvatarUrl] = useState("");
  const [busyUpload, setBusyUpload] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);

  useEffect(() => {
    getCurrentAdminAvatarAction()
      .then((res) => {
        if (res.avatarUrl) setAdminAvatarUrl(res.avatarUrl);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleSwitch = (tab: string, shouldScroll = true) => {
      if (
        ["all", "branding", "features", "sections", "marketplaces", "branches", "reviews", "store", "invoice"].includes(tab)
      ) {
        setActiveSettingsTab(tab as typeof activeSettingsTab);
        if (shouldScroll) {
          setTimeout(() => {
            if (tab === "branding") {
              const el = document.getElementById("storefront-branding-section") || document.getElementById("storefront-settings-tabs");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            } else if (tab === "features") {
              const el = document.getElementById("storefront-features-section") || document.getElementById("storefront-settings-tabs");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            } else if (tab !== "all") {
              const el = document.getElementById("storefront-settings-tabs");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }
          }, 100);
        }
      }
    };

    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam) {
        handleSwitch(tabParam, tabParam === "features");
      }
    }

    const onCustomSwitch = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) handleSwitch(detail, true);
    };

    const onPopState = () => {
      const tabParam = new URLSearchParams(window.location.search).get("tab") || "all";
      handleSwitch(tabParam, false);
    };

    window.addEventListener("admin-switch-tab", onCustomSwitch);
    window.addEventListener("popstate", onPopState);

    getAdminProductOptionsAction()
      .then((rows) =>
        setProducts(
          rows.map((product) => {
            const b = (product as { brands?: { name?: string } | { name?: string }[] }).brands;
            const c = (product as { categories?: { name?: string } | { name?: string }[] }).categories;
            const imgs = (product as { product_images?: { url?: string; is_primary?: boolean }[] }).product_images;
            const primaryImg = Array.isArray(imgs)
              ? imgs.find((i) => i.is_primary)?.url || imgs[0]?.url
              : "";
            return {
              id: product.id,
              name: product.name,
              brand: Array.isArray(b) ? b[0]?.name ?? "" : b?.name ?? "",
              category: Array.isArray(c) ? c[0]?.name ?? "" : c?.name ?? "",
              image: primaryImg || "",
            };
          })
        )
      )
      .catch(() => setProducts([]));

    getAllReviewsForAdminAction()
      .then((data) => setAdminReviews(data))
      .catch(() => setAdminReviews([]));

    return () => {
      window.removeEventListener("admin-switch-tab", onCustomSwitch);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const updateFeatures = <K extends keyof StoreFeaturesSettings>(
    key: K,
    value: StoreFeaturesSettings[K]
  ) => {
    setSettings((current) => ({
      ...current,
      features: {
        ...current.features,
        [key]: value,
      },
    }));
  };

  const updateFeaturedReview = <K extends keyof FeaturedReviewItem>(
    index: number,
    field: K,
    value: FeaturedReviewItem[K]
  ) =>
    setSettings((current) => {
      const arr = [...(current.featured_reviews || [])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...current, featured_reviews: arr };
    });

  const addFeaturedReview = () =>
    setSettings((current) => ({
      ...current,
      featured_reviews: [
        ...(current.featured_reviews || []),
        {
          id: crypto.randomUUID(),
          user_name: "Pelanggan Terverifikasi",
          product_id: products[0]?.id || "",
          product_name: products[0]?.name || "Produk Pilihan",
          product_image: "",
          rating: 5,
          comment: "Produk original bergaransi resmi, pengiriman cepat dan sangat memuaskan.",
          date_text: "Terbaru",
          is_verified: true,
        },
      ],
    }));

  const removeFeaturedReview = (index: number) =>
    setSettings((current) => ({
      ...current,
      featured_reviews: (current.featured_reviews || []).filter((_, i) => i !== index),
    }));

  const resetDefaultReviews = () =>
    setSettings((current) => ({
      ...current,
      featured_reviews: DEFAULT_FEATURED_REVIEWS,
    }));

  const addOrganicReviewToFeatured = (rev: AdminReviewWithDetails) => {
    setSettings((current) => {
      if ((current.featured_reviews || []).some((r) => r.id === rev.id)) return current;
      return {
        ...current,
        featured_reviews: [
          ...(current.featured_reviews || []),
          {
            id: rev.id,
            user_name: rev.user_name,
            user_avatar: rev.user_avatar,
            product_id: rev.product_id,
            product_name: rev.product_name,
            product_image: rev.product_image,
            rating: rev.rating,
            comment: rev.comment,
            date_text: new Date(rev.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            is_verified: true,
          },
        ],
      };
    });
  };

  const updateSection = (
    key: string,
    field: "visible" | "title" | "subtitle" | "productIds" | "tag" | "notice",
    value: string | boolean | string[]
  ) =>
    setSettings((current) => ({
      ...current,
      sections: { ...current.sections, [key]: { ...current.sections[key], [field]: value } },
    }));

  const updateStore = <K extends Exclude<keyof StorefrontSettings["store"], "branches">>(
    field: K,
    value: StorefrontSettings["store"][K]
  ) =>
    setSettings((current) => ({ ...current, store: { ...current.store, [field]: value } }));

  const updateCatalogPageSize = (value: number) =>
    setSettings((current) => ({ ...current, admin: { ...current.admin, catalogPageSize: value } }));


  const updateInvoice = <K extends keyof StorefrontSettings["invoice"]>(
    field: K,
    value: StorefrontSettings["invoice"][K]
  ) =>
    setSettings((current) => ({
      ...current,
      invoice: { ...current.invoice, [field]: value },
    }));


  const uploadLogo = async (file: File, isForAdmin = false) => {
    try {
      setBusyUpload(true);
      setError("");
      const prepared = await prepareImageUpload(file);
      const formData = new FormData();
      formData.set("file", prepared);
      formData.set("bucket", "brands");
      const res = await uploadAdminImageAction(formData);
      if (isForAdmin) {
        updateStore("admin_logo_url", res.url);
      } else {
        updateStore("logo_url", res.url);
      }
      setNotice(
        isForAdmin
          ? "Logo khusus admin berhasil diunggah! Tekan tombol 'Simpan Logo & Identitas' untuk menyimpan."
          : "Logo toko berhasil diunggah! Tekan tombol 'Simpan Logo & Identitas' untuk menyimpan."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengupload logo.");
    } finally {
      setBusyUpload(false);
    }
  };

  const saveAdminAvatar = async () => {
    try {
      setBusyAvatar(true);
      setError("");
      await updateAdminAvatarAction(adminAvatarUrl);
      setNotice("Foto profil admin berhasil diperbarui dan diterapkan ke header!");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui foto profil.");
    } finally {
      setBusyAvatar(false);
    }
  };

  const uploadAdminAvatar = async (file: File) => {
    try {
      setBusyAvatar(true);
      setError("");
      const prepared = await prepareImageUpload(file);
      const formData = new FormData();
      formData.set("file", prepared);
      formData.set("bucket", "banners");
      const res = await uploadAdminImageAction(formData);
      setAdminAvatarUrl(res.url);
      await updateAdminAvatarAction(res.url);
      setNotice("Foto profil admin berhasil diupload dan langsung disimpan!");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengupload foto profil.");
    } finally {
      setBusyAvatar(false);
    }
  };

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
    setSettings((current) => {
      const defaultLat = current.store.latitude || -6.9185411;
      const defaultLng = current.store.longitude || 107.6165665;
      const defaultCity = current.store.city || "Bandung";
      return {
        ...current,
        store: {
          ...current.store,
          branches: [
            ...current.store.branches,
            {
              id: crypto.randomUUID(),
              name: "",
              city: defaultCity,
              address: "",
              latitude: defaultLat,
              longitude: defaultLng,
              phone: "",
              whatsapp: current.store.whatsapp || "6281234567890",
              operating_hours: "09:00 - 21:00 WIB",
              maps_url: "",
              is_active: true,
            },
          ],
        },
      };
    });

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
    <div className="space-y-6">
      {/* Sticky Top Bar for Instant Saving - sticks cleanly right under AdminHeader (h-20 / 80px) */}
      <div className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#18191E]/95 p-4 shadow-md backdrop-blur-md transition-all">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-[#2563EB] dark:text-blue-400">
            <Save className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold leading-tight text-slate-900 dark:text-white">
              Pengaturan Toko, Cabang & Official Marketplace
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Perubahan langsung tersimpan ke database toko Anda.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSettings(DEFAULT_STOREFRONT_SETTINGS)}
            className="rounded-full text-xs font-semibold border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 h-9 px-4"
          >
            Reset Default
          </Button>
          <Button
            onClick={save}
            disabled={busy}
            className="gap-2 shadow-sm font-semibold rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs px-5 h-9 transition"
          >
            {busy ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {busy ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800/40 p-3.5 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Pembagian Tab Pengaturan */}
      <div id="storefront-settings-tabs" className="flex items-center gap-2 overflow-x-auto pb-1 text-sm scrollbar-none scroll-mt-24">
        {[
          { id: "all", label: "Semua Pengaturan", icon: Layers },
          { id: "branding", label: "Logo & Identitas", icon: ImageIcon },
          { id: "features", label: "Fitur & Sistem Toko", icon: SlidersHorizontal },
          { id: "sections", label: "Section Beranda", icon: Compass },
          { id: "marketplaces", label: "Marketplace & Channel", icon: Share2 },
          { id: "branches", label: "Cabang & Peta", icon: MapPin },
          { id: "reviews", label: "Ulasan Produk", icon: Star },
          { id: "store", label: "Profil & Rekening", icon: Phone },
          { id: "invoice", label: "Faktur & Komplain", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSettingsTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveSettingsTab(tab.id as typeof activeSettingsTab);
                if (typeof window !== "undefined") {
                  const newUrl = tab.id === "all" ? "/admin/content" : `/admin/content?tab=${tab.id}`;
                  window.history.replaceState(null, "", newUrl);
                  window.dispatchEvent(new CustomEvent("admin-switch-tab", { detail: tab.id }));
                }
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border",
                isActive
                  ? "bg-[#2563EB] text-white border-[#2563EB] shadow-xs"
                  : "bg-white dark:bg-[#1E2028] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
              )}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bagian Logo, Identitas Toko & Foto Profil Admin */}
      {(activeSettingsTab === "all" || activeSettingsTab === "branding") && (
        <div id="storefront-branding-section" className="space-y-6 rounded-[28px] sm:rounded-[34px] border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-6 shadow-sm scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <ImageIcon className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Identitas Toko, Logo &amp; Foto Profil Admin
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Sesuaikan nama toko, logo header, mode tampilan (logo + tulisan, logo saja, atau teks saja), serta foto profil akun admin.
                </p>
              </div>
            </div>
            <Button onClick={save} disabled={busy} size="sm" className="gap-1.5 shadow-sm">
              <Save className="size-3.5" />
              {busy ? "Menyimpan..." : "Simpan Logo & Identitas"}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Kolom 1: Pengaturan Logo & Nama Toko */}
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Logo &amp; Nama Toko</h3>
              </div>

              <label className="block space-y-1 text-xs font-medium">
                Nama Toko / Brand
                <Input
                  value={settings.store.name ?? "Next Solution"}
                  onChange={(e) => updateStore("name", e.target.value)}
                  placeholder="Next Solution"
                  maxLength={60}
                />
              </label>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium">URL Gambar Logo Toko</label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={settings.store.logo_url ?? ""}
                    onChange={(e) => updateStore("logo_url", e.target.value)}
                    placeholder="https://... atau upload file"
                    className="text-xs"
                  />
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted shadow-2xs">
                    {busyUpload ? <RefreshCw className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5 text-primary" />}
                    Upload Logo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
                      className="sr-only"
                      disabled={busyUpload}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadLogo(file, false);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Format disarankan: PNG transparan, WebP, atau SVG.
                </p>
              </div>

              {/* Pilihan Mode Tampilan: Tulisan + Logo atau Pilih Salah Satu */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <span className="block text-xs font-semibold text-foreground">
                  Mode Tampilan di Header &amp; Navbar:
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { value: "both", label: "Logo + Tulisan", desc: "Tampilkan logo dan nama berdampingan" },
                    { value: "logo_only", label: "Hanya Logo", desc: "Hanya gambar logo tanpa teks nama" },
                    { value: "text_only", label: "Hanya Tulisan", desc: "Hanya teks nama tanpa gambar logo" },
                  ].map((mode) => {
                    const isChecked = (settings.store.logo_display_mode || "both") === mode.value;
                    return (
                      <label
                        key={mode.value}
                        className={cn(
                          "flex flex-col gap-1 rounded-xl border p-2.5 cursor-pointer text-xs transition-colors",
                          isChecked
                            ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                            : "border-border/60 bg-card hover:bg-muted/50 text-muted-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="logo_display_mode"
                            value={mode.value}
                            checked={isChecked}
                            onChange={() => updateStore("logo_display_mode", mode.value as "both" | "logo_only" | "text_only")}
                            className="size-3.5 text-primary"
                          />
                          <span className="font-semibold text-foreground">{mode.label}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground pl-5.5">{mode.desc}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Opsional Logo Khusus Admin */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <label className="block text-xs font-medium">
                  URL Logo Khusus Admin Panel (Opsional)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={settings.store.admin_logo_url ?? ""}
                    onChange={(e) => updateStore("admin_logo_url", e.target.value)}
                    placeholder="Biarkan kosong untuk menyamakan dengan logo toko"
                    className="text-xs"
                  />
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted shadow-2xs">
                    {busyUpload ? <RefreshCw className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5 text-primary" />}
                    Upload
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
                      className="sr-only"
                      disabled={busyUpload}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadLogo(file, true);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Kolom 2: Pengaturan Foto Profil Admin + Live Preview */}
            <div className="space-y-4">
              {/* Foto Profil Admin */}
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserRound className="size-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Foto Profil Akun Admin</h3>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={saveAdminAvatar}
                    disabled={busyAvatar}
                    className="h-7 text-xs gap-1"
                  >
                    {busyAvatar ? <RefreshCw className="size-3 animate-spin" /> : <Save className="size-3" />}
                    Simpan Foto
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  <Avatar className="size-16 border-2 border-primary/20 shadow-sm overflow-hidden shrink-0">
                    {adminAvatarUrl ? (
                      <AvatarImage src={adminAvatarUrl} alt="Foto Profil Admin" className="object-cover" />
                    ) : null}
                    <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                      {(settings.store.name || "AD").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1.5">
                    <label className="block text-xs font-medium">URL Foto Profil</label>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        value={adminAvatarUrl}
                        onChange={(e) => setAdminAvatarUrl(e.target.value)}
                        placeholder="https://... URL foto profil"
                        className="text-xs"
                      />
                      <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted shadow-2xs">
                        {busyAvatar ? <RefreshCw className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5 text-primary" />}
                        Upload Foto
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          className="sr-only"
                          disabled={busyAvatar}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadAdminAvatar(file);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Foto ini akan langsung tampil di pojok kanan atas Admin Header dan profil akun Anda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Kotak Live Preview */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" />
                  Pratinjau Langsung Tampilan Logo &amp; Header
                </span>

                {/* Preview Storefront Navbar */}
                <div className="rounded-lg border bg-background p-3 space-y-1 shadow-2xs">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Header Toko (Storefront Navbar):
                  </span>
                  <div className="flex items-center gap-2.5 h-10 px-2 rounded-md bg-muted/30 border border-border/40">
                    {settings.store.logo_url &&
                    (settings.store.logo_display_mode === "both" || settings.store.logo_display_mode === "logo_only") && (
                      <Image
                        src={settings.store.logo_url}
                        alt="Logo Preview"
                        width={120}
                        height={28}
                        unoptimized
                        className="h-7 max-w-[120px] object-contain"
                      />
                    )}
                    {(!settings.store.logo_url ||
                      settings.store.logo_display_mode === "both" ||
                      settings.store.logo_display_mode === "text_only") && (
                      <span className="text-base font-bold tracking-tight text-primary">
                        {settings.store.name || "Next Solution"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Preview Admin Sidebar */}
                <div className="rounded-lg border bg-background p-3 space-y-1 shadow-2xs">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Header Admin (Sidebar &amp; Header):
                  </span>
                  <div className="flex items-center justify-between h-10 px-3 rounded-md bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-2">
                      {(settings.store.admin_logo_url || settings.store.logo_url) &&
                      (settings.store.logo_display_mode === "both" || settings.store.logo_display_mode === "logo_only") ? (
                        <Image
                          src={settings.store.admin_logo_url || settings.store.logo_url || ""}
                          alt="Admin Logo Preview"
                          width={28}
                          height={28}
                          unoptimized
                          className="size-7 rounded-lg object-contain bg-background"
                        />
                      ) : (
                        <div className="size-7 bg-primary rounded-lg flex items-center justify-center">
                          <span className="text-primary-foreground font-bold text-xs">
                            {(settings.store.name || "N").slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {(settings.store.logo_display_mode === "both" || settings.store.logo_display_mode === "text_only") && (
                        <span className="text-sm font-bold tracking-tight text-primary">Admin</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">moan</span>
                      <Avatar className="size-7 border overflow-hidden">
                        {adminAvatarUrl ? (
                          <AvatarImage src={adminAvatarUrl} alt="moan" className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-[10px]">MO</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bagian Fitur & Sistem Toko (Toggles Pengiriman, Pickup, Pembayaran, Fitur Pelanggan, dsb.) */}
      {(activeSettingsTab === "all" || activeSettingsTab === "features") && (
        <div id="storefront-features-section" className="space-y-6 rounded-[28px] sm:rounded-[34px] border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-7 shadow-sm scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
                <SlidersHorizontal className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Pengaturan Fitur &amp; Sistem Toko
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Kelola dan sesuaikan seluruh fitur website (checkout, metode bayar, akun, komparasi, chat, banner, dsb.) secara instan tanpa perlu coding.
                </p>
              </div>
            </div>
            <Button
              onClick={save}
              disabled={busy}
              size="sm"
              className="gap-1.5 shadow-sm rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4"
            >
              <Save className="size-3.5" />
              {busy ? "Menyimpan..." : "Simpan Fitur"}
            </Button>
          </div>

          {/* GRUP 1: PENGIRIMAN & PENGAMBILAN */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Truck className="size-3.5 text-primary" />
              <span>1. Layanan Pengiriman &amp; Pengambilan Barang</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Kurir */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                      <Truck className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Pengiriman Kurir ke Alamat</h3>
                      <p className="text-xs text-muted-foreground">Opsi kirim paket via kurir (JNE/SiCepat) saat checkout</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.delivery_enabled}
                      onChange={(e) => updateFeatures("delivery_enabled", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/60">
                  {settings.features.delivery_enabled ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5" /> Aktif: Pelanggan dapat memilih opsi pengiriman saat checkout.
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                      <AlertCircle className="size-3.5" /> Nonaktif: Opsi kurir dinonaktifkan. Pelanggan diarahkan ambil di toko.
                    </span>
                  )}
                </div>
                {!settings.features.delivery_enabled && (
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-medium text-foreground">Pemberitahuan saat kurir ditutup:</label>
                    <Input
                      value={settings.features.delivery_notice ?? ""}
                      onChange={(e) => updateFeatures("delivery_notice", e.target.value)}
                      placeholder="Contoh: Pengiriman kurir sedang libur operasional."
                      className="text-xs h-9"
                    />
                  </div>
                )}
              </div>

              {/* Pickup */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Store className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Ambil di Tempat / Toko (Pickup)</h3>
                      <p className="text-xs text-muted-foreground">Pelanggan ambil langsung pesanan di cabang toko</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.pickup_enabled}
                      onChange={(e) => updateFeatures("pickup_enabled", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/60">
                  {settings.features.pickup_enabled ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5" /> Aktif: Pelanggan dapat memilih opsi ambil di cabang toko terdekat.
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                      <AlertCircle className="size-3.5" /> Nonaktif: Opsi ambil di toko ditutup. Pelanggan hanya bisa kirim kurir.
                    </span>
                  )}
                </div>
                {!settings.features.pickup_enabled && (
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-medium text-foreground">Pemberitahuan saat pickup ditutup:</label>
                    <Input
                      value={settings.features.pickup_notice ?? ""}
                      onChange={(e) => updateFeatures("pickup_notice", e.target.value)}
                      placeholder="Contoh: Layanan ambil di toko sementara tutup."
                      className="text-xs h-9"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GRUP 2: METODE PEMBAYARAN CHECKOUT */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Banknote className="size-3.5 text-primary" />
              <span>2. Metode Pembayaran Saat Checkout</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Transfer Bank */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                      <Building2 className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Transfer Bank Manual</h3>
                      <p className="text-xs text-muted-foreground">BCA, Mandiri, BRI, dsb.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.bank_transfer_enabled}
                      onChange={(e) => updateFeatures("bank_transfer_enabled", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.features.bank_transfer_enabled
                    ? "Aktif: Menampilkan opsi transfer ke rekening bank resmi toko."
                    : "Nonaktif: Metode transfer bank disembunyikan."}
                </p>
              </div>

              {/* Bayar Tunai di Kasir */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <CreditCard className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Bayar Tunai di Kasir</h3>
                      <p className="text-xs text-muted-foreground">Cash on Pickup</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.cash_payment_enabled}
                      onChange={(e) => updateFeatures("cash_payment_enabled", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.features.cash_payment_enabled
                    ? "Aktif: Pelanggan yang ambil di toko bisa bayar tunai di tempat."
                    : "Nonaktif: Pelanggan wajib bayar sebelum ambil pesanan."}
                </p>
              </div>

              {/* QRIS */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
                      <QrCode className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Pembayaran QRIS</h3>
                      <p className="text-xs text-muted-foreground">Scan QR digital</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.qris_enabled}
                      onChange={(e) => updateFeatures("qris_enabled", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.features.qris_enabled
                    ? "Aktif: Opsi pembayaran scan QRIS tampil saat checkout."
                    : "Nonaktif: Opsi QRIS disembunyikan."}
                </p>
              </div>
            </div>
          </div>

          {/* GRUP 3: AUTENTIKASI & AKUN */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              <span>3. Autentikasi &amp; Akses Pengguna</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
                      <svg className="size-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Login / Daftar Cepat dengan Google</h3>
                      <p className="text-xs text-muted-foreground">Tombol Google OAuth di halaman login &amp; register</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.google_login_enabled}
                      onChange={(e) => updateFeatures("google_login_enabled", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.features.google_login_enabled
                    ? "Aktif: Pelanggan bisa masuk dengan 1-klik akun Google."
                    : "Nonaktif: Tombol Google disembunyikan; masuk hanya via email & password."}
                </p>
              </div>
            </div>
          </div>

          {/* GRUP 4: FITUR BELANJA & HALAMAN PRODUK */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Star className="size-3.5 text-primary" />
              <span>4. Fitur Interaksi Belanja &amp; Halaman Produk</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Reviews */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                      <Star className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Ulasan &amp; Rating Produk</h3>
                      <p className="text-xs text-muted-foreground">Form ulasan bintang pembeli</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.reviews_enabled}
                      onChange={(e) => updateFeatures("reviews_enabled", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.features.reviews_enabled
                    ? "Aktif: Pembeli dapat memberi rating bintang dan komentar ulasan."
                    : "Nonaktif: Tab ulasan disembunyikan dari halaman produk."}
                </p>
              </div>

              {/* Compare */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                      <Scale className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Fitur Bandingkan Produk</h3>
                      <p className="text-xs text-muted-foreground">Bar komparasi spesifikasi laptop</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.compare_enabled}
                      onChange={(e) => updateFeatures("compare_enabled", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.features.compare_enabled
                    ? "Aktif: Pengunjung dapat membandingkan hingga 4 laptop secara head-to-head."
                    : "Nonaktif: Tombol dan bar perbandingan disembunyikan."}
                </p>
              </div>

              {/* Wishlist */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                      <Heart className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Fitur Wishlist / Favorit</h3>
                      <p className="text-xs text-muted-foreground">Simpan produk impian pelanggan</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.wishlist_enabled}
                      onChange={(e) => updateFeatures("wishlist_enabled", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.features.wishlist_enabled
                    ? "Aktif: Ikon love dan halaman daftar favorit aktif."
                    : "Nonaktif: Fitur wishlist dinonaktifkan."}
                </p>
              </div>

              {/* Badge Stok */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
                      <Tag className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Badge Sisa Stok di Katalog</h3>
                      <p className="text-xs text-muted-foreground">Label stok menipis / tersedia</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.stock_badge_enabled}
                      onChange={(e) => updateFeatures("stock_badge_enabled", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.features.stock_badge_enabled
                    ? "Aktif: Menampilkan label sisa unit fisik pada kartu produk."
                    : "Nonaktif: Label jumlah sisa stok disembunyikan."}
                </p>
              </div>

              {/* Badge Jaminan */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3 md:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Badge Jaminan Garansi Resmi &amp; Original</h3>
                      <p className="text-xs text-muted-foreground">Kotak info keamanan belanja di halaman detail produk</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.product_guarantee_badges}
                      onChange={(e) => updateFeatures("product_guarantee_badges", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.features.product_guarantee_badges
                    ? "Aktif: Menampilkan jaminan Garansi Resmi Distributor, 100% Produk Original, dan Gratis Konsultasi di setiap halaman produk."
                    : "Nonaktif: Kotak jaminan garansi disembunyikan."}
                </p>
              </div>
            </div>
          </div>

          {/* GRUP 5: CS & ASISTEN CHAT */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <MessageCircle className="size-3.5 text-primary" />
              <span>5. Layanan Customer Service &amp; Chatbot AI</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {/* WhatsApp Melayang */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <MessageCircle className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Tombol WhatsApp CS Melayang</h3>
                      <p className="text-xs text-muted-foreground">Widget chat langsung di pojok kanan bawah</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.whatsapp_chat_button}
                      onChange={(e) => updateFeatures("whatsapp_chat_button", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.features.whatsapp_chat_button
                    ? "Aktif: Pengunjung dapat chat langsung dengan nomor WhatsApp CS toko dari seluruh halaman."
                    : "Nonaktif: Tombol WhatsApp CS disembunyikan."}
                </p>
              </div>

              {/* Asisten AI Rekomendasi */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                      <Bot className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Asisten AI Rekomendasi Laptop</h3>
                      <p className="text-xs text-muted-foreground">Chatbot rekomendasi spesifikasi laptop</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.ai_recommendation_chat}
                      onChange={(e) => updateFeatures("ai_recommendation_chat", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.features.ai_recommendation_chat
                    ? "Aktif: Pengunjung dapat berkonsultasi dengan asisten AI pintar untuk memilih laptop sesuai kebutuhan."
                    : "Nonaktif: Fitur asisten AI disembunyikan."}
                </p>
              </div>
            </div>
          </div>

          {/* GRUP 6: PROMOSI & OPERASIONAL TOKO */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              <span>6. Pengumuman Promosi &amp; Operasional Toko</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Top Banner */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Bar Pengumuman Atas (Top Banner)</h3>
                      <p className="text-xs text-muted-foreground">Pita teks pengumuman promo di bagian paling atas website</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.announcement_bar_enabled}
                      onChange={(e) => updateFeatures("announcement_bar_enabled", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {settings.features.announcement_bar_enabled && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Teks Pengumuman Promo:</label>
                    <Input
                      value={settings.features.announcement_bar_text ?? ""}
                      onChange={(e) => updateFeatures("announcement_bar_text", e.target.value)}
                      placeholder="Contoh: 🔥 Diskon 20% Laptop Lenovo & Free Mouse Wireless!"
                      className="text-xs h-9"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {settings.features.announcement_bar_enabled
                    ? "Aktif: Pita promo tampil di atas navbar utama."
                    : "Nonaktif: Pita promo disembunyikan."}
                </p>
              </div>

              {/* Mode Libur */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                      <Clock className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">Mode Toko Libur / Pemeliharaan</h3>
                      <p className="text-xs text-muted-foreground">Banner pengumuman jika toko sedang libur operasional</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.features.store_maintenance_mode}
                      onChange={(e) => updateFeatures("store_maintenance_mode", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {settings.features.store_maintenance_mode && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Pesan Pengumuman Toko Libur:</label>
                    <Input
                      value={settings.features.store_maintenance_message ?? ""}
                      onChange={(e) => updateFeatures("store_maintenance_message", e.target.value)}
                      placeholder="Contoh: Toko sedang libur hari raya. Pesanan akan dikirim tanggal berikutnya."
                      className="text-xs h-9"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {settings.features.store_maintenance_mode
                    ? "Aktif: Banner toko libur tampil di atas navbar."
                    : "Nonaktif: Banner toko libur dinonaktifkan."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bagian Halaman Depan */}
      {(activeSettingsTab === "all" || activeSettingsTab === "sections") && (
        <div id="storefront-sections-settings" className="space-y-6 rounded-[28px] sm:rounded-[34px] border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-7 shadow-sm scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
                <Compass className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Tampilan &amp; Section Halaman Depan
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Atur status tampilan, judul, deskripsi singkat, dan produk pilihan untuk setiap section beranda toko.
                </p>
              </div>
            </div>
            <Button
              onClick={save}
              disabled={busy}
              size="sm"
              className="gap-1.5 shadow-sm rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4"
            >
              <Save className="size-3.5" />
              {busy ? "Menyimpan..." : "Simpan Section"}
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {Object.entries(settings.sections)
              .filter(([key]) => key !== "testimonials")
              .map(([key, section]) => (
                <article
                  key={key}
                  className="min-w-0 flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-5 shadow-xs space-y-4 transition-all hover:border-slate-300 dark:hover:border-white/20"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/5 pb-3">
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#2563EB]/10 text-[#2563EB] dark:text-blue-400 border border-[#2563EB]/20">
                      {names[key] ?? key}
                    </span>
                    <label className="relative inline-flex items-center gap-2.5 cursor-pointer select-none">
                      <span
                        className={cn(
                          "text-xs font-semibold transition-colors",
                          section.visible
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        {section.visible ? "Aktif / Tayang" : "Nonaktif"}
                      </span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={section.visible}
                          onChange={(event) => updateSection(key, "visible", event.target.checked)}
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB] shadow-xs" />
                      </div>
                    </label>
                  </div>

                  <div className="space-y-3">
                    {section.tag !== undefined && (
                      <label className="block space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Tag / Subjudul Kecil (Atas)</span>
                        <Input
                          value={section.tag}
                          onChange={(event) => updateSection(key, "tag", event.target.value)}
                          placeholder="Contoh: CABANG RESMI / OFFICIAL CHANNEL"
                          className="rounded-xl border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#18191E] text-xs h-9.5 px-3 focus-visible:ring-[#2563EB]/30 shadow-2xs"
                        />
                      </label>
                    )}
                    <label className="block space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Judul Section</span>
                      <Input
                        value={section.title}
                        onChange={(event) => updateSection(key, "title", event.target.value)}
                        maxLength={100}
                        className="rounded-xl border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#18191E] text-sm h-10 px-3 font-medium focus-visible:ring-[#2563EB]/30 shadow-2xs"
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Deskripsi Singkat</span>
                      <Input
                        value={section.subtitle}
                        onChange={(event) => updateSection(key, "subtitle", event.target.value)}
                        maxLength={180}
                        className="rounded-xl border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#18191E] text-xs h-9.5 px-3 focus-visible:ring-[#2563EB]/30 shadow-2xs"
                      />
                    </label>
                    {section.notice !== undefined && (
                      <label className="block space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Teks Keamanan Transaksi (Notice)</span>
                        <Input
                          value={section.notice}
                          onChange={(event) => updateSection(key, "notice", event.target.value)}
                          className="rounded-xl border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#18191E] text-xs h-9.5 px-3 focus-visible:ring-[#2563EB]/30 shadow-2xs"
                        />
                      </label>
                    )}
                  </div>

                  {["bestsellers", "newArrivals", "promo", "featuredDiscovery"].includes(key) && (
                    <fieldset className="space-y-3 border-t border-slate-200/70 dark:border-white/5 pt-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <legend className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Pilih Produk Tampilan
                        </legend>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-bold border transition-colors",
                            (section.productIds ?? []).length > 0
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10"
                          )}
                        >
                          {(section.productIds ?? []).length}/8 dipilih
                        </span>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                        <Input
                          aria-label={`Cari produk untuk ${names[key] ?? key}`}
                          value={productSearch[key] ?? ""}
                          onChange={(event) =>
                            setProductSearch((current) => ({ ...current, [key]: event.target.value }))
                          }
                          placeholder="Cari nama produk, brand, kategori..."
                          className="pl-8.5 text-xs rounded-xl h-9 bg-white dark:bg-[#18191E] border-slate-200/80 dark:border-white/10 shadow-2xs"
                        />
                      </div>
                      <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#18191E] p-2 shadow-2xs">
                        {products.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            Memuat daftar produk...
                          </div>
                        ) : (
                          products
                            .filter((product) =>
                              `${product.name} ${product.brand} ${product.category}`
                                .toLocaleLowerCase("id-ID")
                                .includes((productSearch[key] ?? "").trim().toLocaleLowerCase("id-ID"))
                            )
                            .map((product) => {
                              const selected = section.productIds ?? [];
                              const checked = selected.includes(product.id);
                              return (
                                <label
                                  key={product.id}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-2.5 rounded-lg p-2 text-xs transition-colors border select-none",
                                    checked
                                      ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-950 dark:text-blue-100 font-medium"
                                      : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200",
                                    !checked && selected.length >= 8 && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  <input
                                    className="size-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/30 shrink-0 cursor-pointer"
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
                                  {product.image ? (
                                    <div className="relative size-8 shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
                                      <Image
                                        src={product.image}
                                        alt={product.name}
                                        fill
                                        sizes="32px"
                                        className="object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="size-8 shrink-0 rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                      <Package className="size-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="block truncate font-semibold text-xs leading-snug">
                                      {product.name}
                                    </span>
                                    <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      {[product.brand, product.category].filter(Boolean).join(" · ") ||
                                        "Umum"}
                                    </span>
                                  </div>
                                  {checked && (
                                    <span className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                                      Dipilih
                                    </span>
                                  )}
                                </label>
                              );
                            })
                        )}
                      </div>
                    </fieldset>
                  )}
                </article>
              ))}
          </div>
        </div>
      )}

  {/* SECTION: Official Marketplace & Toko Online */}
  {(activeSettingsTab === "all" || activeSettingsTab === "marketplaces") && (
    <div id="storefront-marketplaces-section" className="space-y-6 rounded-[28px] sm:rounded-[34px] border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-7 shadow-sm scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
              <Share2 className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Official Marketplace &amp; Akun Toko Resmi
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Kelola marketplace resmi (Tokopedia, Shopee, TikTok Shop, dll). Setiap marketplace bisa memiliki beberapa cabang/akun toko.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMarketplace}
              className="gap-1.5 rounded-full text-xs font-semibold border-slate-200/80 dark:border-white/10"
            >
              <Plus className="size-3.5" />
              Tambah Platform Marketplace
            </Button>
            <Button
              onClick={save}
              disabled={busy}
              size="sm"
              className="gap-1.5 shadow-sm rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4"
            >
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
              className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-4 sm:p-5 shadow-xs space-y-4"
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
                      Belum ada toko yang ditambahkan di {marketplace.name}. Klik tombol &quot;+ Tambah Toko&quot; di atas.
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}

          {!settings.official_marketplaces?.length && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada marketplace resmi yang dikonfigurasi. Klik &quot;+ Tambah Platform Marketplace&quot; di atas.
            </p>
          )}
        </div>
      </div>
      )}

      {/* SECTION: Cabang Toko & Peta Interaktif */}
      {(activeSettingsTab === "all" || activeSettingsTab === "branches") && (
      <div id="storefront-branches-section" className="space-y-6 rounded-[28px] sm:rounded-[34px] border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-7 shadow-sm scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
              <MapPin className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Cabang Toko &amp; Peta Interaktif
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Kelola titik cabang fisik untuk fitur pencarian cabang terdekat dan peta interaktif.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBranch}
              className="gap-1.5 rounded-full text-xs font-semibold border-slate-200/80 dark:border-white/10"
            >
              <Plus className="size-3.5" />
              Tambah Cabang
            </Button>
            <Button
              onClick={save}
              disabled={busy}
              size="sm"
              className="gap-1.5 shadow-sm rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4"
            >
              <Save className="size-3.5" />
              {busy ? "Menyimpan..." : "Simpan Cabang"}
            </Button>
          </div>
        </div>

        {/* List of Branches */}
        <div className="space-y-4">
          {settings.store.branches.map((branch, index) => (
            <article key={branch.id} className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-4 sm:p-5 shadow-xs space-y-4">
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
                  <div className="flex items-center justify-between">
                    <label className="block">Kota / Wilayah</label>
                    <button
                      type="button"
                      onClick={() => {
                        const extracted = extractCoordinatesFromLocation(branch.maps_url, branch.address, branch.city);
                        updateBranch(branch.id, "latitude", extracted.lat);
                        updateBranch(branch.id, "longitude", extracted.lng);
                        if (extracted.detectedCity) updateBranch(branch.id, "city", extracted.detectedCity);
                      }}
                      className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      <Sparkles className="size-2.5 text-amber-500" /> Deteksi
                    </button>
                  </div>
                  <Input
                    value={branch.city}
                    onChange={(event) => {
                      const cityVal = event.target.value;
                      updateBranch(branch.id, "city", cityVal);
                      const matched = Object.keys(CITY_COORDINATES).find(
                        (c) => c.toLowerCase() === cityVal.trim().toLowerCase()
                      );
                      if (matched) {
                        updateBranch(branch.id, "latitude", CITY_COORDINATES[matched].lat);
                        updateBranch(branch.id, "longitude", CITY_COORDINATES[matched].lng);
                      }
                    }}
                    placeholder="Contoh: Bandung / Semarang"
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
                    onChange={(event) => {
                      const addrVal = event.target.value;
                      updateBranch(branch.id, "address", addrVal);
                      const extracted = extractCoordinatesFromLocation(branch.maps_url, addrVal, branch.city);
                      if (extracted.detectedCity && (!branch.city || branch.city === "Pusat")) {
                        updateBranch(branch.id, "city", extracted.detectedCity);
                        updateBranch(branch.id, "latitude", extracted.lat);
                        updateBranch(branch.id, "longitude", extracted.lng);
                      }
                    }}
                    placeholder="Contoh: Jl. Kartini No. 9, Bandung"
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
                      placeholder="022-4264150"
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
                    placeholder="-6.9185411"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  Longitude (Titik Peta)
                  <Input
                    type="number"
                    step="any"
                    value={branch.longitude}
                    onChange={(event) => updateBranch(branch.id, "longitude", parseFloat(event.target.value) || 0)}
                    placeholder="107.6165665"
                  />
                </label>

                <label className="space-y-1 text-xs sm:col-span-2 lg:col-span-3">
                  Link Google Maps (Untuk Petunjuk Arah)
                  <Input
                    type="url"
                    value={branch.maps_url}
                    onChange={(event) => {
                      const urlVal = event.target.value;
                      updateBranch(branch.id, "maps_url", urlVal);
                      const extracted = extractCoordinatesFromLocation(urlVal, branch.address, branch.city);
                      if (extracted.lat && extracted.lng) {
                        updateBranch(branch.id, "latitude", extracted.lat);
                        updateBranch(branch.id, "longitude", extracted.lng);
                        if (extracted.detectedCity && (!branch.city || branch.city === "Pusat")) {
                          updateBranch(branch.id, "city", extracted.detectedCity);
                        }
                      }
                    }}
                    placeholder="https://maps.google.com/?q=... atau link share Google Maps"
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
                lat={branch.latitude}
                lng={branch.longitude}
                city={branch.city}
                label={`Pratinjau Peta Cabang ${index + 1}: ${branch.name || "Cabang"}`}
              />
            </article>
          ))}
          {!settings.store.branches.length && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada cabang toko yang ditambahkan. Klik &quot;Tambah Cabang&quot; di atas.
            </p>
          )}
        </div>
      </div>
      )}

      {/* SECTION: Ulasan & Review Produk Pelanggan (Slider Beranda) */}
      {(activeSettingsTab === "all" || activeSettingsTab === "reviews") && (
      <div id="storefront-reviews-section" className="space-y-6 rounded-[28px] sm:rounded-[34px] border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-7 shadow-sm scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
              <MessageSquareQuote className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Ulasan &amp; Review Produk di Beranda
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Ulasan produk yang dipilih di sini akan tampil di slider beranda secara otomatis, menampilkan rating bintang, ulasan pelanggan, dan kartu produk.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetDefaultReviews}
              className="text-xs rounded-full border-slate-200/80 dark:border-white/10"
            >
              Kembalikan Default (4)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFeaturedReview}
              className="gap-1.5 text-xs rounded-full border-slate-200/80 dark:border-white/10"
            >
              <Plus className="size-3.5" />
              Tambah Ulasan
            </Button>
            <Button
              onClick={save}
              disabled={busy}
              size="sm"
              className="gap-1.5 shadow-sm rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4"
            >
              <Save className="size-3.5" />
              {busy ? "Menyimpan..." : "Simpan Ulasan"}
            </Button>
          </div>
        </div>

        {/* List of currently active featured reviews */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daftar Ulasan yang Tampil di Slider Beranda ({(settings.featured_reviews || []).length} Ulasan)
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {(settings.featured_reviews || []).map((review, index) => (
              <article
                key={review.id || index}
                className="rounded-2xl border border-border bg-background p-4 sm:p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2 border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-sm text-foreground">
                      {review.user_name || "Nama Pembeli"}
                    </span>
                    <div className="flex items-center gap-0.5 ml-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${
                            i < (review.rating || 5)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFeaturedReview(index)}
                    className="h-7 px-2 text-destructive hover:bg-destructive/10 text-xs gap-1"
                  >
                    <Trash2 className="size-3.5" />
                    Hapus
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs">
                    Nama Pembeli
                    <Input
                      value={review.user_name}
                      onChange={(e) => updateFeaturedReview(index, "user_name", e.target.value)}
                      placeholder="Contoh: Dimas Prasetyo"
                    />
                  </label>

                  <label className="space-y-1 text-xs">
                    Rating Bintang (1 - 5)
                    <select
                      value={review.rating || 5}
                      onChange={(e) => updateFeaturedReview(index, "rating", Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-semibold"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (5 Bintang - Sempurna)</option>
                      <option value={4}>⭐⭐⭐⭐ (4 Bintang - Sangat Baik)</option>
                      <option value={3}>⭐⭐⭐ (3 Bintang - Cukup)</option>
                      <option value={2}>⭐⭐ (2 Bintang)</option>
                      <option value={1}>⭐ (1 Bintang)</option>
                    </select>
                  </label>

                  <div className="space-y-1 text-xs sm:col-span-2">
                    <label className="block">Produk yang Dibeli</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={review.product_id || ""}
                        onChange={(e) => {
                          const pid = e.target.value;
                          updateFeaturedReview(index, "product_id", pid);
                          const p = products.find((prod) => prod.id === pid);
                          if (p) {
                            updateFeaturedReview(index, "product_name", p.name);
                          }
                        }}
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs"
                      >
                        <option value="">-- Pilih Produk dari Katalog Toko --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.brand ? `(${p.brand})` : ""}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={review.product_name}
                        onChange={(e) => updateFeaturedReview(index, "product_name", e.target.value)}
                        placeholder="Nama Produk Tampilan"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <label className="space-y-1 text-xs">
                    URL Gambar Produk (Opsional)
                    <Input
                      value={review.product_image || ""}
                      onChange={(e) => updateFeaturedReview(index, "product_image", e.target.value)}
                      placeholder="https://.../gambar.webp (Kosongkan jika pakai default)"
                      className="h-9 text-xs"
                    />
                  </label>

                  <label className="space-y-1 text-xs">
                    Waktu / Keterangan Pembelian
                    <Input
                      value={review.date_text || ""}
                      onChange={(e) => updateFeaturedReview(index, "date_text", e.target.value)}
                      placeholder="Contoh: 2 hari yang lalu"
                      className="h-9 text-xs"
                    />
                  </label>

                  <label className="space-y-1 text-xs sm:col-span-2">
                    Isi Ulasan / Testimoni Pembeli
                    <textarea
                      value={review.comment}
                      onChange={(e) => updateFeaturedReview(index, "comment", e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-input bg-background p-2.5 text-xs"
                      placeholder="Tulis ulasan pembeli..."
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>

          {!(settings.featured_reviews || []).length && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada ulasan produk yang dipilih untuk slider beranda. Klik &quot;+ Tambah Ulasan Manual&quot; atau &quot;Kembalikan Default&quot;.
            </p>
          )}
        </div>

        {/* Database Organic Reviews Picker (If real reviews exist) */}
        {adminReviews.length > 0 && (
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Star className="size-4 text-amber-500 fill-amber-500" />
                  Review Asli Dari Pembeli di Toko ({adminReviews.length} Ulasan Masuk)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Klik &quot;+ Jadikan Ulasan Unggulan Beranda&quot; untuk menampilkan ulasan organik ini di slider beranda.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {adminReviews.map((ar) => {
                const isAlreadyFeatured = (settings.featured_reviews || []).some((r) => r.id === ar.id);
                return (
                  <div
                    key={ar.id}
                    className="flex flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-2xs text-xs space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-foreground truncate">{ar.user_name}</span>
                        <div className="flex items-center gap-0.5">
                          {[...Array(ar.rating)].map((_, i) => (
                            <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 italic">&ldquo;{ar.comment}&rdquo;</p>
                      <p className="font-semibold text-primary text-[11px] mt-1 truncate">📦 {ar.product_name}</p>
                    </div>
                    <Button
                      type="button"
                      variant={isAlreadyFeatured ? "secondary" : "outline"}
                      size="sm"
                      disabled={isAlreadyFeatured}
                      onClick={() => addOrganicReviewToFeatured(ar)}
                      className="w-full h-7 text-[11px] gap-1 mt-2"
                    >
                      {isAlreadyFeatured ? (
                        <>
                          <CheckCircle2 className="size-3 text-green-600" />
                          Sudah di Slider
                        </>
                      ) : (
                        <>
                          <Plus className="size-3" />
                          + Jadikan Ulasan Unggulan
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Informasi Toko Utama & Footer */}
      {(activeSettingsTab === "all" || activeSettingsTab === "store") && (
      <div id="storefront-store-section" className="space-y-8 rounded-[28px] sm:rounded-[34px] border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-7 shadow-sm scroll-mt-24">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
              <Store className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Informasi Toko Utama, Kontak &amp; Rekening
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Alamat utama, kontak CS, link Google Maps, opsi pickup toko, dan rekening transfer pembayaran.
              </p>
            </div>
          </div>
          <Button
            onClick={save}
            disabled={busy}
            size="sm"
            className="gap-1.5 shadow-sm rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4"
          >
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
            onChange={(event) => {
              const addr = event.target.value;
              updateStore("address", addr);
              const extracted = extractCoordinatesFromLocation(settings.store.maps_url, addr, settings.store.city);
              if (extracted.detectedCity) updateStore("city", extracted.detectedCity);
              updateStore("latitude", extracted.lat);
              updateStore("longitude", extracted.lng);
            }}
            maxLength={400}
            placeholder="Alamat lengkap toko fisik utama, contoh: Jl. Kartini No. 9, Bandung"
            className="min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <MapPin className="size-3.5 text-primary" />
            Link Google Maps toko utama (Link Share atau Maps)
          </span>
          <Input
            type="url"
            value={settings.store.maps_url}
            onChange={(event) => {
              const url = event.target.value;
              updateStore("maps_url", url);
              const extracted = extractCoordinatesFromLocation(url, settings.store.address, settings.store.city);
              if (extracted.lat && extracted.lng) {
                updateStore("latitude", extracted.lat);
                updateStore("longitude", extracted.lng);
                if (extracted.detectedCity) updateStore("city", extracted.detectedCity);
              }
            }}
            placeholder="https://maps.google.com/... atau https://share.google/..."
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm sm:col-span-1">
            Kota / Wilayah toko utama
            <Input
              value={settings.store.city ?? "Bandung"}
              onChange={(e) => {
                const c = e.target.value;
                updateStore("city", c);
                const matched = Object.keys(CITY_COORDINATES).find(
                  (k) => k.toLowerCase() === c.trim().toLowerCase()
                );
                if (matched) {
                  updateStore("latitude", CITY_COORDINATES[matched].lat);
                  updateStore("longitude", CITY_COORDINATES[matched].lng);
                }
              }}
              placeholder="Contoh: Bandung"
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-1">
            Latitude toko utama (Titik Peta)
            <Input
              type="number"
              step="any"
              value={settings.store.latitude ?? -6.9185411}
              onChange={(e) => updateStore("latitude", parseFloat(e.target.value) || 0)}
              placeholder="-6.9185411"
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-1">
            Longitude toko utama (Titik Peta)
            <Input
              type="number"
              step="any"
              value={settings.store.longitude ?? 107.6165665}
              onChange={(e) => updateStore("longitude", parseFloat(e.target.value) || 0)}
              placeholder="107.6165665"
            />
          </label>
        </div>

        {/* Quick Helper Button and City Presets */}
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Pilihan Cepat Koordinat Toko Utama:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => {
                const extracted = extractCoordinatesFromLocation(
                  settings.store.maps_url,
                  settings.store.address,
                  settings.store.city
                );
                updateStore("latitude", extracted.lat);
                updateStore("longitude", extracted.lng);
                if (extracted.detectedCity) updateStore("city", extracted.detectedCity);
              }}
            >
              <Sparkles className="size-3 text-amber-500" />
              Deteksi Otomatis dari Alamat / Maps
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {["Bandung", "Jakarta", "Semarang", "Surabaya", "Yogyakarta", "Solo", "Bogor", "Tangerang", "Bekasi"].map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => {
                  updateStore("city", city);
                  updateStore("latitude", CITY_COORDINATES[city].lat);
                  updateStore("longitude", CITY_COORDINATES[city].lng);
                }}
                className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                  (settings.store.city || "Bandung").toLowerCase() === city.toLowerCase()
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        <GoogleMapsPreviewBox
          address={settings.store.address}
          mapsUrl={settings.store.maps_url}
          lat={settings.store.latitude}
          lng={settings.store.longitude}
          city={settings.store.city}
          label="Pratinjau Peta Toko Utama (Footer & Peta Beranda)"
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
      </div>
      )}

      {/* Pengaturan Faktur Penjualan & Layanan Komplain */}
      {(activeSettingsTab === "all" || activeSettingsTab === "invoice") && (
        <div id="storefront-invoice-section" className="space-y-6 rounded-[28px] sm:rounded-[34px] border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] p-5 sm:p-7 shadow-sm scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Faktur Penjualan &amp; Komplain Pesanan
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Kelola subtitle faktur, catatan garansi, syarat komplain (unboxing), serta WhatsApp penanganan kendala pembeli.
                </p>
              </div>
            </div>
            <Button onClick={save} disabled={busy} size="sm" className="gap-1.5 shadow-sm">
              <Save className="size-3.5" />
              Simpan Pengaturan Faktur
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Sub-judul / Tagline Faktur (Header Kiri)
              </label>
              <Input
                value={settings.invoice?.header_subtitle ?? ""}
                onChange={(e) => updateInvoice("header_subtitle", e.target.value)}
                placeholder="Pusat Komputer, Laptop & Solusi Elektronik Resmi"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Muncul di bawah nama toko pada header resmi faktur penjualan.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                WhatsApp Admin Penanganan Komplain
              </label>
              <Input
                value={settings.invoice?.complaint_whatsapp ?? ""}
                onChange={(e) => updateInvoice("complaint_whatsapp", e.target.value)}
                placeholder="6281234567890"
                className="rounded-xl font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Nomor WhatsApp tujuan saat pembeli mengajukan komplain setelah pengiriman / pengambilan barang.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Catatan Verifikasi &amp; Garansi (Kotak Note di Atas Total)
              </label>
              <textarea
                rows={3}
                value={settings.invoice?.guarantee_note ?? ""}
                onChange={(e) => updateInvoice("guarantee_note", e.target.value)}
                placeholder="Simpan faktur ini sebagai bukti pembelian yang sah untuk klaim garansi resmi dan administrasi perpajakan."
                className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Pesan jaminan keabsahan faktur yang ditampilkan untuk pesanan berstatus Lunas / Terverifikasi.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Syarat &amp; Ketentuan Faktur (TERMS &amp; CONDITIONS/NOTE Footer)
              </label>
              <textarea
                rows={3}
                value={settings.invoice?.terms_note ?? ""}
                onChange={(e) => updateInvoice("terms_note", e.target.value)}
                placeholder="Simpan faktur fisik atau digital ini sebagai bukti sah transaksi dan garansi resmi. Garansi distributor berlaku dengan kondisi segel utuh. Wajib sertakan video unboxing lengkap saat pengajuan komplain."
                className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Ditampilkan pada kolom ketiga di bagian footer faktur penjualan.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Petunjuk / Prosedur Komplain Pelanggan
              </label>
              <textarea
                rows={2}
                value={settings.invoice?.complaint_instructions ?? ""}
                onChange={(e) => updateInvoice("complaint_instructions", e.target.value)}
                placeholder="Ajukan komplain pesanan atau klaim garansi langsung melalui WhatsApp Admin dengan menyertakan nomor faktur dan video unboxing utuh."
                className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Panduan komplain yang tampil pada box bantuan pesanan pelanggan.
              </p>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
