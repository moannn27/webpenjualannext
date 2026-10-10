"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createAdminManagedAccountAction,
  setAdminManagedAccountPasswordAction,
  unlockAdminManagedAccountAction,
  updateAdminManagedAccountRoleAction,
} from "@/actions/admin";
import { saveAdminPermissionsAction } from "@/actions/admin-permissions";
import { ALL_ADMIN_MODULES, type AdminModuleKey, DEFAULT_ADMIN_PERMISSIONS } from "@/types/admin-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Check,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

type Account = {
  id: string;
  full_name: string | null;
  email?: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  is_password_locked?: boolean;
  failed_attempts?: number;
  locked_at?: string | null;
};

interface CustomerAccountsManagerProps {
  customers: Account[];
  canManageAccounts: boolean;
  adminPermissions?: Record<string, string[]>;
}

export function CustomerAccountsManager({
  customers,
  canManageAccounts,
  adminPermissions = {},
}: CustomerAccountsManagerProps) {
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [permModalUser, setPermModalUser] = useState<Account | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<Account | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<AdminModuleKey[]>([]);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  const createAccount = (formData: FormData) => {
    setError("");
    startTransition(async () => {
      try {
        const result = await createAdminManagedAccountAction({
          fullName: String(formData.get("full_name") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          role: String(formData.get("role") ?? "customer"),
          password: String(formData.get("password") ?? ""),
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setOpenCreateModal(false);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Akun gagal dibuat.");
      }
    });
  };

  const handleSavePassword = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (newPassword.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    setError("");
    setPasswordSuccess("");
    startTransition(async () => {
      try {
        const result = await setAdminManagedAccountPasswordAction({
          userId: passwordModalUser.id,
          newPassword,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setPasswordSuccess(`Password berhasil diatur untuk ${passwordModalUser.full_name || "akun ini"}!`);
        setTimeout(() => {
          setPasswordModalUser(null);
          setPasswordSuccess("");
          setNewPassword("");
        }, 1200);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Gagal mengatur password.");
      }
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

  const handleOpenPermissionsModal = (account: Account) => {
    setPermModalUser(account);
    const existing = adminPermissions[account.id];
    const initialPerms = Array.isArray(existing)
      ? (existing as AdminModuleKey[])
      : DEFAULT_ADMIN_PERMISSIONS;
    setSelectedPermissions(initialPerms);
    setError("");
  };

  const togglePermission = (key: AdminModuleKey) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSelectAllPermissions = () => {
    setSelectedPermissions(ALL_ADMIN_MODULES.map((m) => m.key));
  };

  const handleClearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const handleSavePermissions = () => {
    if (!permModalUser) return;
    setError("");
    startTransition(async () => {
      try {
        await saveAdminPermissionsAction({
          adminUserId: permModalUser.id,
          permissions: selectedPermissions,
        });
        setPermModalUser(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan hak akses staf.");
      }
    });
  };

  const lockedCustomers = customers.filter((c) => Boolean(c.is_password_locked));

  const handleUnlockAccount = (account: Account) => {
    if (
      !confirm(
        `Buka kunci akses ganti password untuk akun "${
          account.full_name || account.email
        }"? Hitungan percobaan salah sandi akan dibersihkan kembali ke 0.`
      )
    ) {
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const result = await unlockAdminManagedAccountAction(account.id);
        if (result.error) {
          setError(result.error);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal membuka kunci akun.");
      }
    });
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Akun Pengguna & Staf</h1>
          <p className="mt-1 text-muted-foreground">
            Kelola profil pelanggan dan atur hak akses granular staf admin toko.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/reports/customers"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            <Download className="mr-2 size-4" />
            Ekspor pelanggan + pembelian CSV
          </a>
          {canManageAccounts && (
            <Button
              onClick={() => {
                setError("");
                setOpenCreateModal(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Tambah akun
            </Button>
          )}
        </div>
      </div>

      {/* ALERT NOTIFIKASI AKUN TERKUNCI (3x GAGAL SANDI) */}
      {lockedCustomers.length > 0 && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive flex items-start gap-3.5 shadow-xs animate-in fade-in">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
            <ShieldAlert className="size-5" />
          </div>
          <div className="flex-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-foreground">
                Perhatian Super Admin: {lockedCustomers.length} Akun Butuh Bantuan Reset Password
              </h3>
              <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">
                Terkunci (3x Gagal)
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Pelanggan berikut tidak dapat mengganti kata sandi sendiri karena telah 3x salah memasukkan kata sandi lama:{" "}
              <strong className="text-foreground">
                {lockedCustomers
                  .map((c) => `${c.full_name || "User"} (${c.email || "Tanpa email"})`)
                  .join(", ")}
              </strong>
              . Silakan gunakan tombol <strong>Reset Password</strong> atau <strong>Buka Kunci</strong> pada baris tabel di bawah untuk memulihkan akses pengguna.
            </p>
          </div>
        </div>
      )}

      {canManageAccounts && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          <p className="font-semibold flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Pengaturan Hak Akses Staf Admin
          </p>
          <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
            Sebagai Super Admin, Anda dapat memberikan akses spesifik ke staf (contoh: hanya Produk & Kategori untuk staf katalog). Tindakan pengubahan data oleh staf akan tercatat di menu Log Aktivitas.
          </p>
        </div>
      )}

      {error && !openCreateModal && !permModalUser && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {error}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[850px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nama Pengguna</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Izin Akses Fitur</TableHead>
              <TableHead>Bergabung</TableHead>
              {canManageAccounts && <TableHead className="text-right">Aksi & Role</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const isAdmin = customer.role === "admin";
              const isSuperAdmin = customer.role === "super_admin";
              const userPerms = adminPermissions[customer.id] || DEFAULT_ADMIN_PERMISSIONS;

              return (
                <TableRow
                  key={customer.id}
                  className={
                    customer.is_password_locked
                      ? "bg-destructive/5 hover:bg-destructive/10 transition-colors"
                      : undefined
                  }
                >
                  {/* Nama */}
                  <TableCell className="font-medium">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p>{customer.full_name || "Belum mengisi nama"}</p>
                        {customer.is_password_locked && (
                          <Badge
                            variant="destructive"
                            className="gap-1 text-[10px] font-semibold py-0.5 px-1.5 animate-pulse"
                          >
                            <ShieldAlert className="size-3" />
                            Terkunci (3x Gagal Sandi)
                          </Badge>
                        )}
                      </div>
                      {customer.email && (
                        <p className="text-xs text-muted-foreground font-normal">{customer.email}</p>
                      )}
                    </div>
                  </TableCell>

                  {/* Telepon */}
                  <TableCell>{customer.phone || "—"}</TableCell>

                  {/* Role */}
                  <TableCell>
                    <Badge
                      variant={
                        isSuperAdmin ? "default" : isAdmin ? "secondary" : "outline"
                      }
                      className={isSuperAdmin ? "bg-primary" : isAdmin ? "bg-primary/20 text-primary border-primary/30" : ""}
                    >
                      {customer.role === "super_admin"
                        ? "Super Admin"
                        : customer.role === "admin"
                        ? "Admin"
                        : "Pelanggan"}
                    </Badge>
                  </TableCell>

                  {/* Izin Akses */}
                  <TableCell>
                    {isSuperAdmin ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        <Shield className="size-3.5" />
                        Akses Penuh (Semua Modul)
                      </span>
                    ) : isAdmin ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1 max-w-xs">
                          {userPerms.slice(0, 3).map((p) => {
                            const mod = ALL_ADMIN_MODULES.find((m) => m.key === p);
                            return (
                              <span
                                key={p}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                              >
                                {mod?.label || p}
                              </span>
                            );
                          })}
                          {userPerms.length > 3 && (
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              +{userPerms.length - 3} lainnya
                            </span>
                          )}
                          {!userPerms.length && (
                            <span className="text-xs text-amber-600 font-medium">Belum ada izin</span>
                          )}
                        </div>
                        {canManageAccounts && (
                          <button
                            type="button"
                            onClick={() => handleOpenPermissionsModal(customer)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-2"
                          >
                            <KeyRound className="size-3" />
                            Atur Izin Akses
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Bergabung */}
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(customer.created_at).toLocaleDateString("id-ID")}
                  </TableCell>

                  {/* Kelola Role & Password */}
                  {canManageAccounts && (
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {customer.is_password_locked ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-8 px-2.5 text-xs font-semibold shadow-xs gap-1.5"
                              title="Reset Password Akun Terkunci"
                              onClick={() => {
                                setError("");
                                setPasswordSuccess("");
                                setNewPassword("");
                                setPasswordModalUser(customer);
                              }}
                            >
                              <KeyRound className="size-3.5" />
                              Reset Password
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              className="h-8 px-2 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                              title="Buka Kunci Akun (Bersihkan Limit Gagal)"
                              onClick={() => handleUnlockAccount(customer)}
                            >
                              <Check className="mr-1 size-3.5" />
                              Buka Kunci
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title="Setel Password Akun"
                            onClick={() => {
                              setError("");
                              setPasswordSuccess("");
                              setNewPassword("");
                              setPasswordModalUser(customer);
                            }}
                          >
                            <KeyRound className="mr-1 size-3.5" />
                            Set Password
                          </Button>
                        )}
                        <form onSubmit={updateRole} className="inline-flex items-center gap-1.5">
                          <input type="hidden" name="id" value={customer.id} />
                          <select
                            name="role"
                            aria-label={`Role ${customer.full_name || "akun"}`}
                            defaultValue={customer.role}
                            className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                          >
                            <option value="customer">Pelanggan</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super admin</option>
                          </select>
                          <Button type="submit" size="sm" variant="outline" className="h-8 text-xs" disabled={busy}>
                            Simpan
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}

            {!customers.length && (
              <TableRow>
                <TableCell
                  colSpan={canManageAccounts ? 6 : 5}
                  className="py-12 text-center text-muted-foreground"
                >
                  Belum ada akun.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Atur Izin Akses Granular */}
      {permModalUser && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="perm-dialog-title"
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-card p-6 shadow-xl"
          >
            <div>
              <div className="flex items-center gap-2">
                <KeyRound className="size-5 text-primary" />
                <h2 id="perm-dialog-title" className="text-xl font-bold">
                  Atur Hak Akses Staf
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Pilih modul dan fitur yang dapat diakses oleh{" "}
                <span className="font-semibold text-foreground">
                  {permModalUser.full_name || "Admin"}
                </span>
                .
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between border-y border-border py-2 text-xs">
              <span className="font-medium text-muted-foreground">
                {selectedPermissions.length} dari {ALL_ADMIN_MODULES.length} modul dipilih
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllPermissions}
                  className="font-semibold text-primary hover:underline"
                >
                  Pilih Semua
                </button>
                <span className="text-border">|</span>
                <button
                  type="button"
                  onClick={handleClearAllPermissions}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            {/* Modules Checkboxes */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {ALL_ADMIN_MODULES.map((mod) => {
                const isChecked = selectedPermissions.includes(mod.key);
                return (
                  <label
                    key={mod.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                      isChecked
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-foreground/30 bg-card"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermission(mod.key)}
                      className="mt-1 size-4 rounded accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground">{mod.label}</p>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPermModalUser(null)}
                disabled={busy}
              >
                Batal
              </Button>
              <Button onClick={handleSavePermissions} disabled={busy}>
                {busy ? (
                  <>
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Hak Akses"
                )}
              </Button>
            </div>
          </section>
        </div>
      )}

      {/* Modal Tambah Akun Baru */}
      {openCreateModal && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-dialog-title"
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-card p-5 shadow-xl sm:p-6"
          >
            <div>
              <h2 id="account-dialog-title" className="text-xl font-bold">
                Tambah akun baru
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Kami akan mengirim undangan login ke email yang didaftarkan.
              </p>
            </div>
            <form action={createAccount} className="space-y-4">
              <label className="block space-y-1 text-sm">
                Nama lengkap
                <Input name="full_name" minLength={2} required />
              </label>
              <label className="block space-y-1 text-sm">
                Email
                <Input name="email" type="email" required />
              </label>
              <label className="block space-y-1 text-sm">
                Telepon (opsional)
                <Input name="phone" type="tel" />
              </label>
              <label className="block space-y-1 text-sm">
                Password (opsional)
                <div className="relative">
                  <Input
                    name="password"
                    type={showCreatePassword ? "text" : "password"}
                    placeholder="Kosongkan jika ingin kirim undangan email"
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    title={showCreatePassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showCreatePassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Jika diisi (min. 6 karakter), akun langsung aktif dan bisa login seketika tanpa perlu membuka email undangan.
                </span>
              </label>
              <label className="block space-y-1 text-sm">
                Role
                <select
                  name="role"
                  defaultValue="customer"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3"
                >
                  <option value="customer">Pelanggan</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super admin</option>
                </select>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Admin dapat mengelola operasional sesuai hak akses. Super admin memiliki kontrol penuh.
                </span>
              </label>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpenCreateModal(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Menyimpan akun..." : "Simpan / Buat Akun"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal Setel Password Baru */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-dialog-title"
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-card p-5 shadow-xl sm:p-6"
          >
            <div>
              <h2 id="password-dialog-title" className="text-xl font-bold">
                Setel Password Baru
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Atur password baru untuk akun <strong>{passwordModalUser.full_name || passwordModalUser.email || "ini"}</strong>
                {passwordModalUser.email ? ` (${passwordModalUser.email})` : ""}.
              </p>
            </div>
            <form onSubmit={handleSavePassword} className="space-y-4">
              <label className="block space-y-1 text-sm">
                Password baru
                <div className="relative">
                  <Input
                    type={showAdminPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    title={showAdminPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showAdminPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Akun akan langsung aktif dan bisa login seketika menggunakan email dan password baru ini.
                </span>
              </label>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {passwordSuccess && (
                <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 font-medium dark:text-emerald-400">
                  {passwordSuccess}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordModalUser(null)}
                  disabled={busy}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={busy || !newPassword || newPassword.length < 6}>
                  {busy ? (
                    <>
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Password"
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
