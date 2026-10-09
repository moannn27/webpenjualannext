export type StoreSectionSetting = { visible: boolean; title: string; subtitle: string; productIds?: string[] };
export type BankTransferInfo = { bank_name: string; account_number: string; account_holder: string };
export type StorefrontSettings = {
  sections: Record<string, StoreSectionSetting>;
  store: { description: string; address: string; email: string; phone: string; whatsapp: string; copyright: string; branches: { id: string; name: string; address: string; maps_url: string }[] };
  pickup_info: { store_name: string; store_address: string; maps_url: string };
  bank_transfer: BankTransferInfo[];
  admin: { catalogPageSize: number };
};

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  sections: {
    categories: { visible: true, title: "Belanja berdasarkan kategori", subtitle: "Temukan yang kamu cari." },
    bestsellers: { visible: true, title: "Produk Terlaris", subtitle: "Pilihan favorit pelanggan." },
    promo: { visible: true, title: "Promo Pilihan", subtitle: "Penawaran khusus dari Next Solution." },
    newArrivals: { visible: true, title: "Produk Terbaru", subtitle: "Jelajahi koleksi terbaru." },
    brands: { visible: true, title: "Brand Pilihan", subtitle: "Jelajahi brand favorit." },
    whyUs: { visible: true, title: "Kenapa Belanja di Next Solution?", subtitle: "Produk pilihan dan layanan untuk kebutuhanmu." },
    testimonials: { visible: true, title: "Kata Pelanggan", subtitle: "Pengalaman pelanggan Next Solution." },
    faq: { visible: true, title: "Pertanyaan Umum", subtitle: "Butuh bantuan? Kami siap membantu." },
  },
  store: { description: "Temukan perangkat elektronik dan aksesori pilihan untuk kebutuhanmu.", address: "", email: "", phone: "", whatsapp: "6281234567890", copyright: "Hak cipta dilindungi.", branches: [] },
  pickup_info: { store_name: "Toko Next Solution", store_address: "", maps_url: "" },
  bank_transfer: [],
  admin: { catalogPageSize: 24 },
};

export function normalizeStorefrontSettings(value: unknown): StorefrontSettings {
  if (!value || typeof value !== "object") return DEFAULT_STOREFRONT_SETTINGS;
  const input = value as Partial<StorefrontSettings>;
  const sections = Object.fromEntries(Object.entries(DEFAULT_STOREFRONT_SETTINGS.sections).map(([key, fallback]) => {
    const current = input.sections?.[key];
    return [key, { ...fallback, ...(current ?? {}) }];
  }));
  const settings = value as Partial<StorefrontSettings>;
  const catalogPageSize = [24, 48, 100, 200].includes(settings.admin?.catalogPageSize ?? 24) ? settings.admin?.catalogPageSize ?? 24 : 24;
  const rawPickup = input.pickup_info;
  const pickup_info = {
    store_name: String(rawPickup?.store_name ?? DEFAULT_STOREFRONT_SETTINGS.pickup_info.store_name).trim() || DEFAULT_STOREFRONT_SETTINGS.pickup_info.store_name,
    store_address: String(rawPickup?.store_address ?? "").trim(),
    maps_url: String(rawPickup?.maps_url ?? "").trim(),
  };
  const bank_transfer: BankTransferInfo[] = Array.isArray(input.bank_transfer)
    ? input.bank_transfer.filter((b) => b && typeof b.bank_name === "string" && b.bank_name && typeof b.account_number === "string" && b.account_number && typeof b.account_holder === "string" && b.account_holder)
    : [];
  return { sections, store: { ...DEFAULT_STOREFRONT_SETTINGS.store, ...(input.store ?? {}), whatsapp: input.store?.whatsapp?.trim() || DEFAULT_STOREFRONT_SETTINGS.store.whatsapp, branches: Array.isArray(input.store?.branches) ? input.store.branches : [] }, pickup_info, bank_transfer, admin: { catalogPageSize } };
}

