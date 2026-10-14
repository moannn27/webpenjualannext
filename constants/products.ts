export interface ProductItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  sku?: string;
  brand?: string;
  originalPrice?: number | null;
  discountPrice?: number | null;
  rating?: number;
  reviews?: number;
  badges?: string[];
  status?: string;
}

/**
 * Single source of truth for master product data with consistent fields:
 * id, name, price, category, image, stock
 */
export const MASTER_PRODUCTS: ProductItem[] = [
  {
    id: "1",
    name: "MacBook Pro 16\" M3 Max",
    sku: "MBP-M3M-16",
    price: 3499,
    originalPrice: 3699,
    discountPrice: null,
    stock: 12,
    status: "Active",
    category: "Laptops",
    brand: "Apple",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=2000&auto=format&fit=crop",
    rating: 4.9,
    reviews: 128,
    badges: ["New", "Best Seller"],
  },
  {
    id: "2",
    name: "iPhone 15 Pro Titanium",
    sku: "IP15P-TI-256",
    price: 999,
    originalPrice: null,
    discountPrice: null,
    stock: 45,
    status: "Active",
    category: "Smartphones",
    brand: "Apple",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop",
    rating: 4.8,
    reviews: 215,
    badges: ["Best Seller"],
  },
  {
    id: "3",
    name: "iPad Air 5th Gen",
    sku: "IPAD-A5-64",
    price: 599,
    originalPrice: 699,
    discountPrice: 599,
    stock: 5,
    status: "Low Stock",
    category: "Tablets",
    brand: "Apple",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop",
    rating: 4.9,
    reviews: 89,
    badges: ["Sale"],
  },
  {
    id: "4",
    name: "Sony WH-1000XM5",
    sku: "SNY-WH5-BLK",
    price: 399,
    originalPrice: 429,
    discountPrice: null,
    stock: 10,
    status: "Active",
    category: "Accessories",
    brand: "Sony",
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop",
    rating: 4.7,
    reviews: 412,
    badges: [],
  },
  {
    id: "5",
    name: "Samsung Galaxy S24 Ultra",
    sku: "SGS24U-512",
    price: 1299,
    originalPrice: 1399,
    discountPrice: null,
    stock: 23,
    status: "Active",
    category: "Smartphones",
    brand: "Samsung",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=800&auto=format&fit=crop",
    rating: 4.8,
    reviews: 256,
    badges: ["Pre-order"],
  },
];

const productLookupMap = new Map<string, ProductItem>();
MASTER_PRODUCTS.forEach((product) => {
  productLookupMap.set(product.id, product);
  productLookupMap.set(`p${product.id}`, product);
  if (product.sku) {
    productLookupMap.set(product.sku, product);
  }
});

/**
 * Re-lookup product from master product data by ID or SKU to guarantee verified price
 */
export function getMasterProductById(id: string): ProductItem | undefined {
  if (!id) return undefined;
  return productLookupMap.get(id) || MASTER_PRODUCTS.find((p) => p.id === id);
}

/**
 * Unique category pills derived from master product truth
 */
export const MASTER_CATEGORIES = Array.from(
  new Set(MASTER_PRODUCTS.map((p) => p.category))
);

