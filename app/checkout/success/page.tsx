import { CheckCircle2, MessageCircle, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { OrderInvoice } from "@/components/invoice/OrderInvoice";

export const metadata = {
  title: "Pesanan Berhasil | Next Solution Store",
  description: "Konfirmasi pesanan dan instruksi pembayaran.",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string | string[] }>;
}) {
  const { order_id: queryOrderId } = await searchParams;
  const orderId = typeof queryOrderId === "string" ? queryOrderId : undefined;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: order } = orderId && user
    ? await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          created_at,
          status,
          total_amount,
          shipping_amount,
          discount_amount,
          grand_total,
          courier,
          shipping_address,
          order_items (
            id,
            product_name,
            price,
            quantity,
            variant_details
          ),
          payments (
            id,
            amount,
            payment_method,
            status
          ),
          users (
            full_name,
            phone
          )
        `)
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: storefrontRow } = await supabase
    .from("storefront_settings")
    .select("settings")
    .eq("id", "main")
    .maybeSingle();

  const storefront = normalizeStorefrontSettings(storefrontRow?.settings);
  const rawWa = storefront.store.whatsapp || "6281234567890";
  const whatsappNumber = rawWa.replace(/\D/g, "");
  const storeName = storefront.pickup_info?.store_name || "Next Solution Store";

  const storefrontInfo = {
    storeName,
    storeAddress: storefront.store.address || "Jl. Kartini No. 9",
    storeCity: storefront.store.city || "Bandung",
    storePhone: storefront.store.phone,
    storeWhatsapp: rawWa,
    storeEmail: storefront.store.email,
    bankAccounts: storefront.bank_transfer,
  };

  const address = order?.shipping_address as Record<string, any> | null;
  const isPickup = order?.courier === "pickup";
  const userObj = Array.isArray(order?.users) ? order.users[0] : order?.users;
  const recipientName = address?.recipient_name || userObj?.full_name || "Pelanggan";

  // Exact WIB datetime format
  const orderDateObj = order?.created_at ? new Date(order.created_at) : new Date();
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
    : "";

  const fulfillment = isPickup ? "Ambil sendiri di toko" : "Diantar ke alamat penerima";
  const confirmationMessage = order
    ? `Halo Admin ${storeName},\nSaya sudah membuat pesanan dan ingin konfirmasi pembayaran:\n` +
      `• Nomor Pesanan: *${order.order_number}*\n` +
      `• Nama Pembeli: *${recipientName}*\n` +
      `• Tanggal & Jam: ${formattedDateTimeWIB}\n` +
      `• Total Tagihan: *Rp ${Number(order.grand_total).toLocaleString("id-ID")}*\n` +
      `• Metode: ${fulfillment}\n\n` +
      `Mohon informasikan langkah selanjutnya dan cek bukti pembayaran yang akan saya kirim. Terima kasih!`
    : `Halo Admin ${storeName}, saya ingin konfirmasi pembayaran pesanan. Mohon bantu cek pesanan saya.`;

  const waTarget = whatsappNumber.startsWith("0") ? "62" + whatsappNumber.slice(1) : whatsappNumber;
  const whatsappUrl = `https://wa.me/${waTarget}?text=${encodeURIComponent(confirmationMessage)}`;

  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Banner Notice */}
        <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 shadow-sm text-center flex flex-col items-center">
          <div className="h-16 w-16 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-2">
            Pesanan Berhasil Dibuat!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
            Terima kasih! Pesanan Anda telah tercatat dalam sistem kami tanpa batasan waktu pembayaran yang terburu-buru.
          </p>

          {order && (
            <div className="mt-4 p-4 rounded-2xl bg-muted/40 border border-border/60 max-w-lg w-full text-left space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Nomor Kode Pesanan:</span>
                <span className="font-mono font-bold text-foreground text-base tracking-wider">
                  {order.order_number}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Waktu Pemesanan:</span>
                <span className="font-medium text-foreground text-xs sm:text-sm">
                  {formattedDateTimeWIB}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-border/50 pt-2">
                <span className="font-semibold text-foreground">Total Tagihan:</span>
                <span className="font-mono font-bold text-primary text-lg">
                  Rp {Number(order.grand_total).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}

          {/* WhatsApp Instructions & Action Button */}
          <div className="mt-6 w-full max-w-lg space-y-3">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-left text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <MessageCircle className="size-4 shrink-0" />
                Langkah Konfirmasi Pembayaran:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground pt-1">
                <li>Lakukan transfer manual ke rekening toko yang tercantum di faktur bawah.</li>
                <li>Klik tombol di bawah untuk membuka WhatsApp resmi kami dengan kode pesanan otomatis.</li>
                <li>Kirim bukti transfer agar pesanan langsung disiapkan oleh admin.</li>
              </ol>
            </div>

            <Button
              render={<a href={whatsappUrl} target="_blank" rel="noreferrer" />}
              size="lg"
              className="w-full rounded-2xl h-12 text-sm sm:text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
            >
              <MessageCircle className="size-5 shrink-0" />
              Konfirmasi Pembayaran via WhatsApp
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {order && (
                <Button
                  render={<Link href={`/orders/${order.id}/invoice`} />}
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs"
                >
                  <FileText className="size-3.5" />
                  Buka Faktur / Invoice Khusus
                </Button>
              )}
              <Button
                render={<Link href="/profile" />}
                variant="ghost"
                size="sm"
                className="rounded-xl gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Ke Riwayat Pesanan
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Embedded Complete Official Invoice Component */}
        {order ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Faktur Pembelian Lengkap
              </h2>
              <span className="text-xs text-muted-foreground">
                Dapat dicetak atau disimpan sebagai PDF
              </span>
            </div>
            <OrderInvoice
              order={order as any}
              storefront={storefrontInfo}
              backHref="/"
              backLabel="Kembali ke Beranda"
            />
          </div>
        ) : (
          <div className="text-center p-8 bg-card rounded-2xl border">
            <p className="text-muted-foreground text-sm">
              Nomor pesanan tidak ditemukan atau sesi telah berakhir.
            </p>
            <Button render={<Link href="/" />} className="mt-4 rounded-full">
              Kembali ke Beranda
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
