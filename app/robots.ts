import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/admin/*",
          "/checkout",
          "/checkout/",
          "/checkout/*",
          "/cart",
          "/cart/",
          "/cart/*",
          "/profile",
          "/profile/",
          "/profile/*",
          "/wishlist",
          "/wishlist/",
          "/wishlist/*",
          "/api/",
          "/api/*",
          "/auth/",
          "/auth/*",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

