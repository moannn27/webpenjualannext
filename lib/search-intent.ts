export function getStoreSearchHref(rawQuery: string) {
  const query = rawQuery.trim();
  if (!query) return "/products";
  const normalized = query.toLocaleLowerCase("id-ID").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.some((word) => ["faq", "pertanyaan", "bantuan", "help"].includes(word))) return "/faq";
  if (words.some((word) => ["kategori", "category", "categories"].includes(word))) return "/category";
  if (words.some((word) => ["brand", "brands", "merek"].includes(word))) return "/brands";
  if (words.some((word) => ["promo", "diskon", "sale", "discount"].includes(word))) return "/promo";
  return `/products?search=${encodeURIComponent(query)}`;
}
