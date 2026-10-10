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

export type StorefrontSettings = {
  sections: Record<string, StoreSectionSetting>;
  store: {
    description: string;
    address: string;
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
    channels: {
      visible: true,
      tag: "OFFICIAL CHANNEL",
      title: "Official Channel Next Solution",
      subtitle: "Kunjungi channel resmi kami untuk bertransaksi dengan aman dan terpercaya.",
      notice: "Transaksi lebih aman: Belanja dan ikuti update resmi Next Solution hanya melalui channel terverifikasi agar transaksi lebih mudah dan terpercaya.",
    },
    whyUs: { visible: true, title: "Kenapa Belanja di Next Solution?", subtitle: "Produk pilihan dan layanan untuk kebutuhanmu." },
    testimonials: { visible: true, title: "Kata Pelanggan", subtitle: "Pengalaman pelanggan Next Solution." },
    faq: { visible: true, title: "Pertanyaan Umum", subtitle: "Butuh bantuan? Kami siap membantu." },
  },
  store: {
    description: "Temukan perangkat elektronik dan aksesori pilihan untuk kebutuhanmu.",
    address: "",
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
    store_address: "",
    maps_url: "",
  },
  bank_transfer: [],
  admin: { catalogPageSize: 24 },
};

export function normalizeStoreBranch(raw: unknown, index = 0): StoreBranch {
  if (!raw || typeof raw !== "object") {
    return {
      id: `branch-${index + 1}`,
      name: `Cabang ${index + 1}`,
      city: "Pusat",
      address: "",
      latitude: -6.9932,
      longitude: 110.4203,
      maps_url: "",
      is_active: true,
    };
  }
  const item = raw as Partial<StoreBranch>;
  const name = String(item.name ?? "").trim() || `Cabang ${index + 1}`;
  const address = String(item.address ?? "").trim();
  const city = String(item.city ?? "").trim() || (address.includes(",") ? address.split(",").pop()?.trim() || "Pusat" : "Pusat");
  const lat = typeof item.latitude === "number" && !isNaN(item.latitude) ? item.latitude : -6.9932;
  const lng = typeof item.longitude === "number" && !isNaN(item.longitude) ? item.longitude : 110.4203;

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
    maps_url: String(item.maps_url ?? "").trim(),
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

  return {
    sections,
    store: {
      ...DEFAULT_STOREFRONT_SETTINGS.store,
      ...(input.store ?? {}),
      maps_url: String(input.store?.maps_url ?? "").trim() || DEFAULT_STOREFRONT_SETTINGS.store.maps_url,
      whatsapp: input.store?.whatsapp?.trim() || DEFAULT_STOREFRONT_SETTINGS.store.whatsapp,
      branches,
    },
    official_marketplaces,
    official_channels,
    pickup_info,
    bank_transfer,
    admin: { catalogPageSize },
  };
}
