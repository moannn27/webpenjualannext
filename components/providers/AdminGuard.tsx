"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, role } = useAuthStore();
  const isMounted = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    if (isMounted) {
      if (!isAuthenticated || role !== "admin") {
        router.replace("/login");
      }
    }
  }, [isMounted, isAuthenticated, role, router]);

  // Prevent hydration mismatch or showing admin UI before checking
  if (!isMounted || !isAuthenticated || role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
