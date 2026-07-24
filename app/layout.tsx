import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Navbar } from "@/components/layouts/Navbar";
import { Footer } from "@/components/layouts/Footer";
import { getCartAction } from "@/actions/cart";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
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
  try {
    const cart = await getCartAction();
    if (cart && cart.cart_items) {
      cartCount = cart.cart_items.reduce((acc: number, item: any) => acc + item.quantity, 0);
    }
  } catch (error) {
    // User is likely unauthenticated
  }

  return (
    <html lang="en" className={`${outfit.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <Navbar cartCount={cartCount} />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
