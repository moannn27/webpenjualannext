import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { StorefrontChrome } from "@/components/layouts/StorefrontChrome";
import { getCartAction } from "@/actions/cart";
import { getStorefrontSettingsAction } from "@/actions/content";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { type CartItem } from "@/types/cart";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Next Solution Store | Premium Electronics",
  description: "Minimalist multi-brand electronics e-commerce.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let cartCount = 0;
  let rawSettings: unknown = null;
  try {
    const cart = await getCartAction();
    if (cart && cart.cart_items) {
      cartCount = cart.cart_items.reduce((acc: number, item: CartItem) => acc + item.quantity, 0);
    }
  } catch {
    // User is likely unauthenticated
  }
  try { rawSettings = await getStorefrontSettingsAction(); } catch { /* Store settings migration may not be applied yet. */ }
  const settings = normalizeStorefrontSettings(rawSettings);

  return (
    <html lang="id" className={`${outfit.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <StorefrontChrome cartCount={cartCount} settings={settings}>{children}</StorefrontChrome>
      </body>
    </html>
  );
}
