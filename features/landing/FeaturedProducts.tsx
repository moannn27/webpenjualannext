import Link from "next/link";
import { ProductCard } from "@/components/shared/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { type Product } from "@/store/useProductStore";

interface FeaturedProductsProps {
  title: string;
  type: "bestseller" | "new";
  initialData?: Product[];
}

export function FeaturedProducts({ title, type, initialData = [] }: FeaturedProductsProps) {
  // If no backend data is provided, fallback to empty array or we can just render the array passed in
  const products = initialData.slice(0, 4);

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-foreground">
            {title}
          </h2>
          <p className="text-muted-foreground text-lg">
            {type === "bestseller" ? "Most loved by our customers." : "Discover the latest innovations."}
          </p>
        </div>
        <Button variant="outline" className="rounded-full" render={<Link href={`/products?sort=${type}`} />}>
          View All <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
