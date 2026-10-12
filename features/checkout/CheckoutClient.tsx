"use client";

import { Fragment, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Check,
  CheckCheck,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  LoaderCircle,
  MapPin,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  TicketPercent,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { proceedToCheckoutAction } from "@/actions/checkout";
import { validateVoucherForCheckoutAction } from "@/actions/voucher";
import { emitCartUpdated } from "@/lib/cart-events";
import { type CartData } from "@/types/cart";
import {
  PAYMENT_METHOD,
  type CheckoutAddress,
  type ShippingMethod,
  type ShippingMethodCode,
  type PickupLocation,
} from "@/types/checkout";

import { type BankTransferInfo, type StoreFeaturesSettings } from "@/lib/storefront-settings";

const getItemPrice = (item: CartData["cart_items"][number]) =>
  Number(item.products.discount_price ?? item.products.price);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

interface CheckoutClientProps {
  initialCart: CartData;
  shippingMethods: ShippingMethod[];
  initialAddress: CheckoutAddress | null;
  pickupInfo: PickupLocation;
  pickupLocations?: PickupLocation[];
  bankTransfer: BankTransferInfo[];
  features?: StoreFeaturesSettings;
  storeWhatsapp?: string;
  storeName?: string;
}

export function CheckoutClient({
  initialCart,
  shippingMethods,
  initialAddress,
  pickupInfo,
  pickupLocations = [],
  bankTransfer,
  features,
  storeWhatsapp,
  storeName,
}: CheckoutClientProps) {
  const isDeliveryEnabled = features?.delivery_enabled !== false;
  const isPickupEnabled = features?.pickup_enabled !== false;
  const initialFulfillment: "delivery" | "pickup" = isDeliveryEnabled ? "delivery" : "pickup";

  const [shippingCode, setShippingCode] = useState<ShippingMethodCode | "">(
    shippingMethods[0]?.code ?? ""
  );
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [fulfillmentMode, setFulfillmentMode] = useState<"delivery" | "pickup">(initialFulfillment);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [placedOrder, setPlacedOrder] = useState<{
    orderId: string;
    orderNumber: string;
    grandTotal: number;
    courier: string;
    recipientName: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (e) {
      console.error("Gagal menyalin", e);
    }
  };

  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
    description: string;
    discountType?: "fixed_amount" | "percentage";
    discountValue?: number;
    maxDiscount?: number | null;
    targetScope?: string;
    applicableCategoryNames?: string[];
    applicableBrandNames?: string[];
    isNewCustomerOnly?: boolean;
  } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState("");

  const locations: PickupLocation[] = pickupLocations.length > 0 ? pickupLocations : [pickupInfo];
  const [selectedPickupId, setSelectedPickupId] = useState<string>(locations[0]?.id ?? "main");

  const activePickup = locations.find((l) => l.id === selectedPickupId) || locations[0] || pickupInfo;

  const selectedShipping =
    fulfillmentMode === "delivery"
      ? shippingMethods.find((method) => method.code === shippingCode)
      : null;

  const fulfillmentStepLabel = fulfillmentMode === "pickup" ? "Pengambilan" : "Pengiriman";

  const subtotal = initialCart.cart_items.reduce((total, item) => {
    return total + getItemPrice(item) * item.quantity;
  }, 0);

  const discountAmount = appliedVoucher ? appliedVoucher.discountAmount : 0;
  const shippingPrice = fulfillmentMode === "pickup" ? 0 : selectedShipping?.price ?? 0;
  const finalTotal = Math.max(0, subtotal - discountAmount) + shippingPrice;

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) {
      setVoucherError("Ketik kode voucher terlebih dahulu.");
      return;
    }
    setVoucherLoading(true);
    setVoucherError("");
    try {
      const cartItems = initialCart.cart_items.map((item) => {
        const prod = item.products as typeof item.products & {
          category_id?: string | null;
          brand_id?: string | null;
          categories?: { id?: string | null; name?: string | null } | null;
          brands?: { id?: string | null; name?: string | null } | null;
        };
        return {
          product_id: item.products.id,
          price: getItemPrice(item),
          quantity: item.quantity,
          category_id: prod.category_id ?? prod.categories?.id ?? null,
          brand_id: prod.brand_id ?? prod.brands?.id ?? null,
          category_name: prod.categories?.name ?? null,
          brand_name: prod.brands?.name ?? null,
        };
      });

      const formEl = typeof document !== "undefined" ? (document.getElementById("checkout-form") as HTMLFormElement | null) : null;
      const phoneVal = formEl
        ? String(new FormData(formEl).get("phone") || "")
        : String(initialAddress?.phone || "");

      const result = await validateVoucherForCheckoutAction(
        voucherInput,
        subtotal,
        cartItems,
        phoneVal
      );
      if (!result.success) {
        setVoucherError(result.error || "Kode voucher tidak valid.");
        setAppliedVoucher(null);
      } else {
        setAppliedVoucher({
          code: result.voucherCode!,
          discountAmount: result.discountAmount!,
          description: result.description!,
          discountType: result.discountType,
          discountValue: result.discountValue,
          maxDiscount: result.maxDiscount,
          targetScope: result.targetScope,
          applicableCategoryNames: result.applicableCategoryNames,
          applicableBrandNames: result.applicableBrandNames,
          isNewCustomerOnly: result.isNewCustomerOnly,
        });
        setVoucherInput("");
        setVoucherError("");
      }
    } catch (err) {
      setVoucherError(err instanceof Error ? err.message : "Gagal memeriksa voucher.");
      setAppliedVoucher(null);
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError("");
  };

  const goToStep = (step: 1 | 2 | 3) => {
    if (step > currentStep) return;
    setCurrentStep(step);
    setErrorMessage("");
  };

  const continueCheckout = () => {
    setErrorMessage("");
    const form = document.getElementById("checkout-form") as HTMLFormElement | null;
    if (!form) return;

    const requiredFields =
      currentStep === 1
        ? ["recipientName", "phone", ...(fulfillmentMode === "delivery" ? ["postalCode", "streetAddress", "city", "province"] : [])]
        : [];

    for (const name of requiredFields) {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement && !field.reportValidity()) return;
    }

    if (currentStep === 2 && fulfillmentMode === "delivery" && !selectedShipping) {
      setErrorMessage("Pilih jasa pengiriman terlebih dahulu.");
      return;
    }

    if (currentStep === 2 && fulfillmentMode === "pickup") {
      if (!activePickup?.address?.trim()) {
        setErrorMessage("Alamat pickup belum diatur oleh admin. Silakan hubungi admin atau pilih pengiriman ke alamat.");
        return;
      }
    }

    setCurrentStep((currentStep + 1) as 2 | 3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await proceedToCheckoutAction(new FormData(event.currentTarget));
      if (result && result.success) {
        emitCartUpdated(0);
        setPlacedOrder({
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          grandTotal: result.grandTotal,
          courier: result.courier,
          recipientName: result.recipientName,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
      setErrorMessage(
        error instanceof Error ? error.message : "Pesanan belum berhasil dibuat. Coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  if (placedOrder) {
    const rawWa = (storeWhatsapp || "6281234567890").replace(/\D/g, "");
    const waNumber = rawWa.startsWith("0") ? "62" + rawWa.slice(1) : rawWa;
    const sName = storeName || "Next Solution Store";
    const waText =
      `Halo Admin ${sName},\n` +
      `Saya ingin konfirmasi pembayaran pesanan saya:\n` +
      `• No. Pesanan: *${placedOrder.orderNumber}*\n` +
      `• Nama Pemesan: *${placedOrder.recipientName}*\n` +
      `• Total Transfer: *${formatCurrency(placedOrder.grandTotal)}*\n` +
      `• Metode Pengiriman: ${placedOrder.courier === "pickup" ? "Ambil Sendiri di Toko" : `Kurir (${placedOrder.courier})`}\n\n` +
      `Berikut saya lampirkan bukti transfer pembayarannya. Mohon diverifikasi agar pesanan segera diproses. Terima kasih!`;
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;

    return (
      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 animate-in fade-in duration-300">
        {/* Top Pending Alert Banner */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 sm:p-6 mb-8 text-amber-950 dark:text-amber-200">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
              <Clock3 className="size-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  STATUS: PENDING · MENUNGGU PEMBAYARAN
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Pesanan Berhasil Dicatat — Silakan Transfer &amp; Konfirmasi
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Pesanan Anda telah tersimpan dengan status <strong>Pending</strong>. Silakan transfer tepat sesuai total tagihan ke rekening toko di bawah ini, lalu kirim bukti transfer ke WhatsApp Admin. Faktur pesanan akan diperbarui menjadi <strong>Lunas / Berhasil</strong> setelah admin mengonfirmasi pembayaran Anda.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          {/* Left Column: Bank Details & Instructions */}
          <div className="space-y-6 md:col-span-7">
            {/* Rekening Tujuan Transfer */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 font-semibold text-base">
                  <Banknote className="size-5 text-primary" />
                  <span>Rekening Bank Resmi Toko</span>
                </div>
                <span className="text-xs text-muted-foreground">Transfer Manual</span>
              </div>

              {bankTransfer.length > 0 ? (
                <div className="space-y-3">
                  {bankTransfer.map((bank, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border bg-muted/20 p-4 transition-all hover:border-primary/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded">
                          {bank.bank_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bank.account_number, `bank-${idx}`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-background border px-2.5 py-1 rounded-md"
                        >
                          {copiedKey === `bank-${idx}` ? (
                            <>
                              <CheckCheck className="size-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" />
                              <span>Salin Rekening</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div>
                        <p className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-foreground">
                          {bank.account_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Atas Nama: <strong className="text-foreground">{bank.account_holder}</strong>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Informasi nomor rekening dapat diminta langsung ke WhatsApp admin.
                </p>
              )}

              <div className="rounded-xl bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Petunjuk Pembayaran:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Transfer tepat hingga nominal rupiah terakhir.</li>
                  <li>Simpan foto / screenshot bukti transfer.</li>
                  <li>Kirim bukti tersebut ke WhatsApp admin agar pembayaran segera disetujui.</li>
                </ul>
              </div>
            </div>

            {/* WA Button Section */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                <MessageCircle className="size-5 shrink-0" />
                <span>Kirim Bukti Pembayaran ke WhatsApp Admin</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Setelah selesai melakukan transfer, klik tombol hijau di bawah untuk terhubung langsung ke WhatsApp Admin dengan nomor pesanan otomatis:
              </p>
              <Button
                render={<a href={waUrl} target="_blank" rel="noreferrer" />}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm sm:text-base gap-2 shadow-sm"
              >
                <MessageCircle className="size-5 shrink-0" />
                Kirim Bukti Transfer ke WhatsApp Admin
              </Button>
            </div>
          </div>

          {/* Right Column: Order Summary & Navigation */}
          <div className="space-y-6 md:col-span-5">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="font-semibold text-base border-b border-border pb-3">
                Ringkasan Tagihan Pesanan
              </h2>

              {/* Order Number */}
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Nomor Pesanan</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(placedOrder.orderNumber, "order-code")}
                    className="inline-flex items-center gap-1 hover:text-foreground text-[11px] font-medium"
                  >
                    {copiedKey === "order-code" ? (
                      <>
                        <CheckCheck className="size-3 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-base sm:text-lg font-bold text-foreground tracking-wider">
                  {placedOrder.orderNumber}
                </p>
              </div>

              {/* Total Tagihan */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total yang Harus Ditransfer</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(String(placedOrder.grandTotal), "total-amount")}
                    className="inline-flex items-center gap-1 hover:text-foreground text-[11px] font-medium"
                  >
                    {copiedKey === "total-amount" ? (
                      <>
                        <CheckCheck className="size-3 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Salin Nominal</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-2xl font-black text-primary">
                  {formatCurrency(placedOrder.grandTotal)}
                </p>
              </div>

              <div className="space-y-2 text-xs divide-y divide-border/60 pt-1">
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Nama Pemesan</span>
                  <span className="font-semibold text-foreground">{placedOrder.recipientName}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Metode Pengiriman</span>
                  <span className="font-medium text-foreground">
                    {placedOrder.courier === "pickup" ? "Ambil Sendiri di Toko" : `Kurir (${placedOrder.courier})`}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Status Pembayaran</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    Menunggu Verifikasi Admin (Pending)
                  </span>
                </div>
              </div>

              {/* Navigation Actions: "kalo mau lanjut baru lanjut" */}
              <div className="pt-3 border-t border-border space-y-2.5">
                <Button
                  render={<Link href={`/checkout/success?order_id=${placedOrder.orderId}`} />}
                  className="w-full h-11 rounded-xl font-semibold gap-2 shadow-xs"
                >
                  <FileText className="size-4" />
                  Lanjut ke Faktur Pesanan
                </Button>

                <Button
                  render={<Link href="/profile" />}
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs font-medium"
                >
                  Lihat Riwayat Pesanan
                </Button>

                <Button
                  render={<Link href="/" />}
                  variant="ghost"
                  className="w-full h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                >
                  Kembali ke Beranda
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Link
        href="/cart"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali ke keranjang
      </Link>

      <ol className="mb-10 flex items-center justify-between text-sm sm:justify-start sm:gap-8">
        {(["Alamat", fulfillmentStepLabel, "Pembayaran"] as const).map((label, index) => {
          const stepNumber = (index + 1) as 1 | 2 | 3;
          const isCurrent = currentStep === stepNumber;
          const isDone = currentStep > stepNumber;

          return (
            <Fragment key={label}>
              {index > 0 && <li aria-hidden="true" className="h-px flex-1 bg-border sm:w-16 sm:flex-none" />}
              <li className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => goToStep(stepNumber)}
                  disabled={stepNumber > currentStep}
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                    isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : isDone
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isDone ? <Check className="size-4" /> : stepNumber}
                </button>
                <span className={`text-xs font-medium sm:text-sm ${isCurrent ? "font-semibold text-foreground" : isDone ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </li>
            </Fragment>
          );
        })}
      </ol>

      <div className="grid gap-10 lg:grid-cols-12">
        <form onSubmit={handleSubmit} id="checkout-form" className="space-y-8 lg:col-span-7">
          {appliedVoucher && (
            <input type="hidden" name="voucherCode" value={appliedVoucher.code} />
          )}
          <header className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
            <p className="text-sm text-muted-foreground">
              {currentStep === 1
                ? "Tentukan metode penerimaan dan identitas pemesan."
                : currentStep === 2
                ? fulfillmentMode === "pickup"
                  ? "Pilih lokasi pengambilan pesanan di toko."
                  : "Tentukan jasa pengiriman yang tersedia."
                : "Periksa rekening pembayaran sebelum membuat pesanan."}
            </p>
          </header>

          {errorMessage && (
            <p role="alert" className="rounded-xl border-l-4 border-destructive bg-destructive/10 p-4 text-sm font-medium text-destructive">
              {errorMessage}
            </p>
          )}

          {/* STEP 1: Identitas & Pilihan Pengantaran / Pickup */}
          <section hidden={currentStep !== 1} aria-labelledby="fulfillment-heading" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-5 flex items-center gap-3">
              <MapPin className="size-5 text-primary" />
              <div>
                <h2 id="fulfillment-heading" className="text-lg font-semibold">Pilih cara menerima pesanan</h2>
                <p className="text-sm text-muted-foreground">Pesanan akan diverifikasi admin setelah pembayaran.</p>
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {isDeliveryEnabled ? (
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${fulfillmentMode === "delivery" ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20" : "border-border hover:border-foreground/30 bg-card"}`}>
                  <input className="mt-1 size-4 accent-primary" type="radio" name="fulfillmentMode" checked={fulfillmentMode === "delivery"} onChange={() => setFulfillmentMode("delivery")} />
                  <Truck className="mt-0.5 size-4 text-primary" />
                  <span>
                    <span className="block font-semibold">Diantar ke alamat</span>
                    <span className="mt-1 block text-xs text-muted-foreground">Pilih alamat tujuan dan jasa pengiriman kurir.</span>
                  </span>
                </label>
              ) : (
                <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Pengiriman Kurir Tidak Tersedia</p>
                    <p className="mt-0.5 text-amber-900/80 dark:text-amber-300/80">
                      {features?.delivery_notice || "Layanan pengiriman kurir sedang ditutup sementara."}
                    </p>
                  </div>
                </div>
              )}

              {isPickupEnabled ? (
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${fulfillmentMode === "pickup" ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20" : "border-border hover:border-foreground/30 bg-card"}`}>
                  <input className="mt-1 size-4 accent-primary" type="radio" name="fulfillmentMode" checked={fulfillmentMode === "pickup"} onChange={() => setFulfillmentMode("pickup")} />
                  <Store className="mt-0.5 size-4 text-primary" />
                  <span>
                    <span className="block font-semibold">Ambil di toko</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Gratis ongkir. Pilih lokasi toko dan ambil setelah dikonfirmasi admin.
                    </span>
                  </span>
                </label>
              ) : (
                <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Ambil di Toko Tidak Tersedia</p>
                    <p className="mt-0.5 text-amber-900/80 dark:text-amber-300/80">
                      {features?.pickup_notice || "Layanan ambil di toko sedang ditutup sementara."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium sm:col-span-2" htmlFor="recipientName">
                Nama pemesan / penerima
                <Input id="recipientName" name="recipientName" autoComplete="name" defaultValue={initialAddress?.recipient_name} required minLength={2} maxLength={150} />
              </label>
              <label className="space-y-2 text-sm font-medium" htmlFor="phone">
                Nomor WhatsApp / telepon
                <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" defaultValue={initialAddress?.phone} required minLength={8} maxLength={24} />
              </label>
              {fulfillmentMode === "delivery" && (
                <>
                  <label className="space-y-2 text-sm font-medium" htmlFor="postalCode">
                    Kode pos
                    <Input id="postalCode" name="postalCode" autoComplete="postal-code" defaultValue={initialAddress?.postal_code} required minLength={3} maxLength={20} />
                  </label>
                  <label className="space-y-2 text-sm font-medium sm:col-span-2" htmlFor="streetAddress">
                    Alamat lengkap tujuan
                    <Input id="streetAddress" name="streetAddress" autoComplete="street-address" placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan" defaultValue={initialAddress?.street_address} required minLength={5} maxLength={255} />
                  </label>
                  <label className="space-y-2 text-sm font-medium" htmlFor="city">
                    Kota / kabupaten
                    <Input id="city" name="city" autoComplete="address-level2" defaultValue={initialAddress?.city} required minLength={2} maxLength={100} />
                  </label>
                  <label className="space-y-2 text-sm font-medium" htmlFor="province">
                    Provinsi
                    <Input id="province" name="province" autoComplete="address-level1" defaultValue={initialAddress?.province} required minLength={2} maxLength={100} />
                  </label>
                </>
              )}
            </div>
          </section>

          {/* STEP 2: Pengambilan di Toko ATAU Pilihan Kurir Pengiriman */}
          <section hidden={currentStep !== 2} aria-labelledby="shipping-heading" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-5 flex items-center gap-3">
              {fulfillmentMode === "pickup" ? <Store className="size-5 text-primary" /> : <Truck className="size-5 text-primary" />}
              <div>
                <h2 id="shipping-heading" className="text-lg font-semibold">
                  {fulfillmentMode === "pickup" ? "Pilih lokasi pengambilan di toko" : "Pilih pengiriman"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {fulfillmentMode === "pickup"
                    ? "Klik untuk memilih lokasi toko. Gratis biaya pengiriman."
                    : "Ongkir dihitung otomatis dari kurir yang tersedia."}
                </p>
              </div>
            </div>

            {fulfillmentMode === "pickup" ? (
              <div className="space-y-3">
                {locations.map((loc) => {
                  const isSelected = selectedPickupId === loc.id;
                  return (
                    <label
                      key={loc.id}
                      className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4.5 transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50 bg-card hover:bg-muted/30"
                      }`}
                    >
                      <input
                        className="mt-1 size-4 accent-primary"
                        type="radio"
                        name="selectedPickupLocation"
                        value={loc.id}
                        checked={isSelected}
                        onChange={() => setSelectedPickupId(loc.id)}
                      />
                      <Store className={`mt-0.5 size-5 shrink-0 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">{loc.name}</span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                              <Check className="size-3" /> Lokasi Dipilih
                            </span>
                          )}
                        </div>
                        {loc.address ? (
                          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{loc.address}</p>
                        ) : (
                          <p className="mt-1 text-sm text-amber-700">Alamat pickup belum diatur.</p>
                        )}
                        {loc.maps_url && (
                          <a
                            href={loc.maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPin className="size-3" /> Lihat di Google Maps
                          </a>
                        )}
                      </div>
                    </label>
                  );
                })}

                <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs text-muted-foreground flex items-center gap-2.5">
                  <PackageCheck className="size-4 text-emerald-600 shrink-0" />
                  <span>Admin akan menghubungi kamu melalui WhatsApp setelah pesanan siap untuk mengonfirmasi waktu pengambilan.</span>
                </div>
              </div>
            ) : shippingMethods.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {shippingMethods.map((method) => {
                  const isSelected = shippingCode === method.code;
                  const MethodIcon = method.code === "express" ? Zap : Truck;

                  return (
                    <label
                      key={method.code}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-foreground/30 bg-card"
                      }`}
                    >
                      <input
                        className="mt-1 size-4 accent-primary"
                        type="radio"
                        name="shippingMethod"
                        value={method.code}
                        checked={isSelected}
                        onChange={() => setShippingCode(method.code)}
                      />
                      <MethodIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3 font-medium">
                          {method.name}
                          <span className="text-sm tabular-nums">{formatCurrency(method.price)}</span>
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="size-3.5" /> {method.delivery_estimate}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p role="status" className="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
                Belum ada metode pengiriman aktif. Pesanan belum bisa dibuat.
              </p>
            )}
          </section>

          {/* STEP 3: Pembayaran */}
          <section hidden={currentStep !== 3} aria-labelledby="payment-heading" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-5 flex items-center gap-3">
              <Banknote className="size-5 text-primary" />
              <div>
                <h2 id="payment-heading" className="text-lg font-semibold">Pembayaran</h2>
                <p className="text-sm text-muted-foreground">Pembayaran dicatat dengan status menunggu konfirmasi transfer.</p>
              </div>
            </div>
            <input type="hidden" name="paymentMethod" value={PAYMENT_METHOD} />
            {fulfillmentMode === "pickup" && <input type="hidden" name="shippingMethod" value="pickup" />}
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Transfer manual</p>
                {bankTransfer.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {bankTransfer.map((b, i) => (
                      <li key={i} className="rounded-lg border bg-background px-3 py-2 text-sm">
                        <p className="font-semibold">{b.bank_name}</p>
                        <p className="mt-0.5 font-mono text-base tracking-widest">{b.account_number}</p>
                        <p className="text-xs text-muted-foreground">a.n. {b.account_holder}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Rekening bank belum diatur. Hubungi admin untuk info transfer.</p>
                )}
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Setelah transfer, tekan tombol konfirmasi WhatsApp di halaman berikutnya dan kirim bukti pembayaran agar admin memproses pesananmu.
                </p>
              </div>
            </div>
          </section>
        </form>

        {/* SIDEBAR: Ringkasan Pesanan */}
        <aside aria-labelledby="summary-heading" className="h-fit rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-5">
          <h2 id="summary-heading" className="text-lg font-semibold">Ringkasan pesanan</h2>

          <div className="mt-6 max-h-72 divide-y divide-border overflow-y-auto pr-1">
            {initialCart.cart_items.map((item) => {
              const price = getItemPrice(item);
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="size-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.products.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x {formatCurrency(price)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatCurrency(price * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Voucher Section */}
          <div className="mt-5 rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-foreground">
              <TicketPercent className="size-4 text-primary" />
              <span>Kupon / Voucher Diskon</span>
            </div>

            {appliedVoucher ? (
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-xs space-y-2">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                      <Tag className="size-3.5 shrink-0" />
                      <span className="font-mono tracking-wider">{appliedVoucher.code}</span>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                        VOUCHER AKTIF
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    className="rounded p-1 text-muted-foreground hover:bg-emerald-500/20 hover:text-foreground transition-colors shrink-0"
                    title="Hapus voucher"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Info detail keuntungan voucher */}
                <div className="rounded-lg bg-background/90 p-2.5 border border-emerald-500/25 space-y-1 shadow-2xs">
                  <p className="font-medium text-emerald-950 dark:text-emerald-100 flex items-start gap-1.5">
                    <Sparkles className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      Selamat! Kamu mendapatkan voucher{" "}
                      <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {appliedVoucher.discountType === "percentage"
                          ? `diskon ${appliedVoucher.discountValue}%${
                              appliedVoucher.maxDiscount
                                ? ` (maks. ${formatCurrency(appliedVoucher.maxDiscount)})`
                                : ""
                            }`
                          : `potongan harga ${formatCurrency(appliedVoucher.discountValue || appliedVoucher.discountAmount)}`}
                      </strong>
                    </span>
                  </p>

                  <div className="pl-5 text-emerald-700 dark:text-emerald-400 font-bold text-xs sm:text-sm">
                    Total diskon: -{formatCurrency(appliedVoucher.discountAmount)}
                  </div>

                  {(appliedVoucher.applicableCategoryNames?.length || appliedVoucher.applicableBrandNames?.length || appliedVoucher.isNewCustomerOnly) ? (
                    <div className="pl-5 flex flex-wrap gap-1.5 pt-0.5 text-[10px]">
                      {appliedVoucher.isNewCustomerOnly ? (
                        <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 font-semibold flex items-center gap-1">
                          <Sparkles className="size-2.5" /> Khusus Pembeli Pertama
                        </span>
                      ) : null}
                      {appliedVoucher.applicableCategoryNames?.length ? (
                        <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 font-medium">
                          Khusus Kategori: {appliedVoucher.applicableCategoryNames.join(', ')}
                        </span>
                      ) : null}
                      {appliedVoucher.applicableBrandNames?.length ? (
                        <span className="rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 font-medium">
                          Khusus Merk: {appliedVoucher.applicableBrandNames.join(', ')}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {appliedVoucher.description &&
                    appliedVoucher.description !== appliedVoucher.code && (
                      <p className="text-[11px] text-muted-foreground pl-5 pt-0.5 border-t border-border/40 mt-1">
                        {appliedVoucher.description}
                      </p>
                    )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Masukkan kode kupon"
                    value={voucherInput}
                    onChange={(e) => {
                      setVoucherInput(e.target.value.toUpperCase());
                      setVoucherError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleApplyVoucher();
                      }
                    }}
                    className="h-9 uppercase text-xs font-mono tracking-wider"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApplyVoucher}
                    disabled={voucherLoading || !voucherInput.trim()}
                    className="h-9 text-xs px-3 font-medium"
                  >
                    {voucherLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : "Gunakan"}
                  </Button>
                </div>
                {voucherError && (
                  <p className="text-xs font-medium text-destructive">{voucherError}</p>
                )}
              </div>
            )}
          </div>

          <dl className="space-y-3 py-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium tabular-nums">{formatCurrency(subtotal)}</dd>
            </div>
            {appliedVoucher && discountAmount > 0 && (
              <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                <dt className="flex items-center gap-1 font-medium">
                  <Tag className="size-3.5" />
                  <span>Diskon Kupon ({appliedVoucher.code})</span>
                </dt>
                <dd className="font-semibold tabular-nums">-{formatCurrency(discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{fulfillmentMode === "pickup" ? "Pengambilan" : "Ongkir"}</dt>
              <dd className="font-medium tabular-nums">
                {fulfillmentMode === "pickup"
                  ? `Ambil di toko (${activePickup.name}) · Gratis`
                  : selectedShipping
                  ? formatCurrency(shippingPrice)
                  : "Pilih metode"}
              </dd>
            </div>
          </dl>

          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold tabular-nums">
              {formatCurrency(finalTotal)}
            </span>
          </div>

          <Button
            type={currentStep === 3 ? "submit" : "button"}
            form={currentStep === 3 ? "checkout-form" : undefined}
            onClick={currentStep === 3 ? undefined : continueCheckout}
            disabled={
              loading ||
              (currentStep === 2 && fulfillmentMode === "delivery" && !selectedShipping) ||
              (currentStep === 2 && !shippingMethods.length && fulfillmentMode === "delivery")
            }
            className="mt-6 h-12 w-full"
          >
            {loading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
            {loading
              ? "Menyimpan pesanan..."
              : currentStep === 1
              ? `Lanjut ke ${fulfillmentStepLabel.toLocaleLowerCase("id-ID")}`
              : currentStep === 2
              ? "Lanjut ke pembayaran"
              : "Buat pesanan"}
          </Button>

          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => goToStep((currentStep - 1) as 1 | 2)}
              disabled={loading}
              className="mt-2 w-full"
            >
              Kembali
            </Button>
          )}

          <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
            Total final dihitung ulang dan disimpan oleh database.
          </p>
        </aside>
      </div>
    </main>
  );
}
