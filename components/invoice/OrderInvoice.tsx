"use client";

import {
  Printer,
  MessageCircle,
  ArrowLeft,
  HelpCircle,
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDisplayPhone } from "@/lib/phone";
import { resolveOrderCustomerIdentity } from "@/lib/orders/customer-identity";
import { getOrderPaymentState } from "@/lib/orders/payment-status";
import { getOrderItemSku } from "@/lib/orders/order-item";

export interface InvoiceOrderItem {
  id: string;
  product_id?: string | null;
  product_name: string;
  price: number;
  quantity: number;
  variant_details?: Record<string, unknown> | null;
  sku?: string | null;
  product_image?: string | null;
  brand_name?: string | null;
  category_name?: string | null;
  description?: string | null;
  specifications?: Array<{ key: string; value: string; display_order?: number }>;
  products?: {
    id?: string;
    sku?: string | null;
    name?: string;
    description?: string | null;
    brands?: { name?: string | null } | null;
    categories?: { name?: string | null } | null;
    product_images?: Array<{ url: string; is_primary?: boolean }>;
    product_specifications?: Array<{ key: string; value: string; display_order?: number }>;
  } | null;
}

export interface InvoicePayment {
  id?: string;
  amount: number;
  payment_method?: string;
  status: string;
}

export interface InvoiceOrderData {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total_amount: number;
  shipping_amount: number;
  discount_amount: number;
  grand_total: number;
  courier: string;
  shipping_address?: {
    recipient_name?: string;
    phone?: string;
    street_address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    pickup_location?: string;
    pickup_address?: string;
    fulfillment_change_note?: string;
    customer_snapshot?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  } | null;
  order_items: InvoiceOrderItem[];
  payments?: InvoicePayment[];
  users?: {
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export interface InvoiceStorefrontInfo {
  storeName?: string;
  storeAddress?: string;
  storeCity?: string;
  storePhone?: string;
  storeWhatsapp?: string;
  storeEmail?: string;
  logoUrl?: string;
  logoDisplayMode?: "both" | "logo_only" | "text_only";
  bankAccounts?: Array<{
    bank_name: string;
    account_number: string;
    account_holder: string;
    instructions?: string;
  }>;
  headerSubtitle?: string;
  termsNote?: string;
  guaranteeNote?: string;
  complaintWhatsapp?: string;
  complaintInstructions?: string;
  invoiceHeaderStyle?: "minimalist" | "creative";
}

export interface OrderInvoiceProps {
  order: InvoiceOrderData;
  storefront?: InvoiceStorefrontInfo;
  backHref?: string;
  backLabel?: string;
  isAdmin?: boolean;
}

function getProductSpecifications(item: InvoiceOrderItem): Array<{ key: string; value: string }> {
  const productData = item.products;
  const rawSpecs =
    productData?.product_specifications && productData.product_specifications.length > 0
      ? productData.product_specifications
      : item.specifications || [];

  if (Array.isArray(rawSpecs) && rawSpecs.length > 0) {
    const list = rawSpecs
      .filter((s) => s && typeof s.key === "string" && typeof s.value === "string" && s.key.trim() && s.value.trim())
      .map((s) => ({
        key: s.key.trim(),
        value: s.value.trim(),
        display_order: typeof s.display_order === "number" ? s.display_order : 0,
      }));
    list.sort((a, b) => a.display_order - b.display_order);
    return list.map(({ key, value }) => ({ key, value }));
  }
  return [];
}

function cleanInvoiceDescription(raw: string): string {
  if (!raw) return "";
  let cleaned = raw;
  if (cleaned.includes("Spesifikasi sumber pricelist:")) {
    cleaned = cleaned.split("Spesifikasi sumber pricelist:")[1]?.trim() || cleaned;
  } else if (cleaned.includes("Spesifikasi:")) {
    cleaned = cleaned.split("Spesifikasi:")[1]?.trim() || cleaned;
  }
  return cleaned
    .replace(/^[:|\-\s]+/, "")
    .replace(/[;|\s]+$/, "")
    .trim();
}

function formatWibFull(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  try {
    const parts = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
    const weekday = get("weekday");
    const day = get("day");
    const month = get("month");
    const year = get("year");
    const hour = get("hour");
    const minute = get("minute");

    if (weekday && day && month && year && hour && minute) {
      return `${weekday}, ${day} ${month} ${year} pukul ${hour}.${minute} WIB`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function OrderInvoice({
  order,
  storefront,
  backHref = "/",
  backLabel = "Kembali ke Beranda",
  isAdmin = false,
}: OrderInvoiceProps) {
  const storeName = storefront?.storeName || "Next Solution";
  const headerSubtitle =
    storefront?.headerSubtitle?.trim() || "Pusat Komputer, Laptop & Solusi Elektronik Resmi";
  const storeAddress = storefront?.storeAddress || "Jl. Kartini No. 9";
  const storeCity = storefront?.storeCity || "Bandung";
  const storePhone = storefront?.storePhone || "6281234567890";
  const storeWhatsapp = (
    storefront?.storeWhatsapp ||
    storefront?.storePhone ||
    "6281234567890"
  ).replace(/\D/g, "");
  const storeEmail = storefront?.storeEmail || "support@nextsolution.com";

  const defaultTermsNote =
    "Simpan faktur fisik atau digital ini sebagai bukti sah transaksi dan garansi resmi. Garansi distributor berlaku dengan kondisi segel utuh. Wajib sertakan video unboxing lengkap saat pengajuan komplain.";
  const termsNote = storefront?.termsNote?.trim() || defaultTermsNote;

  const defaultGuaranteeNote =
    "Simpan faktur ini sebagai bukti pembelian yang sah untuk klaim garansi resmi dan administrasi perpajakan.";
  const guaranteeNote = storefront?.guaranteeNote?.trim() || defaultGuaranteeNote;

  const complaintWhatsappRaw = (
    storefront?.complaintWhatsapp ||
    storefront?.storeWhatsapp ||
    storefront?.storePhone ||
    "6281234567890"
  ).replace(/\D/g, "");
  const complaintWhatsapp = complaintWhatsappRaw.startsWith("0")
    ? "62" + complaintWhatsappRaw.slice(1)
    : complaintWhatsappRaw;

  const complaintInstructions =
    storefront?.complaintInstructions?.trim() ||
    "Ajukan komplain pesanan atau klaim garansi langsung melalui WhatsApp Admin dengan menyertakan nomor faktur dan video unboxing utuh.";

  const bankAccounts =
    storefront?.bankAccounts && storefront.bankAccounts.length > 0
      ? storefront.bankAccounts
      : [
          {
            bank_name: "BCA",
            account_number: "8320192831",
            account_holder: "Next Solution Store",
            instructions: "Transfer sesuai nominal total tagihan",
          },
        ];

  type OrderShippingAddress = {
    recipient_name?: string | null;
    phone?: string | null;
    customer_snapshot?: unknown;
    pickup_location?: string | null;
    pickup_address?: string | null;
    street_address?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    fulfillment_change_note?: string | null;
    invoice_override?: {
      customer_name?: string;
      phone?: string;
      store_name?: string;
      order_number?: string;
      notes?: string;
    };
  };

  const address = (order.shipping_address as unknown) as OrderShippingAddress | null | undefined;
  const isPickup = order.courier === "pickup";
  const customerIdentity = resolveOrderCustomerIdentity({
    shippingAddress: address,
    userProfile: order.users,
  });
  const invoiceOverride = address?.invoice_override;
  const recipientName = invoiceOverride?.customer_name || customerIdentity.name || "Nama tidak tercatat";
  const recipientPhone = invoiceOverride?.phone || customerIdentity.phone || "-";
  const customerEmail = customerIdentity.email;
  const displayStoreName = invoiceOverride?.store_name || storeName;
  const displayOrderNumber = invoiceOverride?.order_number || order.order_number;
  const invoiceCustomNotes = invoiceOverride?.notes;

  // Format date in Indonesian WIB (Asia/Jakarta)
  const orderDateObj = new Date(order.created_at);
  const isValidDate = !isNaN(orderDateObj.getTime());
  const formattedDateOnly = isValidDate
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(orderDateObj)
    : order.created_at;

  const formattedDateTimeWIB = isValidDate
    ? formatWibFull(order.created_at)
    : order.created_at;

  const payment = order.payments?.[0];
  const paymentState = getOrderPaymentState(order.payments);
  const isPaymentConfirmed = paymentState === "paid";
  const paymentStateLabel = {
    paid: "LUNAS - TERVERIFIKASI",
    pending: "PENDING - MENUNGGU VERIFIKASI ADMIN",
    failed: "PEMBAYARAN GAGAL / KEDALUWARSA",
    refunded: "PEMBAYARAN DIKEMBALIKAN",
  }[paymentState];

  const paymentMethodRaw = payment?.payment_method?.toLowerCase() || "";
  const isCashMethod =
    paymentMethodRaw.includes("cash") ||
    paymentMethodRaw.includes("tunai") ||
    (isPickup &&
      !paymentMethodRaw.includes("qris") &&
      !paymentMethodRaw.includes("transfer") &&
      !paymentMethodRaw.includes("manual") &&
      !paymentMethodRaw.includes("bank") &&
      !paymentMethodRaw.includes("bca"));
  const isQrisMethod = paymentMethodRaw.includes("qris");

  const paymentMethodName = isQrisMethod
    ? "QRIS (Scan QR Digital)"
    : isCashMethod
    ? "Bayar Tunai di Kasir (Cash on Pickup)"
    : paymentMethodRaw.includes("bca")
    ? "Transfer Bank (BCA)"
    : paymentMethodRaw.includes("mandiri")
    ? "Transfer Bank (Mandiri)"
    : paymentMethodRaw.includes("bri")
    ? "Transfer Bank (BRI)"
    : "Transfer Bank Manual";

  const paymentMethodShortName = isQrisMethod
    ? "BAYAR QRIS"
    : isCashMethod
    ? "BAYAR TUNAI DI KASIR"
    : "TRANSFER BANK";

  const formatRupiah = (num: number) =>
    `Rp ${Number(num ?? 0).toLocaleString("id-ID")}`;

  // WhatsApp confirmation message
  const waTarget = storeWhatsapp.startsWith("0") ? "62" + storeWhatsapp.slice(1) : storeWhatsapp;
  const waMessage =
    `Halo Admin ${displayStoreName},\nSaya ingin konfirmasi pesanan:\n` +
    `• Nomor Faktur: *${order.order_number}*\n` +
    `• Nama Pembeli: *${recipientName}*\n` +
    `• Tanggal: ${formattedDateOnly}\n` +
    `• Total Tagihan: *${formatRupiah(order.grand_total)}*\n` +
    `• Metode: ${isPickup ? "Ambil di Toko" : `Pengiriman Kurir (${order.courier.toUpperCase()})`}\n\n` +
    `Mohon dicek. Terima kasih!`;

  const waUrl = `https://wa.me/${waTarget}?text=${encodeURIComponent(waMessage)}`;

  // WhatsApp complaint message
  const itemsListForComplaint = order.order_items
    .slice(0, 4)
    .map((it) => `• ${it.product_name} (${it.quantity}x)`)
    .join("\n");
  const moreItemsText =
    order.order_items.length > 4 ? `\n• ...dan ${order.order_items.length - 4} item lainnya` : "";

  const complaintMessage =
    `Halo Admin ${storeName},\n` +
    `Saya ingin mengajukan komplain / bantuan terkait pesanan saya:\n\n` +
    `📋 *Rincian Pesanan:*\n` +
    `• Nomor Faktur: *${order.order_number}*\n` +
    `• Nama Pembeli: *${recipientName}*\n` +
    `• No. HP / WhatsApp: *${recipientPhone}*\n` +
    `• Tanggal Faktur: ${formattedDateOnly}\n` +
    `• Metode: ${isPickup ? "Ambil Sendiri di Toko" : `Pengiriman (${order.courier.toUpperCase()})`}\n` +
    `• Produk Dipesan:\n${itemsListForComplaint}${moreItemsText}\n\n` +
    `⚠️ *Kendala yang Terjadi:*\n` +
    `[Silakan jelaskan kendala atau kerusakan barang di sini]\n\n` +
    `Catatan: Saya telah menyiapkan bukti foto & video unboxing utuh sesuai syarat garansi. Mohon bantuannya min. Terima kasih!`;

  const complaintWaUrl = `https://wa.me/${complaintWhatsapp}?text=${encodeURIComponent(complaintMessage)}`;

  // Admin follow up to customer
  const cleanRecipientPhone = recipientPhone.replace(/\D/g, "");
  const customerWaTarget = cleanRecipientPhone.startsWith("0")
    ? "62" + cleanRecipientPhone.slice(1)
    : cleanRecipientPhone;
  const adminFollowUpMsg =
    `Halo Kak ${recipientName},\n` +
    `Kami dari Admin & Layanan Pelanggan ${storeName} terkait pesanan Kakak No. *${order.order_number}*.\n` +
    `Apakah ada kendala pada pesanan atau informasi yang bisa kami bantu?`;
  const adminFollowUpWaUrl =
    customerWaTarget.length >= 8
      ? `https://wa.me/${customerWaTarget}?text=${encodeURIComponent(adminFollowUpMsg)}`
      : null;

  // Handle print: kosongkan document.title saat print agar browser tidak mencetak judul halaman atau URL di margin atas
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      const originalTitle = document.title;
      document.title = "";
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }
  };

  // Bersihkan document.title otomatis saat berada di halaman cetak / print
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "";

    const handleBeforePrint = () => {
      document.title = "";
    };
    const handleAfterPrint = () => {
      document.title = "";
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      document.title = previousTitle;
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const hasLogoImage = Boolean(storefront?.logoUrl && storefront.logoDisplayMode !== "text_only");

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#121318] py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0 print:m-0 print:min-h-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
          html,
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            font-size: 11px !important;
            font-family: var(--font-outfit), var(--font-sans), "Outfit", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-invoice-sheet {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 297mm !important;
            padding: 12mm 16mm 14mm 16mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .invoice-content-wrap {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            min-height: 270mm !important;
            box-sizing: border-box !important;
          }
          .invoice-table-header {
            background-color: #3730A3 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-total-due-box {
            background-color: #3730A3 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-row-border {
            border-bottom: 1px solid #e2e8f0 !important;
          }
          tr, .invoice-item-row {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6 print:space-y-0 print:max-w-none">
        {/* Navigation & Action Bar - Hidden in Print */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden bg-white dark:bg-[#1A1C23] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-xs border-slate-200 dark:border-white/10"
            >
              <Printer className="size-4 text-primary" />
              Cetak / Simpan PDF
            </Button>

            <Button
              render={<a href={complaintWaUrl} target="_blank" rel="noreferrer" />}
              variant="outline"
              className="gap-2 rounded-xl h-10 px-4 border-amber-300 dark:border-amber-700/50 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold"
            >
              Ajukan Komplain
            </Button>

            <Button
              render={<a href={waUrl} target="_blank" rel="noreferrer" />}
              className="gap-2 rounded-xl h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            >
              <MessageCircle className="size-4" />
              Konfirmasi WhatsApp
            </Button>

            {isAdmin && adminFollowUpWaUrl && (
              <Button
                render={<a href={adminFollowUpWaUrl} target="_blank" rel="noreferrer" />}
                variant="outline"
                className="gap-2 rounded-xl h-10 px-4 border-emerald-300 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-300 font-medium"
              >
                Hubungi Pembeli
              </Button>
            )}
          </div>
        </div>

        {/* Complaint & Warranty Notification Card - Hidden in Print */}
        <div className="print:hidden rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Punya Kendala atau Keluhan pada Pesanan?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {complaintInstructions}
              </p>
            </div>
          </div>
          <Button
            render={<a href={complaintWaUrl} target="_blank" rel="noreferrer" />}
            size="sm"
            className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5 px-4 h-9 shadow-xs"
          >
            <MessageCircle className="size-3.5" />
            WhatsApp Layanan Komplain
          </Button>
        </div>

        {/* Browser print hint - Hidden in Print */}
        <div className="print:hidden rounded-xl border border-blue-500/30 bg-blue-50/80 dark:bg-blue-950/20 p-4 text-xs text-blue-950 dark:text-blue-200 flex items-start gap-3 shadow-2xs">
          <HelpCircle className="size-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-blue-900 dark:text-blue-300">
              Tips Cetak PDF Sempurna (1 Halaman Bersih Tanpa Header / URL):
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11.5px] text-slate-700 dark:text-slate-300">
              <li>Pilih ukuran kertas <strong>A4</strong> dan orientasi <strong>Potret</strong>.</li>
              <li><strong>Hapus centang opsi &quot;Header dan footer&quot;</strong> (Khusus pengguna Firefox: klik <em>Pengaturan lainnya</em> &rarr; hilangkan centang <em>Tajuk dan catatan kaki</em>) agar tulisan URL dan judul di margin atas hilang total.</li>
            </ul>
          </div>
        </div>

        {/* INVOICE PAPER CANVAS (Strictly White Paper Sheet matching reference) */}
        <div className="print-invoice-sheet bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-xl p-8 sm:p-12 print:p-0 print:border-none print:shadow-none print:rounded-none">
          <div className="invoice-content-wrap">
            {/* TOP SECTION: Header, Info Cards, Product Table, Summary */}
            <div className="space-y-6 print:space-y-4">
              {/* HEADER: STORE IDENTITY (LEFT) & INVOICE METADATA (RIGHT) */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-2">
                {/* Left: Logo, Store Name, Subtitle & Office Address */}
                <div className="space-y-2.5 max-w-md">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      {hasLogoImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={storefront!.logoUrl}
                          alt={displayStoreName}
                          className="h-10 sm:h-12 max-w-[200px] object-contain print:h-9"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="size-10 rounded-xl bg-[#3730A3] text-white flex items-center justify-center font-bold text-lg shadow-xs print:size-8 print:text-sm">
                          NS
                        </div>
                      )}

                      {(!hasLogoImage || storefront?.logoDisplayMode !== "logo_only") && (
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 print:text-lg">
                          {storeName}
                        </h2>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-500 font-medium print:text-[9.5px]">
                      {headerSubtitle}
                    </p>
                  </div>

                  {/* Office Address & Direct Contacts */}
                  <div className="text-xs text-slate-600 leading-relaxed space-y-0.5 print:text-[9.5px]">
                    <p>{storeAddress}, {storeCity}</p>
                    <p className="text-slate-500">
                      <span>WhatsApp: {formatDisplayPhone(storeWhatsapp || storePhone)}</span>
                      <span className="mx-1.5">•</span>
                      <span>Email: {storeEmail}</span>
                    </p>
                  </div>
                </div>

                {/* Right: FAKTUR PENJUALAN, Order #, Date WIB & Metadata Badges */}
                <div className="min-w-0 w-full space-y-2 text-left sm:w-auto sm:min-w-[280px] sm:text-right">
                  {/* Status & Method Pill Badges */}
                  <div className="flex flex-wrap items-center sm:justify-end gap-1.5 print:gap-1.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wider uppercase bg-indigo-50 text-[#3730A3] border border-indigo-200/80 print:text-[9px]">
                      FAKTUR PENJUALAN
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase print:text-[9px] ${
                        isPaymentConfirmed
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                          : order.status === "cancelled"
                          ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                          : "bg-amber-50 text-amber-700 border border-amber-200/80"
                      }`}
                    >
                      {isPaymentConfirmed
                        ? "LUNAS"
                        : order.status === "cancelled"
                        ? "BATAL"
                        : "PENDING"}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-medium text-slate-700 bg-slate-100 border border-slate-200 print:text-[9px]">
                      {paymentMethodShortName}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-medium text-slate-700 bg-slate-100 border border-slate-200 print:text-[9px]">
                      {isPickup ? "AMBIL DI TOKO" : `KURIR: ${order.courier.toUpperCase()}`}
                    </span>
                  </div>

                  {/* Order Number */}
                  <p className="break-all text-xl sm:text-2xl font-mono font-bold text-slate-900 tracking-tight print:text-lg">
                    {displayOrderNumber}
                  </p>

                  {/* Date in Full WIB Format */}
                  <p className="text-xs font-medium text-slate-600 print:text-[9.5px]">
                    Tanggal: <span className="font-semibold text-slate-900">{formattedDateTimeWIB}</span>
                  </p>
                </div>
              </div>

              {/* HORIZONTAL DIVIDER */}
              <div className="border-b border-slate-200 my-4 print:my-2.5" />

              {/* TWO SIDE-BY-SIDE ROUNDED CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:gap-3">
                {/* Left Card: DITUJUKAN KEPADA: */}
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-1 text-xs print:rounded-lg print:p-3 print:text-[9.5px]">
                  <p className="font-bold text-[#3730A3] uppercase tracking-wider text-[10.5px] print:text-[9px]">
                    DITUJUKAN KEPADA:
                  </p>
                  <p className="font-bold text-slate-900 text-sm sm:text-base print:text-[12px]">
                    {recipientName}
                  </p>
                  <p className="text-slate-600">
                    <span className="text-slate-500 font-normal">No. WhatsApp / HP:</span>{" "}
                    <span className="font-mono font-semibold text-slate-900">{formatDisplayPhone(recipientPhone)}</span>
                  </p>
                  {customerEmail && (
                    <p className="text-slate-600">
                      <span className="text-slate-500 font-normal">Email:</span>{" "}
                      <span className="break-all text-slate-800">{customerEmail}</span>
                    </p>
                  )}
                </div>

                {/* Right Card: LOKASI PENGAMBILAN (PICKUP) ATAU ALAMAT PENGIRIMAN */}
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-1 text-xs print:rounded-lg print:p-3 print:text-[9.5px]">
                  {isPickup ? (
                    <>
                      <p className="font-bold text-[#3730A3] uppercase tracking-wider text-[10.5px] print:text-[9px]">
                        LOKASI PENGAMBILAN (PICKUP):
                      </p>
                      <p className="font-bold text-slate-900 text-sm sm:text-base print:text-[12px]">
                        {address?.pickup_location || storeName}
                      </p>
                      <p className="text-slate-600">
                        {address?.pickup_address || `${storeAddress}, ${storeCity}`}
                      </p>
                      <p className="text-slate-500 pt-0.5">
                        <span className="font-semibold text-slate-700">Layanan:</span> Ambil Sendiri di Toko
                      </p>
                      {address?.fulfillment_change_note && (
                        <p className="text-[11px] text-amber-700 font-medium pt-0.5 print:text-[9px]">
                          Catatan: {address.fulfillment_change_note}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-[#3730A3] uppercase tracking-wider text-[10.5px] print:text-[9px]">
                        ALAMAT PENGIRIMAN:
                      </p>
                      <p className="font-bold text-slate-900 text-sm sm:text-base print:text-[12px]">
                        {recipientName}
                      </p>
                      <p className="text-slate-600">
                        {address?.street_address || "-"}
                      </p>
                      <p className="text-slate-500">
                        {[address?.city, address?.province, address?.postal_code].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-slate-500 pt-0.5">
                        <span className="font-semibold text-slate-700">Layanan:</span> Kurir {order.courier.toUpperCase()}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* TABLE: SOLID INDIGO HEADER BAR & PURE TEXT ROWS */}
              <div className="mt-6 print:mt-4">
                {/* Table Header Bar */}
                <div className="invoice-table-header bg-[#3730A3] text-white rounded-t-xl px-4 py-3 grid grid-cols-[minmax(0,1fr)_4.5rem_2.5rem_5rem] gap-2 items-center text-[9.5px] sm:grid-cols-[minmax(0,1fr)_9rem_4rem_9rem] sm:gap-3 sm:text-xs font-bold uppercase tracking-wider print:py-2.5 print:text-[10px]">
                  <div>PRODUK / RINCIAN ITEM</div>
                  <div className="text-right"><span className="sm:hidden">Harga</span><span className="hidden sm:inline">Harga Satuan</span></div>
                  <div className="text-center">QTY</div>
                  <div className="text-right">Total</div>
                </div>

                {/* Table Rows: Pure Text Description, SKU, Specs & Numbers */}
                <div className="divide-y divide-slate-200 border-x border-b border-slate-200 rounded-b-xl overflow-hidden">
                  {order.order_items.map((item, index) => {
                    const productData = item.products;
                    const liveTitle = productData?.name || item.product_name;
                    const brandName = productData?.brands?.name || item.brand_name;
                    const categoryName = productData?.categories?.name || item.category_name;
                    const variant = item.variant_details;
                    const skuCode = getOrderItemSku({
                      variantDetails: variant,
                      itemSku: item.sku,
                      productSku: productData?.sku,
                    });
                    const variantText =
                      variant && typeof variant === "object"
                        ? [
                            (variant as Record<string, unknown>).color,
                            (variant as Record<string, unknown>).ram,
                            (variant as Record<string, unknown>).storage,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : "";

                    const specs = getProductSpecifications(item);
                    const rawDesc = (productData?.description || item.description || "").trim();
                    const cleanDesc = cleanInvoiceDescription(rawDesc);
                    const isRedundantDesc =
                      specs.length > 0 &&
                      cleanDesc.length > 0 &&
                      specs.some((s) => s.value && cleanDesc.includes(s.value));

                    return (
                      <div
                        key={item.id || index}
                        className="invoice-item-row grid grid-cols-[minmax(0,1fr)_4.5rem_2.5rem_5rem] items-start gap-2 px-3 py-3.5 text-[10.5px] hover:bg-slate-50/60 transition-colors sm:grid-cols-[minmax(0,1fr)_9rem_4rem_9rem] sm:gap-3 sm:px-6 sm:text-sm print:px-4 print:py-2.5 print:text-[10px]"
                      >
                        {/* Item Description Column */}
                        <div className="min-w-0 space-y-1">
                          <p className="font-bold text-slate-900 text-sm sm:text-base leading-snug print:text-xs">
                            {liveTitle}
                          </p>

                          {/* Brand, Category, SKU Tags */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] print:text-[8.5px] text-slate-500">
                            {brandName && <span className="font-bold text-[#3730A3]">{brandName}</span>}
                            {brandName && categoryName && <span>•</span>}
                            {categoryName && <span>{categoryName}</span>}
                            {skuCode && (
                              <>
                                <span>•</span>
                                <span>SKU: <code className="font-mono text-slate-700 font-semibold">{skuCode}</code></span>
                              </>
                            )}
                          </div>

                          {/* Variant Detail */}
                          {variantText && (
                            <p className="text-[11.5px] print:text-[9px] font-semibold text-[#3730A3]">
                              Pilihan Varian: {variantText}
                            </p>
                          )}

                          {/* Live Specifications Inline or Cleaned Description */}
                          {specs.length > 0 ? (
                            <p className="text-[11px] print:text-[9px] text-slate-600 leading-relaxed pt-0.5">
                              {specs.map((s) => `${s.key}: ${s.value}`).join("  •  ")}
                            </p>
                          ) : cleanDesc !== "" && !isRedundantDesc ? (
                            <p className="text-[11px] print:text-[9px] text-slate-600 leading-relaxed pt-0.5">
                              <span className="font-semibold text-slate-700">Spesifikasi:</span> {cleanDesc}
                            </p>
                          ) : null}
                        </div>

                        {/* Unit Price */}
                        <div className="break-words text-right font-semibold text-slate-800 pt-0.5 font-mono print:text-[10px]">
                          {formatRupiah(item.price)}
                        </div>

                        {/* Qty */}
                        <div className="text-center font-bold text-slate-900 pt-0.5 print:text-[10px]">
                          {item.quantity}
                        </div>

                        {/* Total */}
                        <div className="break-words text-right font-bold text-slate-900 pt-0.5 font-mono print:text-[10px]">
                          {formatRupiah(item.price * item.quantity)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FINANCIAL SUMMARY & NOTE SECTION */}
              <div className="mt-6 flex flex-col sm:flex-row justify-between items-start gap-6 pt-2 print:mt-4 print:pt-1">
                {/* Left: Note */}
                <div className="max-w-md space-y-1.5 text-xs text-slate-600 print:text-[9.5px]">
                  <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] print:text-[9.5px]">
                    Note:
                  </p>
                  {invoiceCustomNotes ? (
                    <p className="leading-relaxed font-semibold text-slate-800 dark:text-slate-200">
                      {invoiceCustomNotes}
                    </p>
                  ) : (
                    <p className="leading-relaxed">
                      {order.status === "cancelled"
                        ? "Pesanan ini telah dibatalkan."
                        : isPaymentConfirmed
                        ? guaranteeNote
                        : "Silakan selesaikan pembayaran ke rekening resmi yang tertera di bawah. Setelah melakukan transfer, kirimkan bukti pembayaran melalui WhatsApp atau tombol konfirmasi agar pesanan segera diproses."}
                    </p>
                  )}
                  {isPickup && (
                    <p className="text-[11px] text-[#3730A3] font-semibold print:text-[9px]">
                      • Pengambilan barang dapat dilakukan di gerai toko dengan menunjukkan faktur ini.
                    </p>
                  )}
                </div>

                {/* Right: Subtotal, Shipping, Discount & Solid TOTAL DUE Box */}
                <div className="w-full sm:w-80 space-y-2 text-xs sm:text-sm print:text-[10px]">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-bold uppercase tracking-wider text-[11px] print:text-[9.5px]">SUBTOTAL :</span>
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(order.total_amount)}</span>
                  </div>

                  {Number(order.discount_amount) > 0 && (
                    <div className="flex justify-between items-center text-emerald-700">
                      <span className="font-bold uppercase tracking-wider text-[11px] print:text-[9.5px]">DISCOUNT :</span>
                      <span className="font-mono font-bold">-{formatRupiah(order.discount_amount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-bold uppercase tracking-wider text-[11px] print:text-[9.5px]">
                      {isPickup ? "BIAYA PENANGANAN :" : "ONGKOS KIRIM :"}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {isPickup && Number(order.shipping_amount) === 0 ? "Rp 0 (GRATIS)" : formatRupiah(order.shipping_amount)}
                    </span>
                  </div>

                  {/* Solid Indigo TOTAL Box */}
                  <div className="invoice-total-due-box mt-3 bg-[#3730A3] text-white px-5 py-3 rounded-xl flex items-center justify-between font-bold shadow-xs print:py-2.5 print:rounded-lg">
                    <span className="uppercase tracking-wider text-xs sm:text-sm print:text-[10.5px]">TOTAL :</span>
                    <span className="font-black text-lg sm:text-xl font-mono print:text-base">{formatRupiah(order.grand_total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM SECTION: Thank you message, Signatures, 3-Column Footer */}
            <div className="pt-8 print:pt-6 space-y-6 print:space-y-4">
              {/* GREETING / CLOSING MESSAGE */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#3730A3] tracking-tight print:text-sm">
                  Thank you for your Business
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 print:text-[9px]">
                  Terima kasih telah berbelanja dan mempercayakan kebutuhan komputer Anda kepada {displayStoreName}.
                </p>
              </div>

              {/* TANDA TERIMA / OFFICIAL SIGNATURES BLOCK */}
              <div className="pt-2 pb-2 print:pt-1">
                <div className="grid grid-cols-2 gap-8 text-xs text-slate-700 print:text-[9.5px]">
                  {/* Tanda Terima Pembeli */}
                  <div className="text-center space-y-14 print:space-y-12">
                    <p className="font-bold uppercase tracking-wider text-[11px] text-slate-800 print:text-[9.5px]">
                      Tanda Terima / Pembeli
                    </p>
                    <div>
                      <div className="border-b border-slate-300 w-44 sm:w-52 mx-auto"></div>
                      <p className="mt-2 font-semibold text-slate-900 text-xs print:text-[9.5px] truncate px-2">
                        ( {recipientName} )
                      </p>
                    </div>
                  </div>

                  {/* Hormat Kami / Kasir */}
                  <div className="text-center space-y-14 print:space-y-12">
                    <p className="font-bold uppercase tracking-wider text-[11px] text-slate-800 print:text-[9.5px]">
                      Hormat Kami / Petugas Toko
                    </p>
                    <div>
                      <div className="border-b border-slate-300 w-44 sm:w-52 mx-auto"></div>
                      <p className="mt-2 font-semibold text-slate-900 text-xs print:text-[9.5px] truncate px-2">
                        ( {displayStoreName} )
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-COLUMN FOOTER: QUESTIONS, PAYMENT INFO & TERMS */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-600 print:pt-3 print:gap-4 print:text-[9px]">
                {/* Column 1: Questions? */}
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] print:text-[9.5px]">
                    QUESTIONS?
                  </p>
                  <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-1 text-xs text-slate-600 print:text-[9px]">
                    <span className="text-slate-500">Email us</span>
                    <span className="text-slate-400 select-none">:</span>
                    <span className="font-mono text-slate-800 font-medium truncate">{storeEmail}</span>

                    <span className="text-slate-500">Call / WA</span>
                    <span className="text-slate-400 select-none">:</span>
                    <span className="font-mono text-slate-800 font-medium">{formatDisplayPhone(storeWhatsapp || storePhone)}</span>
                  </div>
                </div>

                {/* Column 2: Payment Info */}
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] print:text-[9.5px]">
                    PAYMENT INFO :
                  </p>
                  <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-1 text-xs text-slate-600 print:text-[9px]">
                    <span className="text-slate-500">Metode</span>
                    <span className="text-slate-400 select-none">:</span>
                    <span className="text-slate-800 font-bold">{paymentMethodName}</span>

                    {isQrisMethod ? (
                      <>
                        <span className="text-slate-500">Detail QR</span>
                        <span className="text-slate-400 select-none">:</span>
                        <span className="text-slate-800 font-medium">Scan QRIS Resmi Toko (m-Banking / e-Wallet)</span>
                      </>
                    ) : isCashMethod ? (
                      <>
                        <span className="text-slate-500">Lokasi</span>
                        <span className="text-slate-400 select-none">:</span>
                        <span className="text-slate-800 font-medium">Kasir Toko saat Pengambilan Unit</span>
                      </>
                    ) : bankAccounts[0] ? (
                      <>
                        <span className="text-slate-500">Bank</span>
                        <span className="text-slate-400 select-none">:</span>
                        <span className="text-slate-800 font-medium">{bankAccounts[0].bank_name}</span>

                        <span className="text-slate-500">Account</span>
                        <span className="text-slate-400 select-none">:</span>
                        <span className="font-mono text-slate-800 font-medium">
                          {bankAccounts[0].account_number}
                        </span>

                        <span className="text-slate-500">A/C Name</span>
                        <span className="text-slate-400 select-none">:</span>
                        <span className="text-slate-800 font-medium">{bankAccounts[0].account_holder}</span>
                      </>
                    ) : null}

                    <span className="text-slate-500">Status</span>
                    <span className="text-slate-400 select-none">:</span>
                    <span className={`font-bold ${paymentState === "paid" ? "text-emerald-700" : paymentState === "pending" ? "text-amber-700" : "text-rose-700"}`}>
                      {paymentStateLabel}
                    </span>
                  </div>
                </div>

                {/* Column 3: Terms & Conditions/Note */}
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] print:text-[9.5px]">
                    TERMS &amp; CONDITIONS/NOTE:
                  </p>
                  <p className="leading-relaxed text-[11px] text-slate-500 print:text-[8.5px]">
                    {termsNote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
