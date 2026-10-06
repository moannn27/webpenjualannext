import { CartClient } from "@/features/cart/CartClient";
import { getCartAction } from "@/actions/cart";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function CartPage() {
  let cart = null;
  try {
    cart = await getCartAction();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-12">
            Shopping Cart
          </h1>
          <div className="py-24 bg-card rounded-[32px] border">
            <h2 className="text-2xl font-bold mb-4">Please log in to view your cart</h2>
            <p className="text-muted-foreground mb-8">You need an account to add items to your cart.</p>
            <Button render={<Link href="/login" />} size="lg" className="rounded-full">
              Sign In
            </Button>
          </div>
        </div>
      );
    }
    // Handle other errors gracefully
  }

  return <CartClient initialCart={cart} />;
}
