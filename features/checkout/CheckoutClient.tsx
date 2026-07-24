"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { proceedToCheckoutAction } from "@/actions/checkout";

export function CheckoutClient({ initialCart }: { initialCart: any }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const subtotal = initialCart.cart_items.reduce((acc: number, item: any) => {
    const price = item.products.discount_price || item.products.price;
    return acc + price * item.quantity;
  }, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    
    const formData = new FormData(e.currentTarget);
    try {
      await proceedToCheckoutAction(formData);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during checkout");
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-12">
        Checkout
      </h1>

      {errorMsg && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-8">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-12 lg:gap-8">
        <div className="flex-1 space-y-12">
          
          {/* Shipping Address */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">1. Shipping Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input name="firstName" placeholder="First Name" required className="bg-muted/30" />
              <Input name="lastName" placeholder="Last Name" required className="bg-muted/30" />
              <Input name="email" placeholder="Email Address" type="email" required className="md:col-span-2 bg-muted/30" />
              <Input name="address" placeholder="Address Line 1" required className="md:col-span-2 bg-muted/30" />
              <Input name="city" placeholder="City" required className="bg-muted/30" />
              <Input name="postalCode" placeholder="Postal Code" required className="bg-muted/30" />
            </div>
          </section>

          {/* Courier */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">2. Shipping Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="border p-4 rounded-[16px] flex items-center justify-between cursor-pointer hover:border-primary transition-colors bg-card">
                <div>
                  <div className="font-semibold text-foreground">Standard Delivery</div>
                  <div className="text-sm text-muted-foreground">3-5 Business Days</div>
                </div>
                <input type="radio" name="shipping" value="standard" defaultChecked className="w-5 h-5 accent-primary" />
              </label>
              <label className="border p-4 rounded-[16px] flex items-center justify-between cursor-pointer hover:border-primary transition-colors bg-card">
                <div>
                  <div className="font-semibold text-foreground">Express Delivery</div>
                  <div className="text-sm text-muted-foreground">1-2 Business Days (+$15.00)</div>
                </div>
                <input type="radio" name="shipping" value="express" className="w-5 h-5 accent-primary" />
              </label>
            </div>
          </section>

          {/* Payment UI */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">3. Payment Details</h2>
            <div className="space-y-4">
              <Input placeholder="Card Number" required className="bg-muted/30" />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="MM/YY" required className="bg-muted/30" />
                <Input placeholder="CVC" required type="password" maxLength={4} className="bg-muted/30" />
              </div>
              <Input placeholder="Name on Card" required className="bg-muted/30" />
            </div>
          </section>

        </div>

        {/* Order Summary */}
        <aside className="w-full lg:w-[400px] shrink-0">
          <div className="bg-card p-8 rounded-[32px] border border-border sticky top-24">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
            <div className="space-y-4 mb-8 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">$250.00</span>
              </div>
              <div className="border-t pt-4 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${(subtotal + 250).toLocaleString()}</span>
              </div>
            </div>
            <Button disabled={loading} type="submit" size="lg" className="w-full rounded-full h-14 text-lg">
              {loading ? "Processing..." : "Place Order"}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4">
              By placing your order, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
