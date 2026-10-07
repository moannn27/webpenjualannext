import { getAdminOrdersAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrdersAction();
  return <section className="space-y-6"><div><h1 className="text-3xl font-bold">Pesanan</h1><p className="mt-1 text-muted-foreground">Daftar pesanan pelanggan.</p></div>
    <div className="rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>Nomor</TableHead><TableHead>Pelanggan</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>
      {orders.map((order) => <TableRow key={order.id}><TableCell className="font-medium">{order.order_number}</TableCell><TableCell>{order.users?.[0]?.full_name || "Pelanggan"}</TableCell><TableCell>{new Date(order.created_at).toLocaleDateString("id-ID")}</TableCell><TableCell><Badge variant={order.status === "delivered" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>{order.status}</Badge></TableCell><TableCell className="text-right">Rp {Number(order.grand_total).toLocaleString("id-ID")}</TableCell></TableRow>)}
      {!orders.length && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Belum ada pesanan.</TableCell></TableRow>}
    </TableBody></Table></div>
  </section>;
}
