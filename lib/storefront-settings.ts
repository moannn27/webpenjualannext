export type StoreSectionSetting = { visible: boolean; title: string; subtitle: string; productIds?: string[] };
export type StorefrontSettings = {
  sections: Record<string, StoreSectionSetting>;
  store: { description: string; address: string; email: string; phone: string; whatsapp: string; copyright: string; branches: { id: string; name: string; address: string; maps_url: string }[] };
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
  return { sections, store: { ...DEFAULT_STOREFRONT_SETTINGS.store, ...(input.store ?? {}), whatsapp: input.store?.whatsapp?.trim() || DEFAULT_STOREFRONT_SETTINGS.store.whatsapp, branches: Array.isArray(input.store?.branches) ? input.store.branches : [] }, admin: { catalogPageSize } };
}
