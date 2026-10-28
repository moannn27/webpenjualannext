"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeUrlRef = useRef<string>("");

  const startProgress = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setVisible(true);
    setProgress(18);

    // Increment progress smoothly towards 85%
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 50) return prev + Math.floor(Math.random() * 12) + 8;
        if (prev < 80) return prev + Math.floor(Math.random() * 6) + 3;
        if (prev < 90) return prev + 1;
        return prev;
      });
    }, 200);

    // Safety timeout in case navigation is cancelled or takes unusually long
    safetyTimeoutRef.current = setTimeout(() => {
      stopProgress();
    }, 10000);
  };

  const stopProgress = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    // Complete to 100%
    setProgress(100);

    // Fade out and reset
    resetTimerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setProgress(0);
      }, 300);
    }, 250);
  };

  // Complete progress whenever URL pathname or searchParams change
  useEffect(() => {
    const currentUrl = `${pathname || ""}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    if (activeUrlRef.current && activeUrlRef.current !== currentUrl) {
      stopProgress();
    }
    activeUrlRef.current = currentUrl;
  }, [pathname, searchParams]);

  // Listen to document clicks for all internal navigation links
  useEffect(() => {
    function handleAnchorClick(e: MouseEvent) {
      // Ignore modified clicks (new tab, etc.)
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");

      if (!anchor || !anchor.href) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href") || "";
      if (rawHref.startsWith("#") || rawHref.startsWith("javascript:")) return;

      try {
        const dest = new URL(anchor.href, window.location.href);
        const curr = new URL(window.location.href);

        // Check if internal origin
        if (dest.origin === curr.origin) {
          // If destination is different from current URL, trigger loading bar
          if (dest.pathname !== curr.pathname || dest.search !== curr.search) {
            startProgress();
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }

    function handleStartLoading() {
      startProgress();
    }

    function handleStopLoading() {
      stopProgress();
    }

    document.addEventListener("click", handleAnchorClick, true);
    window.addEventListener("app:start-loading", handleStartLoading);
    window.addEventListener("app:stop-loading", handleStopLoading);

    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
      window.removeEventListener("app:start-loading", handleStartLoading);
      window.removeEventListener("app:stop-loading", handleStopLoading);
      if (timerRef.current) clearInterval(timerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label="Memuat halaman..."
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-[3px] bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-400 shadow-[0_0_12px_rgba(37,99,235,0.8)] transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

