"use client";

import {
  Printer,
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Laptop,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

interface OrderInvoiceProps {
  order: InvoiceOrderData;
  storefront?: InvoiceStorefrontInfo;
  backHref?: string;
  backLabel?: string;
}

function getProductSpecifications(item: InvoiceOrderItem): Array<{ key: string; value: string }> {
  const productData = item.products;
  // Always prioritize latest live specifications from the product record
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
            instructions: "Transfer sesuai nominal total tagihan",
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
      }).format(orderDateObj) + " WIB"
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
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0 print:m-0 print:min-h-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-invoice-sheet {
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            padding: 12mm 14mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            display: block !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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

        {/* Browser print hint - Hidden in Print */}
        <div className="print:hidden rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
          <HelpCircle className="size-4 shrink-0 text-blue-600 mt-0.5" />
          <p>
            <strong>Tips Cetak PDF Sempurna:</strong> Pada jendela pratinjau cetak browser (Ctrl + P), pastikan ukuran kertas diatur ke <strong>A4</strong> dan hapus centang opsi <em>&quot;Header dan footer&quot;</em> agar hasil bersih dan pas 1 halaman penuh.
          </p>
        </div>

        {/* Invoice Container - Spacious Professional Marketplace Layout */}
        <div className="print-invoice-sheet bg-card rounded-2xl border border-border shadow-lg p-6 sm:p-9 print:p-0 print:border-none print:shadow-none print:rounded-none text-foreground space-y-5 print:space-y-3.5">
          {/* SECTION 1: HEADER & STORE IDENTITY */}
          <div className="border-b-2 border-border/80 pb-4 print:pb-2.5">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              {/* Store Branding */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-3.5">
                  {storefront?.logoUrl && storefront.logoDisplayMode !== "text_only" ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={storefront.logoUrl}
                      alt={storeName}
                      className="h-11 sm:h-12 max-w-[170px] object-contain print:h-8"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="size-11 sm:size-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-xs print:size-8 print:text-sm print:rounded-md">
                      NS
                    </div>
                  )}

                  {storefront?.logoDisplayMode !== "logo_only" && (
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight text-foreground print:text-base">
                        {storeName}
                      </h1>
                      <p className="text-xs font-medium text-muted-foreground print:text-[9.5px]">
                        Pusat Komputer, Laptop &amp; Solusi Elektronik Resmi
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground pt-1 space-y-0.5 print:text-[8.5px]">
                  <p>{storeAddress}, {storeCity}</p>
                  <p>WhatsApp: {formatDisplayPhone(storeWhatsapp)} · Email: {storeEmail}</p>
                </div>
              </div>

              {/* Invoice Meta Strip */}
              <div className="sm:text-right space-y-1.5 self-stretch sm:self-auto bg-muted/30 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
                <div className="inline-block px-3 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[11px] font-bold tracking-wider uppercase print:text-[9px] print:px-2">
                  FAKTUR PENJUALAN
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-mono font-black tracking-tight text-foreground print:text-sm">
                    {order.order_number}
                  </p>
                  <p className="text-xs text-muted-foreground print:text-[8.5px]">
                    Tanggal: <span className="font-semibold text-foreground">{formattedDateTimeWIB}</span>
                  </p>
                </div>
                <div className="flex sm:justify-end items-center gap-1.5 pt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase print:text-[8px] ${
                      isPaymentConfirmed
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {isPaymentConfirmed ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                    {isPaymentConfirmed ? "LUNAS · PEMBAYARAN BERHASIL" : "PENDING · MENUNGGU VERIFIKASI ADMIN"}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border uppercase print:text-[8px]">
                    {isPickup ? "Ambil di Toko" : `Kurir (${order.courier})`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CUSTOMER & DELIVERY INFO (MARKETPLACE TWO-COLUMN STYLE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 print:py-1.5 print:gap-3">
            {/* Box 1: Pembeli */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1.5 print:p-2.5 print:rounded-lg">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-[8.5px]">
                DITUJUKAN KEPADA:
              </h3>
              <p className="text-sm sm:text-base font-bold text-foreground print:text-xs">
                {recipientName}
              </p>
              <p className="text-xs text-muted-foreground print:text-[8.5px]">
                No. WhatsApp / HP: <span className="font-semibold text-foreground">{formatDisplayPhone(recipientPhone)}</span>
              </p>
              {order.users?.email && (
                <p className="text-xs text-muted-foreground print:text-[8.5px]">
                  Email: <span className="text-foreground">{order.users.email}</span>
                </p>
              )}
            </div>

            {/* Box 2: Pengiriman / Lokasi Ambil */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1.5 print:p-2.5 print:rounded-lg">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-[8.5px]">
                {isPickup ? "LOKASI PENGAMBILAN (PICKUP):" : "ALAMAT PENGIRIMAN:"}
              </h3>
              {isPickup ? (
                <div className="space-y-0.5 text-xs print:text-[8.5px]">
                  <p className="font-bold text-foreground">
                    {address?.pickup_location || storeName}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {address?.pickup_address || `${storeAddress}, ${storeCity}`}
                  </p>
                  <p className="text-muted-foreground text-[11px] print:text-[8px] pt-0.5">
                    Layanan: <span className="font-medium text-foreground">Ambil Sendiri di Toko</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5 text-xs print:text-[8.5px]">
                  <p className="font-bold text-foreground">
                    Penerima: {recipientName}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {address?.street_address || "-"}, {[address?.city, address?.province, address?.postal_code].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-muted-foreground text-[11px] print:text-[8px] pt-0.5">
                    Layanan: <span className="capitalize font-medium text-foreground">{order.courier}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: PRODUCT TABLE WITH AUTHENTIC MARKETPLACE LAYOUT */}
          <div className="py-1 print:py-0.5">
            <div className="border border-border/80 rounded-xl overflow-hidden print:rounded-lg shadow-2xs">
              <table className="w-full text-left text-xs print:text-[9.5px]">
                <thead className="bg-muted/70 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider print:text-[8px]">
                  <tr>
                    <th className="py-3 px-3.5 w-10 text-center font-bold">No</th>
                    <th className="py-3 px-3 w-16 text-center font-bold">Foto</th>
                    <th className="py-3 px-4 font-bold">Info &amp; Rincian Produk</th>
                    <th className="py-3 px-4 text-right w-32 font-bold">Harga Satuan</th>
                    <th className="py-3 px-3 text-center w-14 font-bold">Qty</th>
                    <th className="py-3 px-4 text-right w-36 font-bold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {order.order_items.map((item, index) => {
                    const productData = item.products;
                    const imgUrl =
                      productData?.product_images?.find((img) => img.is_primary)?.url ||
                      productData?.product_images?.[0]?.url ||
                      item.product_image ||
                      null;

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

                    // Check if raw description repeats specs
                    const rawDesc = (productData?.description || item.description || "").trim();
                    const isRedundantDesc =
                      specs.length > 0 &&
                      rawDesc.length > 0 &&
                      specs.some((s) => s.value && rawDesc.includes(s.value));

                    return (
                      <tr key={item.id || index} className="text-foreground align-top hover:bg-muted/10 transition-colors">
                        {/* Number */}
                        <td className="py-3.5 px-3.5 text-center text-muted-foreground font-semibold print:py-2">
                          {index + 1}
                        </td>

                        {/* Product Image */}
                        <td className="py-3.5 px-3 print:py-2">
                          <div className="size-14 rounded-xl border border-border/70 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 print:size-10 shadow-2xs">
                            {imgUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={imgUrl}
                                alt={liveTitle}
                                className="size-full object-contain"
                                crossOrigin="anonymous"
                              />
                            ) : (
                              <Laptop className="size-6 text-muted-foreground/40" />
                            )}
                          </div>
                        </td>

                        {/* Product Details */}
                        <td className="py-3.5 px-4 print:py-2">
                          <p className="font-bold text-sm sm:text-base leading-snug text-foreground print:text-xs">
                            {liveTitle}
                          </p>

                          {/* Brand, Category, SKU Tags */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 print:mt-1">
                            {brandName && (
                              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary print:text-[8px]">
                                {brandName}
                              </span>
                            )}
                            {categoryName && (
                              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground print:text-[8px]">
                                {categoryName}
                              </span>
                            )}
                            {skuCode && (
                              <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50 print:text-[8px]">
                                SKU: {skuCode}
                              </span>
                            )}
                          </div>

                          {/* Variant Selected Pill */}
                          {variantText && (
                            <div className="mt-2 print:mt-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-[11px] print:text-[8.5px]">
                                Pilihan Varian: {variantText}
                              </span>
                            </div>
                          )}

                          {/* Real Specifications from DB with clean chip badges */}
                          {specs.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs print:mt-1.5">
                              {specs.map((spec, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-muted/80 border border-border/60 text-[10.5px] text-muted-foreground print:text-[8px] print:px-1.5 print:py-0"
                                >
                                  <strong className="font-semibold text-foreground/80">{spec.key}:</strong>
                                  <span className="text-foreground font-medium">{spec.value}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Product Note if any and not redundant */}
                          {rawDesc !== "" && !isRedundantDesc && (
                            <p className="text-[10.5px] text-muted-foreground/80 mt-2 italic print:text-[8px] line-clamp-2">
                              Catatan: {rawDesc}
                            </p>
                          )}
                        </td>

                        {/* Unit Price */}
                        <td className="py-3.5 px-4 text-right font-mono text-muted-foreground font-medium print:py-2">
                          {formatRupiah(item.price)}
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-3 text-center font-bold text-foreground print:py-2">
                          {item.quantity}
                        </td>

                        {/* Subtotal */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground print:py-2">
                          {formatRupiah(item.price * item.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: PAYMENT INFO & FINANCIAL SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-3.5 border-t border-border/80 print:py-2 print:gap-4">
            {/* Left Box: Payment Details & Guarantee Terms */}
            <div className="space-y-3 text-xs print:space-y-1.5 print:text-[9px]">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-1.5 print:p-2 print:rounded-lg">
                <div className="flex justify-between items-center text-[11px] print:text-[8.5px]">
                  <span className="text-muted-foreground">Metode Pembayaran:</span>
                  <span className="font-semibold text-foreground uppercase">{paymentMethodName}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] print:text-[8.5px]">
                  <span className="text-muted-foreground">Status Pembayaran:</span>
                  <span className={`font-bold ${isPaymentConfirmed ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                    {isPaymentConfirmed ? "Lunas (Diverifikasi Admin)" : "Menunggu Verifikasi Admin (Pending)"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] print:text-[8.5px]">
                  <span className="text-muted-foreground">Waktu Pemesanan:</span>
                  <span className="font-medium text-foreground">{formattedDateTimeWIB}</span>
                </div>

                {!isPaymentConfirmed && (
                  <div className="pt-2 border-t border-border/60 space-y-1">
                    <p className="text-[10.5px] font-bold text-muted-foreground print:text-[8px]">
                      Rekening Pembayaran:
                    </p>
                    {bankAccounts.map((acc, i) => (
                      <div key={i} className="flex justify-between text-[10.5px] font-mono print:text-[8px]">
                        <span>{acc.bank_name}: {acc.account_number}</span>
                        <span>a.n. {acc.account_holder}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Warranty & Unboxing Note */}
              <div className="text-[10.5px] text-muted-foreground space-y-1 print:text-[8px] p-2.5 bg-muted/10 rounded-lg border border-border/50">
                <p className="font-bold text-foreground uppercase tracking-wider text-[10px] print:text-[8px]">
                  Catatan &amp; Ketentuan Garansi:
                </p>
                <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
                  <li>Simpan faktur ini sebagai bukti pembelian yang sah untuk klaim garansi.</li>
                  <li>Segel garansi pada unit wajib utuh dan tidak rusak saat klaim garansi.</li>
                  <li>Wajib menyertakan video unboxing utuh saat mengajukan komplain pesanan.</li>
                </ul>
              </div>
            </div>

            {/* Right Box: Calculations Breakdown & Grand Total */}
            <div className="space-y-1.5 text-xs self-end print:space-y-0.5 print:text-[9.5px]">
              <div className="flex justify-between text-muted-foreground py-0.5">
                <span>Total Harga ({order.order_items.reduce((acc, i) => acc + i.quantity, 0)} Barang)</span>
                <span className="font-mono font-medium text-foreground">{formatRupiah(order.total_amount)}</span>
              </div>

              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium py-0.5">
                  <span>Diskon Voucher Toko</span>
                  <span className="font-mono">-{formatRupiah(order.discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground py-0.5">
                <span>{isPickup ? "Biaya Penanganan / Ambil di Toko" : "Ongkos Kirim"}</span>
                <span className="font-mono font-medium text-foreground">
                  {isPickup && Number(order.shipping_amount) === 0 ? "Rp 0 (Gratis)" : formatRupiah(order.shipping_amount)}
                </span>
              </div>

              <div className="border-t border-border/80 pt-2 flex justify-between items-center bg-primary/10 p-3.5 rounded-xl border border-primary/25 print:p-2 print:rounded-lg">
                <div>
                  <span className="text-xs font-bold uppercase text-foreground print:text-[9.5px]">
                    TOTAL TAGIHAN
                  </span>
                  <p className="text-[10px] text-muted-foreground print:text-[7.5px]">
                    Sudah termasuk PPN jika berlaku
                  </p>
                </div>
                <span className="text-2xl font-black font-mono text-primary print:text-base">
                  {formatRupiah(order.grand_total)}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: SIGNATURES & COMPUTER-GENERATED NOTICE */}
          <div className="border-t border-border/80 pt-4 print:pt-2">
            <div className="flex justify-between items-end gap-6 text-xs print:text-[9px]">
              {/* Penerima / Pembeli */}
              <div className="text-center space-y-8 print:space-y-6 min-w-36">
                <p className="font-semibold text-foreground">Tanda Tangan Pembeli</p>
                <div>
                  <div className="border-b-2 border-foreground/30 w-40 mx-auto"></div>
                  <p className="text-[10.5px] text-muted-foreground mt-1.5 print:text-[8px] truncate">
                    ( {recipientName} )
                  </p>
                </div>
              </div>

              {/* System Note */}
              <div className="hidden sm:block text-center flex-1 px-4 text-[10px] text-muted-foreground print:block print:text-[7.5px]">
                <p>
                  Faktur ini diterbitkan secara resmi oleh sistem komputer {storeName} sebagai bukti transaksi yang sah.
                </p>
                <p className="text-primary font-medium mt-1">
                  Terima kasih atas kepercayaan Anda telah berbelanja di {storeName}!
                </p>
              </div>

              {/* Toko / Kasir - Clean Official Signature */}
              <div className="text-center space-y-8 print:space-y-6 min-w-36">
                <p className="font-semibold text-foreground">Petugas Toko / Kasir</p>
                <div>
                  <div className="border-b-2 border-foreground/30 w-40 mx-auto"></div>
                  <p className="text-[10.5px] text-muted-foreground mt-1.5 print:text-[8px]">
                    ( {storeName} )
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
