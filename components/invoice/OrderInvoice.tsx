"use client";

import { Printer, MessageCircle, ArrowLeft, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDisplayPhone } from "@/lib/phone";

export interface InvoiceOrderItem {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
  variant_details?: Record<string, unknown> | null;
  sku?: string | null;
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
  bankAccounts?: Array<{
    bank_name: string;
    account_number: string;
    account_holder: string;
    instructions?: string;
  }>;
}

interface OrderInvoiceProps {
  order: InvoiceOrderData;
  storefront?: InvoiceStorefrontInfo;
  backHref?: string;
  backLabel?: string;
}

export function OrderInvoice({
  order,
  storefront,
  backHref = "/",
  backLabel = "Kembali ke Beranda",
}: OrderInvoiceProps) {
  const storeName = storefront?.storeName || "Next Solution Store";
  const storeAddress = storefront?.storeAddress || "Jl. Kartini No. 9";
  const storeCity = storefront?.storeCity || "Bandung";
  const storeWhatsapp = (storefront?.storeWhatsapp || storefront?.storePhone || "6281234567890").replace(/\D/g, "");
  const storeEmail = storefront?.storeEmail || "support@nextsolution.com";

  const bankAccounts = storefront?.bankAccounts && storefront.bankAccounts.length > 0
    ? storefront.bankAccounts
    : [
        {
          bank_name: "BCA",
          account_number: "8320192831",
          account_holder: "Next Solution Store",
          instructions: "Transfer sesuai nominal total akhir",
        },
      ];

  const address = order.shipping_address;
  const isPickup = order.courier === "pickup";
  const recipientName = address?.recipient_name || order.users?.full_name || "Pelanggan";
  const recipientPhone = address?.phone || order.users?.phone || "-";

  // Format exact date & time in WIB (Asia/Jakarta)
  const orderDateObj = new Date(order.created_at);
  const formattedDateTimeWIB = !isNaN(orderDateObj.getTime())
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(orderDateObj) + " WIB"
    : order.created_at;

  const payment = order.payments?.[0];
  const paymentStatus = payment?.status || "pending";
  const isPaymentConfirmed = paymentStatus === "success";

  const formatRupiah = (num: number) => `Rp ${Number(num ?? 0).toLocaleString("id-ID")}`;

  // WhatsApp confirmation message
  const waMessage = `Halo Admin ${storeName},\nSaya ingin konfirmasi pembayaran untuk pesanan:\n` +
    `• Nomor Pesanan: *${order.order_number}*\n` +
    `• Nama Pembeli: *${recipientName}*\n` +
    `• Tanggal: ${formattedDateTimeWIB}\n` +
    `• Total Tagihan: *${formatRupiah(order.grand_total)}*\n` +
    `• Metode: ${isPickup ? "Ambil di Toko" : "Pengiriman ke Alamat"}\n\n` +
    `Berikut saya lampirkan bukti transfer pembayaran untuk diproses. Terima kasih!`;

  const waUrl = `https://wa.me/${storeWhatsapp.startsWith("0") ? "62" + storeWhatsapp.slice(1) : storeWhatsapp}?text=${encodeURIComponent(waMessage)}`;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0 print:m-0 print:min-h-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10.5px !important;
            line-height: 1.25 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-invoice-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      <div className="max-w-4xl mx-auto space-y-6 print:space-y-0 print:max-w-none">
        {/* Navigation & Action Bar - Hidden in Print */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden bg-card p-4 rounded-2xl border shadow-xs">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="gap-2 rounded-xl h-10 px-4 font-medium"
            >
              <Printer className="size-4" />
              Cetak / Simpan PDF
            </Button>
            <Button
              render={<a href={waUrl} target="_blank" rel="noreferrer" />}
              className="gap-2 rounded-xl h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <MessageCircle className="size-4" />
              Konfirmasi WhatsApp
            </Button>
          </div>
        </div>

        {/* Invoice Container */}
        <div className="print-invoice-sheet bg-card rounded-3xl border border-border/80 shadow-md p-6 sm:p-10 print:p-0 print:border-none print:shadow-none print:rounded-none text-foreground">
          {/* Header Store Branding & Invoice Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-border/70 pb-5 print:pb-2.5 print:gap-2">
            <div className="space-y-1 print:space-y-0.5">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-xs print:size-6 print:text-xs">
                  NS
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight leading-tight print:text-base">{storeName}</h1>
                  <p className="text-xs text-muted-foreground print:text-[9.5px]">Toko Komputer &amp; Elektronik Resmi</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5 print:text-[9.5px]">
                <p>{storeAddress}, {storeCity}</p>
                <p>WhatsApp: {formatDisplayPhone(storeWhatsapp)} · Email: {storeEmail}</p>
              </div>
            </div>

            <div className="sm:text-right space-y-1 self-stretch sm:self-auto bg-muted/30 sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none print:p-0">
              <span className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-[11px] font-bold tracking-wider uppercase print:text-[9px] print:px-2 print:py-0">
                FAKTUR PEMBELIAN RESMI
              </span>
              <p className="text-xl font-mono font-bold tracking-tight text-foreground print:text-sm">
                {order.order_number}
              </p>
              <p className="text-xs text-muted-foreground print:text-[9.5px]">
                Waktu: <span className="font-semibold text-foreground">{formattedDateTimeWIB}</span>
              </p>
            </div>
          </div>

          {/* Status Badges Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5 p-3 rounded-2xl bg-muted/40 border border-border/60 print:my-1.5 print:p-1.5 print:gap-2 print:rounded-lg">
            <div className="flex items-center gap-2.5 print:gap-1.5">
              <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 print:size-5 ${
                isPaymentConfirmed
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              }`}>
                {isPaymentConfirmed ? <CheckCircle2 className="size-4 print:size-3" /> : <Clock className="size-4 print:size-3" />}
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium print:text-[9px]">Status Pembayaran</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-bold print:text-[10px] ${
                    isPaymentConfirmed
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-700 dark:text-amber-400"
                  }`}>
                    {isPaymentConfirmed ? "Lunas / Terkonfirmasi" : "Menunggu Pembayaran"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:border-l sm:border-border/60 sm:pl-3 print:gap-1.5 print:pl-2">
              <div className="size-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 print:size-5">
                <AlertCircle className="size-4 print:size-3" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium print:text-[9px]">Metode Pemenuhan</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-foreground print:text-[10px]">
                    {isPickup ? "Ambil di Toko (Pickup)" : "Pengiriman Kurir"}
                  </span>
                  <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 print:text-[8px] print:px-1">
                    {order.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Delivery Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-b border-border/70 text-sm print:py-2 print:gap-3 print:text-[10px]">
            <div className="space-y-1.5 print:space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-[9px]">
                Informasi Pemesan
              </h3>
              <div className="space-y-0.5">
                <p className="font-bold text-base text-foreground print:text-xs">{recipientName}</p>
                <p className="text-muted-foreground">No. WhatsApp / HP: <span className="text-foreground font-medium">{formatDisplayPhone(recipientPhone)}</span></p>
                {order.users?.email && (
                  <p className="text-muted-foreground">Email: <span className="text-foreground">{order.users.email}</span></p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 print:space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-[9px]">
                {isPickup ? "Lokasi Pengambilan Toko" : "Alamat Lengkap Pengiriman"}
              </h3>
              {isPickup ? (
                <div className="space-y-0.5 text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    {address?.pickup_location || storeName}
                  </p>
                  <p>{address?.pickup_address || `${storeAddress}, ${storeCity}`}</p>
                  {address?.fulfillment_change_note && (
                    <p className="text-xs bg-amber-500/10 text-amber-900 dark:text-amber-200 p-2 rounded-lg mt-1 border border-amber-500/20 print:p-1 print:text-[9px]">
                      Catatan: {address.fulfillment_change_note}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5 text-muted-foreground">
                  <p className="text-foreground font-medium">{address?.street_address || "-"}</p>
                  <p>{[address?.city, address?.province, address?.postal_code].filter(Boolean).join(", ") || "-"}</p>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Order Table */}
          <div className="py-5 border-b border-border/70 space-y-2.5 print:py-2 print:space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-[9px]">
              Daftar Produk yang Dibeli
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm print:text-[10px]">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase print:text-[9px]">
                    <th className="py-2 pr-3 font-semibold print:py-1">No</th>
                    <th className="py-2 px-3 font-semibold print:py-1">Nama Produk &amp; Spesifikasi</th>
                    <th className="py-2 px-3 text-right font-semibold print:py-1">Harga Satuan</th>
                    <th className="py-2 px-3 text-center font-semibold print:py-1">Qty</th>
                    <th className="py-2 pl-3 text-right font-semibold print:py-1">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {order.order_items.map((item, index) => {
                    const variant = item.variant_details;
                    const variantText = variant && typeof variant === "object"
                      ? [variant.color, variant.ram, variant.storage].filter(Boolean).join(" · ")
                      : "";

                    return (
                      <tr key={item.id || index} className="text-foreground">
                        <td className="py-2.5 pr-3 text-muted-foreground text-xs print:py-1 print:text-[9.5px]">{index + 1}</td>
                        <td className="py-2.5 px-3 print:py-1">
                          <p className="font-semibold leading-snug print:text-[10px]">{item.product_name}</p>
                          {variantText && (
                            <p className="text-xs text-muted-foreground mt-0.5 print:text-[9px] print:mt-0">
                              Varian: {variantText}
                            </p>
                          )}
                          {item.sku && (
                            <p className="text-[11px] font-mono text-muted-foreground print:text-[8.5px]">
                              SKU: {item.sku}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground print:py-1">
                          {formatRupiah(item.price)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold print:py-1">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-mono font-semibold print:py-1">
                          {formatRupiah(item.price * item.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Calculation & Bank Transfer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 print:py-2 print:gap-3">
            {/* Bank Transfer Instructions / Paid Confirmation */}
            {isPaymentConfirmed ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1.5 text-xs text-emerald-800 dark:text-emerald-300 print:p-2.5 print:rounded-lg print:space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-400 print:text-xs">
                  <CheckCircle2 className="size-4 shrink-0 print:size-3.5" />
                  Pembayaran Lunas &amp; Terverifikasi
                </div>
                <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed print:text-[9.5px]">
                  Transaksi ini telah diverifikasi lunas oleh sistem. Tidak diperlukan pembayaran tambahan. Simpan faktur ini sebagai bukti transaksi resmi dan klaim garansi produk.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border bg-muted/20 p-4 space-y-2.5 print:p-2 print:rounded-lg print:space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-[9px]">
                  Tujuan Transfer Pembayaran
                </h4>
                <div className="space-y-2 print:space-y-1">
                  {bankAccounts.map((acc, i) => (
                    <div key={i} className="p-2.5 bg-card rounded-xl border border-border/80 text-xs space-y-0.5 print:p-1.5 print:text-[9.5px]">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-primary print:text-xs">{acc.bank_name}</span>
                        <span className="text-muted-foreground print:text-[9px]">a.n. <strong className="text-foreground">{acc.account_holder}</strong></span>
                      </div>
                      <p className="font-mono text-sm font-bold tracking-wider text-foreground select-all print:text-xs">
                        {acc.account_number}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5 print:text-[8.5px]">
                  ⚠️ Harap transfer tepat <strong>{formatRupiah(order.grand_total)}</strong>, lalu kirim bukti transfer.
                </p>
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-2 text-sm self-end print:space-y-1 print:text-[10px]">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal Produk</span>
                <span className="font-mono text-foreground">{formatRupiah(order.total_amount)}</span>
              </div>

              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Diskon Kupon / Voucher</span>
                  <span className="font-mono">-{formatRupiah(order.discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>{isPickup ? "Biaya Pengambilan Toko" : "Ongkos Kirim"}</span>
                <span className="font-mono text-foreground">
                  {isPickup && Number(order.shipping_amount) === 0 ? "Gratis" : formatRupiah(order.shipping_amount)}
                </span>
              </div>

              <div className="border-t border-border pt-2.5 flex justify-between items-baseline print:pt-1.5">
                <div>
                  <span className="text-base font-bold text-foreground print:text-xs">Total Pembayaran</span>
                  <p className="text-[11px] text-muted-foreground print:text-[8.5px]">Sudah termasuk pajak &amp; diskon</p>
                </div>
                <span className="text-2xl font-black font-mono text-primary print:text-base">
                  {formatRupiah(order.grand_total)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Official Notice */}
          <div className="border-t border-border/60 pt-4 text-center text-xs text-muted-foreground space-y-0.5 print:pt-2 print:text-[9px]">
            <p className="font-medium text-foreground">
              Terima kasih telah berbelanja di {storeName}!
            </p>
            <p>
              Faktur ini sah sebagai bukti transaksi resmi untuk konfirmasi penerimaan dan klaim garansi toko.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
