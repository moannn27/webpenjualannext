import { getAdminOrdersAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { updateAdminOrderStatusAction, updateAdminPaymentStatusAction } from "@/actions/admin";

const orderStatusOptions: Record<string, { value: string; label: string }[]> = {
  pending: [{ value: "pending", label: "Menunggu" }, { value: "processing", label: "Diproses" }, { value: "cancelled", label: "Dibatalkan" }],
  processing: [{ value: "processing", label: "Diproses" }, { value: "shipped", label: "Dikirim" }, { value: "cancelled", label: "Dibatalkan" }],
  shipped: [{ value: "shipped", label: "Dikirim" }, { value: "delivered", label: "Selesai" }],
  delivered: [{ value: "delivered", label: "Selesai" }],
  cancelled: [{ value: "cancelled", label: "Dibatalkan" }],
};

export default async function AdminOrdersPage() {
  const orders = await getAdminOrdersAction();
  return <section className="space-y-6"><div><h1 className="text-3xl font-bold">Pesanan</h1><p className="mt-1 text-muted-foreground">Daftar pesanan pelanggan.</p></div>
    <p className="text-sm text-muted-foreground">Pastikan transfer sudah masuk sebelum menandai pembayaran sukses. Tandai refund hanya setelah uang benar-benar dikembalikan. Pesanan tidak bisa diproses sebelum pembayaran dikonfirmasi.</p>
    <div className="overflow-x-auto rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>Nomor</TableHead><TableHead>Pelanggan</TableHead><TableHead>Tanggal &amp; jam</TableHead><TableHead>Pembayaran</TableHead><TableHead>Status pesanan</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader><TableBody>
      {orders.map((order) => { const payment = order.payments?.[0]; const paymentConfirmed = order.payments?.some((item) => item.status === "success") ?? false; const statuses = orderStatusOptions[order.status] ?? [{ value: order.status, label: order.status }]; const safeStatuses = paymentConfirmed ? statuses : statuses.filter((option) => [order.status, "cancelled"].includes(option.value)); return <TableRow key={order.id}><TableCell className="font-medium">{order.order_number}</TableCell><TableCell>{order.users?.[0]?.full_name || "Pelanggan"}</TableCell><TableCell><time dateTime={order.created_at}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(order.created_at))} WIB</time></TableCell><TableCell><div className="space-y-1"><Badge variant={payment?.status === "success" ? "default" : payment?.status === "failed" ? "destructive" : "secondary"}>{payment?.status ?? "belum tercatat"}</Badge><p className="text-xs text-muted-foreground">{payment?.payment_method || "-"}</p></div></TableCell><TableCell><Badge variant={order.status === "delivered" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>{order.status}</Badge></TableCell><TableCell className="text-right">Rp {Number(order.grand_total).toLocaleString("id-ID")}</TableCell><TableCell><div className="space-y-2">{payment?.status === "pending" && ["pending", "processing"].includes(order.status) && <form action={updateAdminPaymentStatusAction} className="flex items-center gap-2"><input type="hidden" name="order_id" value={order.id} /><Button type="submit" name="payment_status" value="success" size="sm">Konfirmasi bayar</Button><Button type="submit" name="payment_status" value="failed" variant="outline" size="sm">Tandai gagal</Button></form>}{payment?.status === "success" && order.status === "cancelled" && <form action={updateAdminPaymentStatusAction}><input type="hidden" name="order_id" value={order.id} /><Button type="submit" name="payment_status" value="refunded" variant="outline" size="sm">Tandai refund</Button></form>}<form action={updateAdminOrderStatusAction} className="flex items-center gap-2"><input type="hidden" name="id" value={order.id} /><select name="status" defaultValue={order.status} aria-label={`Status ${order.order_number}`} className="h-9 rounded-lg border border-input bg-background px-2 text-sm">{safeStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><Button type="submit" size="sm" disabled={safeStatuses.length < 2 || order.status === "delivered" || order.status === "cancelled"}>Simpan</Button></form></div></TableCell></TableRow>; })}
      {!orders.length && <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Belum ada pesanan.</TableCell></TableRow>}
    </TableBody></Table></div>
  </section>;
}
