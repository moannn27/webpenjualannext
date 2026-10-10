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
  variant_details?: Record<string, any> | null;
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
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">
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
        <div className="bg-card rounded-3xl border border-border/80 shadow-md p-6 sm:p-10 print:p-6 print:border-none print:shadow-none print:rounded-none text-foreground">
          {/* Header Store Branding & Invoice Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-border/70 pb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-xs">
                  NS
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight leading-tight">{storeName}</h1>
                  <p className="text-xs text-muted-foreground">Toko Solusi &amp; Perlengkapan Gadget Terpercaya</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                <p>{storeAddress}, {storeCity}</p>
                <p>WhatsApp: {formatDisplayPhone(storeWhatsapp)} · Email: {storeEmail}</p>
              </div>
            </div>

            <div className="sm:text-right space-y-1.5 self-stretch sm:self-auto bg-muted/30 sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:rounded-none">
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-wider uppercase">
                FAKTUR PEMBELIAN RESMI
              </span>
              <p className="text-2xl font-mono font-bold tracking-tight text-foreground">
                {order.order_number}
              </p>
              <p className="text-xs text-muted-foreground">
                Waktu Transaksi: <span className="font-semibold text-foreground">{formattedDateTimeWIB}</span>
              </p>
            </div>
          </div>

          {/* Status Badges Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-6 p-4 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                isPaymentConfirmed
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              }`}>
                {isPaymentConfirmed ? <CheckCircle2 className="size-5" /> : <Clock className="size-5" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Status Pembayaran</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-sm font-bold ${
                    isPaymentConfirmed
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-700 dark:text-amber-400"
                  }`}>
                    {isPaymentConfirmed ? "Lunas / Terkonfirmasi" : "Menunggu Pembayaran Manual"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:border-l sm:border-border/60 sm:pl-4">
              <div className="size-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Metode Pemenuhan Pesanan</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold text-foreground">
                    {isPickup ? "Ambil Sendiri di Toko (Pickup)" : "Pengiriman ke Alamat (Kurir)"}
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {order.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Delivery Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-border/70 text-sm">
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Informasi Pemesan
              </h3>
              <div className="space-y-1">
                <p className="font-bold text-base text-foreground">{recipientName}</p>
                <p className="text-muted-foreground">No. WhatsApp / HP: <span className="text-foreground font-medium">{formatDisplayPhone(recipientPhone)}</span></p>
                {order.users?.email && (
                  <p className="text-muted-foreground">Email: <span className="text-foreground">{order.users.email}</span></p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isPickup ? "Lokasi Pengambilan Toko" : "Alamat Lengkap Pengiriman"}
              </h3>
              {isPickup ? (
                <div className="space-y-1 text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    {address?.pickup_location || storeName}
                  </p>
                  <p>{address?.pickup_address || `${storeAddress}, ${storeCity}`}</p>
                  {address?.fulfillment_change_note && (
                    <p className="text-xs bg-amber-500/10 text-amber-900 dark:text-amber-200 p-2 rounded-lg mt-1 border border-amber-500/20">
                      Catatan: {address.fulfillment_change_note}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1 text-muted-foreground">
                  <p className="text-foreground font-medium">{address?.street_address || "-"}</p>
                  <p>{[address?.city, address?.province, address?.postal_code].filter(Boolean).join(", ") || "-"}</p>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Order Table */}
          <div className="py-6 border-b border-border/70 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daftar Produk yang Dibeli
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                    <th className="py-2.5 pr-3 font-semibold">No</th>
                    <th className="py-2.5 px-3 font-semibold">Nama Produk &amp; Spesifikasi</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Harga Satuan</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Qty</th>
                    <th className="py-2.5 pl-3 text-right font-semibold">Subtotal</th>
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
                        <td className="py-3 pr-3 text-muted-foreground text-xs">{index + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-semibold leading-snug">{item.product_name}</p>
                          {variantText && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Varian: {variantText}
                            </p>
                          )}
                          {item.sku && (
                            <p className="text-[11px] font-mono text-muted-foreground">
                              SKU: {item.sku}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {formatRupiah(item.price)}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold">
                          {item.quantity}
                        </td>
                        <td className="py-3 pl-3 text-right font-mono font-semibold">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6">
            {/* Bank Transfer Instructions */}
            <div className="rounded-2xl border bg-muted/20 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tujuan Transfer Pembayaran
              </h4>
              <p className="text-xs text-muted-foreground">
                Silakan lakukan transfer manual ke salah satu rekening resmi berikut:
              </p>
              <div className="space-y-2.5">
                {bankAccounts.map((acc, i) => (
                  <div key={i} className="p-3 bg-card rounded-xl border border-border/80 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-primary">{acc.bank_name}</span>
                      <span className="text-muted-foreground">a.n. <strong className="text-foreground">{acc.account_holder}</strong></span>
                    </div>
                    <p className="font-mono text-base font-bold tracking-wider text-foreground select-all">
                      {acc.account_number}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                ⚠️ Harap transfer tepat sejumlah <strong>{formatRupiah(order.grand_total)}</strong>, lalu klik tombol Konfirmasi WhatsApp di atas dengan menyertakan bukti transfer.
              </p>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2.5 text-sm self-end">
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

              <div className="border-t border-border pt-3 flex justify-between items-baseline">
                <div>
                  <span className="text-base font-bold text-foreground">Total Pembayaran</span>
                  <p className="text-[11px] text-muted-foreground">Sudah termasuk pajak &amp; diskon</p>
                </div>
                <span className="text-2xl font-black font-mono text-primary">
                  {formatRupiah(order.grand_total)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Official Notice */}
          <div className="border-t border-border/60 pt-6 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">
              Terima kasih telah berbelanja di {storeName}!
            </p>
            <p>
              Faktur ini diterbitkan secara otomatis dan sah sebagai bukti transaksi yang dapat digunakan untuk konfirmasi penerimaan barang dan garansi resmi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
