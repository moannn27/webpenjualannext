export type ManualVariantInput = {
  id?: string;
  sku: string;
  color: string;
  ram: string;
  storage: string;
  price: number | null;
  discount_price: number | null;
  stock: number;
  images: string[];
};

export type VariantGalleryRow = { id: string; url: string; display_order: number };

export function getVariantGallerySaveBlockReason(galleryReadError?: string): string | null {
  return galleryReadError
    ? "Galeri varian belum berhasil dimuat. Muat ulang data sebelum menyimpan agar foto yang ada tidak terhapus."
    : null;
}

export function findSkuConflict(
  sku: string | null | undefined,
  rows: { id: string; sku: string | null }[],
  allowedId?: string,
) {
  const normalized = sku?.trim().toLocaleLowerCase();
  if (!normalized) return null;
  return rows.find((row) => row.id !== allowedId && row.sku?.trim().toLocaleLowerCase() === normalized) ?? null;
}

export function parseManualVariants(raw: unknown, productPrice: number): ManualVariantInput[] {
  if (!Array.isArray(raw) || raw.length > 50) throw new Error("Daftar varian tidak valid. Maksimal 50 varian.");
  const variants = raw.map((item): ManualVariantInput => {
    if (!item || typeof item !== "object") throw new Error("Daftar varian tidak valid.");
    const value = item as Record<string, unknown>;
    if (typeof value.color !== "string" || typeof value.ram !== "string" || typeof value.storage !== "string") throw new Error("Opsi warna, RAM, dan storage harus berupa teks.");
    if (typeof value.stock !== "number" || !Number.isInteger(value.stock) || value.stock < 0) throw new Error("Stok varian harus berupa bilangan bulat nol atau lebih.");
    const price = value.price == null || value.price === "" ? null : Number(value.price);
    const discount = value.discount_price == null || value.discount_price === "" ? null : Number(value.discount_price);
    if ((price !== null && (!Number.isFinite(price) || price < 0)) || (discount !== null && (!Number.isFinite(discount) || discount <= 0 || discount >= (price ?? productPrice)))) {
      throw new Error("Harga varian atau harga diskon tidak valid.");
    }
    const imagesValue = value.images;
    const images = imagesValue === undefined ? [] : imagesValue;
    if (!Array.isArray(images) || images.length > 8 || images.some((url) => typeof url !== "string" || !/^https:\/\//i.test(url.trim()))) {
      throw new Error("Galeri varian harus berisi maksimal 8 URL HTTPS.");
    }
    const cleanImages = [...new Set(images.map((url: string) => url.trim()).filter(Boolean))];
    if (cleanImages.length !== images.length) throw new Error("URL gambar varian tidak boleh kosong atau duplikat.");
    const sku = typeof value.sku === "string" ? value.sku.trim() : "";
    return {
      ...(typeof value.id === "string" && value.id ? { id: value.id } : {}),
      sku,
      color: value.color.trim(), ram: value.ram.trim(), storage: value.storage.trim(),
      price, discount_price: discount, stock: value.stock, images: cleanImages,
    };
  });
  if (variants.some((item) => !item.color && !item.ram && !item.storage)) throw new Error("Setiap varian harus memiliki warna, RAM, atau storage.");
  const optionKeys = variants.map((item) => [item.color, item.ram, item.storage].map((part) => part.toLocaleLowerCase()).join("|"));
  if (new Set(optionKeys).size !== optionKeys.length) throw new Error("Kombinasi opsi varian tidak boleh duplikat.");
  const skus = variants.map((item) => item.sku.toLocaleLowerCase()).filter(Boolean);
  if (new Set(skus).size !== skus.length) throw new Error("SKU varian tidak boleh duplikat.");
  return variants;
}

export function planVariantGallerySync(current: VariantGalleryRow[], urls: string[]) {
  const currentByUrl = new Map(current.map((image) => [image.url, image]));
  const ordered = urls.map((url, display_order) => ({ url, display_order, existing: currentByUrl.get(url) }));
  const retained = new Set(urls);
  return {
    updates: ordered.filter((image) => image.existing).map((image) => ({ id: image.existing!.id, display_order: image.display_order })),
    inserts: ordered.filter((image) => !image.existing).map(({ url, display_order }) => ({ url, display_order })),
    deletes: current.filter((image) => !retained.has(image.url)).map((image) => image.id),
    primaryImageUrl: urls[0] ?? null,
  };
}
