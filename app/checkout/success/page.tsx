import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Faktur Pesanan | Next Solution Store",
  description: "Konfirmasi pesanan dan instruksi pembayaran.",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string | string[] }>;
}) {
  const { order_id: queryOrderId } = await searchParams;
  const orderId = typeof queryOrderId === "string" ? queryOrderId : undefined;

  if (orderId) {
    redirect(`/orders/${encodeURIComponent(orderId)}/invoice`);
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-card rounded-3xl border border-border p-6 sm:p-8 text-center space-y-4 shadow-sm">
        <div className="size-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-9" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Pesanan Berhasil Dicatat
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Terima kasih atas pesanan Anda. Anda dapat melihat riwayat pesanan lengkap atau kembali ke katalog produk.
        </p>
        <div className="pt-2 flex flex-col gap-2.5">
          <Button render={<Link href="/profile" />} className="w-full h-11 rounded-xl font-semibold gap-2">
            Lihat Riwayat Pesanan
            <ArrowRight className="size-4" />
          </Button>
          <Button render={<Link href="/products" />} variant="outline" className="w-full h-10 rounded-xl text-xs gap-2">
            <ShoppingBag className="size-3.5" />
            Jelajahi Produk Lain
          </Button>
        </div>
      </div>
    </div>
  );
}
