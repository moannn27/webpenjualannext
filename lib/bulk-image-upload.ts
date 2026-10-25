import JSZip from "jszip";
import sharp, { type Metadata } from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BulkImageMatchStatus =
  | "matched_product"
  | "matched_variant"
  | "unmatched"
  | "duplicate"
  | "ambiguous"
  | "invalid_format";

export interface ExtractedImageFile {
  fileName: string;
  entryPath: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
  optimizedBuffer?: Buffer;
  optimizedSize?: number;
  optimizedMimeType?: string;
  width?: number;
  height?: number;
}

export interface BulkImageCatalogProduct {
  id: string;
  name: string;
  sku: string;
  imagesCount: number;
  primaryImageUrl?: string | null;
}

export interface BulkImageCatalogVariant {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  color: string;
  ram: string;
  storage: string;
  imageUrl?: string | null;
  imageUrls?: string[];
}

export interface BulkImageMatchItem {
  fileName: string;
  entryPath: string;
  fileSize: number;
  optimizedSize?: number;
  savingsBytes?: number;
  savingsPercent?: number;
  width?: number;
  height?: number;
  mimeType: string;
  originalMimeType?: string;
  extractedSku: string;
  status: BulkImageMatchStatus;
  statusMessage: string;
  matchedProductId?: string;
  matchedProductName?: string;
  matchedProductSku?: string;
  matchedVariantId?: string;
  matchedVariantSku?: string;
  matchedVariantDetails?: string;
  hasExistingImage: boolean;
  existingImageUrl?: string | null;
  legacyImageUrl?: string | null;
  previewDataUrl?: string;
}

export interface BulkImagePreviewResult {
  totalZipFiles: number;
  matchedCount: number;
  matchedProductCount: number;
  matchedVariantCount: number;
  unmatchedCount: number;
  duplicateCount: number;
  invalidCount: number;
  ambiguousCount: number;
  productsWithoutImagesCount: number;
  totalOriginalBytes: number;
  totalOptimizedBytes: number;
  totalSavingsBytes: number;
  totalSavingsPercent: number;
  hasOptimizationErrors: boolean;
  items: BulkImageMatchItem[];
  unmatchedImages: Array<{ fileName: string; sku: string; reason: string }>;
  productsWithoutImages: Array<{
    id: string;
    name: string;
    sku: string;
    isVariant: boolean;
    variantDetails?: string;
  }>;
}

export interface BulkImageExecutionResult {
  success: boolean;
  uploadedCount: number;
  updatedProductsCount: number;
  updatedVariantsCount: number;
  uploadedUrls: string[];
  totalOriginalBytes?: number;
  totalOptimizedBytes?: number;
  totalSavedBytes?: number;
}

const SUPPORTED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

/**
 * Validates magic byte signatures to prevent spoofed/malicious extensions.
 */
export function detectImageMimeType(buf: Buffer): string | null {
  if (!buf || buf.length < 4) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: RIFF .... WEBP
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  // AVIF: .... ftyp (avif | avis)
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 4, 8) === "ftyp" &&
    (buf.toString("ascii", 8, 12) === "avif" || buf.toString("ascii", 8, 12) === "avis")
  ) {
    return "image/avif";
  }
  return null;
}

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxInputPixels?: number;
}

export interface OptimizedImageResult {
  buffer: Buffer;
  originalSize: number;
  optimizedSize: number;
  savingsBytes: number;
  savingsPercent: number;
  width?: number;
  height?: number;
  format: "webp";
  mimeType: "image/webp";
  hasAlpha: boolean;
  skippedRedundantProcessing?: boolean;
}

/**
 * Optimizes an image buffer using Sharp:
 * 1. Resizes within 1600x1600 max dimensions (preserving aspect ratio, without enlargement).
 * 2. Auto-rotates using EXIF orientation tag, then resets orientation.
 * 3. Strips all unnecessary EXIF, IPTC, and XMP metadata.
 * 4. Encodes to WebP (quality 82, alphaQuality 90) preserving alpha transparency.
 * 5. Prevents redundant re-compression if already an optimized WebP within limits.
 * 6. Limits max input pixels (default 40 MP) and file size to prevent memory exhaustion / DoS.
 */
