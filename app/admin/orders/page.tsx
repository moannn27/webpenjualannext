import { getAdminOrdersAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateAdminOrderStatusAction, updateAdminPaymentStatusAction } from "@/actions/admin";
import { getAdminAccess } from "@/lib/auth/admin";
import Image from "next/image";

import Link from "next/link";
import { Search, MessageCircle } from "lucide-react";

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

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { role } = await getAdminAccess();
  const isSuperAdmin = role === "super_admin";
  const { status: filterStatus = "", search: filterSearch = "" } = (await searchParams) ?? {};
  const orders = await getAdminOrdersAction();

  const counts = {
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    ready_for_pickup: orders.filter((o) => o.status === "ready_for_pickup").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const tabs = [
    { value: "", label: "Semua", count: orders.length },
    { value: "pending", label: "Menunggu Bayar", count: counts.pending },
    { value: "processing", label: "Disiapkan", count: counts.processing },
    { value: "ready_for_pickup", label: "Siap Pickup", count: counts.ready_for_pickup },
    { value: "shipped", label: "Dikirim", count: counts.shipped },
    { value: "delivered", label: "Selesai", count: counts.delivered },
    { value: "cancelled", label: "Dibatalkan", count: counts.cancelled },
  ];

  const filteredOrders = orders.filter((order) => {
    if (filterStatus && order.status !== filterStatus) return false;
    if (filterSearch) {
      const term = filterSearch.toLowerCase();
      const orderNum = order.order_number?.toLowerCase() ?? "";
      const customer = (order.users?.[0]?.full_name ?? "").toLowerCase();
      const phone = (order.users?.[0]?.phone ?? "").toLowerCase();
      if (!orderNum.includes(term) && !customer.includes(term) && !phone.includes(term)) return false;
    }
    return true;
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pesanan</h1>
        <p className="mt-1 text-muted-foreground">Periksa pembayaran lalu perbarui proses kirim atau pickup sampai selesai.</p>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => {
            const isActive = filterStatus === tab.value;
            const href = tab.value
              ? `/admin/orders?status=${tab.value}${filterSearch ? `&search=${encodeURIComponent(filterSearch)}` : ""}`
              : `/admin/orders${filterSearch ? `?search=${encodeURIComponent(filterSearch)}` : ""}`;
            return (
              <Link
                key={tab.value}
                href={href}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-foreground/80 border border-border/50"
                  }`}
                >
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </div>

        <form method="GET" action="/admin/orders" className="flex items-center gap-2">
          {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="search"
              name="search"
              defaultValue={filterSearch}
              placeholder="Cari order / nama / HP..."
              className="h-9 w-48 rounded-lg border bg-background pl-8 pr-3 text-xs focus:w-64 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          {(filterStatus || filterSearch) && (
            <Link href="/admin/orders" className="text-xs text-muted-foreground hover:text-foreground underline">
              Reset
            </Link>
          )}
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[1050px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nomor / pelanggan</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Pembayaran</TableHead>
              <TableHead>Status proses</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Rincian &amp; tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => {
        const payment = order.payments?.[0];
        const isPickup = order.courier === "pickup";
        const choices = (statusChoices[order.status] ?? []).filter((option) => isPickup ? option.value !== "shipped" : option.value !== "ready_for_pickup");
        const address = order.shipping_address as Record<string, unknown> | null;
        return (
          <TableRow key={order.id}>
            <TableCell>
            <p className="font-medium">{order.order_number}</p>
            <p className="mt-1 text-xs text-muted-foreground">{order.users?.[0]?.full_name || "Pelanggan"}</p>
            <p className="text-xs text-muted-foreground">{order.users?.[0]?.phone || ""}</p>
            {order.users?.[0]?.phone && (
              <a
                href={`https://wa.me/${order.users[0].phone.replace(/\D/g, '').replace(/^0/, '62')}?text=Halo%20${encodeURIComponent(order.users[0].full_name || 'Pelanggan')}%2C%20kami%20dari%20Next%20Solution%20mengenai%20pesanan%20${order.order_number}.`}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle className="size-3" /> Chat WA
              </a>
            )}
          </TableCell>
          <TableCell><time dateTime={order.created_at}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(order.created_at))}</time></TableCell>
          <TableCell><div className="space-y-1"><Badge variant={payment?.status === "success" ? "default" : payment?.status === "failed" ? "destructive" : "secondary"}>{paymentLabels[payment?.status ?? ""] ?? payment?.status ?? "Belum tercatat"}</Badge><p className="text-xs text-muted-foreground">{payment?.payment_method === "manual_transfer" ? "Transfer manual" : payment?.payment_method || "—"}</p></div></TableCell>
          <TableCell><Badge variant={order.status === "delivered" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>{statusLabels[order.status] ?? order.status}</Badge><p className="mt-1 text-xs text-muted-foreground">{isPickup ? "Ambil di toko" : "Diantar"}</p></TableCell>
          <TableCell className="font-semibold">{money(order.grand_total)}</TableCell>
          <TableCell><details className="min-w-64"><summary className="cursor-pointer text-sm font-medium">Lihat rincian</summary><div className="mt-3 space-y-3 rounded-lg border bg-background p-3 text-sm"><div><p className="font-semibold">Barang dipesan</p><ul className="mt-2 space-y-3">{(order.order_items ?? []).map((item) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const images = Array.isArray(product?.product_images) ? product?.product_images : [];
            const image = images.find((img: any) => img.is_primary)?.url || images[0]?.url;
            return <li key={item.id} className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {image ? <img src={image} alt="" className="size-10 shrink-0 rounded-md object-cover border" /> : <div className="size-10 shrink-0 rounded-md border bg-muted" />}
                <span className="line-clamp-2">{item.product_name} × {item.quantity}</span>
              </div>
              <span className="shrink-0">{money(item.price * item.quantity)}</span>
            </li>
          })}</ul></div><div><p className="font-semibold">{isPickup ? "Pickup" : "Alamat penerima"}</p>{isPickup ? <p>{String(address?.recipient_name ?? "")} · {String(address?.phone ?? "")}<br />{String(address?.pickup_location ?? "Ambil di toko")}</p> : <p>{String(address?.recipient_name ?? "")} · {String(address?.phone ?? "")}<br />{String(address?.street_address ?? "")}<br />{[address?.city, address?.province, address?.postal_code].filter(Boolean).map(String).join(", ")}</p>}</div><div className="flex justify-between border-t pt-2"><span>Subtotal</span><span>{money(order.total_amount)}</span></div><div className="flex justify-between"><span>{isPickup ? "Pickup" : "Ongkir"}</span><span>{isPickup ? "Gratis" : money(order.shipping_amount)}</span></div><div className="flex justify-between font-semibold"><span>Total</span><span>{money(order.grand_total)}</span></div>
            {payment?.status === "pending" && order.status === "pending" && <form action={updateAdminPaymentStatusAction} className="flex flex-wrap gap-2 border-t pt-3"><input type="hidden" name="order_id" value={order.id} /><Button type="submit" name="payment_status" value="success" size="sm">Transfer sudah dicek</Button><Button type="submit" name="payment_status" value="failed" variant="outline" size="sm">Tandai gagal</Button></form>}
            {payment?.status === "success" && order.status === "cancelled" && <form action={updateAdminPaymentStatusAction} className="border-t pt-3"><input type="hidden" name="order_id" value={order.id} /><Button type="submit" name="payment_status" value="refunded" variant="outline" size="sm">Tandai refund</Button></form>}
            {!!choices.length && <form action={updateAdminOrderStatusAction} className="flex gap-2 border-t pt-3"><input type="hidden" name="id" value={order.id} /><select name="status" aria-label={`Proses ${order.order_number}`} defaultValue={choices[0].value} className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs">{choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select><Button type="submit" size="sm">Perbarui</Button></form>}
            {isSuperAdmin && (
              <form action={updateAdminOrderStatusAction} className="mt-2 flex flex-col gap-2 border-t border-dashed pt-3">
                <p className="text-xs font-semibold text-primary">👑 Khusus Super Admin: Edit Status</p>
                <div className="flex items-center gap-2">
                  <input type="hidden" name="id" value={order.id} />
                  <input type="hidden" name="manual_override" value="on" />
                  <select name="status" defaultValue={order.status} className="h-8 min-w-0 flex-1 rounded-lg border-primary/20 bg-primary/5 px-2 text-xs text-primary font-medium focus:outline-none focus:ring-1 focus:ring-primary">
                    {Object.entries(statusLabels).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                  <Button type="submit" variant="default" size="sm" className="h-8 shadow-none bg-primary/90 hover:bg-primary">Edit</Button>
                </div>
              </form>
            )}
          </div></details></TableCell>
        </TableRow>
      );
      })}
      {!filteredOrders.length && (
        <TableRow>
          <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
            {orders.length ? "Tidak ada pesanan yang cocok dengan filter atau pencarian." : "Belum ada pesanan."}
          </TableCell>
        </TableRow>
      )}
    </TableBody></Table></div>
  </section>
  );
}
