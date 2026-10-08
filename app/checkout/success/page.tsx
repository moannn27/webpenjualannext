import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";

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
    ? await supabase.from("orders").select("order_number, courier, grand_total").eq("id", orderId).eq("user_id", user.id).maybeSingle()
    : { data: null };
  const { data: storefrontRow } = await supabase.from("storefront_settings").select("settings").eq("id", "main").maybeSingle();
  const storefront = normalizeStorefrontSettings(storefrontRow?.settings);
  const whatsappNumber = storefront.store.whatsapp.replace(/\D/g, "") || "6281234567890";
  const fulfillment = order?.courier === "pickup" ? "Ambil di toko" : "Diantar ke alamat";
  const confirmationMessage = order
    ? `Halo Admin, saya ingin konfirmasi pembayaran pesanan ${order.order_number}.\nJenis pemenuhan: ${fulfillment}.\nTotal: Rp ${Number(order.grand_total).toLocaleString("id-ID")}\nSaya akan mengirim bukti transfer untuk dicek. Mohon konfirmasi pembayaran dan langkah selanjutnya.`
    : "Halo Admin, saya ingin konfirmasi pembayaran pesanan. Mohon bantu cek pesanan dan informasikan langkah selanjutnya.";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(confirmationMessage)}`;

  return (
    <div className="container mx-auto px-4 py-24 flex flex-col items-center text-center max-w-xl">
      <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8">
        <CheckCircle2 className="h-12 w-12" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-4 text-foreground">Pesanan berhasil dibuat</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Pesananmu sudah tercatat. Setelah transfer, kirim bukti pembayaran ke admin melalui WhatsApp agar pembayaran dan pesananmu dikonfirmasi.
        {orderId && (
          <>
            <br />
            Nomor referensi pesanan: <span className="font-semibold text-foreground">#{orderId.substring(0, 8).toUpperCase()}</span>.
          </>
        )}
      </p>
      <div className="mb-8 w-full rounded-xl border bg-card p-5 text-left">
        <p className="font-semibold">Langkah selanjutnya</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Selesaikan transfer manual sesuai instruksi admin.</li>
          <li>Buka WhatsApp, lalu kirim pesan beserta bukti transfer.</li>
          <li>Tunggu konfirmasi admin sebelum pesanan dikirim atau diambil.</li>
        </ol>
        {order?.courier === "pickup" && <p className="mt-3 text-sm text-muted-foreground">Untuk ambil di toko, tunggu konfirmasi lokasi dan waktu dari admin sebelum datang.</p>}
      </div>
      <Button render={<a href={whatsappUrl} target="_blank" rel="noreferrer" />} size="lg" className="mb-3 w-full rounded-full px-8">
        Konfirmasi pembayaran via WhatsApp
      </Button>
      <p className="mb-6 text-xs text-muted-foreground">Tombol akan membuka WhatsApp admin dengan pesan siap kirim.</p>
      <Button render={<Link href="/" />} size="lg" className="rounded-full px-8">
        Kembali ke beranda
      </Button>
    </div>
  );
}
