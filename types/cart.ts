export interface CartProduct {
  id: string;
  name: string;
  price: number;
  discount_price?: number | null;
  image?: string | null;
  stock?: number;
  product_images?: { url: string; is_primary?: boolean }[];
  brands?: { name: string } | null;
}

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  products: CartProduct;
}

export interface CartData {
  id: string;
  cart_items: CartItem[];
}
