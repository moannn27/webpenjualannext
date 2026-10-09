import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, CreditCard, Activity, Package, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardStatsAction } from "@/actions/admin";
import { SalesChart } from "@/features/admin/SalesChart";
import { CleanupStorageButton } from "@/features/admin/CleanupStorageButton";

export default async function AdminOverview() {
  const stats = await getDashboardStatsAction();
  const cards = [
    { title: "Pendapatan selesai", value: stats.salesAnalyticsAvailable ? `Rp ${stats.revenue.toLocaleString("id-ID")}` : "—", detail: stats.salesAnalyticsAvailable ? undefined : "Perlu migrasi analitik", icon: DollarSign },
    { title: "Total pesanan", value: stats.totalOrders.toLocaleString("id-ID"), icon: CreditCard },
    { title: "Katalog produk", value: stats.totalProducts.toLocaleString("id-ID"), detail: `${stats.publishedProducts.toLocaleString("id-ID")} tayang`, icon: Activity },
    { title: "Kategori", value: stats.totalCategories.toLocaleString("id-ID"), icon: Tags },
    { title: "Pelanggan", value: stats.totalUsers.toLocaleString("id-ID"), icon: Users },
  ];
  return <div className="space-y-8">
    <div className="flex items-start justify-between">
      <div><h1 className="text-3xl font-bold tracking-tight">Dashboard</h1><p className="mt-1 text-muted-foreground">Ringkasan toko dari data terbaru.</p></div>
      <CleanupStorageButton />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ title, value, detail, icon: Icon }) => <Card key={title}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{value}</div>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Grafik penjualan</CardTitle></CardHeader><CardContent>{stats.salesAnalyticsAvailable ? <SalesChart points={stats.salesChart} /> : <div className="py-8 text-center text-sm text-muted-foreground">Analitik belum aktif. Terapkan migrasi database grafik untuk membaca penjualan secara akurat.</div>}</CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-7">
      <Card className="lg:col-span-5"><CardHeader><CardTitle>Pesanan terbaru</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><Table className="min-w-[540px]"><TableHeader><TableRow><TableHead>Nomor</TableHead><TableHead>Pelanggan</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>
        {stats.recentOrders.map((order) => <TableRow key={order.id}><TableCell className="font-medium">{order.order_number}</TableCell><TableCell>{order.users?.[0]?.full_name || "Pelanggan"}</TableCell><TableCell><Badge variant={order.status === "delivered" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>{order.status}</Badge></TableCell><TableCell className="text-right">Rp {Number(order.grand_total).toLocaleString("id-ID")}</TableCell></TableRow>)}
        {!stats.recentOrders.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Belum ada pesanan.</TableCell></TableRow>}
      </TableBody></Table></div></CardContent></Card>
      <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><Package className="size-4" />Stok menipis</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.lowStockProducts}</p><p className="mt-1 text-sm text-muted-foreground">produk memiliki stok 5 atau kurang.</p></CardContent></Card>
    </div>
  </div>;
}
