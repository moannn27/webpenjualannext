"use client";

import { useState, useEffect, useTransition, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Lock,
  LogOut,
  MessageCircle,
  Package,
  PackageCheck,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Star,
  Store,
  Truck,
  X,
} from "lucide-react";
import { logout } from "@/actions/auth";
import {
  updateProfileAction,
  updateUserPasswordAction,
  checkUserLockStatusAction,
} from "@/actions/user";
import { confirmOrderDeliveredAction } from "@/actions/order";
import { submitReviewAction } from "@/actions/review";
import { formatWhatsAppNumber } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tab = "orders" | "wishlist" | "settings";
type Profile = {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  home_address?: string | null;
  role?: string | null;
  is_password_locked?: boolean;
  failed_password_attempts?: number;
} | null;

type OrderedProduct = {
  id?: string;
  name?: string;
  product_images?: { url: string; is_primary: boolean }[];
  product_specifications?: { key: string; value: string; display_order?: number | null }[];
} | null;

type Order = {
  id: string;
  order_number?: string | null;
  created_at: string;
  updated_at?: string;
  status: string;
  total_amount?: number | null;
  shipping_amount?: number | null;
  grand_total?: number | null;
  courier?: string | null;
  shipping_address?: Record<string, unknown> | null;
  order_items?: {
    id: string;
    product_id?: string;
    product_name: string;
    price: number;
    quantity: number;
    variant_details?: { sku?: string; color?: string; ram?: string; storage?: string } | null;
    products?: OrderedProduct | OrderedProduct[];
  }[];
  payments?: { id: string; amount: number; payment_method: string | null; status: string }[];
};

type WishlistEntry = {
  id: string;
  product_id: string;
  products?: {
    id: string;
    name: string;
    price: number;
    discount_price?: number | null;
    image?: string | null;
    product_images?: { url: string; is_primary?: boolean }[];
    product_specifications?: { key: string; value: string; display_order?: number | null }[];
  } | null;
};

