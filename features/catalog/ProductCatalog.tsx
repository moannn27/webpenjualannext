"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductCard } from "@/components/shared/ProductCard";
import { useAddToCart } from "@/features/cart/useAddToCart";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List as ListIcon, Filter } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { type Product } from "@/store/useProductStore";

interface ProductCatalogProps {
  initialProducts?: Product[];
  initialSort?: string;
}

export function ProductCatalog({ initialProducts = [], initialSort = "newest" }: ProductCatalogProps) {
  const { addToCart, loadingProductId } = useAddToCart();
  const products = initialProducts;
  const brands = [...new Set(products.map((product) => product.brand).filter(Boolean))] as string[];
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))] as string[];
  const payablePrice = (product: typeof products[number]) => product.discountPrice ?? product.price;
  const maximumPrice = Math.max(5000, ...products.map(payablePrice));
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState([0, maximumPrice]);

  // Dummy state for active filters
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);

  const filteredProducts = products.filter((product) =>
    payablePrice(product) >= priceRange[0] && payablePrice(product) <= priceRange[1] &&
    (!selectedBrands.length || selectedBrands.includes(product.brand ?? "")) &&
    (!selectedCategories.length || selectedCategories.includes(product.category))
  );
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sort === "price-low") return payablePrice(a) - payablePrice(b);
    if (sort === "price-high") return payablePrice(b) - payablePrice(a);
    if (sort === "popular") return Number(b.isBestSeller) - Number(a.isBestSeller) || (b.reviews ?? 0) - (a.reviews ?? 0);
    return 0;
  });
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const visibleProducts = sortedProducts.slice((page - 1) * pageSize, page * pageSize);

  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandId) ? prev.filter(b => b !== brandId) : [...prev, brandId]
    );
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const filterSidebar = (
    <div className="space-y-8">
      {/* Price Filter */}
      <div>
        <h4 className="font-semibold mb-4 text-foreground">Kisaran harga</h4>
        <Slider
          defaultValue={[0, maximumPrice]}
          max={maximumPrice}
          step={Math.max(1, Math.round(maximumPrice / 100))}
          value={priceRange}
          onValueChange={(value) => {
            if (Array.isArray(value)) setPriceRange([...value]);
          }}
          className="mb-4"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Rp {priceRange[0].toLocaleString("id-ID")}</span>
          <span>Rp {priceRange[1].toLocaleString("id-ID")}</span>
        </div>
      </div>

      {/* Brands Filter */}
      <div>
        <h4 className="font-semibold mb-4 text-foreground">Brand</h4>
        <div className="space-y-3">
          {brands.map((brand) => (
            <div key={brand} className="flex items-center space-x-2">
              <Checkbox
                id={`brand-${brand}`}
                checked={selectedBrands.includes(brand)}
                onCheckedChange={() => { toggleBrand(brand); setPage(1); }}
              />
              <label
                htmlFor={`brand-${brand}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {brand}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <h4 className="font-semibold mb-4 text-foreground">Kategori</h4>
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${category}`}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => { toggleCategory(category); setPage(1); }}
              />
              <label
                htmlFor={`cat-${category}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {category}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          {filterSidebar}
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b">
            
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger render={<Button variant="outline" size="sm" className="lg:hidden" />}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filter produk</SheetTitle>
                  </SheetHeader>
                  <div className="py-6">
                    {filterSidebar}
                  </div>
                </SheetContent>
              </Sheet>
              <span className="text-sm text-muted-foreground">Menampilkan {visibleProducts.length} dari {filteredProducts.length} produk</span>
            </div>

            <div className="flex w-full items-center justify-end gap-3 sm:w-auto sm:gap-4">
              <Select value={sort} onValueChange={(value) => { if (value) { setSort(value); setPage(1); } }}>
              <SelectTrigger className="h-10 w-full min-w-0 sm:w-44">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent className="min-w-[220px] rounded-xl p-1.5">
                  <SelectItem value="newest">Terbaru</SelectItem>
                  <SelectItem value="popular">Terpopuler</SelectItem>
                  <SelectItem value="price-low">Harga: terendah</SelectItem>
                  <SelectItem value="price-high">Harga: tertinggi</SelectItem>
                </SelectContent>
              </Select>

              <div role="group" aria-label="Tampilan produk" className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-muted/60 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Tampilan grid"
                  aria-pressed={viewMode === "grid"}
                  className={`grid size-9 place-items-center rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${viewMode === "grid" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
                  title="Tampilan grid"
                >
                  <LayoutGrid className="size-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="Tampilan daftar"
                  aria-pressed={viewMode === "list"}
                  className={`grid size-9 place-items-center rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${viewMode === "list" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
                  title="Tampilan daftar"
                >
                  <ListIcon className="size-[18px]" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Grid/List */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
              {visibleProducts.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Produk tidak ditemukan. Coba kata kunci lain atau hapus filter yang aktif.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Simple List View implementation */}
              {visibleProducts.map((product) => (
                <div key={product.id} className="flex gap-6 p-4 bg-card rounded-2xl border items-center">
                  <div className="w-32 h-32 relative shrink-0 bg-muted rounded-xl overflow-hidden">
                    <Image src={product.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"} alt={product.name} fill sizes="128px" className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                    <p className="text-muted-foreground mb-4">{product.brand || product.category}</p>
                    <div className="text-2xl font-bold">Rp {payablePrice(product).toLocaleString("id-ID")}</div>
                  </div>
                  <Button className="shrink-0 z-10" disabled={loadingProductId === product.id} onClick={() => addToCart(product.id)}>Add to Cart</Button>
                </div>
              ))}
              {visibleProducts.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Produk tidak ditemukan. Coba kata kunci lain atau hapus filter yang aktif.
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-12 flex justify-center gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Sebelumnya</Button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <Button key={pageNumber} variant={pageNumber === page ? "default" : "outline"} onClick={() => setPage(pageNumber)}>{pageNumber}</Button>
            ))}
            <Button variant="outline" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Berikutnya</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
