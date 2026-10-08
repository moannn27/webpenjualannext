import { getAdminOrdersAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateAdminOrderStatusAction, updateAdminPaymentStatusAction } from "@/actions/admin";

const statusLabels: Record<string, string> = {
  pending: "Menunggu pembayaran",
  processing: "Pembayaran dikonfirmasi · disiapkan",
  shipped: "Dikirim",
  ready_for_pickup: "Siap diambil di toko",
  delivered: "Selesai",
  cancelled: "Dibatalkan",
};
const paymentLabels: Record<string, string> = { pending: "Menunggu", success: "Terkonfirmasi", failed: "Gagal", refunded: "Refund" };
const statusChoices: Record<string, { value: string; label: string }[]> = {
  pending: [{ value: "cancelled", label: "Batalkan pesanan" }],
  processing: [{ value: "shipped", label: "Tandai dikirim" }, { value: "ready_for_pickup", label: "Siap diambil di toko" }, { value: "cancelled", label: "Batalkan pesanan" }],
  shipped: [{ value: "delivered", label: "Tandai selesai" }],
  ready_for_pickup: [{ value: "delivered", label: "Tandai selesai" }],
  delivered: [],
  cancelled: [],
};
const money = (value: number) => `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;

export default async function AdminOrdersPage() {
  const orders = await getAdminOrdersAction();
  return <section className="space-y-6"><div><h1 className="text-3xl font-bold">Pesanan</h1><p className="mt-1 text-muted-foreground">Periksa pembayaran lalu perbarui proses kirim atau pickup sampai selesai.</p></div>
    <p className="text-sm text-muted-foreground">Saat pembayaran ditandai terkonfirmasi, pesanan otomatis masuk ke tahap disiapkan. Setelah itu pilih tahap yang sesuai dengan jenis penerimaan.</p>
    <div className="overflow-x-auto rounded-xl border bg-card"><Table className="min-w-[1050px]"><TableHeader><TableRow><TableHead>Nomor / pelanggan</TableHead><TableHead>Tanggal</TableHead><TableHead>Pembayaran</TableHead><TableHead>Status proses</TableHead><TableHead>Total</TableHead><TableHead>Rincian &amp; tindakan</TableHead></TableRow></TableHeader><TableBody>
      {orders.map((order) => {
        const payment = order.payments?.[0];
        const isPickup = order.courier === "pickup";
        const choices = (statusChoices[order.status] ?? []).filter((option) => isPickup ? option.value !== "shipped" : option.value !== "ready_for_pickup");
        const address = order.shipping_address as Record<string, unknown> | null;
        return <TableRow key={order.id}>
          <TableCell><p className="font-medium">{order.order_number}</p><p className="mt-1 text-xs text-muted-foreground">{order.users?.[0]?.full_name || "Pelanggan"}</p><p className="text-xs text-muted-foreground">{order.users?.[0]?.phone || ""}</p></TableCell>
          <TableCell><time dateTime={order.created_at}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(order.created_at))}</time></TableCell>
          <TableCell><div className="space-y-1"><Badge variant={payment?.status === "success" ? "default" : payment?.status === "failed" ? "destructive" : "secondary"}>{paymentLabels[payment?.status ?? ""] ?? payment?.status ?? "Belum tercatat"}</Badge><p className="text-xs text-muted-foreground">{payment?.payment_method === "manual_transfer" ? "Transfer manual" : payment?.payment_method || "—"}</p></div></TableCell>
          <TableCell><Badge variant={order.status === "delivered" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>{statusLabels[order.status] ?? order.status}</Badge><p className="mt-1 text-xs text-muted-foreground">{isPickup ? "Ambil di toko" : "Diantar"}</p></TableCell>
          <TableCell className="font-semibold">{money(order.grand_total)}</TableCell>
          <TableCell><details className="min-w-64"><summary className="cursor-pointer text-sm font-medium">Lihat rincian</summary><div className="mt-3 space-y-3 rounded-lg border bg-background p-3 text-sm"><div><p className="font-semibold">Barang dipesan</p><ul className="mt-1 space-y-1">{(order.order_items ?? []).map((item) => <li key={item.id} className="flex justify-between gap-3"><span>{item.product_name} × {item.quantity}</span><span>{money(item.price * item.quantity)}</span></li>)}</ul></div><div><p className="font-semibold">{isPickup ? "Pickup" : "Alamat penerima"}</p>{isPickup ? <p>{String(address?.recipient_name ?? "")} · {String(address?.phone ?? "")}<br />{String(address?.pickup_location ?? "Ambil di toko")}</p> : <p>{String(address?.recipient_name ?? "")} · {String(address?.phone ?? "")}<br />{String(address?.street_address ?? "")}<br />{[address?.city, address?.province, address?.postal_code].filter(Boolean).map(String).join(", ")}</p>}</div><div className="flex justify-between border-t pt-2"><span>Subtotal</span><span>{money(order.total_amount)}</span></div><div className="flex justify-between"><span>{isPickup ? "Pickup" : "Ongkir"}</span><span>{isPickup ? "Gratis" : money(order.shipping_amount)}</span></div><div className="flex justify-between font-semibold"><span>Total</span><span>{money(order.grand_total)}</span></div>
            {payment?.status === "pending" && order.status === "pending" && <form action={updateAdminPaymentStatusAction} className="flex flex-wrap gap-2 border-t pt-3"><input type="hidden" name="order_id" value={order.id} /><Button type="submit" name="payment_status" value="success" size="sm">Transfer sudah dicek</Button><Button type="submit" name="payment_status" value="failed" variant="outline" size="sm">Tandai gagal</Button></form>}
            {payment?.status === "success" && order.status === "cancelled" && <form action={updateAdminPaymentStatusAction} className="border-t pt-3"><input type="hidden" name="order_id" value={order.id} /><Button type="submit" name="payment_status" value="refunded" variant="outline" size="sm">Tandai refund</Button></form>}
            {!!choices.length && <form action={updateAdminOrderStatusAction} className="flex gap-2 border-t pt-3"><input type="hidden" name="id" value={order.id} /><select name="status" aria-label={`Proses ${order.order_number}`} defaultValue={choices[0].value} className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs">{choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select><Button type="submit" size="sm">Perbarui</Button></form>}
          </div></details></TableCell>
        </TableRow>;
      })}
      {!orders.length && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Belum ada pesanan.</TableCell></TableRow>}
    </TableBody></Table></div>
  </section>;
}