export type UserReview = {
  id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

const orderStatusLabels: Record<string, string> = {
  pending: "Menunggu pembayaran",
  processing: "Pembayaran dikonfirmasi · sedang disiapkan",
  shipped: "Dalam pengiriman",
  ready_for_pickup: "Siap diambil di toko",
  delivered: "Selesai (Barang diterima)",
  cancelled: "Dibatalkan (Refund)",
};

const paymentStatusLabels: Record<string, string> = {
  pending: "Menunggu konfirmasi",
  success: "Terkonfirmasi",
  failed: "Gagal",
  refunded: "Dikembalikan (Refund)",
  expired: "Kedaluwarsa",
};

function OrderProgress({ order }: { order: Order }) {
  if (order.status === "cancelled") {
    return (
      <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
        ❌ Pesanan dibatalkan.
      </p>
    );
  }
  const steps =
    order.courier === "pickup"
      ? [
          ["pending", "Menunggu pembayaran"],
          ["processing", "Dikonfirmasi · disiapkan"],
          ["ready_for_pickup", "Siap diambil"],
          ["delivered", "Selesai"],
        ]
      : [
          ["pending", "Menunggu pembayaran"],
          ["processing", "Dikonfirmasi · disiapkan"],
          ["shipped", "Dikirim"],
          ["delivered", "Selesai"],
        ];
  const current = steps.findIndex(([status]) => status === order.status);
  return (
    <ol
      aria-label={`Progres pesanan: ${orderStatusLabels[order.status] ?? order.status}`}
      className="mt-4 grid gap-2 sm:grid-cols-2"
    >
      {steps.map(([status, label], index) => (
        <li
          key={status}
          className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
            current >= index
              ? "border-primary/40 bg-primary/5 font-medium text-foreground"
              : "border-border text-muted-foreground"
          }`}
        >
          <span
            className={`mr-2 inline-grid size-5 place-items-center rounded-full text-[11px] font-bold ${
              current >= index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}

export function ProfileDashboard({
  profile,
  orders,
  wishlist,
  reviews = [],
  storeWhatsapp = "081234567890",
}: {
  profile: Profile;
  orders: Order[];
  wishlist: WishlistEntry[];
  reviews?: UserReview[];
  storeWhatsapp?: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  // Filter & Search untuk Pesanan
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState<string>("");

  // Review Modal State
  const [userReviews, setUserReviews] = useState<UserReview[]>(reviews);
  const [reviewModalItem, setReviewModalItem] = useState<{
    productId: string;
    productName: string;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const name = profile?.full_name || "Pelanggan";
  const roleLabel =
    profile?.role === "super_admin"
      ? "Super admin"
      : profile?.role === "admin"
      ? "Admin"
      : "Akun pelanggan";

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaved(false);
    setNotice("");
    setError("");
    startTransition(async () => {
      try {
        const result = await updateProfileAction(data);
        setSaved(true);
        setNotice(
          result.emailChangePending
            ? "Data profil tersimpan. Cek email lama dan baru untuk konfirmasi."
            : result.emailUpdateError
            ? `Data profil tersimpan, namun ubah email gagal: ${result.emailUpdateError}`
            : "Perubahan profil berhasil disimpan."
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Perubahan gagal disimpan. Coba lagi.");
      }
    });
  };

  // Ubah Kata Sandi Akun
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  const failedStorageKey = `pwd_fail_${profile?.email || "user"}`;

  const [checkingUnlock, setCheckingUnlock] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Jika server menyatakan akun TIDAK terkunci (misalnya setelah admin reset):
      if (!profile?.is_password_locked) {
        localStorage.removeItem(failedStorageKey);
        setFailedAttempts(0);
        return;
      }

      // Jika server menyatakan akun terkunci:
      if (profile?.is_password_locked) {
        setFailedAttempts(3);
        localStorage.setItem(failedStorageKey, "3");
        return;
      }
    }
  }, [failedStorageKey, profile?.is_password_locked]);

  const handleCheckUnlockStatus = async () => {
    setCheckingUnlock(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      const res = await checkUserLockStatusAction();
      if (!res.isLocked) {
        setFailedAttempts(0);
        if (typeof window !== "undefined") {
          localStorage.removeItem(failedStorageKey);
        }
        setPasswordSuccess("Kunci akun telah dibuka! Anda sekarang dapat memasukkan kata sandi baru.");
      } else {
        setPasswordError("Akun masih terkunci. Silakan hubungi admin toko via WhatsApp agar dibantu reset.");
      }
    } catch {
      setPasswordError("Gagal memeriksa status kunci. Silakan muat ulang halaman.");
    } finally {
      setCheckingUnlock(false);
    }
  };

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (failedAttempts >= 3) {
      setPasswordError(
        "Form ubah kata sandi telah dikunci karena 3x salah kata sandi lama. Silakan hubungi admin."
      );
      return;
    }

    if (!oldPassword) {
      setPasswordError("Masukkan kata sandi lama Anda.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (newPassword === oldPassword) {
      setPasswordError("Kata sandi baru harus berbeda dengan kata sandi lama.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setPasswordBusy(true);
    try {
      const data = new FormData();
      data.append("old_password", oldPassword);
      data.append("new_password", newPassword);
      data.append("confirm_password", confirmPassword);
      const result = await updateUserPasswordAction(data);

      if (result.error) {
        if (result.isWrongOldPassword) {
          const nextCount = failedAttempts + 1;
          setFailedAttempts(nextCount);
          if (typeof window !== "undefined") {
            localStorage.setItem(failedStorageKey, String(nextCount));
          }
          if (nextCount >= 3) {
            setPasswordError(
              "Anda telah 3x salah memasukkan kata sandi lama. Akses ubah sandi dikunci. Silakan hubungi admin toko agar dibantu reset kata sandi."
            );
          } else {
            setPasswordError(
              `Kata sandi lama salah! Sisa percobaan: ${3 - nextCount}x lagi.`
            );
          }
        } else {
          setPasswordError(result.error);
        }
      } else {
        setPasswordSuccess("Kata sandi berhasil diperbarui!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setFailedAttempts(0);
        if (typeof window !== "undefined") {
          localStorage.removeItem(failedStorageKey);
        }
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Gagal memperbarui kata sandi.");
    } finally {
      setPasswordBusy(false);
    }
  };

  // Konfirmasi Barang Diterima oleh User
  const handleConfirmDelivered = (orderId: string) => {
    if (!confirm("Pastikan kamu sudah memeriksa barang fisik dengan baik. Lanjutkan tandai pesanan diterima?")) {
      return;
    }
    startTransition(async () => {
      try {
        await confirmOrderDeliveredAction(orderId);
        setNotice("Pesanan berhasil dikonfirmasi diterima! Terima kasih. Anda sekarang dapat memberikan ulasan produk.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengonfirmasi pesanan.");
      }
    });
  };

  // Kirim Review Produk
  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewModalItem) return;
    setReviewSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("productId", reviewModalItem.productId);
      fd.set("rating", String(reviewRating));
      fd.set("comment", reviewComment);
      await submitReviewAction(fd);

      // Update local reviews
      setUserReviews((prev) => {
        const filtered = prev.filter((r) => r.product_id !== reviewModalItem.productId);
        return [
          ...filtered,
          {
            id: `temp-${Date.now()}`,
            product_id: reviewModalItem.productId,
            rating: reviewRating,
            comment: reviewComment,
            created_at: new Date().toISOString(),
          },
        ];
      });

      setNotice(`Ulasan untuk "${reviewModalItem.productName}" berhasil disimpan! Terima kasih.`);
      setReviewModalItem(null);
      setReviewComment("");
      setReviewRating(5);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan ulasan.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Filter orders counts
  const orderCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    in_transit: orders.filter((o) => o.status === "shipped" || o.status === "ready_for_pickup").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const orderTabs = [
    { key: "all", label: "Semua", count: orderCounts.all },
    { key: "pending", label: "Menunggu Bayar", count: orderCounts.pending },
    { key: "processing", label: "Disiapkan", count: orderCounts.processing },
    { key: "in_transit", label: "Dikirim / Siap Ambil", count: orderCounts.in_transit },
    { key: "delivered", label: "Selesai (Diterima)", count: orderCounts.delivered },
    { key: "cancelled", label: "Dibatalkan (Refund)", count: orderCounts.cancelled },
  ];

  const filteredOrders = orders.filter((order) => {
    // Filter status tab
    if (orderStatusFilter === "pending" && order.status !== "pending") return false;
    if (orderStatusFilter === "processing" && order.status !== "processing") return false;
    if (orderStatusFilter === "in_transit" && order.status !== "shipped" && order.status !== "ready_for_pickup") return false;
    if (orderStatusFilter === "delivered" && order.status !== "delivered") return false;
    if (orderStatusFilter === "cancelled" && order.status !== "cancelled") return false;

    // Filter search
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase().trim();
      const orderNum = (order.order_number ?? "").toLowerCase();
      const itemNames = (order.order_items ?? [])
        .map((i) => (i.product_name ?? "").toLowerCase())
        .join(" ");
      if (!orderNum.includes(q) && !itemNames.includes(q)) return false;
    }

    return true;
  });

  return (
    <div className="container mx-auto px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      {notice && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="text-emerald-700 hover:text-emerald-900">
            <X className="size-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-destructive">
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full shrink-0 md:w-64">
          <div className="mb-6 rounded-3xl border border-border bg-card p-6 shadow-xs">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold">{name}</h2>
                <p className="truncate text-sm text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
            <nav className="flex flex-col gap-2">
              {(
                [
                  ["orders", Package, "Pesanan"],
                  ["wishlist", Heart, "Wishlist"],
                  ["settings", Settings, "Pengaturan"],
                ] as const
              ).map(([tab, Icon, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                    activeTab === tab ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </button>
              ))}
              {(profile?.role === "admin" || profile?.role === "super_admin") && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Shield className="size-5" />
                  Panel admin
                </Link>
              )}
              <form action={logout}>
                <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-destructive hover:bg-destructive/10 transition-colors">
                  <LogOut className="size-5" />
                  Keluar
                </button>
              </form>
            </nav>
          </div>
        </aside>

        {/* Content Section */}
        <section className="min-h-[420px] flex-1 rounded-3xl border border-border bg-card p-6 shadow-xs sm:p-8">
          {activeTab === "orders" && (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Riwayat Pesanan</h1>
                  <p className="text-sm text-muted-foreground">
                    Pantau status penerimaan, konfirmasi pengiriman, dan ulas produk pesananmu.
                  </p>
                </div>
              </div>

              {/* Search & Filter Bar Pesanan (User) */}
              <div className="mb-6 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Cari nomor pesanan (ORD-...) atau nama produk..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="pl-9 pr-4"
                  />
                  {orderSearch && (
                    <button
                      onClick={() => setOrderSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Hapus
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
                  {orderTabs.map((tab) => {
                    const isActive = orderStatusFilter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setOrderStatusFilter(tab.key)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-foreground/80"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {!filteredOrders.length ? (
                <div className="rounded-2xl border border-dashed py-14 text-center text-muted-foreground">
                  <Package className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                  <p className="font-medium">Tidak ada pesanan yang sesuai.</p>
                  <p className="mt-1 text-xs">Coba ubah kata kunci pencarian atau tab status di atas.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredOrders.map((order) => {
                    const isPickup = order.courier === "pickup";
                    const isDelivered = order.status === "delivered";
                    const isShipped = order.status === "shipped";
                    const isReadyForPickup = order.status === "ready_for_pickup";
                    const isCancelled = order.status === "cancelled";

                    return (
                      <article key={order.id} className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all">
                        {/* Header Pesanan */}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-bold text-foreground">
                              {order.order_number ?? `Pesanan ${order.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(
                                new Date(order.created_at)
                              )}{" "}
                              ·{" "}
                              <span
                                className={`font-semibold ${
                                  isDelivered
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : isCancelled
                                    ? "text-destructive"
                                    : "text-primary"
                                }`}
                              >
                                {orderStatusLabels[order.status] ?? order.status}
                              </span>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-foreground">
                              Rp {Number(order.grand_total ?? 0).toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        {/* Stepper Progres */}
                        <OrderProgress order={order} />

                        {/* KONDISI ALERT & INFORMASI (Sesuai Permintaan User) */}
                        {/* Kondisi 1: Kurir Sedang Mengirim (shipped) */}
                        {isShipped && (
                          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/90 p-4 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 animate-in fade-in">
                            <div className="flex items-start gap-3">
                              <Truck className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
                              <div className="space-y-2 text-xs sm:text-sm">
                                <p className="font-bold text-blue-900 dark:text-blue-100">
                                  Pesanan Sedang Dalam Pengiriman Kurir
                                </p>
                                <p className="text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
                                  📹 <strong>Wajib Simpan Bukti:</strong> Mohon ambil <strong>foto &amp; video unboxing lengkap tanpa jeda</strong> saat membuka paket untuk bukti sah klaim jika ada kerusakan atau cacat barang.
                                </p>
                                <p className="text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
                                  ⏱️ <strong>Batas Konfirmasi:</strong> Kamu memiliki jeda maksimal <strong>2 hari (48 jam)</strong> untuk memeriksa barang dan menekan tombol di bawah. Jika dalam 2 hari tidak ada konfirmasi, sistem akan secara otomatis menandai barang sebagai <strong>Selesai / Diterima</strong>.
                                </p>
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmDelivered(order.id)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                                  >
                                    <PackageCheck className="size-4" />
                                    {busy ? "Memproses..." : "Konfirmasi Barang Sudah Diterima"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Kondisi 2: Siap Diambil di Toko (ready_for_pickup) */}
                        {isReadyForPickup && (
                          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 animate-in fade-in">
                            <div className="flex items-start gap-3">
                              <Store className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                              <div className="space-y-1 text-xs sm:text-sm">
                                <p className="font-bold text-amber-900 dark:text-amber-100">
                                  Pesanan Siap Diambil di Toko
                                </p>
                                <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                                  Silakan datang ke toko <strong>{String(order.shipping_address?.pickup_location ?? "Toko Next Solution")}</strong> dan tunjukkan nomor pesanan ini ke admin/kasir.
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                  Setelah barang diambil, admin akan menandai pesanan selesai dan kamu bisa memberikan ulasan produk.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Kondisi 3: Pesanan Selesai / Diterima (delivered) */}
                        {isDelivered && (
                          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                            <div className="flex items-start gap-3">
                              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <div className="space-y-1 text-xs sm:text-sm">
                                <p className="font-bold text-emerald-900 dark:text-emerald-100">
                                  Pesanan Selesai &amp; Barang Telah Diterima
                                </p>
                                <p className="text-emerald-800/90 dark:text-emerald-300/90">
                                  Terima kasih telah berbelanja di Next Solution! Kamu dapat memberikan bintang dan ulasan untuk setiap produk di bawah.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Kondisi 4: Pesanan Dibatalkan / Refund (cancelled) */}
                        {isCancelled && (
                          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/90 p-4 text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
                              <div className="space-y-1 text-xs sm:text-sm">
                                <p className="font-bold text-red-900 dark:text-red-100">
                                  Pesanan Dibatalkan (Informasi Pengembalian Dana)
                                </p>
                                <p className="text-red-800/90 dark:text-red-300/90 leading-relaxed">
                                  Pesanan ini telah dibatalkan. Jika kamu sudah melakukan pembayaran, uang refund akan dikembalikan oleh admin ke rekening kamu. Hubungi admin melalui WhatsApp untuk konfirmasi pengembalian dana.
                                </p>
                                <p className="text-xs font-medium text-red-700 dark:text-red-400">
                                  ⚠️ Catatan: Pesanan yang dibatalkan tidak dapat diulas.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Rincian Barang & Tombol Review */}
                        <details className="mt-4 border-t border-border pt-3">
                          <summary className="cursor-pointer text-sm font-semibold text-primary hover:underline">
                            Lihat barang ({order.order_items?.length || 0}), pembayaran, dan rincian lengkap
                          </summary>
                          <div className="mt-4 space-y-4 text-sm">
                            <div>
                              <h3 className="font-semibold text-foreground">Barang dipesan</h3>
                              <ul className="mt-2 space-y-3">
                                {(order.order_items ?? []).map((item) => {
                                  const product = Array.isArray(item.products) ? item.products[0] : item.products;
                                  const prodId = item.product_id || product?.id;
                                  const images = [...(product?.product_images ?? [])].sort(
                                    (a, b) => Number(b.is_primary) - Number(a.is_primary)
                                  );
                                  const variantLabel = [
                                    item.variant_details?.color,
                                    item.variant_details?.ram,
                                    item.variant_details?.storage,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ");

                                  // Cek apakah produk ini sudah direview user
                                  const existingReview = prodId ? userReviews.find((r) => r.product_id === prodId) : null;

                                  return (
                                    <li key={item.id} className="rounded-xl border border-border p-3.5 bg-background/50">
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted border">
                                            {images[0]?.url ? (
                                              <Image
                                                src={images[0].url}
                                                alt={item.product_name}
                                                fill
                                                sizes="64px"
                                                className="object-cover"
                                              />
                                            ) : (
                                              <div className="grid size-full place-items-center text-[10px] text-muted-foreground">
                                                Foto tidak ada
                                              </div>
                                            )}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-foreground">{item.product_name}</p>
                                            {variantLabel && (
                                              <p className="mt-0.5 text-xs text-muted-foreground">{variantLabel}</p>
                                            )}
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                              Jumlah: {item.quantity} · Rp {Number(item.price).toLocaleString("id-ID")} / barang
                                            </p>
                                          </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                          <p className="font-semibold tabular-nums text-foreground">
                                            Rp {Number(item.price * item.quantity).toLocaleString("id-ID")}
                                          </p>

                                          {/* TOMBOL REVIEW ATAU STATUS SUDAH DIULAS */}
                                          {isDelivered && prodId && (
                                            <div className="mt-2">
                                              {existingReview ? (
                                                <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                                                  <span>Sudah Diulas ({existingReview.rating}★)</span>
                                                </div>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setReviewModalItem({
                                                      productId: prodId,
                                                      productName: item.product_name,
                                                    })
                                                  }
                                                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-xs"
                                                >
                                                  <Star className="size-3.5" />
                                                  Beri Ulasan
                                                </button>
                                              )}
                                            </div>
                                          )}

                                          {isCancelled && (
                                            <span className="mt-1 block text-[11px] text-muted-foreground italic">
                                              Tidak dapat diulas
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Tampilkan ulasan jika sudah ada */}
                                      {existingReview?.comment && (
                                        <div className="mt-3 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground border border-border/60">
                                          <p className="font-medium text-foreground">Ulasan Anda:</p>
                                          <p className="mt-0.5 italic">&quot;{existingReview.comment}&quot;</p>
                                        </div>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>

                            {/* Info Pembayaran & Pengiriman */}
                            <div className="grid gap-4 border-t pt-3 sm:grid-cols-2">
                              <div>
                                <h3 className="font-semibold">Pembayaran</h3>
                                <p className="mt-1">
                                  Metode:{" "}
                                  {order.payments?.[0]?.payment_method === "manual_transfer"
                                    ? "Transfer manual"
                                    : order.payments?.[0]?.payment_method || "Belum tercatat"}
                                </p>
                                <p>
                                  Status:{" "}
                                  <span className="font-medium">
                                    {paymentStatusLabels[order.payments?.[0]?.status ?? ""] ??
                                      order.payments?.[0]?.status ??
                                      "Belum tercatat"}
                                  </span>
                                </p>
                              </div>
                              <div>
                                <h3 className="font-semibold">Penerimaan</h3>
                                {isPickup ? (
                                  <>
                                    <p className="mt-1 font-medium">
                                      Ambil di: {String(order.shipping_address?.pickup_location ?? "Toko Next Solution")}
                                    </p>
                                    {order.shipping_address?.pickup_address && (
                                      <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">
                                        {String(order.shipping_address.pickup_address)}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Penerima: {String(order.shipping_address?.recipient_name ?? "")} (
                                    {String(order.shipping_address?.phone ?? "")})
                                    <br />
                                    {String(order.shipping_address?.street_address ?? "")},{" "}
                                    {[
                                      order.shipping_address?.city,
                                      order.shipping_address?.province,
                                      order.shipping_address?.postal_code,
                                    ]
                                      .filter(Boolean)
                                      .map(String)
                                      .join(", ")}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Ringkasan Biaya */}
                            <div className="space-y-1.5 border-t pt-3 text-xs sm:text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal Barang</span>
                                <span className="font-medium">Rp {Number(order.total_amount ?? 0).toLocaleString("id-ID")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{isPickup ? "Biaya Pengambilan" : "Ongkos Kirim"}</span>
                                <span className="font-medium">
                                  {isPickup || Number(order.shipping_amount ?? 0) === 0
                                    ? "Gratis"
                                    : `Rp ${Number(order.shipping_amount ?? 0).toLocaleString("id-ID")}`}
                                </span>
                              </div>
                              <div className="flex justify-between border-t pt-2 text-base font-bold">
                                <span>Total Tagihan</span>
                                <span className="text-primary">
                                  Rp {Number(order.grand_total ?? 0).toLocaleString("id-ID")}
                                </span>
                              </div>

                              <div className="pt-3 border-t flex justify-end">
                                <Link
                                  href={`/orders/${order.id}/invoice`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
                                >
                                  <FileText className="size-3.5 text-primary" />
                                  Lihat / Cetak Faktur (Invoice)
                                </Link>
                              </div>
                            </div>
                          </div>
                        </details>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "wishlist" && (
            <>
              <h1 className="mb-2 text-2xl font-bold">Wishlist</h1>
              <p className="mb-6 text-sm text-muted-foreground">Produk yang kamu simpan.</p>
              {!wishlist.length ? (
                <p className="py-12 text-center text-muted-foreground">Wishlist kamu masih kosong.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {wishlist.map((entry) => {
                    const product = entry.products;
                    const images = [...(product?.product_images ?? [])].sort(
                      (a, b) => Number(b.is_primary) - Number(a.is_primary)
                    );
                    const imageUrl = product?.image || images[0]?.url;
                    return (
                      <Link
                        key={entry.id}
                        href={`/product/${product?.id ?? entry.product_id}`}
                        className="group grid min-w-0 grid-cols-[80px_minmax(0,1fr)] items-start gap-4 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/50 sm:grid-cols-[96px_minmax(0,1fr)] sm:p-5"
                      >
                        <span className="relative grid size-20 place-items-center overflow-hidden rounded-xl bg-muted sm:size-24">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={product?.name ?? "Produk wishlist"}
                              fill
                              sizes="(max-width: 640px) 80px, 96px"
                              className="object-contain p-2 mix-blend-multiply"
                            />
                          ) : (
                            <Package className="size-8 text-muted-foreground" aria-hidden="true" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 font-semibold transition-colors group-hover:text-primary">
                            {product?.name ?? "Produk"}
                          </span>
                          <span className="mt-1 block font-semibold text-primary">
                            Rp {Number(product?.discount_price ?? product?.price ?? 0).toLocaleString("id-ID")}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "settings" && (
            <div className="max-w-2xl space-y-10">
              <div>
                <h1 className="mb-6 text-2xl font-bold">Pengaturan akun</h1>
                {saved && notice && (
                  <div className="mb-4 max-w-lg rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm text-emerald-700 dark:text-emerald-400">
                    {notice}
                  </div>
                )}
                {error && (
                  <div className="mb-4 max-w-lg rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <form onSubmit={saveProfile} className="max-w-lg space-y-4">
                  <label className="block space-y-2 text-sm font-medium">
                    Nama lengkap
                    <Input name="full_name" defaultValue={profile?.full_name ?? ""} required minLength={2} />
                  </label>
                  <label className="block space-y-2 text-sm font-medium">
                    Alamat email
                    <Input name="email" type="email" autoComplete="email" defaultValue={profile?.email ?? ""} required />
                  </label>
                  <p className="-mt-2 text-xs text-muted-foreground">
                    Jika email diubah, Supabase akan mengirim email konfirmasi.
                  </p>
                  <label className="block space-y-2 text-sm font-medium">
                    Nomor HP
                    <Input name="phone" type="tel" autoComplete="tel" defaultValue={profile?.phone ?? ""} placeholder="Contoh: 081234567890" />
                  </label>
                  <label className="block space-y-2 text-sm font-medium">
                    Alamat rumah
                    <textarea
                      name="home_address"
                      autoComplete="street-address"
                      defaultValue={profile?.home_address ?? ""}
                      maxLength={500}
                      placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota, kode pos"
                      className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Menyimpan..." : "Simpan perubahan"}
                  </Button>
                </form>
              </div>

              {/* UBAH KATA SANDI */}
              <div className="border-t pt-8">
                <div className="mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Lock className="size-5 text-primary" />
                    Ubah Kata Sandi
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Perbarui kata sandi akunmu untuk keamanan login.
                  </p>
                </div>

                {failedAttempts >= 3 ? (
                  <div className="max-w-lg rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center animate-in fade-in duration-200">
                    <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive mb-3">
                      <ShieldAlert className="size-6" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      Akses Ubah Sandi Dikunci
                    </h3>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      Anda telah salah memasukkan kata sandi lama sebanyak <strong>3 kali</strong>. Demi keamanan akun Anda, silakan hubungi admin toko agar dibantu reset kata sandi, atau gunakan tautan lupa kata sandi.
                    </p>

                    <div className="mt-5 flex flex-col sm:flex-row gap-2.5 justify-center">
                      <a
                        href={`https://wa.me/${formatWhatsAppNumber(storeWhatsapp || "081234567890")}?text=${encodeURIComponent(
                          `Halo Admin, saya mengalami kendala lupa / salah kata sandi pada akun saya:\n- Nama: ${name}\n- Email: ${profile?.email || "-"}\nMohon bantuan untuk reset kata sandi akun saya. Terima kasih!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                      >
                        <MessageCircle className="size-4" />
                        Hubungi Admin via WhatsApp
                      </a>
                      <Link
                        href="/forgot-password"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Lupa Kata Sandi?
                      </Link>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50">
                      <button
                        type="button"
                        onClick={handleCheckUnlockStatus}
                        disabled={checkingUnlock}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline underline-offset-2 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5 text-primary" />
                        {checkingUnlock ? "Memeriksa status dari server..." : "Sudah dibantu reset oleh admin? Buka Kunci Sekarang"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {failedAttempts > 0 && (
                      <div className="mb-4 max-w-lg rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="size-4 shrink-0 text-amber-500" />
                          <span>Percobaan salah kata sandi: <strong>{failedAttempts}/3</strong></span>
                        </div>
                        <span className="font-semibold text-amber-600 dark:text-amber-300">
                          Sisa {3 - failedAttempts}x lagi
                        </span>
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="mb-4 max-w-lg rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{passwordSuccess}</span>
                      </div>
                    )}
                    {passwordError && (
                      <div className="mb-4 max-w-lg rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{passwordError}</span>
                      </div>
                    )}

                    <form onSubmit={handleUpdatePassword} className="max-w-lg space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Kata sandi lama</label>
                        <div className="relative">
                          <Input
                            type={showOldPassword ? "text" : "password"}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="Masukkan kata sandi lama"
                            required
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPassword(!showOldPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            title={showOldPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                          >
                            {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Kata sandi baru</label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            required
                            minLength={6}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            title={showNewPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                          >
                            {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Konfirmasi kata sandi baru</label>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Ulangi kata sandi baru"
                            required
                            minLength={6}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            title={showConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                          >
                            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" disabled={passwordBusy || !oldPassword || !newPassword || !confirmPassword}>
                        {passwordBusy ? "Menyimpan kata sandi..." : "Perbarui Kata Sandi"}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* MODAL DIALOG ULASAN PRODUK */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Ulas Produk</h3>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {reviewModalItem.productName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalItem(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground">
                  Penilaian Kualitas Produk (Bintang)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`size-7 transition-colors ${
                          reviewRating >= star
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30 hover:text-amber-400/50"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-bold text-foreground">
                    {reviewRating} / 5 Bintang
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="review-comment" className="block text-xs font-semibold text-foreground">
                  Ceritakan Pengalamanmu (Ulasan)
                </label>
                <textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Bagaimana kualitas barangnya? Sesuai harapan dan berfungsi dengan baik?"
                  rows={4}
                  maxLength={500}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewModalItem(null)}
                  disabled={reviewSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={reviewSubmitting} className="gap-1.5">
                  <Star className="size-4" />
                  {reviewSubmitting ? "Mengirim..." : "Kirim Ulasan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
