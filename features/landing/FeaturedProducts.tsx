import Link from "next/link";
import { ProductCard } from "@/components/shared/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { type Product } from "@/store/useProductStore";

interface FeaturedProductsProps {
  title: string;
  type: "bestseller" | "new" | "promo";
  initialData?: Product[];
  subtitle?: string;
}

export function FeaturedProducts({ title, type, initialData = [], subtitle }: FeaturedProductsProps) {
  const products = initialData.slice(0, 4);
  const gridClass = products.length === 1
    ? "max-w-xl grid-cols-1"
    : products.length === 2
      ? "max-w-4xl grid-cols-1 sm:grid-cols-2"
      : products.length === 3
        ? "max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:mb-10 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-foreground">
            {title}
          </h2>
          <p className="text-muted-foreground text-lg">
            {subtitle ?? (type === "bestseller" ? "Most loved by our customers." : "Discover the latest innovations.")}
          </p>
        </div>
        <Button variant="outline" className="self-start rounded-full md:self-auto" render={<Link href={type === "promo" ? "/promo" : `/products?sort=${type}`} />}>
          Lihat semua <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {products.length ? <div className={`mx-auto grid w-full gap-5 sm:gap-6 ${gridClass}`}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div> : <div className="rounded-2xl border border-dashed bg-card/60 px-5 py-8 text-center text-sm text-muted-foreground">Produk pilihan akan segera hadir.</div>}
    </section>
  );
}
