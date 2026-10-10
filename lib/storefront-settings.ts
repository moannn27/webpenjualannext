import { type VoucherTargeting } from '@/types/voucher';

export type StoreSectionSetting = {
  visible: boolean;
  title: string;
  subtitle: string;
  productIds?: string[];
  tag?: string;
  notice?: string;
};

export type BankTransferInfo = {
  bank_name: string;
  account_number: string;
  account_holder: string;
};

export type StoreBranch = {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  whatsapp?: string;
  operating_hours?: string;
  maps_url: string;
  is_active?: boolean;
};

export type OfficialChannelPlatform =
  | "tokopedia"
  | "shopee"
  | "tiktok"
  | "instagram"
  | "whatsapp"
  | "lazada"
  | "blibli"
  | "youtube"
  | "facebook"
  | "other";

export type MarketplaceStore = {
  id: string;
  name: string;
  url: string;
  badge_text?: string;
  is_active?: boolean;
};

export type OfficialMarketplace = {
  id: string;
  platform: OfficialChannelPlatform;
  name: string;
  custom_icon_url?: string;
  is_active?: boolean;
  stores: MarketplaceStore[];
};

// Backward-compatible type for single channel
export type OfficialChannel = {
  id: string;
  platform: OfficialChannelPlatform;
  name: string;
  url: string;
  badge_text?: string;
  custom_icon_url?: string;
  is_active?: boolean;
};

export type FeaturedReviewItem = {
  id: string;
  user_name: string;
  user_avatar?: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  rating: number;
  comment: string;
  date_text?: string;
  is_verified?: boolean;
};

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Bandung: { lat: -6.9185411, lng: 107.6165665 }, // Jl. Kartini No. 9, Bandung (Next Solution / Platinum Store)
  Semarang: { lat: -6.9932, lng: 110.4203 },
  Jakarta: { lat: -6.2088, lng: 106.8456 },
  Surabaya: { lat: -7.2575, lng: 112.7521 },
  Yogyakarta: { lat: -7.7712, lng: 110.3892 },
  Solo: { lat: -7.5684, lng: 110.8284 },
  Surakarta: { lat: -7.5684, lng: 110.8284 },
  Purwokerto: { lat: -7.4243, lng: 109.2302 },
  Cirebon: { lat: -6.7214, lng: 108.5562 },
  Pekalongan: { lat: -6.8886, lng: 109.6753 },
  Kudus: { lat: -6.8048, lng: 110.8405 },
  Magelang: { lat: -7.4797, lng: 110.2177 },
  Madiun: { lat: -7.6298, lng: 111.5239 },
  Malang: { lat: -7.9497, lng: 112.6174 },
  Kediri: { lat: -7.818, lng: 112.0128 },
  Jember: { lat: -8.1845, lng: 113.6681 },
  Denpasar: { lat: -8.6705, lng: 115.2126 },
  Bekasi: { lat: -6.2383, lng: 106.9756 },
  Tangerang: { lat: -6.1783, lng: 106.6319 },
  Depok: { lat: -6.4025, lng: 106.7942 },
  Bogor: { lat: -6.5971, lng: 106.8060 },
};

