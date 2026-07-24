import { CheckoutClient } from "@/features/checkout/CheckoutClient";
import { getCartAction } from "@/actions/cart";
import { redirect } from "next/navigation";

export default async function CheckoutPage() {
  let cart = null;
  try {
    cart = await getCartAction();
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      redirect("/login");
    }
  }

  if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
    redirect("/cart");
  }

  return <CheckoutClient initialCart={cart} />;
}
