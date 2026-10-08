"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
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
import { PAYMENT_METHOD, type CheckoutAddress, type ShippingMethod, type ShippingMethodCode } from "@/types/checkout";

const getItemPrice = (item: CartData["cart_items"][number]) =>
  item.products.discount_price ?? item.products.price;

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
}

export function CheckoutClient({
  initialCart,
  shippingMethods,
  initialAddress,
}: CheckoutClientProps) {
  const [shippingCode, setShippingCode] = useState<ShippingMethodCode | "">(
    shippingMethods[0]?.code ?? ""
  );
  const [fulfillmentMode, setFulfillmentMode] = useState<"delivery" | "pickup">("delivery");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedShipping = fulfillmentMode === "delivery" ? shippingMethods.find((method) => method.code === shippingCode) : null;
  const subtotal = initialCart.cart_items.reduce((total, item) => {
    return total + getItemPrice(item) * item.quantity;
  }, 0);
  const shippingPrice = fulfillmentMode === "pickup" ? 0 : selectedShipping?.price ?? 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      await proceedToCheckoutAction(new FormData(event.currentTarget));
    } catch (error) {
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

      <div className="mb-9 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold text-foreground">
            <span className="grid size-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
            Alamat
          </span>
          <span className="hidden h-px w-8 bg-border sm:block" />
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="grid size-7 place-items-center rounded-full border border-border text-xs">2</span>
            Pengiriman
          </span>
          <span className="hidden h-px w-8 bg-border sm:block" />
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="grid size-7 place-items-center rounded-full border border-border text-xs">3</span>
            Pembayaran
          </span>
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pastikan alamat dan ringkasan pesananmu sudah benar.
        </p>
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-10">
          {errorMessage && (
            <div role="alert" className="border-l-4 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <section aria-labelledby="fulfillment-heading">
            <div className="mb-5 flex items-center gap-3">
              <MapPin className="size-5 text-primary" />
              <div>
                <h2 id="fulfillment-heading" className="text-lg font-semibold">Pilih cara menerima pesanan</h2>
                <p className="text-sm text-muted-foreground">Pesanan akan menunggu konfirmasi admin setelah pembayaran.</p>
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <label className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${fulfillmentMode === "delivery" ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"}`}>
                <input className="mt-1 size-4 accent-primary" type="radio" name="fulfillmentMode" checked={fulfillmentMode === "delivery"} onChange={() => setFulfillmentMode("delivery")} />
                <Truck className="mt-0.5 size-4 text-primary" />
                <span><span className="block font-medium">Diantar ke alamat</span><span className="mt-1 block text-xs text-muted-foreground">Pilih alamat tujuan dan jasa pengiriman.</span></span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${fulfillmentMode === "pickup" ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"}`}>
                <input className="mt-1 size-4 accent-primary" type="radio" name="fulfillmentMode" checked={fulfillmentMode === "pickup"} onChange={() => setFulfillmentMode("pickup")} />
                <Store className="mt-0.5 size-4 text-primary" />
                <span><span className="block font-medium">Ambil di toko</span><span className="mt-1 block text-xs text-muted-foreground">Gratis. Admin akan mengonfirmasi waktu dan lokasi pengambilan.</span></span>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium sm:col-span-2" htmlFor="recipientName">
                Nama penerima
                <Input id="recipientName" name="recipientName" autoComplete="name" defaultValue={initialAddress?.recipient_name} required minLength={2} maxLength={150} />
              </label>
              <label className="space-y-2 text-sm font-medium" htmlFor="phone">
                Nomor telepon
                <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" defaultValue={initialAddress?.phone} required minLength={8} maxLength={24} />
              </label>
              {fulfillmentMode === "delivery" && <>
              <label className="space-y-2 text-sm font-medium" htmlFor="postalCode">
                Kode pos
                <Input id="postalCode" name="postalCode" autoComplete="postal-code" defaultValue={initialAddress?.postal_code} required minLength={3} maxLength={20} />
              </label>
              <label className="space-y-2 text-sm font-medium sm:col-span-2" htmlFor="streetAddress">
                Alamat lengkap
                <Input id="streetAddress" name="streetAddress" autoComplete="street-address" placeholder="Nama jalan, nomor rumah, RT/RW" defaultValue={initialAddress?.street_address} required minLength={5} maxLength={255} />
              </label>
              <label className="space-y-2 text-sm font-medium" htmlFor="city">
                Kota / kabupaten
                <Input id="city" name="city" autoComplete="address-level2" defaultValue={initialAddress?.city} required minLength={2} maxLength={100} />
              </label>
              <label className="space-y-2 text-sm font-medium" htmlFor="province">
                Provinsi
                <Input id="province" name="province" autoComplete="address-level1" defaultValue={initialAddress?.province} required minLength={2} maxLength={100} />
              </label>
              </>}
            </div>
          </section>

          <section aria-labelledby="shipping-heading" className="border-t border-border pt-8">
            <div className="mb-5 flex items-center gap-3">
              <Truck className="size-5 text-primary" />
              <div>
                <h2 id="shipping-heading" className="text-lg font-semibold">{fulfillmentMode === "pickup" ? "Pengambilan di toko" : "Pilih pengiriman"}</h2>
                <p className="text-sm text-muted-foreground">{fulfillmentMode === "pickup" ? "Tidak ada biaya pengiriman. Tunggu konfirmasi admin sebelum datang." : "Ongkir diambil dari tarif yang tersedia."}</p>
              </div>
            </div>

            {fulfillmentMode === "pickup" ? <div className="flex items-start gap-3 border border-border bg-muted/30 p-4"><Store className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-medium">Ambil di toko</p><p className="mt-1 text-sm text-muted-foreground">Lokasi dan waktu pengambilan akan dikonfirmasi admin lewat WhatsApp setelah kamu mengirim bukti pembayaran.</p></div></div> : shippingMethods.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {shippingMethods.map((method) => {
                  const isSelected = shippingCode === method.code;
                  const MethodIcon = method.code === "express" ? Zap : Truck;

                  return (
                    <label
                      key={method.code}
                      className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"}`}
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
              <p role="status" className="border border-border px-4 py-3 text-sm text-muted-foreground">
                Belum ada metode pengiriman aktif. Pesanan belum bisa dibuat.
              </p>
            )}
          </section>

          <section aria-labelledby="payment-heading" className="border-t border-border pt-8">
            <div className="mb-5 flex items-center gap-3">
              <Banknote className="size-5 text-primary" />
              <div>
                <h2 id="payment-heading" className="text-lg font-semibold">Pembayaran</h2>
                <p className="text-sm text-muted-foreground">Pembayaran dicatat dengan status menunggu konfirmasi.</p>
              </div>
            </div>
            <input type="hidden" name="paymentMethod" value={PAYMENT_METHOD} />
            {fulfillmentMode === "pickup" && <input type="hidden" name="shippingMethod" value="pickup" />}
            <div className="flex items-start gap-3 border border-border bg-muted/30 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              <div>
                <p className="font-medium">Transfer manual</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Setelah transfer, tekan tombol konfirmasi WhatsApp di halaman berikutnya dan kirim bukti pembayaran agar admin memproses pesananmu.
                </p>
              </div>
            </div>
          </section>
        </form>

        <aside className="border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="text-lg font-semibold">Ringkasan pesanan</h2>
          <div className="mt-5 divide-y divide-border border-y border-border">
            {initialCart.cart_items.map((item) => {
              const price = getItemPrice(item);

              return (
                <div key={item.id} className="flex justify-between gap-4 py-4 text-sm">
                  <div className="flex min-w-0 gap-3">
                    <PackageCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-medium">{item.products.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
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
                {fulfillmentMode === "pickup" ? "Ambil di toko · Gratis" : selectedShipping ? formatCurrency(shippingPrice) : "Pilih metode"}
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
            type="submit"
            form="checkout-form"
            disabled={loading || (fulfillmentMode === "delivery" && !selectedShipping)}
            className="mt-6 h-12 w-full"
          >
            {loading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
            {loading ? "Menyimpan pesanan..." : "Buat pesanan"}
          </Button>
          <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
            Total final dihitung ulang dan disimpan oleh database.
          </p>
        </aside>
      </div>
    </main>
  );
}