export async function optimizeProductImage(
  inputBuffer: Buffer,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 82,
    maxInputPixels = 40_000_000,
  } = options;

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error("Berkas gambar kosong atau tidak valid.");
  }

  const originalSize = inputBuffer.length;

  // 1. Guard against memory exhaustion with limitInputPixels before decoding
  const inspector = sharp(inputBuffer, {
    limitInputPixels: maxInputPixels,
  });

  let metadata: Metadata;
  try {
    metadata = await inspector.metadata();
  } catch (err) {
    throw new Error(
      `Format gambar tidak dikenali atau berkas rusak: ${err instanceof Error ? err.message : "Gagal membaca header gambar"}`
    );
  }

  if (!metadata.format) {
    throw new Error("Format berkas gambar tidak dikenali atau korup.");
  }

  const origWidth = metadata.width || 0;
  const origHeight = metadata.height || 0;

  if (origWidth === 0 || origHeight === 0) {
    throw new Error("Dimensi gambar tidak valid (lebar atau tinggi 0 piksel).");
  }

  if (origWidth * origHeight > maxInputPixels) {
    throw new Error(
      `Resolusi gambar terlalu besar (${origWidth} × ${origHeight} piksel = ${Math.round(
        (origWidth * origHeight) / 1_000_000
      )} MP). Batas aman adalah ${Math.round(maxInputPixels / 1_000_000)} MP.`
    );
  }

  // 2. Prevent redundant processing:
  // If already WebP, within dimension bounds, no EXIF rotation needed, and no metadata bloat:
  const isWebp = metadata.format === "webp";
  const withinBounds = origWidth <= maxWidth && origHeight <= maxHeight;
  const needsRotation = Boolean(metadata.orientation && metadata.orientation > 1);
  const hasMetadataToStrip = Boolean(metadata.exif || metadata.iptc || metadata.xmp);

  if (isWebp && withinBounds && !needsRotation && !hasMetadataToStrip) {
    const recompressed = await sharp(inputBuffer, { limitInputPixels: maxInputPixels })
      .webp({ quality, alphaQuality: 90, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    if (recompressed.data.length >= originalSize) {
      return {
        buffer: inputBuffer,
        originalSize,
        optimizedSize: originalSize,
        savingsBytes: 0,
        savingsPercent: 0,
        width: origWidth,
        height: origHeight,
        format: "webp",
        mimeType: "image/webp",
        hasAlpha: Boolean(metadata.hasAlpha),
        skippedRedundantProcessing: true,
      };
    }
  }

  // 3. Optimization pipeline:
  // - Auto-rotate based on EXIF orientation
  // - Resize to inside 1600x1600 without enlargement
  // - Strip all EXIF / metadata (default Sharp behavior without .withMetadata())
  // - Output WebP quality 82, alphaQuality 90
  const pipeline = sharp(inputBuffer, { limitInputPixels: maxInputPixels })
    .rotate()
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality,
      alphaQuality: 90,
      effort: 4,
      force: true,
    });

  const { data: outputBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });

  const optimizedSize = outputBuffer.length;
  const savingsBytes = Math.max(0, originalSize - optimizedSize);
  const savingsPercent =
    originalSize > 0 ? Number(((savingsBytes / originalSize) * 100).toFixed(1)) : 0;

  return {
    buffer: outputBuffer,
    originalSize,
    optimizedSize,
    savingsBytes,
    savingsPercent,
    width: info.width,
    height: info.height,
    format: "webp",
    mimeType: "image/webp",
    hasAlpha: Boolean(info.hasAlpha),
    skippedRedundantProcessing: false,
  };
}

/**
 * Extracts and sanitizes images from a ZIP buffer with zip-slip & zip-bomb protection.
 */
