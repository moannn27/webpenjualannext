"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FileText,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Truck,
  Store,
  ShieldAlert,
  Package,
  RefreshCw,
  UserRound,
  SlidersHorizontal,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  updateAdminOrderStatusAction,
  updateAdminPaymentStatusAction,
  updateAdminOrderInvoiceAction,
  deleteAdminOrderAction,
} from "@/actions/admin";

export type AdminOrderItem = {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
  price: number;
  quantity: number;
  variant_details?: unknown;
  products?:
    | { product_images?: { url: string; is_primary: boolean }[] }
    | { product_images?: { url: string; is_primary: boolean }[] }[]
    | null;
};

export type AdminOrderData = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  discount_amount: number;
  shipping_amount: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  courier: string | null;
  shipping_address: Record<string, unknown> | null;
  users?:
    | { full_name?: string | null; phone?: string | null }
    | { full_name?: string | null; phone?: string | null }[]
    | null;
  order_items?: AdminOrderItem[] | null;
  payments?: { id: string; amount: number; status: string; payment_method: string }[] | null;
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu Pembayaran",
  processing: "Pembayaran Dikonfirmasi · Disiapkan",
  ready_for_pickup: "Siap Diambil di Toko",
  shipped: "Sedang Dikirim Kurir",
  delivered: "Selesai (Diterima)",
  cancelled: "Dibatalkan",
};

const statusBadgeStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60",
  processing: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/60",
  ready_for_pickup: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200/60",
  shipped: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60",
  delivered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60",
  cancelled: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60",
};

const money = (val: number) => `Rp ${Number(val ?? 0).toLocaleString("id-ID")}`;

interface OrderActionModalProps {
  order: AdminOrderData;
  isSuperAdmin?: boolean;
  canDeleteOrder?: boolean;
}

