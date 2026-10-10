"use client";

import { Fragment, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Check,
  Clock3,
  LoaderCircle,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { proceedToCheckoutAction } from "@/actions/checkout";
import { type CartData } from "@/types/cart";
import {
  PAYMENT_METHOD,
  type CheckoutAddress,
  type ShippingMethod,
  type ShippingMethodCode,
  type PickupLocation,
} from "@/types/checkout";

import { type BankTransferInfo } from "@/lib/storefront-settings";

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
}

export function CheckoutClient({
  initialCart,
  shippingMethods,
  initialAddress,
  pickupInfo,
  pickupLocations = [],
  bankTransfer,
}: CheckoutClientProps) {
  const [shippingCode, setShippingCode] = useState<ShippingMethodCode | "">(
    shippingMethods[0]?.code ?? ""
  );
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [fulfillmentMode, setFulfillmentMode] = useState<"delivery" | "pickup">("delivery");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const shippingPrice = fulfillmentMode === "pickup" ? 0 : selectedShipping?.price ?? 0;

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
      await proceedToCheckoutAction(new FormData(event.currentTarget));
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
      setErrorMessage(
        error instanceof Error ? error.message : "Pesanan belum berhasil dibuat. Coba lagi."
      );
      setLoading(false);
    }
  };

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
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${fulfillmentMode === "delivery" ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20" : "border-border hover:border-foreground/30 bg-card"}`}>
                <input className="mt-1 size-4 accent-primary" type="radio" name="fulfillmentMode" checked={fulfillmentMode === "delivery"} onChange={() => setFulfillmentMode("delivery")} />
                <Truck className="mt-0.5 size-4 text-primary" />
                <span>
                  <span className="block font-semibold">Diantar ke alamat</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Pilih alamat tujuan dan jasa pengiriman kurir.</span>
                </span>
              </label>
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

          <dl className="space-y-3 py-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium tabular-nums">{formatCurrency(subtotal)}</dd>
            </div>
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
              {formatCurrency(subtotal + shippingPrice)}
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