export async function extractZipImages(
  zipBuffer: Buffer,
  maxFiles = 500,
  maxTotalBytes = 150 * 1024 * 1024
): Promise<ExtractedImageFile[]> {
  if (!zipBuffer || zipBuffer.length === 0) {
    throw new Error("File ZIP kosong atau tidak valid.");
  }

  const zip = await JSZip.loadAsync(zipBuffer);
  const entries: ExtractedImageFile[] = [];
  let totalBytes = 0;
  let fileCount = 0;

  for (const [entryPath, entry] of Object.entries(zip.files)) {
    // 1. Skip directories
    if (entry.dir || entryPath.endsWith("/") || entryPath.endsWith("\\")) {
      continue;
    }

    // 2. Zip-slip defense: reject directory traversal
    if (entryPath.includes("..") || entryPath.startsWith("/") || entryPath.startsWith("\\")) {
      continue;
    }

    // 3. Skip metadata / OS files (__MACOSX, .DS_Store, Thumbs.db)
    const normalizedPath = entryPath.replace(/\\/g, "/");
    if (
      normalizedPath.startsWith("__MACOSX/") ||
      normalizedPath.endsWith(".DS_Store") ||
      normalizedPath.endsWith("Thumbs.db")
    ) {
      continue;
    }

    const baseName = normalizedPath.split("/").pop() || "";
    if (!baseName || baseName.startsWith(".")) {
      continue;
    }

    fileCount++;
    if (fileCount > maxFiles) {
      throw new Error(`File ZIP melebihi batas maksimal ${maxFiles} berkas.`);
    }

    const ext = baseName.split(".").pop()?.toLowerCase() || "";
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      continue;
    }

    const fileBuffer = await entry.async("nodebuffer");
    totalBytes += fileBuffer.length;
    if (totalBytes > maxTotalBytes) {
      throw new Error(`Ukuran dekompresi total ZIP melebihi batas aman (${Math.round(maxTotalBytes / (1024 * 1024))} MB).`);
    }

    const detectedMime = detectImageMimeType(fileBuffer) || (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "avif" ? "image/avif" : "image/jpeg");

    entries.push({
      fileName: baseName,
      entryPath: normalizedPath,
      buffer: fileBuffer,
      mimeType: detectedMime,
      size: fileBuffer.length,
    });
  }

  return entries;
}

/**
 * Matches extracted ZIP images strictly against catalog products and product_variants.sku,
 * while automatically compressing, auto-orienting, stripping metadata, and converting images to WebP.
 */
