import { ProductDetail } from "@/features/product/ProductDetail";
import { FeaturedProducts } from "@/features/landing/FeaturedProducts";
import { getProductByIdAction, getRelatedProductsAction } from "@/actions/product";
import { getProductReviewsAction } from "@/actions/review";
import { getProductCartQuantitiesAction } from "@/actions/cart";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import { getRecommendationSubtitle, type ProductCandidate } from "@/lib/product-recommendations";
import { notFound } from "next/navigation";
import { buildProductJsonLd } from "@/lib/seo";
import { stripHtmlToPlainText } from "@/lib/sanitize-html";
import { createClient } from "@/lib/supabase/server";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { isKnownPromotionalArtwork } from "@/lib/product-gallery";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductByIdAction(id).catch((err) => {
    console.error('Product fetch error for ID:', id, err);
    return null;
  });
  if (!product) return { title: "Produk Tidak Ditemukan" };
  const productImages = product.product_images as { url: string; is_primary?: boolean }[] | undefined;
  const imageUrl = productImages?.find((image) => image.is_primary && !isKnownPromotionalArtwork(image.url))?.url
    ?? productImages?.find((image) => !isKnownPromotionalArtwork(image.url))?.url;
  const title = product.name;
  const plainDesc = stripHtmlToPlainText(product.description);
  const description = plainDesc
    ? plainDesc.slice(0, 160)
    : `Lihat spesifikasi lengkap dan harga ${product.name} di Next Solution Store.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/product/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `/product/${id}`,
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductByIdAction(id).catch((err) => {
    console.error('Product fetch error for ID:', id, err);
    return null;
  });

  if (!product) {
    notFound();
  }

  const supabase = await createClient();
  const [relatedProducts, reviews, cartQuantities, sfRow] = await Promise.all([
    getRelatedProductsAction(id, 8, product).catch(() => []),
    getProductReviewsAction(id).catch(() => []),
    getProductCartQuantitiesAction(id).catch(() => []),
    supabase.from("storefront_settings").select("settings").eq("id", "main").maybeSingle(),
  ]);

  const sfSettings = normalizeStorefrontSettings(sfRow?.data?.settings ?? {});
  const stockLocation = sfSettings.features.stock_location_display_enabled
    ? {
        name: sfSettings.features.stock_location_name || "Gerai Utama Next Solution Bandung (Jl. Kartini No. 09)",
        leadTime: sfSettings.features.stock_location_lead_time || "Siap Diambil di Toko / Dikirim Cepat",
      }
    : undefined;

  const productJsonLd = buildProductJsonLd(product, reviews ?? []);
  const subtitle = getRecommendationSubtitle(product as unknown as ProductCandidate);
  const categoryLink = product.categories?.id ? `/products?category=${product.categories.id}` : undefined;

  return (
    <div className="pt-8 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c') }}
      />
      <ProductDetail product={product} reviews={reviews ?? []} initialCartQuantities={cartQuantities} stockLocation={stockLocation} />
      {relatedProducts.length > 0 && (
        <div className="mt-24">
          <FeaturedProducts
            title="Produk Serupa yang Mungkin Kamu Suka"
            subtitle={subtitle}
            type="bestseller"
            viewAllHref={categoryLink}
            initialData={(relatedProducts as StoreProduct[]).map((item) => toStorefrontProduct(item))}
          />
        </div>
      )}
    </div>
  );
}
