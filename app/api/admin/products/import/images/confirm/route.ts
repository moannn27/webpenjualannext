import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { recordAdminActivity } from "@/lib/audit-log";
import {
  extractZipImages,
  matchZipImagesWithCatalog,
  executeBulkImageUpload,
  type BulkImageCatalogProduct,
  type BulkImageCatalogVariant,
} from "@/lib/bulk-image-upload";

export const runtime = "nodejs";
export const maxDuration = 120;
const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: Request) {
  try {
    const { user, isAdmin, adminName, role } = await getAdminAccess();
    if (!user || !isAdmin) {
      return NextResponse.json({ error: "Akses admin diperlukan." }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const overwriteExisting = form.get("overwriteExisting") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Pilih berkas ZIP yang ingin diunggah." }, { status: 400 });
    }

    if (file.size < 1 || file.size > MAX_ZIP_BYTES) {
      return NextResponse.json(
        { error: `Ukuran file ZIP maksimal 50 MB. Ukuran file ini: ${(file.size / (1024 * 1024)).toFixed(1)} MB.` },
        { status: 413 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "zip") {
      return NextResponse.json({ error: "Format berkas harus berekstensi .zip." }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const entries = await extractZipImages(buffer);

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "Berkas ZIP tidak memuat gambar valid." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const [prodsRes, varsRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, sku, product_images(id, url, is_primary)")
        .not("sku", "is", null),
      supabase
        .from("product_variants")
        .select("id, product_id, sku, color, ram, storage, image_url, product_variant_images(url, display_order), products(name)")
        .not("sku", "is", null),
    ]);

    if (prodsRes.error) {
      throw new Error(`Gagal mengambil data produk: ${prodsRes.error.message}`);
    }
    if (varsRes.error) {
      throw new Error(`Gagal mengambil data varian: ${varsRes.error.message}`);
    }

    const catalogProducts: BulkImageCatalogProduct[] = (prodsRes.data ?? []).map((p) => {
      type ImgType = { id: string; url: string; is_primary: boolean };
      const imgs = (p.product_images as unknown as ImgType[]) ?? [];
      const primary = imgs.find((img) => img.is_primary) ?? imgs[0];
      return {
        id: p.id,
        name: p.name,
        sku: p.sku || "",
        imagesCount: imgs.length,
        primaryImageUrl: primary?.url ?? null,
      };
    });

    const catalogVariants: BulkImageCatalogVariant[] = (varsRes.data ?? []).map((v) => {
      const prodName = (v.products as unknown as { name?: string })?.name || "Produk";
      const images = ((v.product_variant_images as unknown as { url: string; display_order: number }[]) ?? [])
        .slice().sort((a, b) => a.display_order - b.display_order);
      return {
        id: v.id,
        productId: v.product_id,
        productName: prodName,
        sku: v.sku || "",
        color: v.color || "",
        ram: v.ram || "",
        storage: v.storage || "",
        imageUrl: v.image_url ?? null,
        imageUrls: images.map((image) => image.url),
      };
    });

    // Match and optimize images without thumbnail generation for fast processing
    const matchResult = await matchZipImagesWithCatalog(entries, catalogProducts, catalogVariants, false);

    if (matchResult.matchedCount === 0) {
      return NextResponse.json(
        { error: "Tidak ada gambar valid yang cocok dengan SKU produk atau varian untuk diupload." },
        { status: 400 }
      );
    }

    const execution = await executeBulkImageUpload({
      supabase,
      entries,
      matchedItems: matchResult.items,
      overwriteExisting,
    });

    const savedKb = execution.totalSavedBytes ? (execution.totalSavedBytes / 1024).toFixed(0) : "0";

    await recordAdminActivity({
      admin_id: user.id,
      admin_name: adminName || "Admin",
      admin_role: role || "admin",
      action: "create",
      entity_type: "product",
      entity_name: "Bulk Image Upload",
      details: `Mengunggah ${execution.uploadedCount} foto produk WebP via ZIP (${execution.updatedProductsCount} produk induk, ${execution.updatedVariantsCount} varian). Penghematan kompresi: ${savedKb} KB. Kebijakan timpa: ${overwriteExisting ? "Ya" : "Tidak"}.`,
    });

    return NextResponse.json({
      success: true,
      uploadedCount: execution.uploadedCount,
      updatedProductsCount: execution.updatedProductsCount,
      updatedVariantsCount: execution.updatedVariantsCount,
      totalSavedBytes: execution.totalSavedBytes ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan gambar ke penyimpanan." },
      { status: 400 }
    );
  }
}