export async function matchZipImagesWithCatalog(
  entries: ExtractedImageFile[],
  products: BulkImageCatalogProduct[],
  variants: BulkImageCatalogVariant[],
  includeThumbnailDataUrl = true
): Promise<BulkImagePreviewResult> {
  // Build lookup maps (exact uppercase trimmed)
  const productBySku = new Map<string, BulkImageCatalogProduct[]>();
  for (const prod of products) {
    if (prod.sku && prod.sku.trim()) {
      const sku = prod.sku.trim().toUpperCase();
      productBySku.set(sku, [...(productBySku.get(sku) ?? []), prod]);
    }
  }

  const variantBySku = new Map<string, BulkImageCatalogVariant[]>();
  for (const v of variants) {
    if (v.sku && v.sku.trim()) {
      const sku = v.sku.trim().toUpperCase();
      variantBySku.set(sku, [...(variantBySku.get(sku) ?? []), v]);
    }
  }

  // Count SKU frequencies in the uploaded ZIP to detect duplicates
  const skuCounts = new Map<string, number>();
  const getSkuFromFileName = (fileName: string) => fileName.replace(/\.[^.]+$/, "").replace(/__\d+$/, "").trim();
  for (const entry of entries) {
    const rawSku = getSkuFromFileName(entry.fileName).toUpperCase();
    if (rawSku) {
      skuCounts.set(rawSku, (skuCounts.get(rawSku) ?? 0) + 1);
    }
  }

  const items: BulkImageMatchItem[] = [];
  const unmatchedImages: Array<{ fileName: string; sku: string; reason: string }> = [];
  const matchedProductIds = new Set<string>();
  const matchedVariantIds = new Set<string>();

  let matchedProductCount = 0;
  let matchedVariantCount = 0;
  let unmatchedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;
  let ambiguousCount = 0;
  let hasOptimizationErrors = false;

  for (const entry of entries) {
    const ext = entry.fileName.split(".").pop()?.toLowerCase() || "";
    const rawSku = getSkuFromFileName(entry.fileName);
    const normalizedSku = rawSku.toUpperCase();

    // 1. Check supported extension
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      invalidCount++;
      items.push({
        fileName: entry.fileName,
        entryPath: entry.entryPath,
        fileSize: entry.size,
        mimeType: entry.mimeType,
        originalMimeType: entry.mimeType,
        extractedSku: rawSku,
        status: "invalid_format",
        statusMessage: `Format berkas ".${ext}" tidak didukung. Gunakan JPG, PNG, WebP, atau AVIF.`,
        hasExistingImage: false,
      });
      unmatchedImages.push({
        fileName: entry.fileName,
        sku: rawSku,
        reason: `Format .${ext} tidak didukung`,
      });
      continue;
    }

    // 2. Check non-empty SKU
    if (!rawSku) {
      invalidCount++;
      items.push({
        fileName: entry.fileName,
        entryPath: entry.entryPath,
        fileSize: entry.size,
        mimeType: entry.mimeType,
        originalMimeType: entry.mimeType,
        extractedSku: "",
        status: "invalid_format",
        statusMessage: "Nama file tidak memuat SKU yang valid.",
        hasExistingImage: false,
      });
      unmatchedImages.push({
        fileName: entry.fileName,
        sku: "",
        reason: "Nama file kosong sebelum ekstensi",
      });
      continue;
    }

    // 3. Image Optimization Pipeline: Resize (<=1600x1600), WebP (q82), auto-orient, strip metadata
    let opt: OptimizedImageResult;
    try {
      opt = await optimizeProductImage(entry.buffer);
      entry.optimizedBuffer = opt.buffer;
      entry.optimizedSize = opt.optimizedSize;
      entry.optimizedMimeType = opt.mimeType;
      entry.width = opt.width;
      entry.height = opt.height;
    } catch (optErr) {
      invalidCount++;
      hasOptimizationErrors = true;
      const errMsg = optErr instanceof Error ? optErr.message : "Gagal mengoptimasi gambar";
      items.push({
        fileName: entry.fileName,
        entryPath: entry.entryPath,
        fileSize: entry.size,
        originalMimeType: entry.mimeType,
        mimeType: entry.mimeType,
        extractedSku: rawSku,
        status: "invalid_format",
        statusMessage: `Optimasi gagal: ${errMsg}. Berkas tidak dapat diunggah.`,
        hasExistingImage: false,
      });
      unmatchedImages.push({
        fileName: entry.fileName,
        sku: rawSku,
        reason: `Optimasi gagal: ${errMsg}`,
      });
      continue;
    }

    // 4. Generate small fast WebP thumbnail for preview table
    let previewDataUrl: string | undefined = undefined;
    if (includeThumbnailDataUrl) {
      try {
        const thumb = await sharp(opt.buffer)
          .resize(180, 180, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer();
        previewDataUrl = `data:image/webp;base64,${thumb.toString("base64")}`;
      } catch {
        previewDataUrl = `data:image/webp;base64,${opt.buffer.toString("base64")}`;
      }
    }

    // 5. Check duplicate in same ZIP
    const sameSkuEntries = entries.filter((candidate) => getSkuFromFileName(candidate.fileName).toUpperCase() === normalizedSku);
    const numberedMultiImageSet = sameSkuEntries.length > 1 && sameSkuEntries.every((candidate) => /__\d+\.[^.]+$/.test(candidate.fileName)) && new Set(sameSkuEntries.map((candidate) => candidate.fileName.replace(/^.*__(\d+)\.[^.]+$/, "$1"))).size === sameSkuEntries.length;
    if ((skuCounts.get(normalizedSku) ?? 0) > 1 && !numberedMultiImageSet) {
      duplicateCount++;
      const prodMatch = productBySku.get(normalizedSku)?.[0];
      const varMatch = variantBySku.get(normalizedSku)?.[0];
      items.push({
        fileName: entry.fileName,
        entryPath: entry.entryPath,
        fileSize: entry.size,
        optimizedSize: opt.optimizedSize,
        savingsBytes: opt.savingsBytes,
        savingsPercent: opt.savingsPercent,
        width: opt.width,
        height: opt.height,
        mimeType: "image/webp",
        originalMimeType: entry.mimeType,
        extractedSku: rawSku,
        status: "duplicate",
        statusMessage: `Duplikat nama SKU di dalam berkas ZIP (terdapat ${skuCounts.get(normalizedSku)} gambar untuk SKU "${rawSku}"). Tandai untuk direview.`,
        matchedProductId: prodMatch?.id || varMatch?.productId,
        matchedProductName: prodMatch?.name || varMatch?.productName,
        hasExistingImage: Boolean(prodMatch?.imagesCount || varMatch?.imageUrl || varMatch?.imageUrls?.length),
        previewDataUrl,
      });
      unmatchedImages.push({
        fileName: entry.fileName,
        sku: rawSku,
        reason: `Duplikat gambar (${skuCounts.get(normalizedSku)} file di ZIP)`,
      });
      continue;
    }

    // 6. Exact matching against Catalog
    const productsForSku = productBySku.get(normalizedSku) ?? [];
    const variantsForSku = variantBySku.get(normalizedSku) ?? [];
    const matchedProduct = productsForSku.length === 1 ? productsForSku[0] : undefined;
    const matchedVariant = variantsForSku.length === 1 ? variantsForSku[0] : undefined;

    // Ambiguity check: SKU exists as BOTH parent product and variant
    if (productsForSku.length > 1 || variantsForSku.length > 1 || (matchedProduct && matchedVariant)) {
      ambiguousCount++;
      items.push({
        fileName: entry.fileName,
        entryPath: entry.entryPath,
        fileSize: entry.size,
        optimizedSize: opt.optimizedSize,
        savingsBytes: opt.savingsBytes,
        savingsPercent: opt.savingsPercent,
        width: opt.width,
        height: opt.height,
        mimeType: "image/webp",
        originalMimeType: entry.mimeType,
        extractedSku: rawSku,
        status: "ambiguous",
        statusMessage: `Ambigu: SKU "${rawSku}" digunakan oleh lebih dari satu produk atau varian. Perlu review manual.`,
        hasExistingImage: Boolean(matchedProduct?.imagesCount || matchedVariant?.imageUrl || matchedVariant?.imageUrls?.length),
        previewDataUrl,
      });
      unmatchedImages.push({
        fileName: entry.fileName,
        sku: rawSku,
        reason: "SKU tidak unik di katalog produk dan varian",
      });
      continue;
    }

    // Match parent product
    if (matchedProduct) {
      matchedProductCount++;
      matchedProductIds.add(matchedProduct.id);
      items.push({
        fileName: entry.fileName,
        entryPath: entry.entryPath,
        fileSize: entry.size,
        optimizedSize: opt.optimizedSize,
        savingsBytes: opt.savingsBytes,
        savingsPercent: opt.savingsPercent,
        width: opt.width,
        height: opt.height,
        mimeType: "image/webp",
        originalMimeType: entry.mimeType,
        extractedSku: rawSku,
        status: "matched_product",
        statusMessage: `Cocok dengan SKU produk: ${matchedProduct.name}`,
        matchedProductId: matchedProduct.id,
        matchedProductName: matchedProduct.name,
        matchedProductSku: matchedProduct.sku,
        hasExistingImage: matchedProduct.imagesCount > 0,
        existingImageUrl: matchedProduct.primaryImageUrl,
        previewDataUrl,
      });
      continue;
    }

    // Match variant SKU
    if (matchedVariant) {
      matchedVariantCount++;
      matchedVariantIds.add(matchedVariant.id);
      const varDetails = [matchedVariant.color, matchedVariant.ram, matchedVariant.storage].filter(Boolean).join(" / ");
      items.push({
        fileName: entry.fileName,
        entryPath: entry.entryPath,
        fileSize: entry.size,
        optimizedSize: opt.optimizedSize,
        savingsBytes: opt.savingsBytes,
        savingsPercent: opt.savingsPercent,
        width: opt.width,
        height: opt.height,
        mimeType: "image/webp",
        originalMimeType: entry.mimeType,
        extractedSku: rawSku,
        status: "matched_variant",
        statusMessage: `Cocok dengan SKU varian: ${matchedVariant.productName}${varDetails ? ` (${varDetails})` : ""}`,
        matchedProductId: matchedVariant.productId,
        matchedProductName: matchedVariant.productName,
        matchedVariantId: matchedVariant.id,
        matchedVariantSku: matchedVariant.sku,
        matchedVariantDetails: varDetails,
        hasExistingImage: Boolean(matchedVariant.imageUrl || matchedVariant.imageUrls?.length),
        existingImageUrl: matchedVariant.imageUrl ?? matchedVariant.imageUrls?.[0] ?? null,
        legacyImageUrl: matchedVariant.imageUrl ?? null,
        previewDataUrl,
      });
      continue;
    }

    // Unmatched SKU
    unmatchedCount++;
    items.push({
      fileName: entry.fileName,
      entryPath: entry.entryPath,
      fileSize: entry.size,
      optimizedSize: opt.optimizedSize,
      savingsBytes: opt.savingsBytes,
      savingsPercent: opt.savingsPercent,
      width: opt.width,
      height: opt.height,
      mimeType: "image/webp",
      originalMimeType: entry.mimeType,
      extractedSku: rawSku,
      status: "unmatched",
      statusMessage: `SKU "${rawSku}" tidak ditemukan di database produk maupun varian.`,
      hasExistingImage: false,
      previewDataUrl,
    });
    unmatchedImages.push({
      fileName: entry.fileName,
      sku: rawSku,
      reason: `SKU "${rawSku}" tidak ditemukan di database`,
    });
  }

  // Identify products & variants without images
  const productsWithoutImages: Array<{
    id: string;
    name: string;
    sku: string;
    isVariant: boolean;
    variantDetails?: string;
  }> = [];

  for (const prod of products) {
    if (prod.imagesCount === 0 && !matchedProductIds.has(prod.id)) {
      productsWithoutImages.push({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        isVariant: false,
      });
    }
  }

  for (const v of variants) {
    if (!v.imageUrl && !v.imageUrls?.length && !matchedVariantIds.has(v.id)) {
      const varDetails = [v.color, v.ram, v.storage].filter(Boolean).join(" / ");
      productsWithoutImages.push({
        id: v.id,
        name: v.productName,
        sku: v.sku,
        isVariant: true,
        variantDetails: varDetails,
      });
    }
  }

  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;

  for (const item of items) {
    if (item.status === "matched_product" || item.status === "matched_variant") {
      totalOriginalBytes += item.fileSize;
      totalOptimizedBytes += item.optimizedSize ?? item.fileSize;
    }
  }

  const totalSavingsBytes = Math.max(0, totalOriginalBytes - totalOptimizedBytes);
  const totalSavingsPercent =
    totalOriginalBytes > 0
      ? Number(((totalSavingsBytes / totalOriginalBytes) * 100).toFixed(1))
      : 0;

  return {
    totalZipFiles: entries.length,
    matchedCount: matchedProductCount + matchedVariantCount,
    matchedProductCount,
    matchedVariantCount,
    unmatchedCount,
    duplicateCount,
    invalidCount,
    ambiguousCount,
    productsWithoutImagesCount: productsWithoutImages.length,
    totalOriginalBytes,
    totalOptimizedBytes,
    totalSavingsBytes,
    totalSavingsPercent,
    hasOptimizationErrors,
    items,
    unmatchedImages,
    productsWithoutImages,
  };
}

