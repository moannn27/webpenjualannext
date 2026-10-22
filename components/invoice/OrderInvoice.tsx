"use client";

import {
  Printer,
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDisplayPhone } from "@/lib/phone";
import { resolveOrderCustomerIdentity } from "@/lib/orders/customer-identity";

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

  const address = order.shipping_address;
  const isPickup = order.courier === "pickup";
  const customerIdentity = resolveOrderCustomerIdentity({
    shippingAddress: address,
    userProfile: order.users,
  });
  const recipientName = customerIdentity.name || "Nama tidak tercatat";
  const recipientPhone = customerIdentity.phone || "-";
  const customerEmail = customerIdentity.email;

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
  const paymentStatus = payment?.status || "pending";
  const isPaymentConfirmed =
    paymentStatus === "success" ||
    order.status === "processing" ||
    order.status === "shipped" ||
    order.status === "delivered";

  const paymentMethodRaw = payment?.payment_method?.toLowerCase() || "";
  const paymentMethodName =
    paymentMethodRaw.includes("bca")
      ? "Transfer Bank (BCA)"
      : paymentMethodRaw.includes("qris")
      ? "QRIS"
      : paymentMethodRaw.includes("mandiri")
      ? "Transfer Bank (Mandiri)"
      : paymentMethodRaw.includes("bri")
      ? "Transfer Bank (BRI)"
      : paymentMethodRaw.includes("cash") || paymentMethodRaw.includes("tunai")
      ? "Tunai di Toko"
      : isPickup
      ? "Pembayaran Toko / Transfer"
      : "Transfer Bank";

  const formatRupiah = (num: number) =>
    `Rp ${Number(num ?? 0).toLocaleString("id-ID")}`;

  // WhatsApp confirmation message
  const waTarget = storeWhatsapp.startsWith("0") ? "62" + storeWhatsapp.slice(1) : storeWhatsapp;
  const waMessage =
    `Halo Admin ${storeName},\nSaya ingin konfirmasi pesanan:\n` +
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

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const hasLogoImage = Boolean(storefront?.logoUrl && storefront.logoDisplayMode !== "text_only");

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#121318] py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0 print:m-0 print:min-h-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm !important;
          }
          html,
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            font-size: 10.5px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-invoice-sheet {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            display: block !important;
            background: #ffffff !important;
            color: #0f172a !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .invoice-table-header {
            background-color: #3730a3 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-total-due-box {
            background-color: #3730a3 !important;
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
              <AlertTriangle className="size-4 text-amber-600" />
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
                <ExternalLink className="size-4 text-emerald-600" />
                Hubungi Pembeli
              </Button>
            )}
          </div>
        </div>

        {/* Complaint & Warranty Notification Card - Hidden in Print */}
        <div className="print:hidden rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="size-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="size-5" />
            </div>
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
        <div className="print:hidden rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
          <HelpCircle className="size-4 shrink-0 text-blue-600 mt-0.5" />
          <p>
            <strong>Tips Cetak PDF Sempurna:</strong> Pada pratinjau cetak browser (Ctrl + P), pilih ukuran kertas <strong>A4</strong> dan hapus centang opsi <em>&quot;Header dan footer&quot;</em> agar hasil bersih dan pas 1 halaman penuh.
          </p>
        </div>

        {/* INVOICE PAPER CANVAS (Strictly White Paper Sheet matching reference) */}
        <div className="print-invoice-sheet bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-xl p-8 sm:p-12 print:p-0 print:border-none print:shadow-none print:rounded-none">
          {/* HEADER: STORE IDENTITY (LEFT) & INVOICE METADATA (RIGHT) - Screenshot 2 Layout */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-2">
            {/* Left: Logo, Store Name, Subtitle & Office Address */}
            <div className="space-y-3 max-w-md">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {hasLogoImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={storefront!.logoUrl}
                      alt={storeName}
                      className="h-10 sm:h-12 max-w-[200px] object-contain print:h-9"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="size-10 rounded-xl bg-[#3730A3] text-white flex items-center justify-center font-black text-lg shadow-xs print:size-8 print:text-sm">
                      NS
                    </div>
                  )}

                  {(!hasLogoImage || storefront?.logoDisplayMode !== "logo_only") && (
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 print:text-lg">
                      {storeName}
                    </h2>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-500 font-medium print:text-[9px]">
                  {headerSubtitle}
                </p>
              </div>

              {/* Office Address & Direct Contacts */}
              <div className="text-xs text-slate-600 leading-relaxed space-y-0.5 print:text-[9px]">
                <p>{storeAddress}, {storeCity}</p>
                <p className="text-slate-500">
                  <span>WhatsApp: {formatDisplayPhone(storeWhatsapp || storePhone)}</span>
                  <span className="mx-1.5">•</span>
                  <span>Email: {storeEmail}</span>
                </p>
              </div>
            </div>

            {/* Right: FAKTUR PENJUALAN Badge, Order #, Date WIB & Status Pills */}
            <div className="min-w-0 w-full space-y-2 text-left sm:w-auto sm:min-w-[260px] sm:text-right">
              {/* Badge "FAKTUR PENJUALAN" */}
              <div className="sm:flex sm:justify-end">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 print:text-[9px] print:py-0.5 print:px-2.5">
                  FAKTUR PENJUALAN
                </span>
              </div>

              {/* Order Number */}
              <p className="break-all text-lg sm:text-xl font-mono font-black text-slate-900 tracking-tight print:text-base">
                {order.order_number}
              </p>

              {/* Date in Full WIB Format */}
              <p className="text-xs font-medium text-slate-600 print:text-[9px]">
                Tanggal: <span className="font-semibold text-slate-900">{formattedDateTimeWIB}</span>
              </p>

              {/* Badges: Payment Status & Fulfillment Mode */}
              <div className="pt-1 flex flex-wrap items-center sm:justify-end gap-2">
                {/* Payment Badge */}
                {isPaymentConfirmed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-300 print:text-[8.5px] print:py-0.5 print:px-2">
                    <CheckCircle2 className="size-3.5 text-emerald-600 print:size-3" />
                    <span>LUNAS - TERVERIFIKASI</span>
                  </span>
                ) : order.status === "cancelled" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide bg-rose-50 text-rose-800 border border-rose-300 print:text-[8.5px] print:py-0.5 print:px-2">
                    <AlertCircle className="size-3.5 text-rose-600 print:size-3" />
                    <span>DIBATALKAN</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide bg-amber-50 text-amber-900 border border-amber-300 print:text-[8.5px] print:py-0.5 print:px-2">
                    <Clock className="size-3.5 text-amber-600 print:size-3" />
                    <span>PENDING - MENUNGGU VERIFIKASI ADMIN</span>
                  </span>
                )}

                {/* Fulfillment Badge */}
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-300 print:text-[8.5px] print:py-0.5 print:px-2">
                  {isPickup ? "AMBIL DI TOKO" : `KURIR: ${order.courier.toUpperCase()}`}
                </span>
              </div>
            </div>
          </div>

          {/* HORIZONTAL DIVIDER - Screenshot 2 */}
          <div className="border-b border-slate-200 my-5 print:my-3" />

          {/* TWO SIDE-BY-SIDE ROUNDED CARDS - Screenshot 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left Card: DITUJUKAN KEPADA: */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-1 text-xs print:rounded-xl print:p-3 print:text-[9.5px]">
              <p className="font-bold text-slate-500 uppercase tracking-wider text-[11px] print:text-[8.5px]">
                DITUJUKAN KEPADA:
              </p>
              <p className="font-bold text-slate-900 text-sm sm:text-base print:text-xs">
                {recipientName}
              </p>
              <p className="text-slate-600">
                <span className="text-slate-500">No. WhatsApp / HP:</span>{" "}
                <span className="font-mono font-semibold text-slate-900">{formatDisplayPhone(recipientPhone)}</span>
              </p>
              {customerEmail && (
                <p className="text-slate-600">
                  <span className="text-slate-500">Email:</span>{" "}
                  <span className="break-all text-slate-800">{customerEmail}</span>
                </p>
              )}
            </div>

            {/* Right Card: LOKASI PENGAMBILAN (PICKUP) ATAU ALAMAT PENGIRIMAN */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-1 text-xs print:rounded-xl print:p-3 print:text-[9.5px]">
              {isPickup ? (
                <>
                  <p className="font-bold text-slate-500 uppercase tracking-wider text-[11px] print:text-[8.5px]">
                    LOKASI PENGAMBILAN (PICKUP):
                  </p>
                  <p className="font-bold text-slate-900 text-sm sm:text-base print:text-xs">
                    {address?.pickup_location || storeName}
                  </p>
                  <p className="text-slate-600">
                    {address?.pickup_address || `${storeAddress}, ${storeCity}`}
                  </p>
                  <p className="text-slate-500 pt-0.5">
                    <span className="font-semibold text-slate-700">Layanan:</span> Ambil Sendiri di Toko
                  </p>
                  {address?.fulfillment_change_note && (
                    <p className="text-[11px] text-amber-700 font-medium pt-0.5 print:text-[8.5px]">
                      Catatan: {address.fulfillment_change_note}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-500 uppercase tracking-wider text-[11px] print:text-[8.5px]">
                    ALAMAT PENGIRIMAN:
                  </p>
                  <p className="font-bold text-slate-900 text-sm sm:text-base print:text-xs">
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

          {/* TABLE: SOLID INDIGO HEADER BAR & PURE TEXT ROWS (NO IMAGES) */}
          <div className="mt-6">
            {/* Solid Table Header Bar */}
            <div className="invoice-table-header bg-[#3730A3] text-white rounded-t-lg px-4 sm:px-6 py-3 flex items-center text-xs font-bold uppercase tracking-wider print:py-2 print:text-[9.5px]">
              <div className="flex-1">Items Description</div>
              <div className="w-28 sm:w-36 text-right">Unit Price</div>
              <div className="w-14 sm:w-16 text-center">Qty</div>
              <div className="w-28 sm:w-36 text-right">Total</div>
            </div>

            {/* Table Rows: Pure Text Description, SKU, Specs & Numbers */}
            <div className="divide-y divide-slate-200 border-x border-b border-slate-200 rounded-b-lg overflow-hidden">
              {order.order_items.map((item, index) => {
                const productData = item.products;
                const liveTitle = productData?.name || item.product_name;
                const brandName = productData?.brands?.name || item.brand_name;
                const categoryName = productData?.categories?.name || item.category_name;
                const skuCode = productData?.sku || item.sku;

                const variant = item.variant_details;
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
                const isRedundantDesc =
                  specs.length > 0 &&
                  rawDesc.length > 0 &&
                  specs.some((s) => s.value && rawDesc.includes(s.value));

                return (
                  <div
                    key={item.id || index}
                    className="invoice-item-row grid grid-cols-[minmax(0,1fr)_4rem_2rem_4.5rem] items-start gap-2 px-3 py-4 text-[10px] hover:bg-slate-50/60 transition-colors sm:grid-cols-[minmax(0,1fr)_9rem_4rem_9rem] sm:gap-3 sm:px-6 sm:text-sm print:px-4 print:py-2.5 print:text-[9.5px]"
                  >
                    {/* Item Description Column */}
                    <div className="min-w-0 space-y-1">
                      <p className="font-bold text-slate-900 text-sm sm:text-base leading-snug print:text-xs">
                        {liveTitle}
                      </p>

                      {/* Brand, Category, SKU Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] print:text-[8px] text-slate-500">
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
                        <p className="text-[11.5px] print:text-[8.5px] font-semibold text-[#3730A3]">
                          Pilihan Varian: {variantText}
                        </p>
                      )}

                      {/* Live Specifications Inline */}
                      {specs.length > 0 && (
                        <p className="text-[11px] print:text-[8px] text-slate-500 leading-relaxed">
                          {specs.map((s) => `${s.key}: ${s.value}`).join("  |  ")}
                        </p>
                      )}

                      {/* Description / Note */}
                      {rawDesc !== "" && !isRedundantDesc && (
                        <p className="text-[11px] print:text-[8px] text-slate-400 italic line-clamp-2">
                          {rawDesc}
                        </p>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="break-words text-right font-semibold text-slate-800 pt-0.5 font-mono print:text-[9.5px]">
                      {formatRupiah(item.price)}
                    </div>

                    {/* Qnt */}
                    <div className="text-center font-bold text-slate-900 pt-0.5 print:text-[9.5px]">
                      {item.quantity}
                    </div>

                    {/* Total */}
                    <div className="break-words text-right font-bold text-slate-900 pt-0.5 font-mono print:text-[9.5px]">
                      {formatRupiah(item.price * item.quantity)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FINANCIAL SUMMARY & NOTE SECTION */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            {/* Left: Note */}
            <div className="max-w-md space-y-2 text-xs text-slate-600 print:text-[9px]">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] print:text-[9px]">
                Note:
              </p>
              <p className="leading-relaxed">
                {order.status === "cancelled"
                  ? "Pesanan ini telah dibatalkan."
                  : isPaymentConfirmed
                  ? guaranteeNote
                  : "Silakan selesaikan pembayaran ke rekening resmi yang tertera di bawah. Setelah melakukan transfer, kirimkan bukti pembayaran melalui WhatsApp atau tombol konfirmasi agar pesanan segera diproses."}
              </p>
              {isPickup && (
                <p className="text-[11px] text-[#3730A3] font-semibold print:text-[8.5px]">
                  • Pengambilan barang dapat dilakukan di gerai toko dengan menunjukkan faktur ini.
                </p>
              )}
            </div>

            {/* Right: Subtotal, Shipping, Discount & Solid TOTAL DUE Box */}
            <div className="w-full sm:w-80 space-y-2 text-xs sm:text-sm print:text-[9.5px]">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-bold uppercase tracking-wider text-[11px] print:text-[9px]">SUBTOTAL :</span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(order.total_amount)}</span>
              </div>

              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between items-center text-emerald-700">
                  <span className="font-bold uppercase tracking-wider text-[11px] print:text-[9px]">DISCOUNT :</span>
                  <span className="font-mono font-bold">-{formatRupiah(order.discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-600">
                <span className="font-bold uppercase tracking-wider text-[11px] print:text-[9px]">
                  {isPickup ? "BIAYA PENANGANAN :" : "ONGKOS KIRIM :"}
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {isPickup && Number(order.shipping_amount) === 0 ? "Rp 0 (GRATIS)" : formatRupiah(order.shipping_amount)}
                </span>
              </div>

              {/* Solid Indigo TOTAL DUE Box */}
              <div className="invoice-total-due-box mt-3 bg-[#3730A3] text-white px-5 py-3 rounded-lg flex items-center justify-between font-bold shadow-xs print:py-2">
                <span className="uppercase tracking-wider text-xs sm:text-sm print:text-[10px]">TOTAL DUE :</span>
                <span className="font-black text-lg sm:text-xl font-mono print:text-sm">{formatRupiah(order.grand_total)}</span>
              </div>
            </div>
          </div>

          {/* GREETING / CLOSING MESSAGE */}
          <div className="mt-8 pt-2">
            <h3 className="text-base sm:text-lg font-bold text-[#3730A3] tracking-tight print:text-sm">
              Thank you for your Business
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 print:text-[8.5px]">
              Terima kasih telah berbelanja dan mempercayakan kebutuhan komputer Anda kepada {storeName}.
            </p>
          </div>

          {/* TANDA TERIMA / OFFICIAL SIGNATURES BLOCK */}
          <div className="mt-8 pt-4 pb-2 print:mt-6 print:pt-2">
            <div className="grid grid-cols-2 gap-8 text-xs text-slate-700 print:text-[9px]">
              {/* Tanda Terima Pembeli */}
              <div className="text-center space-y-12 print:space-y-8">
                <p className="font-bold uppercase tracking-wider text-[11px] text-slate-900 print:text-[9px]">
                  Tanda Terima / Pembeli
                </p>
                <div>
                  <div className="border-b border-slate-400 w-44 sm:w-52 mx-auto"></div>
                  <p className="mt-1.5 font-semibold text-slate-900 text-xs print:text-[8.5px] truncate px-2">
                    ( {recipientName} )
                  </p>
                </div>
              </div>

              {/* Hormat Kami / Kasir */}
              <div className="text-center space-y-12 print:space-y-8">
                <p className="font-bold uppercase tracking-wider text-[11px] text-slate-900 print:text-[9px]">
                  Hormat Kami / Petugas Toko
                </p>
                <div>
                  <div className="border-b border-slate-400 w-44 sm:w-52 mx-auto"></div>
                  <p className="mt-1.5 font-semibold text-slate-900 text-xs print:text-[8.5px] truncate px-2">
                    ( {storeName} )
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3-COLUMN FOOTER: QUESTIONS, PAYMENT INFO & TERMS (Screenshot 3 & 4) */}
          <div className="mt-8 pt-5 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-600 print:mt-6 print:pt-3 print:gap-4 print:text-[8.5px]">
            {/* Column 1: Questions? */}
            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] print:text-[9px]">
                QUESTIONS?
              </p>
              <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-1 text-xs text-slate-600 print:text-[8.5px]">
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
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] print:text-[9px]">
                PAYMENT INFO :
              </p>
              <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-1 text-xs text-slate-600 print:text-[8.5px]">
                <span className="text-slate-500">Metode</span>
                <span className="text-slate-400 select-none">:</span>
                <span className="text-slate-800 font-medium">{paymentMethodName}</span>

                {bankAccounts[0] && (
                  <>
                    <span className="text-slate-500">Account</span>
                    <span className="text-slate-400 select-none">:</span>
                    <span className="font-mono text-slate-800 font-medium">
                      {bankAccounts[0].account_number} ({bankAccounts[0].bank_name})
                    </span>

                    <span className="text-slate-500">A/C Name</span>
                    <span className="text-slate-400 select-none">:</span>
                    <span className="text-slate-800 font-medium">{bankAccounts[0].account_holder}</span>
                  </>
                )}

                <span className="text-slate-500">Status</span>
                <span className="text-slate-400 select-none">:</span>
                <span className={`font-bold ${isPaymentConfirmed ? "text-emerald-700" : "text-amber-700"}`}>
                  {isPaymentConfirmed ? "LUNAS (DIVERIFIKASI)" : "MENUNGGU PEMBAYARAN"}
                </span>
              </div>
            </div>

            {/* Column 3: Terms & Conditions/Note */}
            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] print:text-[9px]">
                TERMS &amp; CONDITIONS/NOTE:
              </p>
              <p className="leading-relaxed text-[11px] text-slate-500 print:text-[8px]">
                {termsNote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
