export interface CartProduct {
  id: string;
  name: string;
  price: number;
  discount_price?: number | null;
  image?: string | null;
  stock?: number;
  product_images?: { url: string; is_primary?: boolean }[];
  product_specifications?: { key: string; value: string; display_order?: number | null }[];
  category_id?: string | null;
  brand_id?: string | null;
  categories?: { id?: string; name: string } | null;
  brands?: { id?: string; name: string } | null;
}

export interface CartVariant {
  id: string;
  sku: string | null;
  color: string;
  ram: string;
  storage: string;
  price: number | null;
  discount_price: number | null;
  stock: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  products: CartProduct;
  product_variants?: CartVariant | null;
}

export interface CartData {
  id: string;
  cart_items: CartItem[];
}
