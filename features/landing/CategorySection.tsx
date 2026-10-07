import Image from "next/image";
import Link from "next/link";

export function CategorySection({ categories = [], title = "Shop by Category", subtitle = "Find exactly what you're looking for." }: { categories?: { id: string; name: string; image_url?: string | null; image?: string; slug?: string }[]; title?: string; subtitle?: string }) {
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 mt-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-foreground">
            {title}
          </h2>
          <p className="text-muted-foreground text-lg">
            {subtitle}
          </p>
        </div>
        <Link href="/category" className="text-primary font-medium hover:underline flex items-center gap-1">
          View All Categories <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${category.id}`}
            className="group flex flex-col items-center gap-4 p-4 rounded-3xl hover:bg-muted/50 transition-colors"
          >
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted">
              <Image
                src={category.image_url || category.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"}
                alt={category.name}
                fill
                sizes="(min-width: 1024px) 16vw, (min-width: 768px) 28vw, 44vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <span className="font-medium text-foreground group-hover:text-primary transition-colors">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
