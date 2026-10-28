import type { Metadata } from "next";
import { Suspense } from "react";
import { Outfit } from "next/font/google";
import { StorefrontChrome } from "@/components/layouts/StorefrontChrome";
import { NavigationProgress } from "@/components/providers/NavigationProgress";
import { getCartAction } from "@/actions/cart";
import { getStorefrontSettingsAction } from "@/actions/content";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { createClient } from "@/lib/supabase/server";
import { formatCartItemToStored } from "@/lib/cart-utils";
import { type StoredCartItem } from "@/store/useCartStore";
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
  icons: {
    icon: [
      { url: "/icon.png?v=20261027", type: "image/png" },
      { url: "/favicon.ico?v=20261027", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png?v=20261027", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icon.png?v=20261027",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let cartCount = 0;
  let currentUserId: string | null = null;
  let initialCartItems: StoredCartItem[] = [];
  let rawSettings: unknown = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      currentUserId = user.id;
      const cart = await getCartAction();
      if (cart && cart.cart_items) {
        initialCartItems = cart.cart_items.map((it: Parameters<typeof formatCartItemToStored>[0]) =>
          formatCartItemToStored(it)
        );
        cartCount = initialCartItems.reduce((acc, item) => acc + item.quantity, 0);
      }
    }
  } catch {
    // User is unauthenticated or error fetching cart
  }

  try {
    rawSettings = await getStorefrontSettingsAction();
  } catch {
    /* Store settings migration may not be applied yet. */
  }
  const settings = normalizeStorefrontSettings(rawSettings);

  return (
    <html lang="id" className={`${outfit.variable} antialiased`} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/icon.png?v=20261027" />
        <link rel="shortcut icon" href="/icon.png?v=20261027" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png?v=20261027" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("next-solution-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}else{document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <StorefrontChrome
          currentUserId={currentUserId}
          cartCount={cartCount}
          initialCartItems={initialCartItems}
          settings={settings}
        >
          {children}
        </StorefrontChrome>
      </body>
    </html>
  );
}
