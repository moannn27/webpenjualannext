"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Heart, LogOut, Package, Settings, Shield } from "lucide-react";
import { logout } from "@/actions/auth";
import { updateProfileAction } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tab = "orders" | "wishlist" | "settings";
type Profile = { full_name?: string | null; phone?: string | null; email?: string | null; home_address?: string | null; role?: string | null } | null;
type Order = { id: string; order_number?: string | null; created_at: string; status: string; grand_total?: number | null };
type WishlistEntry = { id: string; product_id: string; products?: { id: string; name: string; price: number; discount_price?: number | null } | null };

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
            {orders.map((order) => <article key={order.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-border p-5 sm:flex-row sm:items-center">
              <div><p className="font-semibold">{order.order_number ?? `Pesanan ${order.id.slice(0, 8)}`}</p><p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString("id-ID")} · {order.status}</p></div>
              <div className="font-semibold">Rp {Number(order.grand_total ?? 0).toLocaleString("id-ID")}</div>
            </article>)}
          </div>}
        </>}

        {activeTab === "wishlist" && <>
          <h1 className="mb-6 text-2xl font-bold">Wishlist</h1>
          {!wishlist.length ? <p className="py-12 text-center text-muted-foreground">Wishlist kamu masih kosong.</p> : <div className="grid gap-4 sm:grid-cols-2">
            {wishlist.map((entry) => <Link key={entry.id} href={`/product/${entry.products?.id ?? entry.product_id}`} className="rounded-2xl border border-border p-5 hover:border-primary/50"><p className="font-semibold">{entry.products?.name ?? "Produk"}</p><p className="mt-2 text-sm text-muted-foreground">Rp {Number(entry.products?.discount_price ?? entry.products?.price ?? 0).toLocaleString("id-ID")}</p></Link>)}
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
