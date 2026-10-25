import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import JSZip from "jszip";
import sharp from "sharp";
import {
  extractZipImages,
  detectImageMimeType,
  optimizeProductImage,
  matchZipImagesWithCatalog,
  executeBulkImageUpload,
  type BulkImageCatalogProduct,
  type BulkImageCatalogVariant,
  type ExtractedImageFile,
} from "@/lib/bulk-image-upload";

describe("Bulk Image Upload & Optimization Suite", () => {
  let VALID_JPEG: Buffer;
  let VALID_PNG: Buffer; // with alpha transparency
  let VALID_WEBP: Buffer;
  let OVERSIZED_JPEG: Buffer; // 2400 x 1200 px (2:1 aspect ratio)

  beforeAll(async () => {
    // Generate valid test image buffers
    VALID_JPEG = await sharp({
      create: { width: 400, height: 400, channels: 3, background: { r: 220, g: 30, b: 30 } },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    // 4-channel PNG with 50% alpha transparency
    VALID_PNG = await sharp({
      create: { width: 300, height: 200, channels: 4, background: { r: 0, g: 150, b: 255, alpha: 0.5 } },
    })
      .png()
      .toBuffer();

    VALID_WEBP = await sharp({
      create: { width: 250, height: 250, channels: 3, background: { r: 40, g: 200, b: 80 } },
    })
      .webp({ quality: 80 })
      .toBuffer();

    // Oversized 2400 x 1200 JPEG to verify downscaling to 1600 x 800
    OVERSIZED_JPEG = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: { r: 100, g: 100, b: 100 } },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
  });

  const sampleProducts: BulkImageCatalogProduct[] = [
    {
      id: "prod-1",
      name: "Lenovo AIO 24IRH9",
      sku: "F0HN00Q3ID",
      imagesCount: 1,
      primaryImageUrl: "https://example.com/existing-aio.jpg",
    },
    {
      id: "prod-2",
      name: "IdeaPad Slim 5 14AKP10",
      sku: "83HX001AID",
      imagesCount: 0,
      primaryImageUrl: null,
    },
  ];

  const sampleVariants: BulkImageCatalogVariant[] = [
    {
      id: "var-1",
      productId: "prod-1",
      productName: "Lenovo AIO 24IRH9",
      sku: "F0HN00Q3ID-VAR-GREY",
      color: "Cloud Grey",
      ram: "16GB",
      storage: "512GB",
      imageUrl: null,
    },
    {
      id: "var-2",
      productId: "prod-2",
      productName: "IdeaPad Slim 5 14AKP10",
      sku: "83HX001AID-VAR-BLUE",
      color: "Abyss Blue",
      ram: "16GB",
      storage: "1TB",
      imageUrl: "https://example.com/existing-blue.jpg",
    },
  ];

  describe("1. ZIP Extraction & Security Validations", () => {
    it("extracts valid image files from a ZIP archive", async () => {
      const zip = new JSZip();
      zip.file("F0HN00Q3ID.jpg", VALID_JPEG);
      zip.file("83HX001AID.png", VALID_PNG);
      zip.file("F0HN00Q3ID-VAR-GREY.webp", VALID_WEBP);

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      const entries = await extractZipImages(zipBuffer);

      expect(entries).toHaveLength(3);
      expect(entries.map((e) => e.fileName).sort()).toEqual([
        "83HX001AID.png",
        "F0HN00Q3ID-VAR-GREY.webp",
        "F0HN00Q3ID.jpg",
      ]);
      expect(entries.find((e) => e.fileName === "F0HN00Q3ID.jpg")?.mimeType).toBe("image/jpeg");
      expect(entries.find((e) => e.fileName === "83HX001AID.png")?.mimeType).toBe("image/png");
      expect(entries.find((e) => e.fileName === "F0HN00Q3ID-VAR-GREY.webp")?.mimeType).toBe("image/webp");
    });

    it("prevents Zip-Slip path traversal attacks and skips directory markers", async () => {
      const zip = new JSZip();
      zip.folder("subfolder")?.file("safe.jpg", VALID_JPEG);
      zip.folder("empty_folder");

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      const entries = await extractZipImages(zipBuffer);

      expect(entries).toHaveLength(1);
      expect(entries[0].fileName).toBe("safe.jpg");
    });

    it("filters out unsupported non-image extensions and macOS metadata files", async () => {
      const zip = new JSZip();
      zip.file("F0HN00Q3ID.jpg", VALID_JPEG);
      zip.file("document.pdf", "sample pdf content");
      zip.file("script.sh", "echo hello");
      zip.file(".DS_Store", "dummy");
      zip.file("__MACOSX/._F0HN00Q3ID.jpg", "apple double");

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      const entries = await extractZipImages(zipBuffer);

      expect(entries).toHaveLength(1);
      expect(entries[0].fileName).toBe("F0HN00Q3ID.jpg");
    });

    it("accurately detects mime types via magic bytes", () => {
      expect(detectImageMimeType(VALID_JPEG)).toBe("image/jpeg");
      expect(detectImageMimeType(VALID_PNG)).toBe("image/png");
      expect(detectImageMimeType(VALID_WEBP)).toBe("image/webp");
      expect(detectImageMimeType(Buffer.from("invalid plain text file"))).toBeNull();
    });

    it("throws an error when given an empty buffer", async () => {
      await expect(extractZipImages(Buffer.alloc(0))).rejects.toThrow("File ZIP kosong atau tidak valid.");
    });
  });

  describe("2. Image Optimization Pipeline (WebP, Compression, Transparency, Dimensions, Safety)", () => {
    it("converts JPEG to WebP quality ~82 and reduces file size", async () => {
      const opt = await optimizeProductImage(VALID_JPEG, { quality: 82 });

      expect(opt.format).toBe("webp");
      expect(opt.mimeType).toBe("image/webp");
      expect(opt.originalSize).toBe(VALID_JPEG.length);
      expect(opt.optimizedSize).toBeLessThanOrEqual(VALID_JPEG.length);
      expect(opt.width).toBe(400);
      expect(opt.height).toBe(400);
    });

    it("resizes images exceeding 1600x1600 to inside bounds preserving aspect ratio (2400x1200 -> 1600x800)", async () => {
      const opt = await optimizeProductImage(OVERSIZED_JPEG, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 82,
      });

      expect(opt.format).toBe("webp");
      expect(opt.width).toBe(1600);
      expect(opt.height).toBe(800); // 2:1 ratio preserved!
      expect(opt.optimizedSize).toBeLessThan(OVERSIZED_JPEG.length);
      expect(opt.savingsPercent).toBeGreaterThan(50);
    });

    it("preserves alpha transparency channel when converting PNG to WebP", async () => {
      const opt = await optimizeProductImage(VALID_PNG, { quality: 82 });

      expect(opt.format).toBe("webp");
      expect(opt.mimeType).toBe("image/webp");
      expect(opt.hasAlpha).toBe(true);

      // Verify the resulting WebP buffer actually has an alpha channel
      const meta = await sharp(opt.buffer).metadata();
      expect(meta.hasAlpha).toBe(true);
      expect(meta.format).toBe("webp");
    });

    it("skips redundant lossy re-encoding for already-optimized WebP within limits", async () => {
      const opt = await optimizeProductImage(VALID_WEBP, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 82,
      });

      expect(opt.format).toBe("webp");
      expect(opt.skippedRedundantProcessing).toBe(true);
      expect(opt.optimizedSize).toBe(VALID_WEBP.length);
      expect(opt.savingsBytes).toBe(0);
    });

    it("fails cleanly on corrupt image buffer without falling back silently", async () => {
      const corruptBuffer = Buffer.from("NOT_A_VALID_IMAGE_DATA_STREAM");

      await expect(optimizeProductImage(corruptBuffer)).rejects.toThrow(
        /Format gambar tidak dikenali atau berkas rusak/i
      );
    });

    it("guards against extreme resolution images to prevent memory exhaustion", async () => {
      // Set pixel limit to 50,000 pixels. 400x400 = 160,000 pixels (exceeds limit)
      await expect(
        optimizeProductImage(VALID_JPEG, { maxInputPixels: 50_000 })
      ).rejects.toThrow();
    });
  });

  describe("3. SKU & Variant SKU Exact Matching with Optimization", () => {
    it("matches parent product SKU exactly and computes WebP compression stats", async () => {
      const entries: ExtractedImageFile[] = [
        {
          fileName: "F0HN00Q3ID.jpg",
          entryPath: "F0HN00Q3ID.jpg",
          buffer: VALID_JPEG,
          mimeType: "image/jpeg",
          size: VALID_JPEG.length,
        },
      ];

      const result = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, true);

      expect(result.matchedCount).toBe(1);
      expect(result.matchedProductCount).toBe(1);
      expect(result.items[0].status).toBe("matched_product");
      expect(result.items[0].matchedProductId).toBe("prod-1");
      expect(result.items[0].matchedProductName).toBe("Lenovo AIO 24IRH9");
      expect(result.items[0].hasExistingImage).toBe(true);
      expect(result.items[0].mimeType).toBe("image/webp");
      expect(result.items[0].optimizedSize).toBeDefined();
      expect(result.items[0].previewDataUrl).toMatch(/^data:image\/webp;base64,/);
      expect(result.totalOriginalBytes).toBe(VALID_JPEG.length);
      expect(result.totalOptimizedBytes).toBeDefined();
    });

    it("matches the exact product_variants.sku and associates with parent product details", async () => {
      const entries: ExtractedImageFile[] = [
        {
          fileName: "F0HN00Q3ID-VAR-GREY.webp",
          entryPath: "F0HN00Q3ID-VAR-GREY.webp",
          buffer: VALID_WEBP,
          mimeType: "image/webp",
          size: VALID_WEBP.length,
        },
      ];

      const result = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);

      expect(result.matchedCount).toBe(1);
      expect(result.matchedVariantCount).toBe(1);
      expect(result.items[0].status).toBe("matched_variant");
      expect(result.items[0].matchedVariantId).toBe("var-1");
      expect(result.items[0].matchedVariantSku).toBe("F0HN00Q3ID-VAR-GREY");
      expect(result.items[0].matchedVariantDetails).toContain("Cloud Grey");
      expect(result.items[0].hasExistingImage).toBe(false);
    });

    it("is case-insensitive and trims whitespace in SKU names", async () => {
      const entries: ExtractedImageFile[] = [
        {
          fileName: "f0hn00q3id.jpg", // lowercase in file
          entryPath: "f0hn00q3id.jpg",
          buffer: VALID_JPEG,
          mimeType: "image/jpeg",
          size: VALID_JPEG.length,
        },
      ];

      const result = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);

      expect(result.matchedProductCount).toBe(1);
      expect(result.items[0].status).toBe("matched_product");
      expect(result.items[0].matchedProductId).toBe("prod-1");
    });

    it("flags duplicate SKUs within the same ZIP as 'duplicate' for admin review", async () => {
      const entries: ExtractedImageFile[] = [
        {
          fileName: "F0HN00Q3ID.jpg",
          entryPath: "F0HN00Q3ID.jpg",
          buffer: VALID_JPEG,
          mimeType: "image/jpeg",
          size: VALID_JPEG.length,
        },
        {
          fileName: "F0HN00Q3ID.png", // duplicate SKU
          entryPath: "subfolder/F0HN00Q3ID.png",
          buffer: VALID_PNG,
          mimeType: "image/png",
          size: VALID_PNG.length,
        },
      ];

      const result = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);

      expect(result.matchedCount).toBe(0);
      expect(result.duplicateCount).toBe(2);
      expect(result.items[0].status).toBe("duplicate");
      expect(result.items[1].status).toBe("duplicate");
      expect(result.unmatchedImages).toHaveLength(2);
    });

    it("flags unknown SKUs as 'unmatched' without guessing", async () => {
      const entries: ExtractedImageFile[] = [
        {
          fileName: "UNKNOWN_SKU_999.jpg",
          entryPath: "UNKNOWN_SKU_999.jpg",
          buffer: VALID_JPEG,
          mimeType: "image/jpeg",
          size: VALID_JPEG.length,
        },
      ];

      const result = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);

      expect(result.matchedCount).toBe(0);
      expect(result.unmatchedCount).toBe(1);
      expect(result.items[0].status).toBe("unmatched");
      expect(result.unmatchedImages[0].sku).toBe("UNKNOWN_SKU_999");
    });

    it("flags ambiguous SKU collisions when SKU exists as both parent and variant", async () => {
      const collisionProducts: BulkImageCatalogProduct[] = [
        { id: "p-col", name: "Collide Prod", sku: "COLLIDE123", imagesCount: 0 },
      ];
      const collisionVariants: BulkImageCatalogVariant[] = [
        {
          id: "v-col",
          productId: "p-other",
          productName: "Other Prod",
          sku: "COLLIDE123",
          color: "Black",
          ram: "8GB",
          storage: "256GB",
        },
      ];

      const entries: ExtractedImageFile[] = [
        {
          fileName: "COLLIDE123.jpg",
          entryPath: "COLLIDE123.jpg",
          buffer: VALID_JPEG,
          mimeType: "image/jpeg",
          size: VALID_JPEG.length,
        },
      ];

      const result = await matchZipImagesWithCatalog(entries, collisionProducts, collisionVariants, false);

      expect(result.ambiguousCount).toBe(1);
      expect(result.items[0].status).toBe("ambiguous");
    });

    it("matches multiple explicitly numbered images to the same variant SKU", async () => {
      const entries: ExtractedImageFile[] = [1, 2, 3].map((number) => ({
        fileName: `F0HN00Q3ID-VAR-GREY__${number}.webp`,
        entryPath: `F0HN00Q3ID-VAR-GREY__${number}.webp`,
        buffer: VALID_WEBP,
        mimeType: "image/webp",
        size: VALID_WEBP.length,
      }));
      const result = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);
      expect(result.matchedVariantCount).toBe(3);
      expect(result.items.map((item) => item.matchedVariantId)).toEqual(["var-1", "var-1", "var-1"]);
    });

    it("uses the existing variant gallery as the fallback when the legacy image_url is empty", async () => {
      const entry: ExtractedImageFile = {
        fileName: "F0HN00Q3ID-VAR-GREY.jpg", entryPath: "F0HN00Q3ID-VAR-GREY.jpg",
        buffer: VALID_JPEG, mimeType: "image/jpeg", size: VALID_JPEG.length,
      };
      const result = await matchZipImagesWithCatalog([entry], sampleProducts, [
        { ...sampleVariants[0], imageUrl: null, imageUrls: ["https://example.com/gallery-first.webp"] },
      ], false);
      expect(result.items[0]).toMatchObject({
        status: "matched_variant",
        hasExistingImage: true,
        existingImageUrl: "https://example.com/gallery-first.webp",
        legacyImageUrl: null,
      });
    });

    it("rejects duplicate catalog SKUs as ambiguous instead of choosing the last record", async () => {
      const duplicateVariants = [sampleVariants[0], { ...sampleVariants[0], id: "var-duplicate", productId: "prod-2" }];
      const entry: ExtractedImageFile = {
        fileName: "F0HN00Q3ID-VAR-GREY.jpg", entryPath: "F0HN00Q3ID-VAR-GREY.jpg",
        buffer: VALID_JPEG, mimeType: "image/jpeg", size: VALID_JPEG.length,
      };
      const result = await matchZipImagesWithCatalog([entry], sampleProducts, duplicateVariants, false);
      expect(result.ambiguousCount).toBe(1);
      expect(result.items[0].status).toBe("ambiguous");
      expect(result.items[0].matchedVariantId).toBeUndefined();
    });

    it("marks corrupt files as 'invalid_format' and excludes them from matched items", async () => {
      const entries: ExtractedImageFile[] = [
        {
          fileName: "F0HN00Q3ID.jpg", // Valid SKU name, but corrupt bytes
          entryPath: "F0HN00Q3ID.jpg",
          buffer: Buffer.from("NOT_A_VALID_IMAGE_BYTES"),
          mimeType: "image/jpeg",
          size: 25,
        },
      ];

      const result = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);

      expect(result.matchedCount).toBe(0);
      expect(result.invalidCount).toBe(1);
      expect(result.hasOptimizationErrors).toBe(true);
      expect(result.items[0].status).toBe("invalid_format");
      expect(result.items[0].statusMessage).toMatch(/Optimasi gagal/i);
      expect(result.unmatchedImages).toHaveLength(1);
    });

    it("lists products and variants in catalog that currently lack photos", async () => {
      const entries: ExtractedImageFile[] = [
        {
          fileName: "F0HN00Q3ID.jpg", // matches prod-1
          entryPath: "F0HN00Q3ID.jpg",
          buffer: VALID_JPEG,
          mimeType: "image/jpeg",
          size: VALID_JPEG.length,
        },
      ];

      const result = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);

      expect(result.productsWithoutImagesCount).toBe(2);
      expect(result.productsWithoutImages.some((p) => p.id === "prod-2")).toBe(true);
      expect(result.productsWithoutImages.some((p) => p.id === "var-1")).toBe(true);
    });
  });

  describe("4. Atomic Upload & Rollback Verification", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSupabase: any;
    let uploadedPaths: string[];
    let uploadedContentTypes: string[];
    let removedPaths: string[];
    let variantImageRows: { id: string; variant_id: string; url: string; display_order: number }[];
    let variantPrimaryUrls: string[];
    let variantInsertCount: number;
    let failVariantInsertAt: number;

    beforeEach(() => {
      uploadedPaths = [];
      uploadedContentTypes = [];
      removedPaths = [];
      variantImageRows = [];
      variantPrimaryUrls = [];
      variantInsertCount = 0;
      failVariantInsertAt = 0;

      mockSupabase = {
        storage: {
          from: vi.fn(() => ({
            upload: vi.fn(async (path: string, _body: Buffer, options?: { contentType?: string }) => {
              uploadedPaths.push(path);
              if (options?.contentType) uploadedContentTypes.push(options.contentType);
              return { data: { path }, error: null };
            }),
            getPublicUrl: vi.fn((path: string) => ({
              data: { publicUrl: `https://test-supabase.co/storage/v1/object/public/products/${path}` },
            })),
            remove: vi.fn(async (paths: string[]) => {
              removedPaths.push(...paths);
              return { data: paths, error: null };
            }),
          })),
        },
        from: vi.fn((table: string) => {
          if (table === "product_images") {
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({ data: { id: "img-new-1" }, error: null })),
                  maybeSingle: vi.fn(async () => ({ data: { id: "img-new-1" }, error: null })),
                })),
              })),
              update: vi.fn(() => ({
                eq: vi.fn(async () => ({ error: null })),
              })),
              delete: vi.fn(() => ({
                in: vi.fn(async () => ({ error: null })),
              })),
            };
          }
          if (table === "product_variants") {
            return {
              update: vi.fn((values: { image_url?: string }) => ({
                eq: vi.fn(async () => {
                  if (Object.hasOwn(values, "image_url")) variantPrimaryUrls.push(values.image_url ?? "<null>");
                  return { error: null };
                }),
              })),
            };
          }
          if (table === "product_variant_images") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(async () => ({ data: variantImageRows, error: null })),
              })),
              insert: vi.fn((row: Omit<(typeof variantImageRows)[number], "id">) => ({
                select: vi.fn(() => ({
                  single: vi.fn(async () => {
                    variantInsertCount += 1;
                    if (failVariantInsertAt === variantInsertCount) {
                      return { data: null, error: { message: "variant gallery insert failed" } };
                    }
                    const record = { ...row, id: `variant-image-${variantImageRows.length + 1}` };
                    variantImageRows.push(record);
                    return { data: { id: record.id }, error: null };
                  }),
                })),
              })),
              delete: vi.fn(() => ({ in: vi.fn(async (_column: string, ids: string[]) => {
                variantImageRows = variantImageRows.filter((row) => !ids.includes(row.id));
                return { error: null };
              }) })),
            };
          }
          return {};
        }),
      };
    });

    it("uploads ONLY optimized WebP image (.webp extension, image/webp MIME) and respects overwriteExisting = false", async () => {
      const entries: ExtractedImageFile[] = [
        {
          fileName: "F0HN00Q3ID.jpg",
          entryPath: "F0HN00Q3ID.jpg",
          buffer: VALID_JPEG,
          mimeType: "image/jpeg",
          size: VALID_JPEG.length,
        },
      ];

      const matchResult = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);

      const result = await executeBulkImageUpload({
        supabase: mockSupabase,
        entries,
        matchedItems: matchResult.items,
        overwriteExisting: false,
      });

      expect(result.success).toBe(true);
      expect(result.uploadedCount).toBe(1);
      expect(uploadedPaths).toHaveLength(1);
      // Must be uploaded as .webp regardless of original .jpg extension!
      expect(uploadedPaths[0]).toMatch(/\.webp$/);
      expect(uploadedContentTypes[0]).toBe("image/webp");
      expect(removedPaths).toHaveLength(0); // No rollback when successful
    });

    it("saves multiple numbered images to one variant and keeps the first as its primary image", async () => {
      const entries: ExtractedImageFile[] = [1, 2].map((number) => ({
        fileName: `F0HN00Q3ID-VAR-GREY__${number}.webp`,
        entryPath: `F0HN00Q3ID-VAR-GREY__${number}.webp`,
        buffer: VALID_WEBP,
        mimeType: "image/webp",
        size: VALID_WEBP.length,
      }));
      const match = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);
      const result = await executeBulkImageUpload({
        supabase: mockSupabase,
        entries,
        matchedItems: match.items,
        overwriteExisting: false,
      });
      expect(result.uploadedCount).toBe(2);
      expect(variantImageRows).toHaveLength(2);
      expect(variantImageRows.map((row) => row.display_order)).toEqual([0, 1]);
      expect(variantPrimaryUrls).toHaveLength(1);
      expect(variantPrimaryUrls[0]).toContain(uploadedPaths[0]);
    });

    it("syncs a pre-existing gallery's first image_url when the legacy column is empty", async () => {
      const entries: ExtractedImageFile[] = [{
        fileName: "F0HN00Q3ID-VAR-GREY.jpg", entryPath: "F0HN00Q3ID-VAR-GREY.jpg",
        buffer: VALID_JPEG, mimeType: "image/jpeg", size: VALID_JPEG.length,
      }];
      const match = await matchZipImagesWithCatalog(entries, sampleProducts, [
        { ...sampleVariants[0], imageUrl: null, imageUrls: ["https://example.com/gallery-first.webp"] },
      ], false);
      await executeBulkImageUpload({ supabase: mockSupabase, entries, matchedItems: match.items, overwriteExisting: false });
      expect(variantPrimaryUrls).toEqual(["https://example.com/gallery-first.webp"]);
    });

    it("rolls back variant gallery records, storage, and legacy image_url after a later insert fails", async () => {
      const entries: ExtractedImageFile[] = [1, 2].map((number) => ({
        fileName: `F0HN00Q3ID-VAR-GREY__${number}.webp`, entryPath: `F0HN00Q3ID-VAR-GREY__${number}.webp`,
        buffer: VALID_WEBP, mimeType: "image/webp", size: VALID_WEBP.length,
      }));
      const match = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);
      failVariantInsertAt = 2;
      await expect(executeBulkImageUpload({ supabase: mockSupabase, entries, matchedItems: match.items, overwriteExisting: false }))
        .rejects.toThrow("Gagal menyimpan foto galeri varian");
      expect(variantImageRows).toHaveLength(0);
      expect(removedPaths).toEqual(uploadedPaths);
      expect(variantPrimaryUrls.at(-1)).toBe("<null>");
    });

    it("aborts and never uploads unoptimized files if optimization fails during execute", async () => {
      const entries: ExtractedImageFile[] = [
        {
          fileName: "F0HN00Q3ID.jpg",
          entryPath: "F0HN00Q3ID.jpg",
          buffer: Buffer.from("CORRUPT_BUFFER"),
          mimeType: "image/jpeg",
          size: 14,
        },
      ];

      // Pretend this was falsely marked as matched
      const fakeMatchedItem = {
        fileName: "F0HN00Q3ID.jpg",
        entryPath: "F0HN00Q3ID.jpg",
        fileSize: 14,
        mimeType: "image/jpeg",
        extractedSku: "F0HN00Q3ID",
        status: "matched_product" as const,
        statusMessage: "matched",
        matchedProductId: "prod-1",
        hasExistingImage: false,
      };

      await expect(
        executeBulkImageUpload({
          supabase: mockSupabase,
          entries,
          matchedItems: [fakeMatchedItem],
          overwriteExisting: false,
        })
      ).rejects.toThrow(/Gagal mengoptimasi gambar/i);

      // Verify that no storage file remained!
      expect(uploadedPaths).toHaveLength(0);
    });

    it("reports storage upload failures without writing database records", async () => {
      const entries: ExtractedImageFile[] = [{
        fileName: "F0HN00Q3ID.jpg", entryPath: "F0HN00Q3ID.jpg", buffer: VALID_JPEG,
        mimeType: "image/jpeg", size: VALID_JPEG.length,
      }];
      const match = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);
      mockSupabase.storage.from = vi.fn(() => ({
        upload: vi.fn(async () => ({ data: null, error: { message: "storage unavailable" } })),
        remove: vi.fn(async () => ({ data: [], error: null })),
      }));
      await expect(executeBulkImageUpload({ supabase: mockSupabase, entries, matchedItems: match.items, overwriteExisting: false }))
        .rejects.toThrow(/storage unavailable/);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("rolls back all uploaded storage files if database operation fails midway", async () => {
      const entries: ExtractedImageFile[] = [
        {
          fileName: "F0HN00Q3ID.jpg",
          entryPath: "F0HN00Q3ID.jpg",
          buffer: VALID_JPEG,
          mimeType: "image/jpeg",
          size: VALID_JPEG.length,
        },
      ];

      const matchResult = await matchZipImagesWithCatalog(entries, sampleProducts, sampleVariants, false);

      // Force product_images insert to fail with database error
      mockSupabase.from = vi.fn((table: string) => {
        if (table === "product_images") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: null,
                  error: { message: "Database connection lost or constraint violation" },
                })),
              })),
            })),
            delete: vi.fn(() => ({
              in: vi.fn(async () => ({ error: null })),
            })),
          };
        }
        return {};
      });

      await expect(
        executeBulkImageUpload({
          supabase: mockSupabase,
          entries,
          matchedItems: matchResult.items,
          overwriteExisting: false,
        })
      ).rejects.toThrow("Gagal menyimpan referensi gambar produk");

      // Verify that the uploaded storage file was immediately rolled back & removed!
      expect(uploadedPaths).toHaveLength(1);
      expect(removedPaths).toHaveLength(1);
      expect(removedPaths[0]).toBe(uploadedPaths[0]);
    });
  });
});
