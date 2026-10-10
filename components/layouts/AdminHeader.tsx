"use client";

import {
  Search,
  ShoppingBag,
  ChevronDown,
  LogOut,
  Store,
  UserRound,
  Bell,
  ShieldAlert,
  AlertTriangle,
  Package,
  CheckCircle2,
  Trash2,
  X,
  FileText,
  Clock,
  Layers,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { logout } from "@/actions/auth";
import {
  getAdminAllNotificationsAction,
  type AdminNotificationItem,
} from "@/actions/admin";

export function AdminHeader({ adminName = "Admin" }: { adminName?: string }) {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "security" | "order" | "stock">("all");
  const [allNotifications, setAllNotifications] = useState<AdminNotificationItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Load dismissed notification IDs from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("admin_dismissed_notifications");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setDismissedIds(new Set(parsed));
          }
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/admin/products?search=${encodeURIComponent(search.trim())}`);
  };

  const resetTimer = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenuOpen(false), 10_000);
  }, []);

  useEffect(() => {
    if (menuOpen) resetTimer();
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [menuOpen, resetTimer]);

  // Polling notifikasi multi-kategori (Keamanan, Pesanan, Stok)
  useEffect(() => {
    let active = true;
    const fetchNotifs = async () => {
      try {
        const res = await getAdminAllNotificationsAction();
        if (active && res) {
          setAllNotifications(res.notifications ?? []);
        }
      } catch {
        /* ignore */
      }
    };
    void fetchNotifs();
    const interval = setInterval(fetchNotifs, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
      if (!notifRef.current?.contains(event.target as Node)) setNotifOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  // Filter out notifications that user has dismissed
  const activeNotifications = allNotifications.filter((n) => !dismissedIds.has(n.id));

  // Category counts
  const countSecurity = activeNotifications.filter((n) => n.category === "security").length;
  const countOrder = activeNotifications.filter((n) => n.category === "order").length;
  const countStock = activeNotifications.filter((n) => n.category === "stock").length;

  // Filtered by selected tab
  const displayedNotifications = activeNotifications.filter((n) => {
    if (activeTab === "all") return true;
    return n.category === activeTab;
  });

  // Handle dismiss single notification
  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_dismissed_notifications", JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  // Handle clear all notifications
  const handleClearAll = () => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      for (const n of allNotifications) {
        next.add(n.id);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_dismissed_notifications", JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  return (
    <header
      data-admin-header
      className="h-16 bg-card border-b flex items-center justify-between gap-3 pl-14 pr-3 sm:px-6 sticky top-0 z-30"
    >
      <div className="flex-1 max-w-md">
        <form className="relative" onSubmit={submitSearch}>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari produk..."
            className="w-full bg-muted/50 border-none pl-9 rounded-full focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </form>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* PUSAT NOTIFIKASI MULTI-KATEGORI */}
        <div ref={notifRef} className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label="Pusat Notifikasi"
            title={
              activeNotifications.length > 0
                ? `${activeNotifications.length} notifikasi baru menunggu tindakan`
                : "Tidak ada notifikasi baru"
            }
            className="rounded-full relative text-muted-foreground hover:text-foreground"
          >
            {countSecurity > 0 ? (
              <ShieldAlert className="h-5 w-5 text-destructive animate-pulse" />
            ) : countStock > 0 ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {activeNotifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-4.5 min-h-4.5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white shadow-xs">
                {activeNotifications.length > 99 ? "99+" : activeNotifications.length}
              </span>
            )}
          </Button>

          {notifOpen && (
            <div className="absolute right-0 top-12 z-[70] w-96 max-w-[92vw] rounded-2xl border bg-popover text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Top Header */}
              <div className="p-3.5 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Bell className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-none text-foreground">
                      Pusat Notifikasi Toko
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {activeNotifications.length} peringatan aktif
                    </p>
                  </div>
                </div>
                {activeNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors py-1 px-2 rounded-lg hover:bg-destructive/10 cursor-pointer"
                    title="Bersihkan semua notifikasi dari tampilan"
                  >
                    <Trash2 className="size-3" />
                    Bersihkan Semua
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="px-3 pt-2 pb-1 border-b flex items-center gap-1.5 overflow-x-auto text-[11px] bg-background">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                    activeTab === "all"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Semua ({activeNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("security")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 flex items-center gap-1 ${
                    activeTab === "security"
                      ? "bg-destructive text-destructive-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ShieldAlert className="size-3" />
                  Keamanan ({countSecurity})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("order")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 flex items-center gap-1 ${
                    activeTab === "order"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ShoppingBag className="size-3" />
                  Pesanan ({countOrder})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("stock")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 flex items-center gap-1 ${
                    activeTab === "stock"
                      ? "bg-amber-600 text-white font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <AlertTriangle className="size-3" />
                  Stok ({countStock})
                </button>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-36 max-h-[380px]">
                {displayedNotifications.length === 0 ? (
                  <div className="py-10 text-center px-4">
                    <div className="grid size-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 mx-auto mb-2">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      Semua notifikasi sudah bersih!
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {activeTab === "all"
                        ? "Tidak ada tindakan yang mendesak saat ini."
                        : `Tidak ada notifikasi untuk kategori ${activeTab}.`}
                    </p>
                  </div>
                ) : (
                  displayedNotifications.map((n) => {
                    const isSec = n.category === "security";
                    const isStock = n.category === "stock";
                    const isOrd = n.category === "order";

                    return (
                      <div
                        key={n.id}
                        className={`group relative rounded-xl border p-2.5 transition-all text-xs ${
                          isSec
                            ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                            : isStock
                            ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                            : "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={n.link}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-2.5 flex-1 min-w-0"
                          >
                            <div
                              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md ${
                                isSec
                                  ? "bg-destructive/15 text-destructive"
                                  : isStock
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              {isSec ? (
                                <ShieldAlert className="size-3.5" />
                              ) : isStock ? (
                                <AlertTriangle className="size-3.5" />
                              ) : (
                                <ShoppingBag className="size-3.5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`font-semibold line-clamp-1 text-xs ${
                                  isSec
                                    ? "text-destructive"
                                    : isStock
                                    ? "text-amber-700 dark:text-amber-400"
                                    : "text-foreground"
                                }`}
                              >
                                {n.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                                {n.description}
                              </p>
                              <p className="text-[10px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                                <Clock className="size-3 inline" />
                                {new Intl.DateTimeFormat("id-ID", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                  timeZone: "Asia/Jakarta",
                                }).format(new Date(n.created_at))}
                                <span className="text-primary font-medium ml-1">
                                  &bull; Buka &rarr;
                                </span>
                              </p>
                            </div>
                          </Link>

                          {/* Dismiss single notification */}
                          <button
                            type="button"
                            onClick={(e) => handleDismiss(n.id, e)}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-70 group-hover:opacity-100"
                            title="Hapus notifikasi ini"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Actions */}
              <div className="p-2.5 border-t bg-muted/20 flex items-center justify-between gap-2 text-xs">
                <Link
                  href="/admin/logs"
                  onClick={() => setNotifOpen(false)}
                  className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline text-[11px]"
                >
                  <FileText className="size-3.5" />
                  Log Aktivitas & Ekspor
                </Link>
                <Link
                  href="/admin/orders"
                  onClick={() => setNotifOpen(false)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Kelola Toko &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Lihat pesanan"
          title="Lihat pesanan"
          render={<Link href="/admin/orders" />}
          className="rounded-full relative text-muted-foreground hover:text-foreground"
        >
          <ShoppingBag className="h-5 w-5" />
        </Button>

        <div className="h-8 w-px bg-border mx-1 sm:mx-2"></div>

        <div ref={menuRef} className="relative">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Buka menu admin"
            className="flex h-auto items-center gap-3 rounded-xl px-2 py-1.5"
          >
            <span className="text-right hidden sm:block">
              <span className="block max-w-48 truncate text-sm font-medium leading-none">
                {adminName}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">Admin</span>
            </span>
            <Avatar className="h-9 w-9 border">
              <AvatarFallback>{adminName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <ChevronDown
              className={`size-4 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </Button>

          {menuOpen && (
            <div
              onPointerMove={resetTimer}
              onFocus={resetTimer}
              onClick={resetTimer}
              className="absolute right-0 top-12 z-[70] w-60 rounded-2xl border bg-popover p-2 text-popover-foreground shadow-xl"
            >
              <p className="truncate px-3 py-2 text-sm font-semibold">{adminName}</p>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <UserRound className="size-4" />
                Profil akun
              </Link>
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <Store className="size-4" />
                Lihat toko
              </Link>
              <div className="my-1 border-t" />
              <div className="flex items-center justify-between px-3 py-1 text-sm">
                <span>Mode tema</span>
                <ThemeToggle />
              </div>
              <form action={logout}>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                  <LogOut className="size-4" />
                  Keluar
                </button>
              </form>
              <p className="px-3 pb-1 text-[11px] text-muted-foreground">
                Menu tertutup setelah 10 detik tanpa aktivitas.
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
