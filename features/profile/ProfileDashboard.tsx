"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, LogOut, Package, Settings, Shield } from "lucide-react";
import { logout } from "@/actions/auth";
import { updateProfileAction } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tab = "orders" | "wishlist" | "settings";
type Profile = { full_name?: string | null; phone?: string | null; email?: string | null; home_address?: string | null; role?: string | null } | null;
type OrderedProduct = {
  product_images?: { url: string; is_primary: boolean }[];
  product_specifications?: { key: string; value: string; display_order?: number | null }[];
} | null;
type Order = {
  id: string; order_number?: string | null; created_at: string; status: string; total_amount?: number | null;
  shipping_amount?: number | null; grand_total?: number | null; courier?: string | null;
  shipping_address?: Record<string, unknown> | null;
  order_items?: { id: string; product_name: string; price: number; quantity: number; variant_details?: { sku?: string; color?: string; ram?: string; storage?: string } | null; products?: OrderedProduct | OrderedProduct[] }[];
  payments?: { id: string; amount: number; payment_method: string | null; status: string }[];
};
type WishlistEntry = { id: string; product_id: string; products?: {
  id: string; name: string; price: number; discount_price?: number | null;
  image?: string | null;
  product_images?: { url: string; is_primary?: boolean }[];
  product_specifications?: { key: string; value: string; display_order?: number | null }[];
} | null };

const orderStatusLabels: Record<string, string> = {
  pending: "Menunggu pembayaran",
  processing: "Pembayaran dikonfirmasi · sedang disiapkan",
  shipped: "Dalam pengiriman",
  ready_for_pickup: "Siap diambil di toko",
  delivered: "Selesai",
  cancelled: "Dibatalkan",
};
const paymentStatusLabels: Record<string, string> = { pending: "Menunggu konfirmasi", success: "Terkonfirmasi", failed: "Gagal", refunded: "Dikembalikan", expired: "Kedaluwarsa" };

