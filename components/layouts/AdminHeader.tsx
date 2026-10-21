"use client";

import {
  Search,
  ShoppingBag,
  LogOut,
  Store,
  UserRound,
  Bell,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  X,
  FileText,
  Clock,
  Calendar,
  Sun,
  Moon,
  CreditCard,
  Layers,
  Package,
  History,
  Sliders,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth";
import { useCartStore } from "@/store/useCartStore";
import {
  getAdminAllNotificationsAction,
  saveStaffNotificationConfigAction,
  type AdminNotificationItem,
  type AdminNotificationCategory,
} from "@/actions/admin";

const CATEGORY_META: Record<
  AdminNotificationCategory,
  { label: string; icon: typeof Bell; color: string; bg: string; border: string; text: string }
> = {
  order: {
    label: "Pesanan",
    icon: ShoppingBag,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500/25 bg-blue-500/5 hover:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
  },
  payment: {
    label: "Pembayaran",
    icon: CreditCard,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  stock: {
    label: "Stok",
    icon: Package,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
  },
  catalog: {
    label: "Katalog",
    icon: Layers,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/15",
    border: "border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/10",
    text: "text-purple-700 dark:text-purple-400",
  },
  activity: {
    label: "Aktivitas",
    icon: History,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/15",
    border: "border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-400",
  },
  security: {
    label: "Keamanan",
    icon: ShieldAlert,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
  },
};

const ALL_CATEGORY_KEYS: AdminNotificationCategory[] = [
  "order",
  "payment",
  "stock",
  "catalog",
  "activity",
  "security",
];

export function AdminHeader({
  adminName = "Admin",
  avatarUrl = "",
  isSuperAdmin = false,
}: {
  adminName?: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | AdminNotificationCategory>("all");
  const [allNotifications, setAllNotifications] = useState<AdminNotificationItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [allowedCategories, setAllowedCategories] = useState<AdminNotificationCategory[]>([
    "order",
    "payment",
    "stock",
    "catalog",
    "activity",
    "security",
  ]);
  const [staffConfig, setStaffConfig] = useState<AdminNotificationCategory[]>([
    "order",
    "stock",
    "catalog",
  ]);
  const [configOpen, setConfigOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configNotice, setConfigNotice] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const isDark = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener("theme-change", onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener("theme-change", onChange);
      };
    },
    () => {
      if (typeof window === "undefined") return false;
      return document.documentElement.classList.contains("dark");
    },
    () => false
  );

  const toggleTheme = () => {
    const nextDark = !document.documentElement.classList.contains("dark");
    const root = document.documentElement;
    root.classList.toggle("dark", nextDark);
    root.style.colorScheme = nextDark ? "dark" : "light";
    try {
      localStorage.setItem("next-solution-theme", nextDark ? "dark" : "light");
      localStorage.setItem("theme", nextDark ? "dark" : "light");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("theme-change"));
  };

  const currentHour = new Date().getHours();
  const greetingText =
    currentHour < 11
      ? "Selamat Pagi"
      : currentHour < 15
      ? "Selamat Siang"
      : currentHour < 18
      ? "Selamat Sore"
      : "Selamat Malam";

  const todayFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  // Load dismissed notification IDs from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("admin_dismissed_notifications");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            queueMicrotask(() => {
              setDismissedIds(new Set(parsed));
            });
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

  // Polling notifikasi berkala
  useEffect(() => {
    let active = true;
    const fetchNotifs = async () => {
      try {
        const res = await getAdminAllNotificationsAction();
        if (active && res) {
          setAllNotifications(res.notifications ?? []);
          if (res.allowedCategories) setAllowedCategories(res.allowedCategories);
          if (res.staffNotificationConfig) setStaffConfig(res.staffNotificationConfig);
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
      if (!notifRef.current?.contains(event.target as Node)) {
        setNotifOpen(false);
        setConfigOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setNotifOpen(false);
        setConfigOpen(false);
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
  const getCount = (cat: AdminNotificationCategory) =>
    activeNotifications.filter((n) => n.category === cat).length;

  // Filtered by selected tab
  const displayedNotifications = activeNotifications.filter((n) => {
    if (activeTab === "all") return true;
    return n.category === activeTab;
  });

  // Handle dismiss single notification
  const handleDismiss = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_dismissed_notifications", JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  // Handle clicking notification item (marks as read/dismissed and closes dropdown)
  const handleNotificationClick = (id: string) => {
    handleDismiss(id);
    setNotifOpen(false);
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

  // Save staff notification preferences (Super Admin only)
  const handleSaveStaffConfig = async () => {
    setIsSavingConfig(true);
    setConfigNotice(null);
    try {
      const res = await saveStaffNotificationConfigAction(staffConfig);
      if (res.success) {
        setConfigNotice("Pengaturan tersimpan!");
        setTimeout(() => {
          setConfigOpen(false);
          setConfigNotice(null);
        }, 1500);
      }
    } catch (err) {
      setConfigNotice(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const toggleStaffCategory = (cat: AdminNotificationCategory) => {
    setStaffConfig((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <header
      data-admin-header
      className="h-20 bg-[#F0F2F9] dark:bg-[#18191E] border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between gap-4 pl-14 pr-4 sm:px-8 sticky top-0 z-50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
          {greetingText}, {adminName.split(" ")[0]}!
        </h1>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <form className="relative hidden md:block w-44 lg:w-56" onSubmit={submitSearch}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search here..."
            className="w-full bg-white dark:bg-[#23252C] border border-slate-200/70 dark:border-white/10 pl-9 pr-3.5 py-2 text-xs rounded-full text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/30 shadow-xs transition"
          />
        </form>

        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#EFF6FF] dark:bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] text-xs font-semibold select-none shadow-xs">
          <Calendar className="size-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
          <span>{todayFormatted}</span>
        </div>

        {/* SWITCH TEMA (DARK / LIGHT MODE SLIDER HALUS & LEGA) */}
        <div
          onClick={toggleTheme}
          role="switch"
          aria-checked={isDark}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleTheme();
            }
          }}
          className="relative flex items-center w-16 h-8 shrink-0 rounded-full bg-slate-200/80 dark:bg-[#23252C] border border-slate-300/70 dark:border-white/10 cursor-pointer transition-colors duration-300 select-none shadow-xs hover:border-slate-400/50 dark:hover:border-white/20 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 group"
          title={isDark ? "Mode Gelap aktif (Klik untuk beralih ke Mode Terang)" : "Mode Terang aktif (Klik untuk beralih ke Mode Gelap)"}
          aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
        >
          {/* Kapsul geser aktif (smooth gliding thumb) */}
          <span
            className={cn(
              "absolute top-[3px] left-[3px] size-6 aspect-square shrink-0 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none shadow-md",
              isDark
                ? "translate-x-8 bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/35"
                : "translate-x-0 bg-gradient-to-tr from-amber-400 to-amber-300 shadow-amber-500/30"
            )}
          />

          {/* Slot Ikon yang lega & proporsional */}
          <div className="relative z-10 flex items-center justify-between w-full h-full px-[3px] pointer-events-none">
            <div
              className={cn(
                "size-6 aspect-square shrink-0 flex items-center justify-center transition-all duration-300",
                !isDark
                  ? "text-amber-950 scale-100 font-bold"
                  : "text-slate-400 group-hover:text-slate-300 scale-90 opacity-60"
              )}
            >
              <Sun className={cn("size-3.5 stroke-[2.2] transition-transform duration-300", !isDark ? "rotate-0" : "-rotate-45")} />
            </div>
            <div
              className={cn(
                "size-6 aspect-square shrink-0 flex items-center justify-center transition-all duration-300",
                isDark
                  ? "text-white scale-100 font-bold"
                  : "text-slate-400 group-hover:text-slate-500 scale-90 opacity-60"
              )}
            >
              <Moon className={cn("size-3.5 stroke-[2.2] transition-transform duration-300", isDark ? "rotate-0" : "rotate-45")} />
            </div>
          </div>
        </div>

        {/* PUSAT NOTIFIKASI MULTI-KATEGORI */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setConfigOpen(false);
            }}
            aria-label="Pusat Notifikasi"
            title={
              activeNotifications.length > 0
                ? `${activeNotifications.length} notifikasi menunggu tindakan`
                : "Tidak ada notifikasi baru"
            }
            className="size-10 rounded-full bg-white dark:bg-[#23252C] border border-slate-200/70 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs relative cursor-pointer hover:border-[#2563EB]/40 transition"
          >
            <Bell
              className={cn(
                "h-4.5 w-4.5 transition-colors",
                activeNotifications.length > 0
                  ? "text-[#2563EB] dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-300"
              )}
            />
            {activeNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 grid min-w-4.5 min-h-4.5 place-items-center rounded-full bg-[#2563EB] px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white dark:ring-[#23252C]">
                {activeNotifications.length > 99 ? "99+" : activeNotifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-14 z-[100] w-[440px] max-w-[94vw] rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-800 dark:text-slate-100 shadow-2xl shadow-slate-900/30 dark:shadow-black/70 animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Top Header */}
              <div className="p-3.5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <div className="grid size-7 place-items-center rounded-lg bg-blue-500/15 text-[#2563EB] dark:text-blue-400">
                    <Bell className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-none text-slate-900 dark:text-white">
                      Pusat Notifikasi Toko
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {activeNotifications.length} pemberitahuan aktif
                      {isSuperAdmin && " • Mode Super Admin"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Super Admin Config Button */}
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setConfigOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                        configOpen
                          ? "bg-[#2563EB] text-white"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10"
                      }`}
                      title="Atur kategori notifikasi yang diterima admin biasa"
                    >
                      <Sliders className="size-3" />
                      Atur Notif Staf
                    </button>
                  )}

                  {activeNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors py-1 px-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      title="Bersihkan semua notifikasi dari tampilan"
                    >
                      <Trash2 className="size-3" />
                      Bersihkan
                    </button>
                  )}
                </div>
              </div>

              {/* SUPER ADMIN STAFF CONFIG OVERLAY MODAL */}
              {configOpen && isSuperAdmin && (
                <div className="p-3.5 border-b border-slate-200/80 dark:border-white/10 bg-blue-50/50 dark:bg-blue-950/20 text-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        Pengaturan Notifikasi Admin Biasa
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Tentukan jenis notifikasi yang tampil pada staf admin non-super:
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfigOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {[
                      { key: "order" as AdminNotificationCategory, label: "Pesanan & Pembelian (Order)" },
                      { key: "stock" as AdminNotificationCategory, label: "Stok & Restock (Stock)" },
                      { key: "catalog" as AdminNotificationCategory, label: "Produk & Brand (Catalog)" },
                      { key: "payment" as AdminNotificationCategory, label: "Edit Pembayaran (Payment)" },
                      { key: "activity" as AdminNotificationCategory, label: "Aktivitas Toko (Activity)" },
                      { key: "security" as AdminNotificationCategory, label: "Keamanan Akun (Security)" },
                    ].map((item) => {
                      const isChecked = staffConfig.includes(item.key);
                      return (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-900 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleStaffCategory(item.key)}
                            className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200 leading-tight">
                            {item.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {configNotice && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {configNotice}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveStaffConfig}
                      disabled={isSavingConfig}
                      className="ml-auto rounded-lg bg-[#2563EB] text-white px-3 py-1.5 text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {isSavingConfig ? "Menyimpan..." : "Simpan Pengaturan"}
                    </button>
                  </div>
                </div>
              )}

              {/* Category Filter Pills */}
              <div className="px-3 pt-2 pb-1 border-b border-slate-200/80 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto text-[11px] bg-white dark:bg-[#1E2028] no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                    activeTab === "all"
                      ? "bg-[#2563EB] text-white font-semibold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                  }`}
                >
                  Semua ({activeNotifications.length})
                </button>

                {ALL_CATEGORY_KEYS.filter((cat) => allowedCategories.includes(cat)).map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const Icon = meta.icon;
                  const count = getCount(cat);
                  const isTabActive = activeTab === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveTab(cat)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 flex items-center gap-1 ${
                        isTabActive
                          ? "bg-[#2563EB] text-white font-semibold shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <Icon className="size-3" />
                      <span>
                        {meta.label} ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-36 max-h-[420px]">
                {displayedNotifications.length === 0 ? (
                  <div className="py-12 text-center px-4">
                    <div className="grid size-11 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2">
                      <CheckCircle2 className="size-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Semua notifikasi sudah bersih!
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {activeTab === "all"
                        ? "Tidak ada tindakan atau peringatan mendesak saat ini."
                        : `Tidak ada notifikasi untuk kategori ${CATEGORY_META[activeTab]?.label || activeTab}.`}
                    </p>
                  </div>
                ) : (
                  displayedNotifications.map((n) => {
                    const meta = CATEGORY_META[n.category] || CATEGORY_META.order;
                    const Icon = meta.icon;

                    return (
                      <div
                        key={n.id}
                        className={`group relative rounded-xl border p-2.5 transition-all text-xs ${meta.border}`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <Link
                            href={n.link}
                            onClick={() => handleNotificationClick(n.id)}
                            className="flex items-start gap-2.5 flex-1 min-w-0"
                          >
                            <div
                              className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${meta.bg} ${meta.color}`}
                            >
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="rounded-md bg-white/80 dark:bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                  {meta.label}
                                </span>
                                {n.severity === "urgent" && (
                                  <span className="rounded-md bg-rose-500 text-white px-1.5 py-0.5 text-[9px] font-black uppercase">
                                    Urgent
                                  </span>
                                )}
                              </div>
                              <p
                                className={`font-bold line-clamp-1 text-xs mt-0.5 ${meta.text}`}
                              >
                                {n.title}
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                                {n.description}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                                <Clock className="size-3 inline" />
                                {new Intl.DateTimeFormat("id-ID", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                  timeZone: "Asia/Jakarta",
                                }).format(new Date(n.created_at))}
                              </p>
                            </div>
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => handleDismiss(n.id, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors opacity-70 group-hover:opacity-100 shrink-0"
                            title="Tandai sudah dibaca & hapus"
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
              <div className="p-2.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between gap-2 text-xs">
                <Link
                  href="/admin/logs"
                  onClick={() => setNotifOpen(false)}
                  className="inline-flex items-center gap-1.5 font-bold text-[#2563EB] dark:text-blue-400 hover:underline text-[11px]"
                >
                  <FileText className="size-3.5" />
                  Log Aktivitas & Audit
                </Link>
                <Link
                  href="/admin/orders"
                  onClick={() => setNotifOpen(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Kelola Pesanan &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        <Link
          href="/admin/orders"
          aria-label="Lihat pesanan"
          title="Lihat pesanan"
          className="size-10 rounded-full bg-white dark:bg-[#23252C] border border-slate-200/70 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs cursor-pointer hover:border-[#2563EB]/40 transition"
        >
          <ShoppingBag className="h-4.5 w-4.5" />
        </Link>

        <div className="h-7 w-px bg-slate-200 dark:bg-white/10 mx-0.5"></div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Admin Profile Menu"
            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/5 transition"
          >
            <Avatar className="size-9 border border-slate-200 dark:border-white/10 shadow-xs">
              <AvatarImage src={avatarUrl} alt={adminName} />
              <AvatarFallback className="bg-[#2563EB] text-white text-xs font-bold">
                {adminName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-xl animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b mb-1">
                <p className="text-xs font-bold leading-none text-foreground">{adminName}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                  {isSuperAdmin ? "Super Admin" : "Staf Administrator"}
                </p>
              </div>
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <Store className="size-3.5 text-muted-foreground" />
                Lihat Toko Publik
              </Link>
              <Link
                href="/admin/customers"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <UserRound className="size-3.5 text-muted-foreground" />
                Profil & Staf Toko
              </Link>
              <div className="h-px bg-border my-1" />
              <button
                type="button"
                onClick={() => {
                  useCartStore.getState().clearCart();
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition cursor-pointer"
              >
                <LogOut className="size-3.5" />
                Keluar Akun
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
