import { stripHtmlToPlainText } from "@/lib/sanitize-html";
export const SITE_NAME = "Next Solution Store";
export const DEFAULT_SITE_TITLE = "Next Solution Store | Belanja Laptop, PC & Elektronik Premium";
export const DEFAULT_SITE_DESCRIPTION =
  "Next Solution Store - Toko perangkat komputer, laptop, dan aksesoris elektronik pilihan dengan informasi spesifikasi lengkap dan opsi ambil di toko.";

export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000";
  const withProtocol = envUrl.startsWith("http://") || envUrl.startsWith("https://") ? envUrl : `https://${envUrl}`;
  return withProtocol.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export interface StructuredDataProductInput {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  discount_price?: number | null;
  stock?: number;
  rating?: number;
  reviews?: number;
  sku?: string | null;
  product_images?: { url: string }[] | null;
  brands?: { name: string } | null;
  categories?: { name: string } | null;
}

export interface StructuredDataReviewInput {
  id: string;
  rating: number;
  comment?: string | null;
  created_at?: string;
  users?: { full_name?: string | null } | null;
}

export function buildProductJsonLd(
  product: StructuredDataProductInput,
  reviews?: StructuredDataReviewInput[]
): Record<string, unknown> {
  const effectivePrice = Number(product.discount_price ?? product.price);
  const images = (product.product_images ?? [])
    .map((img) => img.url)
    .filter((url): url is string => Boolean(url));
  const inStock = (product.stock ?? 0) > 0;
  const brandName = product.brands?.name;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.id}`),
      priceCurrency: "IDR",
      price: effectivePrice,
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  if (product.description) {
    jsonLd.description = stripHtmlToPlainText(product.description);
  }

  if (images.length > 0) {
    jsonLd.image = images;
  }

  if (product.sku) {
    jsonLd.sku = product.sku;
  }

  if (brandName) {
    jsonLd.brand = {
      "@type": "Brand",
      name: brandName,
    };
  }

  if (product.categories?.name) {
    jsonLd.category = product.categories.name;
  }

  // Only include rating / review if real, valid reviews are present.
  // Never forge ratings or review counts.
  const validRatings = Array.isArray(reviews)
    ? reviews.filter((review) => typeof review.rating === "number" && review.rating >= 1 && review.rating <= 5)
    : [];
  if (
    typeof product.rating === "number" &&
    Number.isFinite(product.rating) &&
    product.rating >= 1 &&
    product.rating <= 5 &&
    typeof product.reviews === "number" &&
    Number.isSafeInteger(product.reviews) &&
    product.reviews > 0
  ) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating.toFixed(1),
      reviewCount: product.reviews,
      bestRating: "5",
      worstRating: "1",
    };
  } else if (validRatings.length > 0) {
    const avg = (
      validRatings.reduce((sum, review) => sum + review.rating, 0) / validRatings.length
    ).toFixed(1);
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avg,
      reviewCount: validRatings.length,
      bestRating: "5",
      worstRating: "1",
    };
  }

  if (validRatings.length > 0) {
    jsonLd.review = validRatings.slice(0, 5).map((review) => {
      const item: Record<string, unknown> = {
        "@type": "Review",
        author: {
          "@type": "Person",
          name: review.users?.full_name || "Pelanggan Terverifikasi",
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: review.rating,
          bestRating: "5",
          worstRating: "1",
        },
      };
      if (review.comment) {
        item.reviewBody = review.comment;
      }
      if (review.created_at) {
        try {
          item.datePublished = new Date(review.created_at).toISOString().split("T")[0];
        } catch {
          // ignore date formatting errors
        }
      }
      return item;
    });
  }

  return jsonLd;
}

export function buildStoreJsonLd(store?: {
  address?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
}): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    name: SITE_NAME,
    url: siteUrl,
    description: DEFAULT_SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/products?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  if (store?.address) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: store.address,
      addressCountry: "ID",
    };
  }

  if (store?.phone) {
    jsonLd.telephone = store.phone;
  }

  if (store?.email) {
    jsonLd.email = store.email;
  }

  return jsonLd;
}