function OrderProgress({ order }: { order: Order }) {
  if (order.status === "cancelled") return <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">Pesanan dibatalkan.</p>;
  const steps = order.courier === "pickup"
    ? [["pending", "Menunggu pembayaran"], ["processing", "Dikonfirmasi · disiapkan"], ["ready_for_pickup", "Siap diambil"], ["delivered", "Selesai"]]
    : [["pending", "Menunggu pembayaran"], ["processing", "Dikonfirmasi · disiapkan"], ["shipped", "Dikirim"], ["delivered", "Selesai"]];
  const current = steps.findIndex(([status]) => status === order.status);
  return <ol aria-label={`Progres pesanan: ${orderStatusLabels[order.status] ?? order.status}`} className="mt-4 grid gap-2 sm:grid-cols-2">{steps.map(([status, label], index) => <li key={status} className={`rounded-lg border px-3 py-2 text-xs ${current >= index ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}><span className={`mr-2 inline-grid size-5 place-items-center rounded-full ${current >= index ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{index + 1}</span>{label}</li>)}</ol>;
}

export function ProfileDashboard({ profile, orders, wishlist }: {
  profile: Profile;
  orders: Order[];
  wishlist: WishlistEntry[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const name = profile?.full_name || "Pelanggan";
  const roleLabel = profile?.role === "super_admin" ? "Super admin" : profile?.role === "admin" ? "Admin" : "Akun pelanggan";
  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaved(false); setNotice(""); setError("");
    startTransition(async () => {
      try {
        const result = await updateProfileAction(data);
        setSaved(true);
        setNotice(result.emailChangePending
          ? "Data profil tersimpan. Cek email lama dan email baru untuk konfirmasi perubahan alamat email."
          : result.emailUpdateError
            ? `Data profil tersimpan, tetapi permintaan ubah email gagal: ${result.emailUpdateError}`
            : "Perubahan profil berhasil disimpan.");
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Perubahan gagal disimpan. Coba lagi."); }
    });
  };

  return <div className="container mx-auto px-4 pb-24 pt-8 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="w-full shrink-0 md:w-64">
        <div className="mb-6 rounded-3xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">{name.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0"><h2 className="truncate text-lg font-semibold">{name}</h2><p className="truncate text-sm text-muted-foreground">{roleLabel}</p></div>
          </div>
          <nav className="flex flex-col gap-2">
            {([['orders', Package, 'Pesanan'], ['wishlist', Heart, 'Wishlist'], ['settings', Settings, 'Pengaturan']] as const).map(([tab, Icon, label]) =>
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left ${activeTab === tab ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted'}`}><Icon className="size-5" />{label}</button>
            )}
            {(profile?.role === "admin" || profile?.role === "super_admin") && <Link href="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-primary hover:bg-primary/10"><Shield className="size-5" />Panel admin</Link>}
            <form action={logout}><button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-destructive hover:bg-destructive/10"><LogOut className="size-5" />Keluar</button></form>
          </nav>
        </div>
      </aside>

      <section className="min-h-[420px] flex-1 rounded-3xl border border-border bg-card p-6 sm:p-8">
        {activeTab === "orders" && <>
          <h1 className="mb-6 text-2xl font-bold">Riwayat pesanan</h1>
          {!orders.length ? <p className="py-12 text-center text-muted-foreground">Kamu belum memiliki pesanan.</p> : <div className="space-y-4">
            {orders.map((order) => <article key={order.id} className="rounded-2xl border border-border p-5">
              <div><p className="font-semibold">{order.order_number ?? `Pesanan ${order.id.slice(0, 8)}`}</p><p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString("id-ID")} · {order.status}</p></div>
              <div className="mt-3 font-semibold">Rp {Number(order.grand_total ?? 0).toLocaleString("id-ID")}</div>
              <OrderProgress order={order} />
              <details className="mt-4 border-t border-border pt-3"><summary className="cursor-pointer text-sm font-medium">Lihat barang, pembayaran, dan detail pesanan</summary><div className="mt-4 space-y-4 text-sm"><div><h3 className="font-semibold">Barang dipesan</h3><ul className="mt-2 space-y-3">{(order.order_items ?? []).map((item) => {
                const product = Array.isArray(item.products) ? item.products[0] : item.products;
                const images = [...(product?.product_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
                const specifications = [...(product?.product_specifications ?? [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
                const variantLabel = [item.variant_details?.color, item.variant_details?.ram, item.variant_details?.storage].filter(Boolean).join(" · ");
                return <li key={item.id} className="rounded-xl border border-border p-3"><div className="flex items-center gap-3"><div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">{images[0]?.url ? <Image src={images[0].url} alt={item.product_name} fill sizes="64px" className="object-cover" /> : <div className="grid size-full place-items-center text-[10px] text-muted-foreground">Foto tidak tersedia</div>}</div><div className="min-w-0 flex-1"><p className="font-medium">{item.product_name}</p>{variantLabel && <p className="mt-1 text-xs text-muted-foreground">{variantLabel}</p>}<p className="mt-1 text-xs text-muted-foreground">Jumlah {item.quantity} · Rp {Number(item.price).toLocaleString("id-ID")} / barang</p></div><span className="shrink-0 font-medium">Rp {Number(item.price * item.quantity).toLocaleString("id-ID")}</span></div>{specifications.length > 0 && <dl className="mt-3 grid gap-x-4 gap-y-2 border-t border-border pt-3 sm:grid-cols-2">{specifications.map((specification, index) => <div key={`${specification.key}-${index}`} className="min-w-0"><dt className="text-xs text-muted-foreground">{specification.key}</dt><dd className="break-words text-sm">{specification.value}</dd></div>)}</dl>}</li>;
              })}</ul>{!order.order_items?.length && <p className="mt-1 text-muted-foreground">Rincian barang tidak tersedia.</p>}</div><div><h3 className="font-semibold">Pembayaran</h3><p className="mt-1">Metode: {order.payments?.[0]?.payment_method === "manual_transfer" ? "Transfer manual" : order.payments?.[0]?.payment_method || "Belum tercatat"}</p><p>Status: {paymentStatusLabels[order.payments?.[0]?.status ?? ""] ?? order.payments?.[0]?.status ?? "Belum tercatat"}</p></div><div><h3 className="font-semibold">Status pesanan</h3><p className="mt-1">{orderStatusLabels[order.status] ?? order.status}</p></div><div><h3 className="font-semibold">Penerimaan</h3>{order.courier === "pickup" ? <><p className="mt-1">{String(order.shipping_address?.pickup_location ?? "Ambil di toko")}</p>{order.shipping_address?.pickup_address && <p className="mt-1 whitespace-pre-line">{String(order.shipping_address.pickup_address)}</p>}{order.shipping_address?.pickup_maps_url && <a className="text-primary underline" href={String(order.shipping_address.pickup_maps_url)} target="_blank" rel="noopener noreferrer">Lihat lokasi di Google Maps</a>}{order.shipping_address?.fulfillment_change_note && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{String(order.shipping_address.fulfillment_change_note)}</p>}</> : <p className="mt-1">{String(order.shipping_address?.recipient_name ?? "")} · {String(order.shipping_address?.phone ?? "")}<br />{String(order.shipping_address?.street_address ?? "")}<br />{[order.shipping_address?.city, order.shipping_address?.province, order.shipping_address?.postal_code].filter(Boolean).map(String).join(", ")}</p>}</div><div className="flex justify-between border-t pt-2"><span>Subtotal</span><span>Rp {Number(order.total_amount ?? 0).toLocaleString("id-ID")}</span></div><div className="flex justify-between"><span>{order.courier === "pickup" ? "Pengambilan" : "Ongkir"}</span><span>{order.courier === "pickup" && Number(order.shipping_amount ?? 0) === 0 ? "Gratis" : `Rp ${Number(order.shipping_amount ?? 0).toLocaleString("id-ID")}`}</span></div><div className="flex justify-between font-semibold"><span>Total</span><span>Rp {Number(order.grand_total ?? 0).toLocaleString("id-ID")}</span></div></div></details>
            </article>)}
          </div>}
        </>}

        {activeTab === "wishlist" && <>
          <h1 className="mb-2 text-2xl font-bold">Wishlist</h1>
          <p className="mb-6 text-sm text-muted-foreground">Produk yang kamu simpan.</p>
          {!wishlist.length ? <p className="py-12 text-center text-muted-foreground">Wishlist kamu masih kosong.</p> : <div className="grid gap-4 sm:grid-cols-2">
            {wishlist.map((entry) => {
              const product = entry.products;
              const images = [...(product?.product_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
              const imageUrl = product?.image || images[0]?.url;
              const specifications = [...(product?.product_specifications ?? [])]
                .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                .slice(0, 3);
              const extraSpecs = Math.max(0, (product?.product_specifications?.length ?? 0) - specifications.length);
              return <Link key={entry.id} href={`/product/${product?.id ?? entry.product_id}`} className="group grid min-w-0 grid-cols-[80px_minmax(0,1fr)] items-start gap-4 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/50 sm:grid-cols-[96px_minmax(0,1fr)] sm:p-5">
                <span className="relative grid size-20 place-items-center overflow-hidden rounded-xl bg-muted sm:size-24">
                  {imageUrl ? <Image src={imageUrl} alt={product?.name ?? "Produk wishlist"} fill sizes="(max-width: 640px) 80px, 96px" className="object-contain p-2 mix-blend-multiply" /> : <Package className="size-8 text-muted-foreground" aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 font-semibold transition-colors group-hover:text-primary">{product?.name ?? "Produk"}</span>
                  <span className="mt-1 block font-semibold text-primary">Rp {Number(product?.discount_price ?? product?.price ?? 0).toLocaleString("id-ID")}</span>
                  {specifications.length > 0 && <span className="mt-2 flex flex-wrap gap-1.5">
                    {specifications.map((specification, index) => <span key={`${specification.key}-${index}`} className="max-w-full truncate rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">{specification.key}:</span> {specification.value}</span>)}
                    {extraSpecs > 0 && <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">+{extraSpecs} spek</span>}
                  </span>}
                </span>
              </Link>;
            })}
          </div>}
        </>}

        {activeTab === "settings" && <>
          <h1 className="mb-6 text-2xl font-bold">Pengaturan akun</h1>
          <form onSubmit={saveProfile} className="max-w-lg space-y-4">
            <label className="block space-y-2 text-sm font-medium">Nama lengkap<Input name="full_name" defaultValue={profile?.full_name ?? ""} required minLength={2} /></label>
            <label className="block space-y-2 text-sm font-medium">Alamat email<Input name="email" type="email" autoComplete="email" defaultValue={profile?.email ?? ""} required /></label>
            <p className="-mt-2 text-xs text-muted-foreground">Jika email diubah, Supabase akan meminta konfirmasi melalui email.</p>
            <label className="block space-y-2 text-sm font-medium">Nomor HP<Input name="phone" type="tel" autoComplete="tel" defaultValue={profile?.phone ?? ""} placeholder="Contoh: 081234567890" /></label>
            <label className="block space-y-2 text-sm font-medium">Alamat rumah<textarea name="home_address" autoComplete="street-address" defaultValue={profile?.home_address ?? ""} maxLength={500} placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota, kode pos" className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
            {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {saved && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
            <Button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan perubahan"}</Button>
          </form>
        </>}
      </section>
    </div>
  </div>;
}
