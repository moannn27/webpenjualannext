import { ProductDetail } from "@/features/product/ProductDetail";
import { FeaturedProducts } from "@/features/landing/FeaturedProducts";
import { getProductByIdAction, getBestSellerAction } from "@/actions/product";
import { getProductReviewsAction } from "@/actions/review";
import { toStorefrontProduct, type StoreProduct } from "@/lib/products";
import { notFound } from "next/navigation";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, bestSellers, reviews] = await Promise.all([
    getProductByIdAction(id),
    getBestSellerAction().catch(() => []),
    getProductReviewsAction(id).catch(() => []),
  ]);

  if (!product) {
    notFound();
  }
  
  return (
    <div className="pt-8 pb-24">
      <ProductDetail product={product} reviews={reviews ?? []} />
      <div className="mt-24">
      <FeaturedProducts title="Related Products" type="bestseller" initialData={(bestSellers || []).filter((item) => item.id !== product.id).map((item) => toStorefrontProduct(item as StoreProduct))} />
      </div>
    </div>
  );
}
