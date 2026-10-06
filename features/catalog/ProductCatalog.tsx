"use client";

import { useState } from "react";
import Image from "next/image";
import { BRANDS, CATEGORIES } from "@/constants/dummy";
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
}

export function ProductCatalog({ initialProducts = [] }: ProductCatalogProps) {
  const { addToCart, loadingProductId } = useAddToCart();
  const products = initialProducts;
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState([0, 5000]);

  // Dummy state for active filters
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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
        <h4 className="font-semibold mb-4 text-foreground">Price Range</h4>
        <Slider
          defaultValue={[0, 5000]}
          max={5000}
          step={50}
          value={priceRange}
          onValueChange={(value) => {
            if (Array.isArray(value)) setPriceRange([...value]);
          }}
          className="mb-4"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>${priceRange[0]}</span>
          <span>${priceRange[1]}</span>
        </div>
      </div>

      {/* Brands Filter */}
      <div>
        <h4 className="font-semibold mb-4 text-foreground">Brands</h4>
        <div className="space-y-3">
          {BRANDS.map((brand) => (
            <div key={brand.id} className="flex items-center space-x-2">
              <Checkbox
                id={`brand-${brand.id}`}
                checked={selectedBrands.includes(brand.id)}
                onCheckedChange={() => toggleBrand(brand.id)}
              />
              <label
                htmlFor={`brand-${brand.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {brand.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <h4 className="font-semibold mb-4 text-foreground">Categories</h4>
        <div className="space-y-3">
          {CATEGORIES.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <label
                htmlFor={`cat-${category.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {category.name}
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
                  Filters
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="py-6">
                    {filterSidebar}
                  </div>
                </SheetContent>
              </Sheet>
              <span className="text-sm text-muted-foreground">Showing {products.length} results</span>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-auto">
              <Select defaultValue="newest">
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center border rounded-md">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title="List View"
                >
                  <ListIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Grid/List */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
              {products.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No products found. Add some from the admin panel!
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Simple List View implementation */}
              {products.map((product) => (
                <div key={product.id} className="flex gap-6 p-4 bg-card rounded-2xl border items-center">
                  <div className="w-32 h-32 relative shrink-0 bg-muted rounded-xl overflow-hidden">
                    <Image src={product.image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"} alt={product.name} fill sizes="128px" className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                    <p className="text-muted-foreground mb-4">{product.brand || product.category}</p>
                    <div className="text-2xl font-bold">${product.price.toLocaleString()}</div>
                  </div>
                  <Button className="shrink-0 z-10" disabled={loadingProductId === product.id} onClick={() => addToCart(product.id)}>Add to Cart</Button>
                </div>
              ))}
              {products.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No products found. Add some from the admin panel!
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-12 flex justify-center gap-2">
            <Button variant="outline" disabled>Previous</Button>
            <Button variant="default">1</Button>
            <Button variant="outline">2</Button>
            <Button variant="outline">3</Button>
            <Button variant="outline">Next</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
