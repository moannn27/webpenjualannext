"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createAdminManagedAccountAction, updateAdminManagedAccountRoleAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Plus } from "lucide-react";

type Account = { id: string; full_name: string | null; phone: string | null; role: string; created_at: string };

export function CustomerAccountsManager({ customers, canManageAccounts }: { customers: Account[]; canManageAccounts: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  const createAccount = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      try {
        const result = await createAdminManagedAccountAction({ fullName: String(formData.get("full_name") ?? ""), email: String(formData.get("email") ?? ""), phone: String(formData.get("phone") ?? ""), role: String(formData.get("role") ?? "customer") });
        if (result.error) { setError(result.error); return; }
        setOpen(false);
        router.refresh();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Akun gagal dibuat."); }
    });
  };

  const updateRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateAdminManagedAccountRoleAction(formData);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  return <section className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">Akun</h1><p className="mt-1 text-muted-foreground">Profil akun pelanggan dan admin.</p></div><div className="flex flex-wrap gap-2"><a href="/api/admin/reports/customers" className="inline-flex h-10 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium hover:bg-muted"><Download className="mr-2 size-4" />Ekspor pelanggan + pembelian CSV</a>{canManageAccounts && <Button onClick={() => { setError(""); setOpen(true); }}><Plus className="mr-2 size-4" />Tambah akun</Button>}</div></div>
    {canManageAccounts && <p className="text-sm text-muted-foreground">Super admin dapat mengundang akun baru dan mengatur role. Undangan masuk melalui email.</p>}
    {error && !open && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="overflow-x-auto rounded-xl border bg-card"><Table className="min-w-[700px]"><TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Telepon</TableHead><TableHead>Role</TableHead><TableHead>Bergabung</TableHead>{canManageAccounts && <TableHead>Ubah role</TableHead>}</TableRow></TableHeader><TableBody>
      {customers.map((customer) => <TableRow key={customer.id}><TableCell className="font-medium">{customer.full_name || "Belum mengisi nama"}</TableCell><TableCell>{customer.phone || "—"}</TableCell><TableCell><Badge variant={customer.role === "admin" || customer.role === "super_admin" ? "default" : "secondary"}>{customer.role}</Badge></TableCell><TableCell>{new Date(customer.created_at).toLocaleDateString("id-ID")}</TableCell>{canManageAccounts && <TableCell><form onSubmit={updateRole} className="flex items-center gap-2"><input type="hidden" name="id" value={customer.id} /><select name="role" aria-label={`Role ${customer.full_name || "akun"}`} defaultValue={customer.role} className="h-9 rounded-lg border border-input bg-background px-2 text-sm"><option value="customer">Pelanggan</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></select><Button type="submit" size="sm" variant="outline" disabled={busy}>Simpan</Button></form></TableCell>}</TableRow>)}
      {!customers.length && <TableRow><TableCell colSpan={canManageAccounts ? 5 : 4} className="py-12 text-center text-muted-foreground">Belum ada akun.</TableCell></TableRow>}
    </TableBody></Table></div>
    {open && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="account-dialog-title" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-card p-5 shadow-xl sm:p-6"><div><h2 id="account-dialog-title" className="text-xl font-bold">Tambah akun</h2><p className="mt-1 text-sm text-muted-foreground">Kami akan mengirim undangan login ke email yang didaftarkan.</p></div><form action={createAccount} className="space-y-4"><label className="block space-y-1 text-sm">Nama lengkap<Input name="full_name" minLength={2} required /></label><label className="block space-y-1 text-sm">Email<Input name="email" type="email" required /></label><label className="block space-y-1 text-sm">Telepon (opsional)<Input name="phone" type="tel" /></label><label className="block space-y-1 text-sm">Role<select name="role" defaultValue="customer" className="h-10 w-full rounded-lg border border-input bg-background px-3"><option value="customer">Pelanggan</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></select><span className="mt-1 block text-xs text-muted-foreground">Admin dapat mengelola operasional. Super admin juga dapat mengelola brand, landing page, dan role akun.</span></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={busy}>{busy ? "Mengirim undangan..." : "Kirim undangan"}</Button></div></form></section></div>}
  </section>;
}
