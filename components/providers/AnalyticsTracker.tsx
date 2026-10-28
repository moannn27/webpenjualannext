"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics/tracker";

function AnalyticsTrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.includes("/invoice")) {
      return;
    }

    const currentUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    if (lastTracked.current === currentUrl) {
      return; // Deduplicate React re-renders for the same URL
    }
    lastTracked.current = currentUrl;

    trackPageView(pathname);
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerContent />
    </Suspense>
  );
}
