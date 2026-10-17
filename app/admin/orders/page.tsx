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
import { OrderSortSelect } from "@/features/admin/OrderSortSelect";
import { OrderActionModal } from "@/features/admin/OrderActionModal";
import { 
  Search, 
  MessageCircle, 
  FileText, 
  Plus, 
  SlidersHorizontal, 
  ArrowUpDown, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Store, 
  AlertCircle,
  Eye,
  ExternalLink,
  ChevronDown
} from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Menunggu pembayaran",
  processing: "Pembayaran dikonfirmasi · disiapkan",
  shipped: "Dikirim",
  ready_for_pickup: "Siap diambil di toko",
  delivered: "Selesai (Diterima)",
  cancelled: "Dibatalkan (Refund)",
};

const paymentLabels: Record<string, string> = { 
  pending: "Menunggu", 
  success: "Terkonfirmasi", 
  failed: "Gagal", 
  refunded: "Refund" 
};

const statusChoices: Record<string, { value: string; label: string }[]> = {
  pending: [{ value: "cancelled", label: "Batalkan pesanan" }],
  processing: [
    { value: "shipped", label: "Tandai dikirim" },
    { value: "ready_for_pickup", label: "Siap diambil di toko" },
    { value: "cancelled", label: "Batalkan pesanan" }
  ],
  shipped: [{ value: "delivered", label: "Tandai selesai" }],
  ready_for_pickup: [{ value: "delivered", label: "Tandai selesai" }],
  delivered: [],
  cancelled: [],
};

