import { ProductDetail } from "@/features/product/ProductDetail";
import { FeaturedProducts } from "@/features/landing/FeaturedProducts";
import { getProductByIdAction, getBestSellerAction } from "@/actions/product";
import { notFound } from "next/navigation";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProductByIdAction(params.id);
  const bestSellers = await getBestSellerAction();

  if (!product) {
    notFound();
  }
  
  return (
    <div className="pt-8 pb-24">
      <ProductDetail product={product} />
      <div className="mt-24">
        <FeaturedProducts title="Related Products" type="bestseller" initialData={bestSellers || []} />
      </div>
    </div>
  );
}
