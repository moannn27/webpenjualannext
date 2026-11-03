"use client";

import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InvoiceOrderData, InvoiceStorefrontInfo } from "@/components/invoice/OrderInvoice";
import { resolveOrderCustomerIdentity } from "@/lib/orders/customer-identity";
import { getOrderPaymentState } from "@/lib/orders/payment-status";

interface ThermalReceiptViewProps {
  order: InvoiceOrderData;
  storefront?: InvoiceStorefrontInfo;
  onPrint: () => void;
  onSwitchToA4: () => void;
  backHref?: string;
  backLabel?: string;
}

export function ThermalReceiptView({
  order,
  storefront,
  onPrint,
  onSwitchToA4,
}: ThermalReceiptViewProps) {
  const storeName = storefront?.storeName || "NEXT SOLUTION STORE";
  const storeAddress = storefront?.storeAddress || "Jl. Kartini No. 09, Bandung";
  const storePhone = storefront?.storePhone || storefront?.storeWhatsapp || "0811-2238-310";

  const customer = resolveOrderCustomerIdentity({
    shippingAddress: order.shipping_address as Record<string, unknown> | null,
    userProfile: order.users,
  });

  const customerName = customer.name || "Pelanggan";
  const customerPhone = customer.phone || "";
  const isPickup = order.courier === "pickup";
  const taxInvoice = (order.shipping_address as Record<string, unknown> | null)?.tax_invoice as {
    requested?: boolean;
    company_name?: string;
    npwp?: string;
    tax_percent?: number;
    tax_amount?: number;
    dpp_amount?: number;
    calculation_type?: "inclusive" | "exclusive";
  } | undefined;

  const paymentState = getOrderPaymentState(order.payments);
  const paymentStateLabel =
    paymentState === "paid"
      ? "LUNAS - TERVERIFIKASI"
      : paymentState === "pending"
      ? "PENDING - MENUNGGU PEMBAYARAN"
      : "BELUM LUNAS";

  const paymentMethod = order.payments?.[0]?.payment_method || (isPickup ? "Bayar di Kasir" : "Transfer Bank");

  const formatIdr = (val: number) =>
    `Rp ${Number(val ?? 0).toLocaleString("id-ID")}`;

  const orderDate = new Date(order.created_at);
  const formattedDateTime = !isNaN(orderDate.getTime())
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(orderDate) + " WIB"
    : order.created_at;

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto !important;
            margin: 0mm !important;
          }
          html,
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            font-family: "Courier New", Courier, monospace !important;
          }
          .thermal-print-container {
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 4mm 3mm !important;
            margin: 0 !important;
            font-size: 11px !important;
            line-height: 1.35 !important;
            color: #000000 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Action & Format Switch Bar (Hidden in Print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1A1C23] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSwitchToA4}
            className="gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Kembali ke Faktur Resmi A4</span>
          </Button>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline text-xs text-muted-foreground font-medium">
            Format: Struk Kasir / POS (58/80mm)
          </span>
          <Button
            type="button"
            onClick={onPrint}
            className="gap-2 rounded-xl h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm cursor-pointer"
          >
            <Printer className="size-4" />
            <span>Cetak Struk Thermal</span>
          </Button>
        </div>
      </div>

      {/* Thermal Preview Paper Canvas */}
      <div className="thermal-print-container w-full max-w-[380px] mx-auto bg-white text-black p-6 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl font-mono text-xs leading-relaxed select-all">
        {/* Store Header */}
        <div className="text-center space-y-1">
          <h2 className="text-base font-black tracking-tight uppercase">
            {storeName}
          </h2>
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-600">
            Pusat Komputer & Laptop Resmi
          </p>
          <p className="text-[10px] text-slate-700">{storeAddress}</p>
          <p className="text-[10px] text-slate-700">Telp/WA: {storePhone}</p>
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-dashed border-slate-400" />

        {/* Transaction Meta */}
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-600">No. Struk</span>
            <span className="font-bold">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Waktu</span>
            <span>{formattedDateTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Pelanggan</span>
            <span className="font-bold truncate max-w-[200px] text-right">
              {customerName}
            </span>
          </div>
          {customerPhone && (
            <div className="flex justify-between">
              <span className="text-slate-600">No. HP</span>
              <span>{customerPhone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-600">Layanan</span>
            <span className="font-semibold">
              {isPickup ? "Ambil di Gerai (Pickup)" : `Kirim (${order.courier.toUpperCase()})`}
            </span>
          </div>
          {taxInvoice?.requested && (
            <>
              <div className="flex justify-between pt-0.5 border-t border-dashed border-slate-300">
                <span className="text-slate-600">Faktur Pajak</span>
                <span className="font-bold">Diminta</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">NPWP</span>
                <span className="font-mono text-right truncate max-w-[190px]">{taxInvoice.npwp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Perusahaan</span>
                <span className="font-medium text-right truncate max-w-[190px]">{taxInvoice.company_name}</span>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-dashed border-slate-400" />

        {/* Items List */}
        <div className="space-y-2.5 text-[11px]">
          {order.order_items.map((item, idx) => (
            <div key={item.id || idx} className="space-y-0.5">
              <p className="font-bold text-slate-900 leading-snug">
                {idx + 1}. {item.product_name}
              </p>
              {item.sku && (
                <p className="text-[10px] text-slate-500">
                  SKU: {item.sku}
                </p>
              )}
              <div className="flex justify-between text-[11px] pt-0.5">
                <span className="text-slate-600">
                  {item.quantity} x {formatIdr(item.price)}
                </span>
                <span className="font-bold">
                  {formatIdr(item.quantity * item.price)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-dashed border-slate-400" />

        {/* Summary */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span>{formatIdr(order.total_amount)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Potongan Diskon</span>
              <span>-{formatIdr(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-600">
              {isPickup ? "Biaya Penanganan" : "Ongkos Kirim"}
            </span>
            <span>
              {order.shipping_amount > 0
                ? formatIdr(order.shipping_amount)
                : "Rp 0 (GRATIS)"}
            </span>
          </div>
        </div>

        {/* Double divider for Grand Total */}
        <div className="my-2.5 border-t-2 border-dashed border-slate-900" />

        <div className="flex justify-between items-baseline py-1">
          <span className="font-bold text-xs uppercase">TOTAL AKHIR</span>
          <span className="font-black text-sm tracking-tight">
            {formatIdr(order.grand_total)}
          </span>
        </div>

        {taxInvoice?.requested && (() => {
          const taxRate = Number(taxInvoice.tax_percent) > 0 ? Number(taxInvoice.tax_percent) : 11;
          const isInclusive = taxInvoice.calculation_type !== "exclusive";
          const taxableAmount = Math.max(0, Number(order.total_amount || 0) - Number(order.discount_amount || 0));
          const dpp = taxInvoice.dpp_amount !== undefined && Number(taxInvoice.dpp_amount) > 0
            ? Number(taxInvoice.dpp_amount)
            : isInclusive
            ? Math.round(taxableAmount / (1 + taxRate / 100))
            : taxableAmount;
          const taxAmount = taxInvoice.tax_amount !== undefined && Number(taxInvoice.tax_amount) > 0
            ? Number(taxInvoice.tax_amount)
            : isInclusive
            ? taxableAmount - dpp
            : Math.round(taxableAmount * (taxRate / 100));

          return isInclusive ? (
            <>
              <div className="flex justify-between text-slate-700 font-medium pt-0.5 border-t border-dashed border-slate-300">
                <span>DPP</span>
                <span className="font-mono font-semibold">{formatIdr(dpp)}</span>
              </div>
              <div className="flex justify-between text-slate-700 font-medium">
                <span>PPN ({taxRate}% Inc)</span>
                <span className="font-mono font-semibold">{formatIdr(taxAmount)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-700 font-medium pt-0.5 border-t border-dashed border-slate-300">
              <span>Pajak PPN ({taxRate}%)</span>
              <span className="font-mono font-semibold">+{formatIdr(taxAmount)}</span>
            </div>
          );
        })()}

        <div className="space-y-0.5 pt-1 text-[10px] text-slate-600">
          <div className="flex justify-between">
            <span>Metode Bayar:</span>
            <span className="font-bold uppercase text-slate-900">
              {paymentMethod}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-bold uppercase text-slate-900">
              {paymentStateLabel}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-dashed border-slate-400" />

        {/* Footer Notes */}
        <div className="text-center space-y-1.5 text-[9.5px] text-slate-600 leading-tight">
          <p className="font-semibold text-slate-800">
            SIMPAN STRUK INI UNTUK KLAIM GARANSI
          </p>
          <p>
            Barang yang sudah dibeli bergaransi resmi distributor. Wajib menyertakan nota fisik saat klaim service.
          </p>
          <div className="py-1 tracking-[0.25em] text-[11px] font-bold text-slate-400">
            ||| | ||||| || | |||| |||
          </div>
          <p className="font-bold text-slate-900 pt-1">
            Terima Kasih Telah Berbelanja!
          </p>
          <p className="text-[9px] text-slate-500">
            Next Solution • Solusi Komputer & Elektronik
          </p>
        </div>
      </div>
    </div>
  );
}