export function extractCoordinatesFromLocation(
  mapsUrl?: string,
  address?: string,
  city?: string
): { lat: number; lng: number; detectedCity?: string } {
  if (mapsUrl) {
    const url = mapsUrl.trim();
    const atMatch = url.match(/@(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }

    const queryMatch = url.match(/[?&](?:q|query|ll|center)=(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/i);
    if (queryMatch) {
      const lat = parseFloat(queryMatch[1]);
      const lng = parseFloat(queryMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }

    const dataMatch = url.match(/!3d(-?\d+\.\d{3,})!4d(-?\d+\.\d{3,})/i);
    if (dataMatch) {
      const lat = parseFloat(dataMatch[1]);
      const lng = parseFloat(dataMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  }

  const combinedText = `${city || ""} ${address || ""} ${mapsUrl || ""}`.toLowerCase();

  if (combinedText.includes("kartini")) {
    return { lat: -6.9185411, lng: 107.6165665, detectedCity: "Bandung" };
  }

  for (const [cityName, coords] of Object.entries(CITY_COORDINATES)) {
    if (combinedText.includes(cityName.toLowerCase())) {
      return { lat: coords.lat, lng: coords.lng, detectedCity: cityName };
    }
  }

  return { lat: -6.9185411, lng: 107.6165665, detectedCity: "Bandung" };
}

export type StorefrontSettings = {
  sections: Record<string, StoreSectionSetting>;
  store: {
    description: string;
    address: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    maps_url: string;
    email: string;
    phone: string;
    whatsapp: string;
    copyright: string;
    branches: StoreBranch[];
  };
  official_marketplaces: OfficialMarketplace[];
  official_channels: OfficialChannel[]; // Flat projection for easy backward compatibility
  pickup_info: { store_name: string; store_address: string; maps_url: string };
  bank_transfer: BankTransferInfo[];
  admin: { catalogPageSize: number };
  featured_reviews: FeaturedReviewItem[];
  selected_review_ids?: string[];
  admin_permissions?: Record<string, string[]>;
  admin_audit_logs?: AdminAuditLog[];
  voucher_targeting?: Record<string, VoucherTargeting>;
};

export type AdminAuditLog = {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_role: string;
  action: "create" | "update" | "delete" | "status_change";
  entity_type: "product" | "category" | "brand" | "order" | "voucher" | "content" | "account" | "settings";
  entity_name: string;
  details: string;
  created_at: string;
};

export const DEFAULT_OFFICIAL_MARKETPLACES: OfficialMarketplace[] = [
  {
    id: "marketplace-tokopedia",
    platform: "tokopedia",
    name: "Tokopedia",
    custom_icon_url: "",
    is_active: true,
    stores: [
      {
        id: "store-tokopedia-1",
        name: "Next Solution Official",
        url: "https://www.tokopedia.com",
        badge_text: "Official Store",
        is_active: true,
      },
    ],
  },
  {
    id: "marketplace-shopee",
    platform: "shopee",
    name: "Shopee",
    custom_icon_url: "",
    is_active: true,
    stores: [
      {
        id: "store-shopee-1",
        name: "Next Solution Shopee Mall",
        url: "https://shopee.co.id",
        badge_text: "Shopee Mall",
        is_active: true,
      },
    ],
  },
  {
    id: "marketplace-tiktok",
    platform: "tiktok",
    name: "TikTok Shop",
    custom_icon_url: "",
    is_active: true,
    stores: [
      {
        id: "store-tiktok-1",
        name: "Next Solution Official Shop",
        url: "https://www.tiktok.com",
        badge_text: "Official Shop",
        is_active: true,
      },
    ],
  },
  {
    id: "marketplace-instagram",
    platform: "instagram",
    name: "Instagram",
    custom_icon_url: "",
    is_active: true,
    stores: [
      {
        id: "store-instagram-1",
        name: "Instagram @nextsolution",
        url: "https://www.instagram.com",
        badge_text: "@nextsolution",
        is_active: true,
      },
    ],
  },
];

export const DEFAULT_FEATURED_REVIEWS: FeaturedReviewItem[] = [
  {
    id: "review-feat-1",
    user_name: "Dimas Prasetyo",
    product_id: "539c23b8-faff-432c-9482-2d3fd963ab5b",
    product_name: "Ideapad slim 3",
    product_image: "https://xyhooykvidzstnmaggku.supabase.co/storage/v1/object/public/products/366daf41-bd62-4bab-b2cd-0d5682601da0.webp",
    rating: 5,
    comment: "Barang mendarat dengan sangat aman, packing kayu tebal dan bubble wrap berlapis. Laptopnya mulus banget, performa buat kerja harian kencang tanpa kendala sama sekali!",
    date_text: "2 hari yang lalu",
    is_verified: true,
  },
  {
    id: "review-feat-2",
    user_name: "Sarah Amanda",
    product_id: "f084200e-641f-419d-befd-47ce8d5610e1",
    product_name: "ROG Zephyrus G14",
    product_image: "",
    rating: 5,
    comment: "Pelayanan Next Solution terbaik! Admin fast response saat tanya detail spesifikasi. Barang 100% original bergaransi resmi, layar cakep dan spek gaming mantap banget.",
    date_text: "5 hari yang lalu",
    is_verified: true,
  },
  {
    id: "review-feat-3",
    user_name: "Budi Santoso",
    product_id: "4e9d426d-75ac-4752-bd41-bc34c05385d4",
    product_name: 'MacBook Pro 16" M3 Max',
    product_image: "",
    rating: 5,
    comment: "Kualitas produk luar biasa, pengiriman cepat sampai di hari yang sama dengan opsi kurir instant. Garansi resmi terdaftar aman. Sangat puas belanja di sini!",
    date_text: "1 minggu yang lalu",
    is_verified: true,
  },
  {
    id: "review-feat-4",
    user_name: "Reza Pratama",
    product_id: "f679c6fb-79f7-4031-bedd-b96d0da1defb",
    product_name: "Galaxy S24 Ultra",
    product_image: "",
    rating: 5,
    comment: "Bisa ambil langsung di toko cabang, dicek bareng-bareng sama teknisi toko. Toko fisik jelas, garansi aman, belanja gadget di sini tenang tanpa was-was.",
    date_text: "2 minggu yang lalu",
    is_verified: true,
  },
];

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  sections: {
    categories: { visible: true, title: "Belanja berdasarkan kategori", subtitle: "Temukan yang kamu cari." },
    bestsellers: { visible: true, title: "Produk Terlaris", subtitle: "Pilihan favorit pelanggan." },
    promo: { visible: true, title: "Promo Pilihan", subtitle: "Penawaran khusus dari Next Solution." },
    newArrivals: { visible: true, title: "Produk Terbaru", subtitle: "Jelajahi koleksi terbaru." },
    brands: { visible: true, title: "Brand Pilihan", subtitle: "Jelajahi brand favorit." },
    branches: {
      visible: true,
      tag: "CABANG RESMI",
      title: "Temukan Cabang Next Solution Terdekat",
      subtitle: "Ketik kota atau lokasi Anda, lalu sistem akan membantu menampilkan cabang Next Solution yang paling relevan berdasarkan area terdekat.",
    },
    reviews: {
      visible: true,
      tag: "ULASAN PELANGGAN",
      title: "Ulasan Pembeli Next Solution",
      subtitle: "Pengalaman nyata dari pembeli terverifikasi produk pilihan di Next Solution.",
    },
    channels: {
      visible: true,
      tag: "OFFICIAL CHANNEL",
      title: "Official Channel Next Solution",
      subtitle: "Kunjungi channel resmi kami untuk bertransaksi dengan aman dan terpercaya.",
      notice: "Transaksi lebih aman: Belanja dan ikuti update resmi Next Solution hanya melalui channel terverifikasi agar transaksi lebih mudah dan terpercaya.",
    },
    whyUs: { visible: true, title: "Kenapa Belanja di Next Solution?", subtitle: "Produk pilihan dan layanan untuk kebutuhanmu." },
    testimonials: { visible: false, title: "Kata Pelanggan", subtitle: "Pengalaman pelanggan Next Solution." },
    faq: { visible: true, title: "Pertanyaan Umum", subtitle: "Butuh bantuan? Kami siap membantu." },
  },
  store: {
    description: "Temukan perangkat elektronik dan aksesori pilihan untuk kebutuhanmu.",
    address: "Jl. Kartini No. 9",
    city: "Bandung",
    latitude: -6.9185411,
    longitude: 107.6165665,
    maps_url: "",
    email: "",
    phone: "",
    whatsapp: "6281234567890",
    copyright: "Hak cipta dilindungi.",
    branches: [],
  },
  official_marketplaces: DEFAULT_OFFICIAL_MARKETPLACES,
  official_channels: [],
  pickup_info: {
    store_name: "Toko Next Solution",
    store_address: "Jl. Kartini No. 9, Bandung",
    maps_url: "",
  },
  bank_transfer: [],
  admin: { catalogPageSize: 24 },
  featured_reviews: DEFAULT_FEATURED_REVIEWS,
  selected_review_ids: [],
  admin_permissions: {},
  admin_audit_logs: [],
  voucher_targeting: {},
};

export function normalizeStoreBranch(raw: unknown, index = 0): StoreBranch {
  if (!raw || typeof raw !== "object") {
    return {
      id: `branch-${index + 1}`,
      name: `Cabang ${index + 1}`,
      city: "Bandung",
      address: "",
      latitude: -6.9185411,
      longitude: 107.6165665,
      maps_url: "",
      is_active: true,
    };
  }
  const item = raw as Partial<StoreBranch>;
  const name = String(item.name ?? "").trim() || `Cabang ${index + 1}`;
  const address = String(item.address ?? "").trim();
  const maps_url = String(item.maps_url ?? "").trim();
  const rawCity = String(item.city ?? "").trim();

  const extracted = extractCoordinatesFromLocation(maps_url, address, rawCity);
  const city = rawCity && rawCity !== "Pusat" ? rawCity : (extracted.detectedCity || "Bandung");
  const lat = typeof item.latitude === "number" && !isNaN(item.latitude) && item.latitude !== 0
    ? item.latitude
    : extracted.lat;
  const lng = typeof item.longitude === "number" && !isNaN(item.longitude) && item.longitude !== 0
    ? item.longitude
    : extracted.lng;

  return {
    id: String(item.id ?? `branch-${index + 1}`),
    name,
    city,
    address,
    latitude: lat,
    longitude: lng,
    phone: item.phone ? String(item.phone).trim() : undefined,
    whatsapp: item.whatsapp ? String(item.whatsapp).trim() : undefined,
    operating_hours: item.operating_hours ? String(item.operating_hours).trim() : "09:00 - 21:00 WIB",
    maps_url: maps_url,
    is_active: item.is_active !== false,
  };
}

export function normalizeOfficialMarketplace(raw: unknown, index = 0): OfficialMarketplace {
  if (!raw || typeof raw !== "object") {
    return {
      id: `marketplace-${index + 1}`,
      platform: "other",
      name: `Marketplace ${index + 1}`,
      custom_icon_url: "",
      is_active: true,
      stores: [],
    };
  }
  const item = raw as Partial<OfficialMarketplace>;
  const validPlatforms: OfficialChannelPlatform[] = [
    "tokopedia",
    "shopee",
    "tiktok",
    "instagram",
    "whatsapp",
    "lazada",
    "blibli",
    "youtube",
    "facebook",
    "other",
  ];
  const platform = validPlatforms.includes(item.platform as OfficialChannelPlatform)
    ? (item.platform as OfficialChannelPlatform)
    : "other";

  const rawStores = Array.isArray(item.stores) ? item.stores : [];
  const stores: MarketplaceStore[] = rawStores.map((s, sIdx) => {
    const storeObj = s as Partial<MarketplaceStore>;
    return {
      id: String(storeObj.id ?? `store-${index + 1}-${sIdx + 1}`),
      name: String(storeObj.name ?? "").trim() || `Toko ${sIdx + 1}`,
      url: String(storeObj.url ?? "").trim(),
      badge_text: storeObj.badge_text ? String(storeObj.badge_text).trim() : undefined,
      is_active: storeObj.is_active !== false,
    };
  });

  return {
    id: String(item.id ?? `marketplace-${index + 1}`),
    platform,
    name: String(item.name ?? "").trim() || platform.toUpperCase(),
    custom_icon_url: item.custom_icon_url ? String(item.custom_icon_url).trim() : undefined,
    is_active: item.is_active !== false,
    stores,
  };
}

export function normalizeStorefrontSettings(value: unknown): StorefrontSettings {
  if (!value || typeof value !== "object") return DEFAULT_STOREFRONT_SETTINGS;
  const input = value as Partial<StorefrontSettings> & { official_channels?: unknown[] };

  const sections = Object.fromEntries(
    Object.entries(DEFAULT_STOREFRONT_SETTINGS.sections).map(([key, fallback]) => {
      const current = input.sections?.[key];
      return [key, { ...fallback, ...(current ?? {}) }];
    })
  );

  const catalogPageSize = [24, 48, 100, 200].includes(input.admin?.catalogPageSize ?? 24)
    ? input.admin?.catalogPageSize ?? 24
    : 24;

  const rawPickup = input.pickup_info;
  const storeAddress = String(input.store?.address ?? "").trim();
  const storeMapsUrl = String(input.store?.maps_url ?? "").trim();

  const pickup_info = {
    store_name:
      String(rawPickup?.store_name ?? DEFAULT_STOREFRONT_SETTINGS.pickup_info.store_name).trim() ||
      DEFAULT_STOREFRONT_SETTINGS.pickup_info.store_name,
    store_address: String(rawPickup?.store_address ?? "").trim() || storeAddress || DEFAULT_STOREFRONT_SETTINGS.pickup_info.store_address,
    maps_url: String(rawPickup?.maps_url ?? "").trim() || storeMapsUrl || DEFAULT_STOREFRONT_SETTINGS.pickup_info.maps_url,
  };

  const bank_transfer: BankTransferInfo[] = Array.isArray(input.bank_transfer)
    ? input.bank_transfer.filter(
        (b) =>
          b &&
          typeof b.bank_name === "string" &&
          b.bank_name &&
          typeof b.account_number === "string" &&
          b.account_number &&
          typeof b.account_holder === "string" &&
          b.account_holder
      )
    : [];

  const rawBranches = input.store?.branches;
  const branches: StoreBranch[] = Array.isArray(rawBranches)
    ? rawBranches.map((b, i) => normalizeStoreBranch(b, i))
    : [];

  // Parse official marketplaces (hierarchical structure)
  let official_marketplaces: OfficialMarketplace[] = [];

  if (Array.isArray(input.official_marketplaces) && input.official_marketplaces.length > 0) {
    official_marketplaces = input.official_marketplaces.map((m, i) => normalizeOfficialMarketplace(m, i));
  } else if (Array.isArray(input.official_channels) && input.official_channels.length > 0) {
    // AUTO-MIGRATION: Group existing flat channels into hierarchical marketplaces by platform!
    const grouped = new Map<string, OfficialMarketplace>();

    input.official_channels.forEach((ch, idx) => {
      if (!ch || typeof ch !== "object") return;
      const c = ch as Partial<OfficialChannel>;
      const plat = (c.platform || "other") as OfficialChannelPlatform;
      const key = plat.toLowerCase();

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: `marketplace-${key}`,
          platform: plat,
          name: plat === "tokopedia" ? "Tokopedia" : plat === "shopee" ? "Shopee" : plat === "tiktok" ? "TikTok Shop" : plat === "instagram" ? "Instagram" : String(c.name || plat),
          custom_icon_url: c.custom_icon_url || "",
          is_active: true,
          stores: [],
        });
      }

      const mp = grouped.get(key)!;
      mp.stores.push({
        id: String(c.id ?? `store-${key}-${idx + 1}`),
        name: String(c.name ?? "").trim() || mp.name,
        url: String(c.url ?? "").trim(),
        badge_text: c.badge_text ? String(c.badge_text).trim() : undefined,
        is_active: c.is_active !== false,
      });
    });

    official_marketplaces = Array.from(grouped.values());
  } else {
    official_marketplaces = DEFAULT_OFFICIAL_MARKETPLACES;
  }

  // Create flat projection of official channels for backward compatibility
  const official_channels: OfficialChannel[] = official_marketplaces.flatMap((m) =>
    m.stores.map((s) => ({
      id: s.id,
      platform: m.platform,
      name: s.name,
      url: s.url,
      badge_text: s.badge_text,
      custom_icon_url: m.custom_icon_url,
      is_active: m.is_active !== false && m.stores.length > 0 && s.is_active !== false,
    }))
  );

  const rawFeaturedReviews = input.featured_reviews;
  const featured_reviews: FeaturedReviewItem[] =
    Array.isArray(rawFeaturedReviews) && rawFeaturedReviews.length > 0
      ? rawFeaturedReviews.map((r, i) => normalizeFeaturedReview(r, i))
      : DEFAULT_FEATURED_REVIEWS;

  const selected_review_ids: string[] = Array.isArray(input.selected_review_ids)
    ? input.selected_review_ids.filter((id) => typeof id === "string" && id)
    : [];

  const storeCity = String(input.store?.city ?? "").trim();
  const extractedStoreCoords = extractCoordinatesFromLocation(storeMapsUrl, storeAddress, storeCity);

  const storeLat =
    typeof input.store?.latitude === "number" && !isNaN(input.store.latitude) && input.store.latitude !== 0
      ? input.store.latitude
      : extractedStoreCoords.lat;

  const storeLng =
    typeof input.store?.longitude === "number" && !isNaN(input.store.longitude) && input.store.longitude !== 0
      ? input.store.longitude
      : extractedStoreCoords.lng;

  const finalStoreCity = storeCity && storeCity !== "Pusat" ? storeCity : (extractedStoreCoords.detectedCity || "Bandung");

  return {
    sections,
    store: {
      ...DEFAULT_STOREFRONT_SETTINGS.store,
      ...(input.store ?? {}),
      address: storeAddress,
      city: finalStoreCity,
      latitude: storeLat,
      longitude: storeLng,
      maps_url: storeMapsUrl || DEFAULT_STOREFRONT_SETTINGS.store.maps_url,
      whatsapp: input.store?.whatsapp?.trim() || DEFAULT_STOREFRONT_SETTINGS.store.whatsapp,
      branches,
    },
    official_marketplaces,
    official_channels,
    pickup_info,
    bank_transfer,
    admin: { catalogPageSize },
    featured_reviews,
    selected_review_ids,
    admin_permissions:
      input.admin_permissions && typeof input.admin_permissions === "object"
        ? (input.admin_permissions as Record<string, string[]>)
        : {},
    admin_audit_logs: Array.isArray(input.admin_audit_logs)
      ? (input.admin_audit_logs as AdminAuditLog[])
      : [],
    voucher_targeting:
      input.voucher_targeting && typeof input.voucher_targeting === "object"
        ? (input.voucher_targeting as Record<string, VoucherTargeting>)
        : {},
  };
}

export function normalizeFeaturedReview(raw: unknown, index = 0): FeaturedReviewItem {
  if (!raw || typeof raw !== "object") {
    return {
      id: `review-${index + 1}`,
      user_name: "Pelanggan Terverifikasi",
      product_id: "",
      product_name: "Produk Next Solution",
      rating: 5,
      comment: "Pelayanan sangat memuaskan dan produk berkualitas prima.",
      date_text: "Terbaru",
      is_verified: true,
    };
  }
  const item = raw as Partial<FeaturedReviewItem>;
  const rating = Number(item.rating);
  return {
    id: String(item.id ?? `review-${index + 1}`),
    user_name: String(item.user_name ?? "").trim() || "Pelanggan Terverifikasi",
    user_avatar: item.user_avatar ? String(item.user_avatar).trim() : undefined,
    product_id: String(item.product_id ?? "").trim(),
    product_name: String(item.product_name ?? "").trim() || "Produk Next Solution",
    product_image: item.product_image ? String(item.product_image).trim() : undefined,
    rating: isNaN(rating) || rating < 1 || rating > 5 ? 5 : rating,
    comment: String(item.comment ?? "").trim() || "Pelayanan sangat memuaskan dan produk berkualitas prima.",
    date_text: String(item.date_text ?? "Terbaru").trim(),
    is_verified: item.is_verified !== false,
  };
}
