import { getAdminOrdersAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateAdminOrderStatusAction, updateAdminPaymentStatusAction } from "@/actions/admin";
import { getAdminAccess } from "@/lib/auth/admin";
import { requireModulePermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, MessageCircle, FileText } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Menunggu pembayaran",
  processing: "Pembayaran dikonfirmasi · disiapkan",
  shipped: "Dikirim",
  ready_for_pickup: "Siap diambil di toko",
  delivered: "Selesai (Diterima)",
  cancelled: "Dibatalkan (Refund)",
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
  try {
    await requireModulePermission("orders");
  } catch {
    redirect("/admin?error=forbidden");
  }

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
    { value: "delivered", label: "Selesai (Diterima)", count: counts.delivered },
    { value: "cancelled", label: "Dibatalkan (Refund)", count: counts.cancelled },
  ];

  const filteredOrders = orders.filter((order) => {
    if (filterStatus && order.status !== filterStatus) return false;
    if (filterSearch) {
      const term = filterSearch.toLowerCase();
      const orderNum = order.order_number?.toLowerCase() ?? "";
      const customer = (order.users?.[0]?.full_name ?? "").toLowerCase();
      const phone = (order.users?.[0]?.phone ?? "").toLowerCase();
      const items = (order.order_items ?? []).map((i: any) => i.product_name?.toLowerCase() ?? "").join(" ");
      if (!orderNum.includes(term) && !customer.includes(term) && !phone.includes(term) && !items.includes(term)) return false;
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

        <form method="GET" action="/admin/orders" className="flex w-full items-center gap-2 sm:w-auto">
          {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
          <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <span className="sr-only">Cari nomor pesanan, nama, telepon, atau nama produk</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <input
              aria-label="Cari nomor pesanan, nama pelanggan, atau nama produk"
              type="search"
              name="search"
              defaultValue={filterSearch}
              placeholder="Cari pesanan, pelanggan, produk..."
              className="h-10 w-full rounded-lg border bg-background pl-8 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button type="submit" variant="outline" size="icon" aria-label="Cari pesanan" className="size-10 shrink-0"><Search className="size-4" /></Button>
          {(filterStatus || filterSearch) && (
            <Link href="/admin/orders" className="text-xs text-muted-foreground hover:text-foreground underline">
              Reset
            </Link>
          )}
        </form>
      </div>

      <div className="space-y-3 lg:hidden">
        {filteredOrders.map((order) => {
          const payment = order.payments?.[0];
          const isPickup = order.courier === "pickup";
          const choices = (statusChoices[order.status] ?? []).filter((option) => isPickup ? option.value !== "shipped" : option.value !== "ready_for_pickup");
          const address = order.shipping_address as Record<string, unknown> | null;
          return <article key={order.id} className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="font-semibold">{order.order_number}</p><p className="mt-1 text-sm text-muted-foreground">{order.users?.[0]?.full_name || "Pelanggan"}</p></div>
              <Badge variant={order.status === "delivered" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>{statusLabels[order.status] ?? order.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 border-y py-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Pembayaran</p><p className="mt-1 font-medium">{paymentLabels[payment?.status ?? ""] ?? payment?.status ?? "Belum tercatat"}</p></div>
              <div><p className="text-xs text-muted-foreground">Total</p><p className="mt-1 font-semibold">{money(order.grand_total)}</p></div>
              <div><p className="text-xs text-muted-foreground">Tanggal</p><p className="mt-1">{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(order.created_at))}</p></div>
              <div><p className="text-xs text-muted-foreground">Pemenuhan</p><p className="mt-1">{isPickup ? "Ambil di toko" : "Diantar"}</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {order.users?.[0]?.phone && <a href={`https://wa.me/${order.users[0].phone.replace(/\D/g, '').replace(/^0/, '62')}?text=Halo%20${encodeURIComponent(order.users[0].full_name || 'Pelanggan')}%2C%20kami%20dari%20Next%20Solution%20mengenai%20pesanan%20${order.order_number}.`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100"><MessageCircle className="size-4" /> Chat WA</a>}
              <a href={`/orders/${order.id}/invoice`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"><FileText className="size-4" /> Lihat Invoice</a>
            </div>
            <details className="rounded-lg border px-3">
              <summary className="cursor-pointer py-3 text-sm font-medium">Lihat barang dan alamat</summary>
              <div className="space-y-3 border-t py-3 text-sm">
                <ul className="space-y-2">{(order.order_items ?? []).map((item) => <li key={item.id} className="flex justify-between gap-3"><span>{item.product_name} × {item.quantity}</span><span className="shrink-0">{money(item.price * item.quantity)}</span></li>)}</ul>
                <div className="border-t pt-2"><p className="font-medium">{isPickup ? "Lokasi pengambilan" : "Alamat penerima"}</p><p className="mt-1 text-muted-foreground">{String(address?.recipient_name ?? "")} · {String(address?.phone ?? "")}<br />{isPickup ? ([address?.pickup_location, address?.pickup_address].filter(Boolean).map(String).join(" · ") || "Ambil di toko") : [address?.street_address, address?.city, address?.province, address?.postal_code].filter(Boolean).map(String).join(", ")}</p>{isPickup && typeof address?.fulfillment_change_note === "string" && <p className="mt-2 whitespace-normal break-words rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">{address.fulfillment_change_note}</p>}</div>
                <div className="flex justify-between border-t pt-2"><span>Subtotal</span><span>{money(order.total_amount)}</span></div>
                {Number(order.discount_amount) > 0 && <div className="flex justify-between text-emerald-600 font-medium"><span>Diskon Voucher</span><span>-{money(order.discount_amount)}</span></div>}
                <div className="flex justify-between"><span>{isPickup ? "Pengambilan" : "Ongkir"}</span><span>{isPickup && Number(order.shipping_amount) === 0 ? "Gratis" : money(order.shipping_amount)}</span></div>
              </div>
            </details>
            {(payment?.status === "pending" || payment?.status === "failed" || payment?.status === "success") && order.status === "pending" && <form action={updateAdminPaymentStatusAction} className="flex flex-wrap gap-2"><input type="hidden" name="order_id" value={order.id} /><Button type="submit" name="payment_status" value="success" size="sm">{payment.status === "failed" ? "Konfirmasi pembayaran" : payment.status === "success" ? "Lanjutkan proses pesanan" : "Transfer sudah dicek"}</Button>{payment.status === "pending" && <Button type="submit" name="payment_status" value="failed" variant="outline" size="sm">Tandai gagal</Button>}</form>}
            {payment?.status === "success" && order.status === "cancelled" && <form action={updateAdminPaymentStatusAction}><input type="hidden" name="order_id" value={order.id} /><Button type="submit" name="payment_status" value="refunded" variant="outline" size="sm">Tandai refund</Button></form>}
            {!!choices.length && <form action={updateAdminOrderStatusAction} className="flex gap-2"><input type="hidden" name="id" value={order.id} /><select name="status" aria-label={`Proses ${order.order_number}`} defaultValue={choices[0].value} className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm">{choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select><Button type="submit" size="sm" className="h-10">Perbarui</Button></form>}
            {isSuperAdmin && <details className="w-full rounded-lg border border-amber-300 bg-amber-50/70 px-3 dark:border-amber-800 dark:bg-amber-950/20"><summary className="cursor-pointer py-3 text-sm font-semibold text-amber-950 dark:text-amber-100">Koreksi pesanan (Super Admin)</summary><p className="min-w-0 whitespace-normal break-words pb-3 text-sm leading-6 text-muted-foreground">Pilih status Siap diambil di toko untuk otomatis mengubah metode penerimaan. Ongkir yang sudah dibayar tidak otomatis dikembalikan. Pesanan batal hanya bisa dibuka jika stok mencukupi.</p><form action={updateAdminOrderStatusAction} className="grid min-w-0 grid-cols-1 gap-3 border-t border-amber-200 py-3 dark:border-amber-900 [&_select]:h-9 [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_select]:text-sm"><input type="hidden" name="id" value={order.id} /><input type="hidden" name="status_correction" value="on" /><label className="grid min-w-0 gap-1 text-sm font-medium">Metode penerimaan<select name="fulfillment_correction" defaultValue="keep" className="h-10 w-full min-w-0 max-w-full rounded-lg border bg-background px-3 text-sm"><option value="keep">Pertahankan: {isPickup ? "Ambil di toko" : "Pengiriman ke alamat"}</option>{!isPickup && <option value="pickup">Koreksi jadi ambil di toko</option>}</select></label><label className="grid min-w-0 gap-1 text-sm font-medium">Status yang benar<select name="status" defaultValue={order.status} className="h-10 w-full min-w-0 max-w-full rounded-lg border bg-background px-3 text-sm">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex items-start gap-2 text-sm leading-5"><input type="checkbox" name="confirm_correction" value="on" required className="mt-1 accent-primary" /><span>Saya yakin koreksi metode penerimaan atau status ini benar.</span></label><Button type="submit" variant="outline" size="sm">Simpan koreksi</Button></form></details>}
          </article>;
        })}
        {!filteredOrders.length && <div className="rounded-xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">{orders.length ? "Tidak ada pesanan yang cocok dengan filter atau pencarian." : "Belum ada pesanan."}</div>}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
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
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {order.users?.[0]?.phone && (
                <a
                  href={`https://wa.me/${order.users[0].phone.replace(/\D/g, '').replace(/^0/, '62')}?text=Halo%20${encodeURIComponent(order.users[0].full_name || 'Pelanggan')}%2C%20kami%20dari%20Next%20Solution%20mengenai%20pesanan%20${order.order_number}.`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle className="size-3" /> Chat WA
                </a>
              )}
              <a
                href={`/orders/${order.id}/invoice`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                title="Lihat / Cetak Faktur Resmi"
              >
                <FileText className="size-3" /> Invoice
              </a>
            </div>
          </TableCell>
          <TableCell><time dateTime={order.created_at}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(order.created_at))}</time></TableCell>
          <TableCell><div className="space-y-1"><Badge variant={payment?.status === "success" ? "default" : payment?.status === "failed" ? "destructive" : "secondary"}>{paymentLabels[payment?.status ?? ""] ?? payment?.status ?? "Belum tercatat"}</Badge><p className="text-xs text-muted-foreground">{payment?.payment_method === "manual_transfer" ? "Transfer manual" : payment?.payment_method || "—"}</p></div></TableCell>
          <TableCell><Badge variant={order.status === "delivered" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>{statusLabels[order.status] ?? order.status}</Badge><p className="mt-1 text-xs text-muted-foreground">{isPickup ? "Ambil di toko" : "Diantar"}</p></TableCell>
          <TableCell className="font-semibold">{money(order.grand_total)}</TableCell>
          <TableCell className="min-w-0 whitespace-normal"><details className="w-[420px] max-w-full min-w-0 whitespace-normal"><summary className="cursor-pointer text-sm font-medium">Lihat rincian</summary><div className="mt-3 min-w-0 space-y-3 rounded-lg border bg-background p-3 text-sm"><div><p className="font-semibold">Barang dipesan</p><ul className="mt-2 space-y-3">{(order.order_items ?? []).map((item) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const images = product?.product_images as { is_primary: boolean; url: string }[] | undefined;
            const image = images?.find((img) => img.is_primary)?.url || images?.[0]?.url;
            return <li key={item.id} className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {image ? <div className="size-10 shrink-0 overflow-hidden rounded-md border"><Image src={image} alt="" width={40} height={40} className="size-full object-cover" /></div> : <div className="size-10 shrink-0 rounded-md border bg-muted" />}
                <span className="min-w-0"><span className="line-clamp-2">{item.product_name} × {item.quantity}</span>{item.variant_details && typeof item.variant_details === "object" && <span className="mt-1 block text-xs text-muted-foreground">{[item.variant_details.color, item.variant_details.ram, item.variant_details.storage].filter(Boolean).join(" · ")}</span>}</span>
              </div>
              <span className="shrink-0">{money(item.price * item.quantity)}</span>
            </li>
          })}</ul></div><div><p className="font-semibold">{isPickup ? "Pickup" : "Alamat penerima"}</p>{isPickup ? <><p>{String(address?.recipient_name ?? "")} · {String(address?.phone ?? "")}<br />{([address?.pickup_location, address?.pickup_address].filter(Boolean).map(String).join(" · ") || "Ambil di toko")}</p>{typeof address?.fulfillment_change_note === "string" && <p className="mt-2 whitespace-normal break-words rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">{address.fulfillment_change_note}</p>}</> : <p>{String(address?.recipient_name ?? "")} · {String(address?.phone ?? "")}<br />{String(address?.street_address ?? "")}<br />{[address?.city, address?.province, address?.postal_code].filter(Boolean).map(String).join(", ")}</p>}</div><div className="flex justify-between border-t pt-2"><span>Subtotal</span><span>{money(order.total_amount)}</span></div>{Number(order.discount_amount) > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium"><span>Diskon Voucher</span><span>-{money(order.discount_amount)}</span></div>}<div className="flex justify-between"><span>{isPickup ? "Pengambilan" : "Ongkir"}</span><span>{isPickup && Number(order.shipping_amount) === 0 ? "Gratis" : money(order.shipping_amount)}</span></div><div className="flex justify-between font-semibold"><span>Total</span><span>{money(order.grand_total)}</span></div>
            {(payment?.status === "pending" || payment?.status === "failed" || payment?.status === "success") && order.status === "pending" && <form action={updateAdminPaymentStatusAction} className="flex flex-wrap gap-2 border-t pt-3"><input type="hidden" name="order_id" value={order.id} /><Button type="submit" name="payment_status" value="success" size="sm">{payment.status === "failed" ? "Konfirmasi pembayaran" : payment.status === "success" ? "Lanjutkan proses pesanan" : "Transfer sudah dicek"}</Button>{payment.status === "pending" && <Button type="submit" name="payment_status" value="failed" variant="outline" size="sm">Tandai gagal</Button>}</form>}
            {payment?.status === "success" && order.status === "cancelled" && <form action={updateAdminPaymentStatusAction} className="border-t pt-3"><input type="hidden" name="order_id" value={order.id} /><Button type="submit" name="payment_status" value="refunded" variant="outline" size="sm">Tandai refund</Button></form>}
            {!!choices.length && <form action={updateAdminOrderStatusAction} className="flex gap-2 border-t pt-3"><input type="hidden" name="id" value={order.id} /><select name="status" aria-label={`Proses ${order.order_number}`} defaultValue={choices[0].value} className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs">{choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select><Button type="submit" size="sm">Perbarui</Button></form>}
            {isSuperAdmin && <details className="mt-3 w-full max-w-[420px] min-w-0 rounded-lg border border-amber-300 bg-amber-50/70 px-3 dark:border-amber-800 dark:bg-amber-950/20"><summary className="cursor-pointer py-3 text-sm font-semibold text-amber-950 dark:text-amber-100">Koreksi pesanan (Super Admin)</summary><p className="min-w-0 whitespace-normal break-words pb-3 text-sm leading-6 text-muted-foreground">Pilih status Siap diambil di toko untuk otomatis mengubah metode penerimaan. Ongkir yang sudah dibayar tidak otomatis dikembalikan. Pesanan batal hanya bisa dibuka jika stok mencukupi.</p><form action={updateAdminOrderStatusAction} className="grid min-w-0 grid-cols-1 gap-3 border-t border-amber-200 py-3 dark:border-amber-900 [&_select]:h-9 [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_select]:text-sm"><input type="hidden" name="id" value={order.id} /><input type="hidden" name="status_correction" value="on" /><label className="grid min-w-0 gap-1 text-sm font-medium">Metode penerimaan<select name="fulfillment_correction" defaultValue="keep" className="h-10 w-full min-w-0 max-w-full rounded-lg border bg-background px-3 text-sm"><option value="keep">Pertahankan: {isPickup ? "Ambil di toko" : "Pengiriman ke alamat"}</option>{!isPickup && <option value="pickup">Koreksi jadi ambil di toko</option>}</select></label><label className="grid min-w-0 gap-1 text-sm font-medium">Status yang benar<select name="status" defaultValue={order.status} className="h-10 w-full min-w-0 max-w-full rounded-lg border bg-background px-3 text-sm">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex items-start gap-2 text-sm leading-5"><input type="checkbox" name="confirm_correction" value="on" required className="mt-1 accent-primary" /><span>Saya yakin koreksi metode penerimaan atau status ini benar.</span></label><Button type="submit" variant="outline" size="sm">Simpan koreksi</Button></form></details>}

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
