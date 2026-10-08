const SOURCE_LIMIT = 15 * 1024 * 1024;
const OUTPUT_LIMIT = 800 * 1024;
const MAX_EDGE = 1440;

/** Shrink admin uploads in the browser so the Server Action stays under Next's 1 MB default. */
export async function prepareImageUpload(source: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(source.type)) {
    throw new Error("Pilih gambar JPG, PNG, WebP, atau AVIF.");
  }
  if (source.size > SOURCE_LIMIT) throw new Error("Ukuran gambar sumber maksimal 15 MB.");
  if (typeof createImageBitmap !== "function") throw new Error("Browser ini belum mendukung kompresi gambar. Coba browser versi terbaru.");

  const bitmap = await createImageBitmap(source);
  try {
    let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 8; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Gambar tidak dapat diproses oleh browser.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", Math.max(0.48, 0.84 - attempt * 0.06)));
      if (!blob) throw new Error("Gagal mengompres gambar.");
      if (blob.size <= OUTPUT_LIMIT) {
        return new File([blob], `${source.name.replace(/\.[^.]+$/, "") || "image"}.webp`, { type: "image/webp", lastModified: Date.now() });
      }
      scale *= 0.82;
    }
    throw new Error("Gambar terlalu kompleks untuk dikompres di bawah 800 KB. Pilih gambar yang lebih kecil.");
  } finally {
    bitmap.close();
  }
}
