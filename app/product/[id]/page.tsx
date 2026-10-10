import { ProductDetail } from "@/features/product/ProductDetail";
import { FeaturedProducts } from "@/features/landing/FeaturedProducts";
import { getProductByIdAction, getBestSellerAction } from "@/actions/product";
import { getProductReviewsAction } from "@/actions/review";
import { getProductCartQuantitiesAction } from "@/actions/cart";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import { notFound } from "next/navigation";
import { buildProductJsonLd } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductByIdAction(id).catch(() => null);
  if (!product) return { title: "Produk Tidak Ditemukan" };
  const imageUrl = product.product_images?.[0]?.url;
  const title = product.name;
  const description = product.description
    ? String(product.description).slice(0, 160)
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
  const [product, bestSellers, reviews, cartQuantities] = await Promise.all([
    getProductByIdAction(id),
    getBestSellerAction().catch(() => []),
    getProductReviewsAction(id).catch(() => []),
    getProductCartQuantitiesAction(id).catch(() => []),
  ]);

  if (!product) {
    notFound();
  }

  const productJsonLd = buildProductJsonLd(product, reviews ?? []);

  return (
    <div className="pt-8 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductDetail product={product} reviews={reviews ?? []} initialCartQuantities={cartQuantities} />
      <div className="mt-24">
        <FeaturedProducts
          title="Produk Terkait & Terpopuler"
          subtitle="Pilihan laptop dan perangkat elektronik populer lainnya untukmu."
          type="bestseller"
          initialData={(bestSellers || []).filter((item) => item.id !== product.id).map((item) => toStorefrontProduct(item as StoreProduct))}
        />
      </div>
    </div>
  );
}
