import { CheckoutClient } from "@/features/checkout/CheckoutClient";
import { getCartAction } from "@/actions/cart";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type CheckoutAddress, type ShippingMethod, type ShippingMethodCode } from "@/types/checkout";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/checkout");

  const cart = await getCartAction();
  if (!cart?.cart_items?.length) redirect("/cart");

  const [{ data: shippingRows, error: shippingError }, { data: savedAddress }] = await Promise.all([
    supabase
      .from("shipping_methods")
      .select("code, name, delivery_estimate, price")
      .eq("is_active", true)
      .order("price"),
    supabase
      .from("addresses")
      .select("recipient_name, phone, street_address, city, province, postal_code")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .maybeSingle(),
  ]);

  if (shippingError) throw shippingError;

  const shippingMethods: ShippingMethod[] = (shippingRows ?? []).map((method) => ({
    code: method.code as ShippingMethodCode,
    name: method.name,
    delivery_estimate: method.delivery_estimate,
    price: Number(method.price),
  }));
  const initialAddress = savedAddress as CheckoutAddress | null;

  return (
    <CheckoutClient
      initialCart={cart}
      shippingMethods={shippingMethods}
      initialAddress={initialAddress}
    />
  );
}
