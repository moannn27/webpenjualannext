import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { getCategoriesAction } from "@/actions/catalog";
import { getProductsAction } from "@/actions/product";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/promo`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/category`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/brands`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const [categories, products] = await Promise.all([
    getCategoriesAction().catch(() => []),
    getProductsAction().catch(() => []),
  ]);

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? [])
    .filter((cat) => Boolean(cat?.slug))
    .map((cat) => ({
      url: `${siteUrl}/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const productRoutes: MetadataRoute.Sitemap = (products ?? [])
    .filter((prod) => Boolean(prod?.id))
    .map((prod) => ({
      url: `${siteUrl}/product/${prod.id}`,
      lastModified: prod.created_at ? new Date(prod.created_at) : new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}