export function OrderActionModal({ order, isSuperAdmin = false, canDeleteOrder = false }: OrderActionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [superAdminCorrectionOpen, setSuperAdminCorrectionOpen] = useState(false);
  const [correctionStatus, setCorrectionStatus] = useState(order.status);
  const [correctionStatusOptionsOpen, setCorrectionStatusOptionsOpen] = useState(false);
  const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const router = useRouter();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const payment = order.payments?.[0];
  const isPickup = order.courier === "pickup";
  const userObj = Array.isArray(order.users) ? order.users[0] : order.users;
  const customerName = userObj?.full_name || "Pelanggan";
  const customerPhone = userObj?.phone || "";
  const address = order.shipping_address as Record<string, unknown> | null;
  const items = order.order_items ?? [];

  // Parse phone for WhatsApp URL
  const cleanPhone = customerPhone.replace(/\D/g, "").replace(/^0/, "62");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(customerName)}%2C%20kami%20dari%20Next%20Solution%20mengenai%20pesanan%20%23${order.order_number}.`
    : null;

  // Handle Payment Status Update
  const handlePaymentChange = (nextStatus: "success" | "failed") => {
    setFeedback(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("order_id", order.id);
        fd.set("payment_status", nextStatus);
        await updateAdminPaymentStatusAction(fd);
        setFeedback({
          type: "success",
          message:
            nextStatus === "success"
              ? "Pembayaran berhasil dikonfirmasi! Pesanan otomatis masuk status Disiapkan."
              : "Bukti transfer ditandai gagal/tidak valid.",
        });
        router.refresh();
      } catch (err) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Gagal memperbarui status pembayaran.",
        });
      }
    });
  };

  // Handle Order Status Transition
  const handleSaveInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingInvoice(true);
    setFeedback(null);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("order_id", order.id);
      await updateAdminOrderInvoiceAction(formData);
      setFeedback({
        type: "success",
        message: "Data faktur pesanan berhasil diperbarui!",
      });
      setEditInvoiceOpen(false);
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal memperbarui faktur pesanan.",
      });
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleDeleteOrder = async () => {
    setIsDeleting(true);
    setFeedback(null);
    try {
      await deleteAdminOrderAction(order.id);
      setDeleteConfirmOpen(false);
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menghapus pesanan.",
      });
      setIsDeleting(false);
    }
  };

  const handleOrderStatusChange = (
    nextStatus: string,
    options?: { isCorrection?: boolean; fulfillmentCorrection?: "pickup" }
  ) => {
    setFeedback(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", order.id);
        fd.set("status", nextStatus);
        if (options?.isCorrection) {
          fd.set("status_correction", "on");
          fd.set("confirm_correction", "on");
          if (options.fulfillmentCorrection) {
            fd.set("fulfillment_correction", options.fulfillmentCorrection);
          }
        }
        await updateAdminOrderStatusAction(fd);
        setFeedback({
          type: "success",
          message: `Status pesanan berhasil diubah menjadi "${statusLabels[nextStatus] ?? nextStatus}"!`,
        });
        router.refresh();
      } catch (err) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Gagal memperbarui status pesanan.",
        });
      }
    });
  };

  return (
    <>
      {/* Trigger Button inside table cell */}
      <button
        type="button"
        onClick={() => {
          setFeedback(null);
          setIsOpen(true);
        }}
        title="Buka Tindakan & Detail Pesanan"
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#23252C] hover:bg-blue-50 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:border-blue-400 dark:hover:border-blue-500/50 transition cursor-pointer"
      >
        <SlidersHorizontal className="size-3.5 text-[#2563EB]" />
        <span>Tindakan</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="relative w-full max-w-2xl rounded-[28px] border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#18191E] shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 p-5 sm:px-7 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-500/10 text-[#2563EB] flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Tindakan &amp; Detail Pesanan
                    </h2>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold border shadow-2xs",
                        statusBadgeStyles[order.status] ?? "bg-slate-100 text-slate-700"
                      )}
                    >
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    #{order.order_number} ·{" "}
                    {new Intl.DateTimeFormat("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Jakarta",
                    }).format(new Date(order.created_at))}{" "}
                    WIB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-8 rounded-full border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 transition cursor-pointer"
                aria-label="Tutup modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto pr-3 sm:pr-6 scrollbar-thin">
              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={cn(
                    "flex items-center gap-2.5 p-3.5 rounded-2xl text-xs sm:text-sm font-medium border",
                    feedback.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/40"
                      : "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/40"
                  )}
                >
                  {feedback.type === "success" ? (
                    <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="size-4.5 text-rose-600 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* 1. KOTAK TINDAKAN CEPAT (ACTION BUTTONS) */}
              <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 p-4.5 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-blue-200/50 dark:border-blue-900/30 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-[#2563EB]" />
                    Tindakan Status &amp; Verifikasi
                  </span>
                  <span className="text-xs font-medium text-blue-700/80 dark:text-blue-400">
                    {order.status === "pending"
                      ? "Menunggu Konfirmasi Pembayaran"
                      : order.status === "processing"
                      ? "Pesanan Siap Dikemas"
                      : "Dalam Proses"}
                  </span>
                </div>

                {/* Sub-Aksi: Pembayaran Menunggu Konfirmasi */}
                {order.status === "pending" && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Pelanggan memesan via <strong>{payment?.payment_method === "manual_transfer" ? "Transfer Bank Manual" : (payment?.payment_method || "Transfer")}</strong>. Periksa bukti transfer mutasi bank toko, lalu klik tombol di bawah:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => handlePaymentChange("success")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                      >
                        {busy ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                        Konfirmasi Transfer Valid (Masuk Disiapkan)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => handlePaymentChange("failed")}
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs h-9 px-3.5 rounded-xl cursor-pointer"
                      >
                        Tandai Bukti Tidak Valid / Palsu
                      </Button>
                    </div>
                  </div>
                )}

                {/* Sub-Aksi: Proses Alur Pengiriman */}
                {order.status === "processing" && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Pembayaran telah terverifikasi valid. Jika barang sudah dikemas siap diambil/dikirim, ubah status:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isPickup ? (
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() => handleOrderStatusChange("ready_for_pickup")}
                          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                        >
                          {busy ? <RefreshCw className="size-3.5 animate-spin" /> : <Store className="size-3.5" />}
                          Tandai Siap Diambil di Toko
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() => handleOrderStatusChange("shipped")}
                          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                        >
                          {busy ? <RefreshCw className="size-3.5 animate-spin" /> : <Truck className="size-3.5" />}
                          Tandai Sudah Diserahkan ke Kurir
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => handleOrderStatusChange("cancelled")}
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs h-9 px-3.5 rounded-xl cursor-pointer"
                      >
                        Batalkan Pesanan
                      </Button>
                    </div>
                  </div>
                )}

                {/* Sub-Aksi: Selesaikan Pesanan */}
                {(order.status === "shipped" || order.status === "ready_for_pickup") && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {isPickup
                        ? "Pelanggan dapat mengambil barang di lokasi toko. Jika sudah diambil pembeli:"
                        : "Paket sedang dalam perjalanan kurir. Jika paket sudah tiba di alamat pembeli:"}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => handleOrderStatusChange("delivered")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                      >
                        {busy ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                        Selesaikan Pesanan (Sudah Diterima)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => handleOrderStatusChange("cancelled")}
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs h-9 px-3.5 rounded-xl cursor-pointer"
                      >
                        Batalkan / Retur
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status Selesai / Dibatalkan */}
                {order.status === "delivered" && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="size-4" />
                    <span>Pesanan ini telah selesai dan barang telah berhasil diterima pembeli.</span>
                  </div>
                )}
                {order.status === "cancelled" && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    <AlertCircle className="size-4" />
                    <span>Pesanan ini telah dibatalkan.</span>
                  </div>
                )}
              </div>

              {/* 2. RINCIAN PRODUK YANG DIPESAN */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Package className="size-3.5 text-[#2563EB]" />
                    Produk yang Dipesan ({items.length} Item)
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Subtotal: {money(order.total_amount)}
                  </span>
                </div>

                <div className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {items.map((item) => {
                    const productObj = Array.isArray(item.products) ? item.products[0] : item.products;
                    const img =
                      productObj?.product_images?.find((i) => i.is_primary)?.url ||
                      productObj?.product_images?.[0]?.url;
                    let variantStr = "";
                    if (item.variant_details) {
                      if (typeof item.variant_details === "string") {
                        variantStr = item.variant_details;
                      } else if (typeof item.variant_details === "object") {
                        const vd = item.variant_details as Record<string, unknown>;
                        variantStr = [vd.color, vd.ram, vd.storage].filter(Boolean).join(" · ");
                      }
                    }

                    return (
                      <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                        <div className="relative size-12 shrink-0 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden flex items-center justify-center">
                          {img ? (
                            <Image src={img} alt={item.product_name ?? "Produk"} fill sizes="48px" className="object-cover" />
                          ) : (
                            <Package className="size-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                            {item.product_name || "Produk"}
                          </h4>
                          {variantStr && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Varian: {variantStr}
                            </p>
                          )}
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                            {money(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white tabular-nums">
                            {money(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rincian Biaya & Total */}
                <div className="border-t border-slate-200/70 dark:border-white/10 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal Produk</span>
                    <span className="tabular-nums">{money(order.total_amount)}</span>
                  </div>
                  {Number(order.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>Diskon Voucher</span>
                      <span className="tabular-nums">- {money(order.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Ongkos Kirim ({isPickup ? "Ambil di Toko" : (order.courier || "Kurir")})</span>
                    <span className="tabular-nums">{Number(order.shipping_amount) === 0 ? "Gratis" : money(order.shipping_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200/70 dark:border-white/10">
                    <span>Total Pembayaran (Grand Total)</span>
                    <span className="text-[#2563EB] dark:text-blue-400 tabular-nums">{money(order.grand_total)}</span>
                  </div>
                </div>
              </div>

              {/* 3. INFORMASI PELANGGAN & PENGIRIMAN */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Data Pelanggan */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-4 space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-white/5 pb-2">
                    <UserRound className="size-4 text-[#2563EB]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Informasi Pelanggan
                    </span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {customerName}
                    </p>
                    {customerPhone ? (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {customerPhone}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">Tidak ada no. telepon</p>
                    )}
                  </div>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs mt-1"
                    >
                      <MessageCircle className="size-3.5" />
                      <span>Chat WhatsApp Pembeli</span>
                    </a>
                  )}
                </div>

                {/* Metode & Alamat Pengiriman */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-4 space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-white/5 pb-2">
                    {isPickup ? <Store className="size-4 text-amber-600" /> : <Truck className="size-4 text-blue-600" />}
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {isPickup ? "Lokasi Ambil di Toko (Pickup)" : "Alamat Pengiriman Kurir"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isPickup ? (
                      <>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {String(address?.pickup_location ?? "Toko Next Solution")}
                        </p>
                        <p className="mt-0.5">
                          {String(address?.pickup_address ?? "Jl. Kartini No. 09, Bandung")}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          Penerima: {String(address?.recipient_name ?? customerName)} ({String(address?.phone ?? customerPhone)})
                        </p>
                        <p className="mt-0.5">
                          {[address?.street_address, address?.city, address?.province, address?.postal_code]
                            .filter(Boolean)
                            .map(String)
                            .join(", ") || "Alamat belum dilengkapi."}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* FITUR EDIT FAKTUR ORDERAN */}
              <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-blue-500/10 text-[#2563EB] flex items-center justify-center">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Faktur &amp; Kustomisasi Nota
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Sesuaikan nama pelanggan, kontak, toko, atau catatan pada faktur pesanan ini.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditInvoiceOpen(!editInvoiceOpen)}
                    className="h-7 text-xs font-bold gap-1 rounded-lg border-blue-200 dark:border-blue-900 text-[#2563EB] hover:bg-blue-50"
                  >
                    <Pencil className="size-3" />
                    <span>{editInvoiceOpen ? "Tutup Editor" : "Edit Faktur"}</span>
                  </Button>
                </div>

                {editInvoiceOpen && (
                  <form onSubmit={handleSaveInvoice} className="pt-3 border-t border-blue-100 dark:border-blue-900/40 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Nama Pelanggan / Penerima:
                        </label>
                        <input
                          type="text"
                          name="recipient_name"
                          defaultValue={String(
                            (address?.invoice_override as any)?.customer_name ||
                            address?.recipient_name ||
                            customerName
                          )}
                          required
                          className="w-full h-8 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Nomor Telepon / WhatsApp:
                        </label>
                        <input
                          type="text"
                          name="phone"
                          defaultValue={String(
                            (address?.invoice_override as any)?.phone ||
                            address?.phone ||
                            customerPhone
                          )}
                          required
                          className="w-full h-8 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          Nama Toko / Cabang (Kustom):
                        </label>
                        <input
                          type="text"
                          name="store_name"
                          placeholder="Next Solution Store"
                          defaultValue={String((address?.invoice_override as any)?.store_name || "")}
                          className="w-full h-8 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                          No. Pesanan / Faktur Tampil:
                        </label>
                        <input
                          type="text"
                          name="order_number"
                          placeholder={order.order_number}
                          defaultValue={String((address?.invoice_override as any)?.order_number || "")}
                          className="w-full h-8 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-900 dark:text-white text-xs font-mono font-medium focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {isPickup ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                            Nama Titik Ambil di Toko:
                          </label>
                          <input
                            type="text"
                            name="pickup_location"
                            defaultValue={String(address?.pickup_location ?? "Toko Next Solution")}
                            className="w-full h-8 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-900 dark:text-white text-xs font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                            Alamat Gerai / Toko:
                          </label>
                          <input
                            type="text"
                            name="pickup_address"
                            defaultValue={String(address?.pickup_address ?? "")}
                            placeholder="Alamat gerai toko..."
                            className="w-full h-8 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-900 dark:text-white text-xs font-medium"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                            Alamat Jalan:
                          </label>
                          <input
                            type="text"
                            name="street_address"
                            defaultValue={String(address?.street_address ?? "")}
                            placeholder="Nama jalan, nomor rumah, RT/RW..."
                            className="w-full h-8 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-900 dark:text-white text-xs font-medium"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                              Kota / Kab:
                            </label>
                            <input
                              type="text"
                              name="city"
                              defaultValue={String(address?.city ?? "")}
                              className="w-full h-8 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-900 dark:text-white text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                              Provinsi:
                            </label>
                            <input
                              type="text"
                              name="province"
                              defaultValue={String(address?.province ?? "")}
                              className="w-full h-8 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-900 dark:text-white text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                              Kode Pos:
                            </label>
                            <input
                              type="text"
                              name="postal_code"
                              defaultValue={String(address?.postal_code ?? "")}
                              className="w-full h-8 px-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-900 dark:text-white text-xs font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Catatan Khusus Faktur:
                      </label>
                      <textarea
                        name="invoice_notes"
                        rows={2}
                        defaultValue={String((address?.invoice_override as any)?.notes || "")}
                        placeholder="Contoh: Garansi resmi 2 tahun distributor. Nota asli wajib dibawa saat klaim service."
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-900 dark:text-white text-xs font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditInvoiceOpen(false)}
                        className="h-8 text-xs font-semibold"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSavingInvoice}
                        size="sm"
                        className="h-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg px-4"
                      >
                        {isSavingInvoice ? "Menyimpan..." : "Simpan Perubahan Faktur"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* 4. METODE & STATUS PEMBAYARAN */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Metode Pembayaran:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {payment?.payment_method === "manual_transfer"
                      ? "Transfer Bank Manual"
                      : payment?.payment_method === "cod"
                      ? "Cash On Delivery (COD)"
                      : payment?.payment_method || "Transfer Bank"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status Pembayaran:</span>
                  <span
                    className={cn(
                      "font-bold text-xs uppercase px-2.5 py-0.5 rounded-full border inline-block mt-0.5",
                      payment?.status === "success"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : payment?.status === "failed"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {payment?.status === "success"
                      ? "Terkonfirmasi Valid"
                      : payment?.status === "failed"
                      ? "Gagal / Ditolak"
                      : "Menunggu Verifikasi"}
                  </span>
                </div>
              </div>

              {/* 5. KOREKSI KHUSUS SUPER ADMIN */}
              {isSuperAdmin && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSuperAdminCorrectionOpen(!superAdminCorrectionOpen);
                      setCorrectionStatus(order.status);
                      setCorrectionStatusOptionsOpen(false);
                    }}
                    className="flex items-center justify-between w-full text-left font-bold text-xs text-amber-800 dark:text-amber-300 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="size-4 text-amber-600" />
                      Koreksi Status Super Admin (Akses Darurat)
                    </span>
                    <ChevronDown
                      className={cn("size-4 transition-transform", superAdminCorrectionOpen && "rotate-180")}
                    />
                  </button>

                  {superAdminCorrectionOpen && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const statusVal = (form.elements.namedItem("status") as HTMLInputElement).value;
                        const isPickupCorrection = (form.elements.namedItem("fulfillment_correction") as HTMLInputElement)?.checked;
                        handleOrderStatusChange(statusVal, {
                          isCorrection: true,
                          fulfillmentCorrection: isPickupCorrection ? "pickup" : undefined,
                        });
                      }}
                      className="space-y-3 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-xs"
                    >
                      <div className="block space-y-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Paksa Ubah Status Pesanan Menjadi:
                        </span>
                        <input type="hidden" name="status" value={correctionStatus} />
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={correctionStatusOptionsOpen}
                          onClick={() => setCorrectionStatusOptionsOpen((open) => !open)}
                          className="flex h-9 w-full items-center justify-between gap-3 rounded-xl border border-amber-300 bg-white px-3 text-left text-xs font-semibold dark:border-amber-800 dark:bg-[#1E2028]"
                        >
                          <span>{statusLabels[correctionStatus] ?? correctionStatus}</span>
                          <ChevronDown className={cn("size-4 shrink-0 transition-transform", correctionStatusOptionsOpen && "rotate-180")} />
                        </button>
                        {correctionStatusOptionsOpen && (
                          <div
                            role="listbox"
                            aria-label="Pilih status pesanan"
                            className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-amber-200 bg-white p-1 shadow-sm dark:border-amber-900/60 dark:bg-[#1E2028]"
                          >
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                role="option"
                                aria-selected={correctionStatus === value}
                                onClick={() => {
                                  setCorrectionStatus(value);
                                  setCorrectionStatusOptionsOpen(false);
                                }}
                                className={cn(
                                  "block w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors",
                                  correctionStatus === value
                                    ? "bg-amber-100 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100"
                                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {order.courier !== "pickup" && (
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                          <input type="checkbox" name="fulfillment_correction" value="pickup" className="rounded" />
                          <span>Koreksi metode penerimaan menjadi Ambil di Toko (Pickup)</span>
                        </label>
                      )}

                      <Button
                        type="submit"
                        disabled={busy}
                        size="sm"
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 rounded-xl"
                      >
                        {busy ? "Menyimpan Koreksi..." : "Terapkan Koreksi Super Admin"}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-white/5 p-4 sm:px-7 bg-slate-50/70 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <a
                  href={`/orders/${order.id}/invoice`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:underline"
                >
                  <FileText className="size-4" />
                  <span>Buka Faktur / Invoice Resmi</span>
                  <ExternalLink className="size-3" />
                </a>

                {canDeleteOrder && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Hapus Pesanan</span>
                  </button>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="rounded-full text-xs font-semibold px-4 h-8"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Konfirmasi Hapus Pesanan */}
      {deleteConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-[#18191E] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Hapus Pesanan #{order.order_number}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tindakan ini memerlukan izin khusus dan tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 p-3 text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              Semua data terkait transaksi ini termasuk rincian item produk dan verifikasi pembayaran akan dihapus secara permanen dari basis data toko.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmOpen(false)}
                className="text-xs font-semibold rounded-xl h-8 px-4"
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteOrder}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl h-8 px-4 flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="size-3.5" />
                <span>{isDeleting ? "Menghapus..." : "Ya, Hapus Pesanan"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
