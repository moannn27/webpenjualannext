import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { StorefrontChrome } from "@/components/layouts/StorefrontChrome";
import { getCartAction } from "@/actions/cart";
import { getStorefrontSettingsAction } from "@/actions/content";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { type CartItem } from "@/types/cart";
import { getSiteUrl, DEFAULT_SITE_TITLE, DEFAULT_SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: DEFAULT_SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
  keywords: [
    "Next Solution Store",
    "laptop",
    "laptop gaming",
    "komputer PC",
    "periferal",
    "aksesoris komputer",
    "spesifikasi laptop",
    "ambil di toko",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: SITE_NAME,
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
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
