"use client";

import {
  Printer,
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Laptop,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDisplayPhone } from "@/lib/phone";

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
  specifications?: Array<{ key: string; value: string }>;
  products?: {
    id?: string;
    sku?: string | null;
    name?: string;
    description?: string | null;
    brands?: { name?: string | null } | null;
    categories?: { name?: string | null } | null;
    product_images?: Array<{ url: string; is_primary?: boolean }>;
    product_specifications?: Array<{ key: string; value: string }>;
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
  const storeName = storefront?.storeName || "Toko Next Solution";
  const storeAddress = storefront?.storeAddress || "Jl. Kartini No. 9";
  const storeCity = storefront?.storeCity || "Bandung";
  const storeWhatsapp = (
    storefront?.storeWhatsapp ||
    storefront?.storePhone ||
    "6281234567890"
  ).replace(/\D/g, "");
  const storeEmail = storefront?.storeEmail || "support@nextsolution.com";

  const bankAccounts =
    storefront?.bankAccounts && storefront.bankAccounts.length > 0
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
  const recipientName =
    address?.recipient_name || order.users?.full_name || "Pelanggan";
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
  const isPaymentConfirmed =
    paymentStatus === "success" ||
    order.status === "processing" ||
    order.status === "shipped" ||
    order.status === "delivered";

  const formatRupiah = (num: number) =>
    `Rp ${Number(num ?? 0).toLocaleString("id-ID")}`;

  // WhatsApp confirmation message
  const waMessage =
    `Halo Admin ${storeName},\nSaya ingin konfirmasi pesanan:\n` +
    `• Nomor Faktur: *${order.order_number}*\n` +
    `• Nama Pembeli: *${recipientName}*\n` +
    `• Tanggal: ${formattedDateTimeWIB}\n` +
    `• Total Tagihan: *${formatRupiah(order.grand_total)}*\n` +
    `• Metode: ${isPickup ? "Ambil di Toko" : "Pengiriman ke Alamat"}\n\n` +
    `Mohon dicek. Terima kasih!`;

  const waUrl = `https://wa.me/${
    storeWhatsapp.startsWith("0") ? "62" + storeWhatsapp.slice(1) : storeWhatsapp
  }?text=${encodeURIComponent(waMessage)}`;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      const prevTitle = document.title;
      try {
        // Temporary clean title for browser print engine
        document.title = `Faktur_${order.order_number}`;
        window.print();
      } finally {
        window.setTimeout(() => {
          document.title = prevTitle;
        }, 1200);
      }
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0 print:m-0 print:min-h-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important; /* Zero margin forces browsers to suppress default URL & title header/footer! */
          }
          html,
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-invoice-sheet {
            box-sizing: border-box !important;
            width: 210mm !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            padding: 10mm 13mm 8mm 13mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          img {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
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
              className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-xs"
            >
              <Printer className="size-4 text-primary" />
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

        {/* Tip for browser printing - Hidden in Print */}
        <div className="print:hidden rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
          <HelpCircle className="size-4 shrink-0 text-blue-600 mt-0.5" />
          <p>
            <strong>Tips Cetak PDF Sempurna:</strong> Pada jendela pratinjau cetak browser (Ctrl + P), pastikan ukuran kertas diatur ke <strong>A4</strong> dan hapus centang opsi <em>&quot;Header dan footer&quot;</em> agar hasil bersih dari teks URL di bagian atas kertas.
          </p>
        </div>

        {/* Invoice Container - Fits exactly 1 sheet of A4 */}
        <div className="print-invoice-sheet bg-card rounded-3xl border border-border shadow-md p-6 sm:p-10 print:p-0 print:border-none print:shadow-none print:rounded-none text-foreground">
          {/* SECTION 1: HEADER & STORE IDENTITY */}
          <div className="border-b-2 border-primary/20 pb-4 print:pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              {/* Store Branding */}
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-xs print:size-9 print:text-base print:rounded-lg">
                    NS
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight text-foreground print:text-lg">
                      {storeName}
                    </h1>
                    <p className="text-xs font-semibold text-primary tracking-wide print:text-[10px]">
                      Pusat Penjualan Komputer, Laptop &amp; Solusi Elektronik Resmi
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-1 space-y-0.5 print:text-[9.5px]">
                  <p>Alamat: {storeAddress}, {storeCity}</p>
                  <p>WhatsApp: {formatDisplayPhone(storeWhatsapp)} · Email: {storeEmail}</p>
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="sm:text-right space-y-1.5 self-stretch sm:self-auto bg-muted/40 sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none">
                <div className="inline-block px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-black tracking-wider uppercase print:text-[10px] print:px-2.5 print:py-0.5">
                  FAKTUR PENJUALAN RESMI
                </div>
                <div>
                  <p className="text-xl font-mono font-black tracking-tight text-foreground print:text-base">
                    {order.order_number}
                  </p>
                  <p className="text-xs text-muted-foreground print:text-[9.5px]">
                    Tanggal: <span className="font-semibold text-foreground">{formattedDateTimeWIB}</span>
                  </p>
                </div>
                <div className="flex sm:justify-end items-center gap-1.5 pt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase print:text-[9px] ${
                      isPaymentConfirmed
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {isPaymentConfirmed ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                    {isPaymentConfirmed ? "LUNAS / TERKONFIRMASI" : "MENUNGGU PEMBAYARAN"}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border uppercase print:text-[9px]">
                    {isPickup ? "Ambil di Toko" : `Kurir (${order.courier})`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CUSTOMER & DELIVERY BOXES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 print:py-2.5 print:gap-3">
            {/* Box 1: Pembeli */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1 print:p-2.5 print:rounded-lg">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-primary print:text-[9px]">
                DITAGIHKAN KEPADA (PEMBELI)
              </h3>
              <p className="text-sm font-bold text-foreground print:text-xs">
                {recipientName}
              </p>
              <p className="text-xs text-muted-foreground print:text-[9.5px]">
                No. WhatsApp / HP: <span className="font-semibold text-foreground">{formatDisplayPhone(recipientPhone)}</span>
              </p>
              {order.users?.email && (
                <p className="text-xs text-muted-foreground print:text-[9.5px]">
                  Email: <span className="text-foreground">{order.users.email}</span>
                </p>
              )}
            </div>

            {/* Box 2: Pengiriman / Pengambilan Toko */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1 print:p-2.5 print:rounded-lg">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-primary print:text-[9px]">
                {isPickup ? "LOKASI PENGAMBILAN TOKO (PICKUP)" : "ALAMAT LENGKAP PENGIRIMAN"}
              </h3>
              {isPickup ? (
                <div className="space-y-0.5 text-xs print:text-[9.5px]">
                  <p className="font-bold text-foreground">
                    {address?.pickup_location || storeName}
                  </p>
                  <p className="text-muted-foreground">
                    {address?.pickup_address || `${storeAddress}, ${storeCity}`}
                  </p>
                  {address?.fulfillment_change_note && (
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium pt-0.5">
                      Catatan: {address.fulfillment_change_note}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5 text-xs print:text-[9.5px]">
                  <p className="font-bold text-foreground">
                    Penerima: {recipientName}
                  </p>
                  <p className="text-muted-foreground">
                    {address?.street_address || "-"}, {[address?.city, address?.province, address?.postal_code].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-muted-foreground">
                    Layanan: <span className="capitalize font-medium text-foreground">{order.courier}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: PRODUCT TABLE WITH IMAGE & SPECS */}
          <div className="py-2 flex-1">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-2 print:text-[9px] print:mb-1">
              RINCIAN PRODUK &amp; SPESIFIKASI PESANAN
            </h3>
            <div className="border border-border/80 rounded-xl overflow-hidden print:rounded-lg">
              <table className="w-full text-left text-xs print:text-[10px]">
                <thead className="bg-muted/60 border-b border-border text-[11px] font-bold text-muted-foreground uppercase print:text-[9px]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center font-bold">No</th>
                    <th className="py-2.5 px-3 w-16 text-center font-bold">Foto</th>
                    <th className="py-2.5 px-3 font-bold">Nama Produk &amp; Spesifikasi Lengkap</th>
                    <th className="py-2.5 px-3 text-right w-28 font-bold">Harga Satuan</th>
                    <th className="py-2.5 px-3 text-center w-14 font-bold">Qty</th>
                    <th className="py-2.5 px-3 text-right w-32 font-bold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {order.order_items.map((item, index) => {
                    const productData = item.products;
                    // Primary or first thumbnail image
                    const imgUrl =
                      item.product_image ||
                      productData?.product_images?.find((img) => img.is_primary)?.url ||
                      productData?.product_images?.[0]?.url ||
                      null;

                    const brandName = item.brand_name || productData?.brands?.name;
                    const categoryName = item.category_name || productData?.categories?.name;
                    const skuCode = item.sku || productData?.sku;

                    // Variant text (RAM, Storage, Color)
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

                    // Technical specs
                    const specsList =
                      item.specifications || productData?.product_specifications || [];

                    return (
                      <tr key={item.id || index} className="text-foreground align-top hover:bg-muted/20">
                        {/* Number */}
                        <td className="py-3 px-3 text-center text-muted-foreground font-semibold print:py-2">
                          {index + 1}
                        </td>

                        {/* Product Image Thumbnail */}
                        <td className="py-3 px-3 print:py-2">
                          <div className="size-13 rounded-lg border border-border/80 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 print:size-11">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={item.product_name}
                                className="size-full object-contain"
                                crossOrigin="anonymous"
                              />
                            ) : (
                              <Laptop className="size-6 text-muted-foreground/40" />
                            )}
                          </div>
                        </td>

                        {/* Product Details & Specifications */}
                        <td className="py-3 px-3 print:py-2">
                          <p className="font-bold text-sm leading-snug text-foreground print:text-xs">
                            {item.product_name}
                          </p>

                          {/* Brand & Category & SKU tags */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 print:mt-0.5">
                            {brandName && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary print:text-[8.5px]">
                                {brandName}
                              </span>
                            )}
                            {categoryName && (
                              <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground print:text-[8.5px]">
                                {categoryName}
                              </span>
                            )}
                            {skuCode && (
                              <span className="font-mono text-[10px] text-muted-foreground print:text-[8.5px]">
                                SKU: {skuCode}
                              </span>
                            )}
                          </div>

                          {/* Variant Details */}
                          {variantText && (
                            <p className="text-[11px] text-primary/90 font-medium mt-1 print:text-[9px] print:mt-0.5">
                              Pilihan Varian: {variantText}
                            </p>
                          )}

                          {/* Technical Specifications Chips */}
                          {specsList.length > 0 ? (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[10px] text-muted-foreground print:text-[8.5px] print:mt-0.5">
                              {specsList.map((spec, sIdx) => (
                                <span key={sIdx} className="inline-flex items-center">
                                  <strong>{spec.key}:</strong>&nbsp;{spec.value}
                                  {sIdx < specsList.length - 1 && <span className="ml-2 text-border">•</span>}
                                </span>
                              ))}
                            </div>
                          ) : productData?.description ? (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 italic print:text-[8.5px]">
                              {productData.description}
                            </p>
                          ) : null}
                        </td>

                        {/* Unit Price */}
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground font-medium print:py-2">
                          {formatRupiah(item.price)}
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-3 text-center font-bold text-foreground print:py-2">
                          {item.quantity}
                        </td>

                        {/* Subtotal */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-foreground print:py-2">
                          {formatRupiah(item.price * item.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: PAYMENT STATUS & FINANCIAL SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-3 border-t border-border/80 print:py-2.5 print:gap-4">
            {/* Left Box: Payment Verification & Store Guarantee */}
            <div className="space-y-2">
              {isPaymentConfirmed ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1 text-xs text-emerald-950 dark:text-emerald-200 print:p-2 print:rounded-lg">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-700 dark:text-emerald-400 print:text-xs">
                    <CheckCircle2 className="size-4 shrink-0" />
                    PEMBAYARAN LUNAS &amp; TERVERIFIKASI
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-900/90 dark:text-emerald-300/90 print:text-[9px]">
                    Transaksi ini telah divalidasi lunas oleh sistem Toko Next Solution. Seluruh unit barang dilindungi garansi resmi toko &amp; distributor.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5 text-xs text-amber-950 dark:text-amber-200 print:p-2 print:rounded-lg">
                  <h4 className="font-bold text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5">
                    <Clock className="size-4 shrink-0" />
                    REKENING TUJUAN TRANSFER RESMI
                  </h4>
                  <div className="space-y-1">
                    {bankAccounts.map((acc, i) => (
                      <div key={i} className="p-1.5 bg-card rounded-md border border-border/70 flex justify-between items-center text-[11px] print:text-[9.5px]">
                        <span className="font-bold text-primary">{acc.bank_name}</span>
                        <span className="font-mono font-bold">{acc.account_number}</span>
                        <span className="text-muted-foreground text-[10px]">a.n. {acc.account_holder}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warranty Badge Info */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border/70 bg-muted/20 text-xs text-muted-foreground print:p-1.5 print:rounded-lg print:text-[9px]">
                <ShieldCheck className="size-4 text-primary shrink-0" />
                <span>
                  <strong>Jaminan Resmi:</strong> Unit bergaransi resmi, original, dan tersegel dengan dukungan purna jual Toko Next Solution.
                </span>
              </div>
            </div>

            {/* Right Box: Calculations Breakdown & Grand Total */}
            <div className="space-y-1.5 text-xs self-end print:space-y-1 print:text-[10px]">
              <div className="flex justify-between text-muted-foreground py-0.5">
                <span>Subtotal Produk</span>
                <span className="font-mono font-medium text-foreground">{formatRupiah(order.total_amount)}</span>
              </div>

              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium py-0.5">
                  <span>Diskon Kupon / Voucher Toko</span>
                  <span className="font-mono">-{formatRupiah(order.discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground py-0.5">
                <span>{isPickup ? "Biaya Pengambilan Toko" : "Ongkos Kirim"}</span>
                <span className="font-mono font-medium text-foreground">
                  {isPickup && Number(order.shipping_amount) === 0 ? "Gratis" : formatRupiah(order.shipping_amount)}
                </span>
              </div>

              <div className="border-t-2 border-primary/20 pt-2 flex justify-between items-center bg-primary/5 p-2.5 rounded-xl border border-primary/20 print:p-2 print:rounded-lg">
                <div>
                  <span className="text-xs font-black uppercase text-foreground print:text-[10px]">
                    TOTAL PEMBAYARAN
                  </span>
                  <p className="text-[10px] text-muted-foreground print:text-[8.5px]">
                    Sudah termasuk PPN &amp; seluruh diskon
                  </p>
                </div>
                <span className="text-xl font-black font-mono text-primary print:text-base">
                  {formatRupiah(order.grand_total)}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: OFFICIAL GUARANTEE TERMS & SIGNATURE STAMP BOX */}
          <div className="border-t-2 border-border/80 pt-3 print:pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {/* Terms & Conditions */}
              <div className="sm:col-span-2 space-y-1 text-[10.5px] text-muted-foreground leading-snug print:text-[8.5px] print:space-y-0.5">
                <p className="font-bold text-foreground uppercase tracking-wider text-[11px] print:text-[9px]">
                  KETENTUAN KLAIM GARANSI &amp; PENGESAHAN RESMI:
                </p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Faktur ini sah sebagai bukti transaksi resmi untuk klaim garansi toko dan distributor.</li>
                  <li>Wajib menyertakan fisik faktur ini dan video unboxing utuh saat mengajukan retur atau komplain.</li>
                  <li>Segel garansi pada unit tidak boleh rusak atau dibongkar oleh pihak luar tanpa otorisasi.</li>
                </ol>
                <p className="text-primary font-medium pt-1">
                  Terima kasih atas kepercayaan Anda telah berbelanja di {storeName}!
                </p>
              </div>

              {/* Signatures & Official Stamp */}
              <div className="flex justify-between sm:justify-end gap-6 text-center text-xs print:text-[9px]">
                {/* Penerima / Pembeli */}
                <div className="space-y-9 print:space-y-7 min-w-24">
                  <p className="font-bold text-foreground">Tanda Tangan Pembeli</p>
                  <div className="border-b border-foreground/60 w-full pt-2"></div>
                  <p className="text-[10px] text-muted-foreground -mt-1 print:text-[8px] truncate">
                    ({recipientName})
                  </p>
                </div>

                {/* Kasir & Stempel Toko */}
                <div className="relative space-y-9 print:space-y-7 min-w-28">
                  <p className="font-bold text-foreground">Petugas / Kasir Toko</p>

                  {/* Official Digital Store Stamp */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-1">
                    <div className="border-2 border-emerald-600 rounded-lg p-1 px-2 rotate-[-8deg] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wider shadow-2xs print:text-[8px] print:border-emerald-700">
                      <div className="text-[7.5px] tracking-normal font-bold">TOKO NEXT SOLUTION</div>
                      <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-black">✓ LUNAS / VERIFIED</div>
                      <div className="text-[7px] text-muted-foreground font-semibold">OFFICIAL STORE</div>
                    </div>
                  </div>

                  <div className="border-b border-foreground/60 w-full pt-2"></div>
                  <p className="text-[10px] text-muted-foreground -mt-1 print:text-[8px]">
                    ( Bagian Administrasi )
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