const money = (value: number) => `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; sort?: string }>;
}) {
  try {
    await requireModulePermission("orders");
  } catch {
    redirect("/admin?error=forbidden");
  }

  const { role } = await getAdminAccess();
  const isSuperAdmin = role === "super_admin";
  const { status: filterStatus = "", search: filterSearch = "", sort: sortOption = "date_desc" } = (await searchParams) ?? {};
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
      const items = (order.order_items ?? [])
        .map((i: { product_name?: string | null }) => i.product_name?.toLowerCase() ?? "")
        .join(" ");
      if (!orderNum.includes(term) && !customer.includes(term) && !phone.includes(term) && !items.includes(term)) {
        return false;
      }
    }
    return true;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortOption === "date_asc") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortOption === "amount_desc") {
      return Number(b.grand_total) - Number(a.grand_total);
    }
    if (sortOption === "amount_asc") {
      return Number(a.grand_total) - Number(b.grand_total);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Manajemen Pesanan
            </h1>
            <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              {orders.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Kelola pesanan masuk, pantau status pembayaran, dan perbarui proses pengiriman atau pickup.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#1E2028] px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 transition cursor-pointer"
          >
            <FileText className="size-4 text-slate-500" />
            <span>Laporan & Ekspor</span>
          </Link>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>+ Tambah Produk</span>
          </Link>
        </div>
      </div>

      {/* 2. 4 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Pesanan Baru */}
        <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-[#EFF6FF] dark:bg-blue-950/25 p-5 shadow-2xs relative overflow-hidden transition-all hover:shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
            <span>Pesanan Baru</span>
            <div className="size-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-300">
              <Clock className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-blue-800 dark:text-blue-200 tracking-tight">
              {counts.pending}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-white/70 dark:bg-white/10 rounded-full px-2 py-0.5 shadow-2xs">
              <TrendingUp className="size-3" /> Baru Masuk
            </span>
          </div>
          <p className="mt-2 text-[11px] text-blue-600/80 dark:text-blue-400/80">
            Menunggu verifikasi pembayaran
          </p>
        </div>

        {/* Card 2: Perlu Disiapkan */}
        <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-[#FFFBEB] dark:bg-amber-950/25 p-5 shadow-2xs relative overflow-hidden transition-all hover:shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
            <span>Perlu Disiapkan</span>
            <div className="size-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-300">
              <AlertCircle className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-800 dark:text-amber-200 tracking-tight">
              {counts.processing}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-white/70 dark:bg-white/10 rounded-full px-2 py-0.5 shadow-2xs">
              Diproses
            </span>
          </div>
          <p className="mt-2 text-[11px] text-amber-600/80 dark:text-amber-400/80">
            Pembayaran beres, pesanan dikemas
          </p>
        </div>

        {/* Card 3: Sedang Berjalan (Dikirim / Siap) */}
        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-[#ECFDF5] dark:bg-emerald-950/25 p-5 shadow-2xs relative overflow-hidden transition-all hover:shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
            <span>Sedang Berjalan (Dikirim / Siap)</span>
            <div className="size-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
              <Truck className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-800 dark:text-emerald-200 tracking-tight">
              {counts.shipped + counts.ready_for_pickup}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-white/70 dark:bg-white/10 rounded-full px-2 py-0.5 shadow-2xs">
              <TrendingUp className="size-3" /> Berjalan
            </span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
            {counts.shipped} dalam kurir · {counts.ready_for_pickup} di toko
          </p>
        </div>

        {/* Card 4: Pesanan Selesai */}
        <div className="rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-[#F5F3FF] dark:bg-purple-950/25 p-5 shadow-2xs relative overflow-hidden transition-all hover:shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
            <span>Pesanan Selesai</span>
            <div className="size-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300">
              <CheckCircle2 className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-purple-800 dark:text-purple-200 tracking-tight">
              {counts.delivered}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-white/70 dark:bg-white/10 rounded-full px-2 py-0.5 shadow-2xs">
              <TrendingUp className="size-3" /> Sukses
            </span>
          </div>
          <p className="mt-2 text-[11px] text-purple-600/80 dark:text-purple-400/80">
            Pesanan diterima dan transaksi tuntas
          </p>
        </div>
      </div>

      {/* 3. Outer White Card Container for Table & Filters (Matching Screenshot) */}
      <div className="rounded-[28px] sm:rounded-[34px] bg-white dark:bg-[#1E2028] border border-slate-200/80 dark:border-white/10 p-5 sm:p-7 shadow-sm space-y-6">
        {/* Controls Row: Search Input + Status Filter Pills + Date Sort */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
          {/* Search Box */}
          <form method="GET" action="/admin/orders" className="relative flex-1 max-w-md">
            {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
            {sortOption && <input type="hidden" name="sort" value={sortOption} />}
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="search"
              name="search"
              defaultValue={filterSearch}
              placeholder="Cari pesanan... (nomor pesanan, pelanggan, produk)"
              className="h-10 w-full rounded-xl border border-slate-200/80 dark:border-white/10 bg-[#F8F9FA] dark:bg-white/5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </form>

          {/* Filter Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {tabs.map((tab) => {
              const isActive = filterStatus === tab.value;
              const href = tab.value
                ? `/admin/orders?status=${tab.value}${filterSearch ? `&search=${encodeURIComponent(filterSearch)}` : ""}${sortOption ? `&sort=${sortOption}` : ""}`
                : `/admin/orders${filterSearch ? `?search=${encodeURIComponent(filterSearch)}` : ""}${sortOption ? `&sort=${sortOption}` : ""}`;
              return (
                <Link
                  key={tab.value}
                  href={href}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "bg-[#F8F9FA] dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-[#F2F4F7] border border-slate-200/60 dark:border-white/5"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-white dark:bg-black/30 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">Urutkan:</span>
            <OrderSortSelect
              defaultValue={sortOption}
              filterStatus={filterStatus}
              filterSearch={filterSearch}
            />
            {(filterStatus || filterSearch || sortOption !== "date_desc") && (
              <Link
                href="/admin/orders"
                className="text-xs font-semibold text-blue-600 hover:underline px-2"
              >
                Reset
              </Link>
            )}
          </div>
        </div>

        {/* 4. Table (Desktop & Tablet) */}
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="border-b border-slate-100 dark:border-white/5 hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 py-3.5">
                  No. Pesanan
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 py-3.5">
                  Pelanggan
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 py-3.5">
                  Produk
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 py-3.5">
                  Total Belanja
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 py-3.5">
                  Tanggal
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 py-3.5">
                  Pembayaran
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 py-3.5 text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400 py-3.5 text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order) => {
                const payment = order.payments?.[0];
                const isPickup = order.courier === "pickup";
                const choices = (statusChoices[order.status] ?? []).filter((option) =>
                  isPickup ? option.value !== "shipped" : option.value !== "ready_for_pickup"
                );
                const address = order.shipping_address as Record<string, unknown> | null;
                const customerName = order.users?.[0]?.full_name || "Pelanggan";
                const customerPhone = order.users?.[0]?.phone || "";
                const firstItem = order.order_items?.[0];
                const itemCount = (order.order_items ?? []).reduce((acc, i) => acc + (i.quantity || 1), 0);

                // Exact status badge styling from screenshot
                const statusPillClass =
                  order.status === "delivered"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60"
                    : order.status === "shipped" || order.status === "ready_for_pickup"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60"
                    : order.status === "processing"
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60"
                    : order.status === "cancelled"
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60";

                const statusLabelText =
                  order.status === "delivered"
                    ? "Selesai"
                    : order.status === "shipped"
                    ? "Dikirim"
                    : order.status === "ready_for_pickup"
                    ? "Siap Diambil"
                    : order.status === "processing"
                    ? "Disiapkan"
                    : order.status === "cancelled"
                    ? "Dibatalkan"
                    : "Menunggu Bayar";

                return (
                  <TableRow
                    key={order.id}
                    className="border-b border-slate-100/80 dark:border-white/5 hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors group"
                  >
                    {/* 1. No. Pesanan */}
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {order.order_number}
                        </span>
                        {isPickup ? (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                            <Store className="size-2.5" /> Toko
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            <Truck className="size-2.5" /> Kirim
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 2. Pelanggan */}
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                          {customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {customerName}
                          </p>
                          {customerPhone && (
                            <a
                              href={`https://wa.me/${customerPhone.replace(/\D/g, "").replace(/^0/, "62")}?text=Halo%20${encodeURIComponent(customerName)}%2C%20kami%20dari%20Next%20Solution%20mengenai%20pesanan%20${order.order_number}.`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline mt-0.5"
                            >
                              <MessageCircle className="size-3" />
                              <span>{customerPhone}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* 3. Produk */}
                    <TableCell className="py-4 max-w-[220px]">
                      <div className="truncate">
                        <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                          {firstItem?.product_name || "Produk"}
                        </span>
                        {itemCount > 1 && (
                          <span className="ml-1.5 inline-block text-[11px] font-bold text-slate-400">
                            +{itemCount - 1} item
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* 4. Total Belanja */}
                    <TableCell className="py-4">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white tabular-nums">
                        {money(order.grand_total)}
                      </span>
                    </TableCell>

                    {/* 5. Tanggal */}
                    <TableCell className="py-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        timeZone: "Asia/Jakarta",
                      }).format(new Date(order.created_at))}
                    </TableCell>

                    {/* 6. Pembayaran */}
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {payment?.payment_method === "manual_transfer"
                            ? "Transfer Bank"
                            : payment?.payment_method === "cod"
                            ? "COD"
                            : payment?.payment_method || "Transfer Bank"}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            payment?.status === "success"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : payment?.status === "failed"
                              ? "text-rose-600"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {paymentLabels[payment?.status ?? ""] ?? "Menunggu"}
                        </span>
                      </div>
                    </TableCell>

                    {/* 7. Status */}
                    <TableCell className="py-4 text-center">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-bold shadow-2xs ${statusPillClass}`}
                      >
                        {statusLabelText}
                      </span>
                    </TableCell>

                    {/* 8. Aksi (Faktur & Modal Tindakan Lengkap) */}
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/orders/${order.id}/invoice`}
                          target="_blank"
                          rel="noreferrer"
                          title="Lihat Faktur / Invoice"
                          className="size-8 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#23252C] hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 transition shadow-2xs"
                        >
                          <FileText className="size-3.5" />
                        </a>

                        <OrderActionModal order={order} isSuperAdmin={isSuperAdmin} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!sortedOrders.length && (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-sm text-slate-400">
                    {orders.length
                      ? "Tidak ada pesanan yang cocok dengan pencarian atau filter yang dipilih."
                      : "Belum ada pesanan terdata di toko."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 5. Pagination Footer (Matching Reference Screenshot: 1-7 sur 141 & < 1 2 3 ... 20 >) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500">
          <div>
            <span>Menampilkan 1 - {sortedOrders.length} dari {orders.length} pesanan</span>
          </div>

          <div className="flex items-center gap-1.5 self-center">
            <button
              type="button"
              disabled
              className="size-8 rounded-lg border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-400 disabled:opacity-40 cursor-not-allowed"
            >
              &lt;
            </button>
            <button
              type="button"
              className="size-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shadow-2xs"
            >
              1
            </button>
            <button
              type="button"
              className="size-8 rounded-lg border border-slate-200/60 dark:border-white/5 hover:bg-slate-50 flex items-center justify-center text-slate-600 dark:text-slate-300"
            >
              2
            </button>
            <button
              type="button"
              className="size-8 rounded-lg border border-slate-200/60 dark:border-white/5 hover:bg-slate-50 flex items-center justify-center text-slate-600 dark:text-slate-300"
            >
              3
            </button>
            <span className="px-1 text-slate-400">...</span>
            <button
              type="button"
              className="size-8 rounded-lg border border-slate-200/60 dark:border-white/5 hover:bg-slate-50 flex items-center justify-center text-slate-600 dark:text-slate-300"
            >
              {Math.max(1, Math.ceil(orders.length / 10))}
            </button>
            <button
              type="button"
              className="size-8 rounded-lg border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
