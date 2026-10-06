import Image from "next/image";
import Link from "next/link";
import { CATEGORIES } from "@/constants/dummy";

export function CategorySection() {
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 mt-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-foreground">
            Shop by Category
          </h2>
          <p className="text-muted-foreground text-lg">
            Find exactly what you&apos;re looking for.
          </p>
        </div>
        <Link href="/category" className="text-primary font-medium hover:underline flex items-center gap-1">
          View All Categories <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
        {CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className="group flex flex-col items-center gap-4 p-4 rounded-3xl hover:bg-muted/50 transition-colors"
          >
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted">
              <Image
                src={category.image}
                alt={category.name}
                fill
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