/**
 * Uploads matched images into Supabase Storage with strict rollback on failure.
 */
export async function executeBulkImageUpload(params: {
  supabase: SupabaseClient;
  entries: ExtractedImageFile[];
  matchedItems: BulkImageMatchItem[];
  overwriteExisting: boolean;
  baseUrl?: string;
}): Promise<BulkImageExecutionResult> {
  const { supabase, entries, matchedItems, overwriteExisting, baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "" } = params;

  // Filter only validly matched items
  const validItems = matchedItems.filter(
    (item) => item.status === "matched_product" || item.status === "matched_variant"
  ).slice().sort((a, b) => {
    const sameTarget = a.matchedVariantId && a.matchedVariantId === b.matchedVariantId
      ? true
      : a.matchedProductId && a.matchedProductId === b.matchedProductId;
    if (!sameTarget) return 0;
    const getNumber = (fileName: string) => Number(fileName.match(/__(\d+)\.[^.]+$/)?.[1] ?? 0);
    return getNumber(a.fileName) - getNumber(b.fileName);
  });

  if (!validItems.length) {
    throw new Error("Tidak ada gambar yang cocok dengan SKU produk atau varian untuk diupload.");
  }

  const fileMap = new Map<string, ExtractedImageFile>();
  for (const entry of entries) {
    fileMap.set(entry.fileName, entry);
  }

  const uploadedStoragePaths: string[] = [];
  const uploadedUrls: string[] = [];
  const insertedImageRecordIds: string[] = [];
  const insertedVariantImageRecordIds: string[] = [];
  const originalVariantImageUrls = new Map<string, string | null>();
  const originalVariantImageOrders = new Map<string, { id: string; display_order: number }[]>();
  let updatedProductsCount = 0;
  let updatedVariantsCount = 0;
  const variantPrimaryImagesUpdated = new Set<string>();
  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;

  try {
    for (const item of validItems) {
      const fileEntry = fileMap.get(item.fileName);
      if (!fileEntry) continue;

      // Ensure optimized WebP buffer is available; optimize if not already cached
      let finalBuffer = fileEntry.optimizedBuffer;
      if (!finalBuffer) {
        try {
          const opt = await optimizeProductImage(fileEntry.buffer);
          finalBuffer = opt.buffer;
          fileEntry.optimizedBuffer = opt.buffer;
          fileEntry.optimizedSize = opt.optimizedSize;
        } catch (optErr) {
          throw new Error(
            `Gagal mengoptimasi gambar "${item.fileName}": ${optErr instanceof Error ? optErr.message : "Error"}. Upload dibatalkan untuk mencegah penyimpanan gambar asli tanpa kompresi.`
          );
        }
      }

      totalOriginalBytes += fileEntry.size;
      totalOptimizedBytes += finalBuffer.length;

      const cleanSku = (item.matchedProductSku || item.matchedVariantSku || item.extractedSku)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      const storagePath = `products/bulk-${cleanSku}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

      // 1. Upload ONLY optimized WebP to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(storagePath, finalBuffer, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Gagal mengupload gambar "${item.fileName}" ke storage: ${uploadError.message}`);
      }

      uploadedStoragePaths.push(storagePath);

      // 2. Generate public URL
      let publicUrl = supabase.storage.from("products").getPublicUrl(storagePath).data.publicUrl;
      if (!publicUrl.startsWith("http")) {
        publicUrl = `${baseUrl.replace(/\/$/, "")}/storage/${publicUrl.replace(/^\//, "")}`;
      }
      uploadedUrls.push(publicUrl);

      // 3. Database Updates
      if (item.status === "matched_product" && item.matchedProductId) {
        const productId = item.matchedProductId;

        if (overwriteExisting) {
          // Demote existing primary images
          await supabase
            .from("product_images")
            .update({ is_primary: false })
            .eq("product_id", productId);

          // Insert new primary image
          const { data: newImg, error: imgError } = await supabase
            .from("product_images")
            .insert({
              product_id: productId,
              url: publicUrl,
              alt_text: item.matchedProductName || item.extractedSku,
              is_primary: true,
              display_order: 0,
            })
            .select("id")
            .single();

          if (imgError) throw new Error(`Gagal menyimpan referensi gambar produk: ${imgError.message}`);
          if (newImg?.id) insertedImageRecordIds.push(newImg.id);
        } else {
          // If not overwriting: if has no images make it primary, otherwise add as secondary
          const isPrimary = !item.hasExistingImage;
          const { data: newImg, error: imgError } = await supabase
            .from("product_images")
            .insert({
              product_id: productId,
              url: publicUrl,
              alt_text: item.matchedProductName || item.extractedSku,
              is_primary: isPrimary,
              display_order: isPrimary ? 0 : 99,
            })
            .select("id")
            .single();

          if (imgError) throw new Error(`Gagal menyimpan referensi gambar produk: ${imgError.message}`);
          if (newImg?.id) insertedImageRecordIds.push(newImg.id);
        }

        updatedProductsCount++;
      } else if (item.status === "matched_variant" && item.matchedVariantId) {
        const variantId = item.matchedVariantId;
        const { data: existingVariantImages, error: readVariantImagesError } = await supabase
          .from("product_variant_images")
          .select("id, display_order")
          .eq("variant_id", variantId);
        if (readVariantImagesError) throw new Error(`Gagal membaca galeri varian: ${readVariantImagesError.message}`);
        const uploadedForVariant = validItems.filter((candidate) => candidate.matchedVariantId === variantId).length;
        const hasUploadedVariantImage = variantPrimaryImagesUpdated.has(variantId);
        const existingImages = existingVariantImages ?? [];
        if (overwriteExisting && !hasUploadedVariantImage && existingImages.length) {
          originalVariantImageOrders.set(variantId, existingImages.map((image) => ({
            id: image.id,
            display_order: image.display_order ?? 0,
          })));
          for (const image of existingImages) {
            const { error } = await supabase.from("product_variant_images")
              .update({ display_order: (image.display_order ?? 0) + uploadedForVariant })
              .eq("id", image.id);
            if (error) throw new Error(`Gagal mengurutkan ulang galeri varian: ${error.message}`);
          }
        }
        const nextOrder = overwriteExisting
          ? validItems.slice(0, validItems.indexOf(item)).filter((candidate) => candidate.matchedVariantId === variantId).length
          : existingImages.reduce((max, image) => Math.max(max, image.display_order ?? 0), -1) + 1;
        const { data: variantImage, error: variantImageError } = await supabase.from("product_variant_images").insert({
          variant_id: variantId, url: publicUrl, display_order: nextOrder,
        }).select("id").single();
        if (variantImageError) throw new Error(`Gagal menyimpan foto galeri varian: ${variantImageError.message}`);
        if (variantImage?.id) insertedVariantImageRecordIds.push(variantImage.id);
        if (!variantPrimaryImagesUpdated.has(variantId)) {
          const primaryUrl = overwriteExisting
            ? publicUrl
            : item.legacyImageUrl ?? item.existingImageUrl ?? publicUrl;
          if (primaryUrl !== item.legacyImageUrl) {
            const { error: varError } = await supabase.from("product_variants").update({ image_url: primaryUrl }).eq("id", variantId);
            if (varError) throw new Error(`Gagal memperbarui foto varian: ${varError.message}`);
            originalVariantImageUrls.set(variantId, item.legacyImageUrl ?? null);
          }
          variantPrimaryImagesUpdated.add(variantId);
        }

        updatedVariantsCount++;
      }
    }

    const totalSavedBytes = Math.max(0, totalOriginalBytes - totalOptimizedBytes);

    return {
      success: true,
      uploadedCount: uploadedStoragePaths.length,
      updatedProductsCount,
      updatedVariantsCount,
      uploadedUrls,
      totalOriginalBytes,
      totalOptimizedBytes,
      totalSavedBytes,
    };
  } catch (cause) {
    // ATOMIC ROLLBACK: Remove all files uploaded to Supabase Storage in this batch
    if (uploadedStoragePaths.length > 0) {
      try {
        await supabase.storage.from("products").remove(uploadedStoragePaths);
      } catch (cleanupErr) {
        console.error("Gagal membersihkan file storage saat rollback:", cleanupErr);
      }
    }

    // Clean up any database image records inserted in this batch
    if (insertedImageRecordIds.length > 0) {
      try {
        await supabase.from("product_images").delete().in("id", insertedImageRecordIds);
      } catch (dbCleanupErr) {
        console.error("Gagal membersihkan baris product_images saat rollback:", dbCleanupErr);
      }
    }

    if (insertedVariantImageRecordIds.length > 0) {
      try {
        await supabase.from("product_variant_images").delete().in("id", insertedVariantImageRecordIds);
      } catch (dbCleanupErr) {
        console.error("Gagal membersihkan baris product_variant_images saat rollback:", dbCleanupErr);
      }
    }

    for (const [variantId, imageUrl] of originalVariantImageUrls) {
      try {
        const { error } = await supabase.from("product_variants").update({ image_url: imageUrl }).eq("id", variantId);
        if (error) console.error("Gagal memulihkan foto utama varian saat rollback:", error);
      } catch (restoreErr) {
        console.error("Gagal memulihkan foto utama varian saat rollback:", restoreErr);
      }
    }

    for (const rows of originalVariantImageOrders.values()) {
      for (const row of rows) {
        try {
          const { error } = await supabase.from("product_variant_images")
            .update({ display_order: row.display_order }).eq("id", row.id);
          if (error) console.error("Gagal memulihkan urutan galeri varian saat rollback:", error);
        } catch (restoreErr) {
          console.error("Gagal memulihkan urutan galeri varian saat rollback:", restoreErr);
        }
      }
    }

    throw cause instanceof Error
      ? cause
      : new Error("Terjadi kesalahan saat memproses bulk image upload.");
  }
}

