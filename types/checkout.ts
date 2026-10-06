export const SHIPPING_METHOD_CODES = ["standard", "express"] as const;
export const PAYMENT_METHOD = "manual_transfer" as const;

export type ShippingMethodCode = (typeof SHIPPING_METHOD_CODES)[number];

export interface ShippingMethod {
  code: ShippingMethodCode;
  name: string;
  delivery_estimate: string;
  price: number;
}

export interface CheckoutAddress {
  recipient_name: string;
  phone: string;
  street_address: string;
  city: string;
  province: string;
  postal_code: string;
}