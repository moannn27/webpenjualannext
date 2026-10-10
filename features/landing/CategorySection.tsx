import Image from "next/image";
import Link from "next/link";

export function CategorySection({
  categories = [],
  title = "Belanja Berdasarkan Kategori",
  subtitle = "Temukan perangkat dan aksesoris pilihan yang kamu butuhkan.",
}: {
  categories?: { id: string; name: string; image_url?: string | null; image?: string; slug?: string }[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="container mx-auto mt-8 px-4 sm:px-6 lg:px-8 sm:mt-12">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
        <div>
          <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {title}
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            {subtitle}
          </p>
        </div>
        <Link href="/category" className="flex items-center gap-1 font-medium text-primary hover:underline">
          Lihat Semua Kategori <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-6">
        {categories.map((category) => {
          const href = category.slug ? `/category/${category.slug}` : `/products?category=${category.id}`;
          return (
            <Link
              key={category.id}
              href={href}
              aria-label={`Kategori ${category.name}`}
              className="group flex flex-col items-center gap-3 rounded-3xl p-4 transition-colors hover:bg-muted/50 sm:gap-4"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={category.image_url || category.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"}
                  alt={`Kategori ${category.name}`}
                  fill
                  sizes="(min-width: 1024px) 16vw, (min-width: 768px) 28vw, 44vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span className="text-center font-medium text-foreground transition-colors group-hover:text-primary">
                {category.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
