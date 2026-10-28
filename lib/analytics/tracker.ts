"use client";

export type AnalyticsEventName =
  | "page_view"
  | "view_item"
  | "search"
  | "search_no_results"
  | "add_to_cart"
  | "begin_checkout"
  | "ai_recommendation_click";

export type AnalyticsEventPayload = {
  eventName: AnalyticsEventName;
  path: string;
  referrerDomain?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: "mobile" | "desktop" | "tablet";
  productId?: string;
  metadata?: Record<string, unknown>;
};

const VISITOR_KEY = "ns_vid";
const SESSION_KEY = "ns_sid";
const SESSION_EXPIRY_KEY = "ns_sid_exp";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity

// In-memory debounce set to prevent duplicated events from React rerenders
const recentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 3000;

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "server-visitor";
  try {
    let vid = localStorage.getItem(VISITOR_KEY);
    if (!vid || vid.length < 10) {
      vid = generateUUID();
      localStorage.setItem(VISITOR_KEY, vid);
    }
    return vid;
  } catch {
    return "anonymous-visitor";
  }
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  try {
    const now = Date.now();
    const expiry = Number(sessionStorage.getItem(SESSION_EXPIRY_KEY) || 0);
    let sid = sessionStorage.getItem(SESSION_KEY);

    if (!sid || now > expiry) {
      sid = generateUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }

    sessionStorage.setItem(SESSION_EXPIRY_KEY, String(now + SESSION_TIMEOUT_MS));
    return sid;
  } catch {
    return "anonymous-session";
  }
}

export function getDeviceType(): "mobile" | "desktop" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function sanitizePath(rawPath: string): string {
  try {
    const url = new URL(rawPath, "http://localhost");
    // Strip sensitive query params
    const forbidden = ["token", "code", "auth", "secret", "key", "email", "password", "session"];
    forbidden.forEach((param) => url.searchParams.delete(param));
    return `${url.pathname}${url.search ? url.search : ""}`;
  } catch {
    return rawPath.split("?")[0] || "/";
  }
}

export function getReferrerDomain(): string | undefined {
  if (typeof document === "undefined" || !document.referrer) return undefined;
  try {
    const refUrl = new URL(document.referrer);
    // If internal referrer, ignore or return undefined
    if (typeof window !== "undefined" && refUrl.hostname === window.location.hostname) {
      return undefined;
    }
    return refUrl.hostname;
  } catch {
    return undefined;
  }
}

export function getUtmParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  if (typeof window === "undefined") return {};
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
    };
  } catch {
    return {};
  }
}

export function sendAnalyticsEvent(payload: AnalyticsEventPayload): void {
  if (typeof window === "undefined") return;

  // Never track visits inside admin panel
  if (payload.path.startsWith("/admin") || window.location.pathname.startsWith("/admin")) {
    return;
  }

  // Deduplication check
  const dedupKey = `${payload.eventName}:${payload.path}:${payload.productId || ""}`;
  const now = Date.now();
  const lastTime = recentEvents.get(dedupKey) || 0;
  if (now - lastTime < DEDUP_WINDOW_MS) {
    return; // Drop duplicate event caused by quick re-render
  }
  recentEvents.set(dedupKey, now);

  // Clean old dedup entries every 50 events
  if (recentEvents.size > 50) {
    for (const [key, time] of recentEvents.entries()) {
      if (now - time > 10000) recentEvents.delete(key);
    }
  }

  const utm = getUtmParams();
  const fullBody = {
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    eventName: payload.eventName,
    path: sanitizePath(payload.path),
    referrerDomain: payload.referrerDomain || getReferrerDomain(),
    utmSource: payload.utmSource || utm.utmSource,
    utmMedium: payload.utmMedium || utm.utmMedium,
    utmCampaign: payload.utmCampaign || utm.utmCampaign,
    deviceType: payload.deviceType || getDeviceType(),
    productId: payload.productId,
    metadata: payload.metadata || {},
  };

  const bodyJson = JSON.stringify(fullBody);

  // Use sendBeacon if available, fallback to fetch with keepalive
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([bodyJson], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/analytics/event", blob);
      if (sent) return;
    }
  } catch {
    // Fallback to fetch
  }

  try {
    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyJson,
      keepalive: true,
    }).catch(() => {
      // Non-blocking telemetry failure is quietly ignored
    });
  } catch {
    // Non-blocking
  }
}

// Convenience helpers for application components
export function trackPageView(path: string): void {
  sendAnalyticsEvent({
    eventName: "page_view",
    path,
  });
}

export function trackViewItem(product: {
  id: string;
  name: string;
  price?: number;
  brandId?: string;
  categoryId?: string;
}): void {
  sendAnalyticsEvent({
    eventName: "view_item",
    path: typeof window !== "undefined" ? window.location.pathname : `/product/${product.id}`,
    productId: product.id,
    metadata: {
      productName: product.name,
      price: product.price,
      brandId: product.brandId,
      categoryId: product.categoryId,
    },
  });
}

export function trackAddToCart(product: {
  id: string;
  name: string;
  price?: number;
  quantity: number;
}): void {
  sendAnalyticsEvent({
    eventName: "add_to_cart",
    path: typeof window !== "undefined" ? window.location.pathname : "/cart",
    productId: product.id,
    metadata: {
      productName: product.name,
      price: product.price,
      quantity: product.quantity,
    },
  });
}

export function trackBeginCheckout(summary: { totalAmount: number; itemCount: number }): void {
  sendAnalyticsEvent({
    eventName: "begin_checkout",
    path: "/checkout",
    metadata: summary,
  });
}

export function trackSearchEvent(query: string, resultsCount: number): void {
  const cleanQuery = query.trim().slice(0, 100);
  if (!cleanQuery) return;
  sendAnalyticsEvent({
    eventName: resultsCount === 0 ? "search_no_results" : "search",
    path: "/products",
    metadata: {
      query: cleanQuery,
      resultsCount,
    },
  });
}

export function trackAiRecommendationClick(productId: string, productName?: string): void {
  sendAnalyticsEvent({
    eventName: "ai_recommendation_click",
    path: typeof window !== "undefined" ? window.location.pathname : "/",
    productId,
    metadata: { productName },
  });
}

