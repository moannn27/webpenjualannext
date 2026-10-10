"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearAdminAuditLogsAction } from "@/actions/admin-permissions";
import { type AdminAuditLog } from "@/lib/storefront-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Layers,
  LoaderCircle,
  Package,
  Printer,
  Search,
  Shield,
  Trash2,
  UserCheck,
} from "lucide-react";

interface AdminAuditLogsManagerProps {
  logs: AdminAuditLog[];
  isSuperAdmin: boolean;
}

export function AdminAuditLogsManager({ logs, isSuperAdmin }: AdminAuditLogsManagerProps) {
  const [search, setSearch] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  // Extract unique admin names
  const adminNames = Array.from(new Set(logs.map((l) => l.admin_name || "Admin")));

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      log.details.toLowerCase().includes(q) ||
      log.entity_name.toLowerCase().includes(q) ||
      log.admin_name.toLowerCase().includes(q);

    const matchesAdmin =
      selectedAdmin === "all" || log.admin_name === selectedAdmin;

    const matchesEntity =
      selectedEntity === "all" || log.entity_type === selectedEntity;

    const matchesAction =
      selectedAction === "all" || log.action === selectedAction;

    return matchesSearch && matchesAdmin && matchesEntity && matchesAction;
  });

  const handleClearLogs = () => {
    if (!confirm("Apakah Anda yakin ingin menghapus semua riwayat log aktivitas?")) {
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await clearAdminAuditLogsAction();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal membersihkan log.");
      }
    });
  };

  const getActionBadge = (action: AdminAuditLog["action"]) => {
    switch (action) {
      case "create":
        return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">Tambah</Badge>;
      case "update":
        return <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400">Ubah</Badge>;
      case "delete":
        return <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/20 dark:text-red-400">Hapus</Badge>;
      case "status_change":
        return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">Status</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getEntityLabel = (entity: AdminAuditLog["entity_type"]) => {
    switch (entity) {
      case "product": return "Produk";
      case "category": return "Kategori";
      case "brand": return "Brand";
      case "order": return "Pesanan";
      case "voucher": return "Voucher";
      case "content": return "Konten";
      case "account": return "Akun";
      case "settings": return "Pengaturan";
      default: return entity;
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return iso;
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Aktivitas & Audit</h1>
          <p className="mt-1 text-muted-foreground">
            Pantau seluruh aktivitas penambahan, pengeditan, dan penghapusan data oleh staf admin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Unduh Laporan Log (Excel, Word, PDF) */}
          <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground px-2 hidden sm:inline">
              Unduh:
            </span>
            <a
              href="/api/admin/reports/logs?format=csv"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              title="Unduh laporan log ke Microsoft Excel / CSV"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              Excel (CSV)
            </a>
            <a
              href="/api/admin/reports/logs?format=doc"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              title="Unduh laporan log ke Microsoft Word (.doc)"
            >
              <FileText className="size-3.5 text-blue-600" />
              Word (.doc)
            </a>
            <a
              href="/api/admin/reports/logs?format=html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              title="Cetak atau Simpan Laporan sebagai PDF"
            >
              <Printer className="size-3.5 text-purple-600" />
              Cetak / PDF
            </a>
          </div>

          {isSuperAdmin && logs.length > 0 && (
            <Button
              variant="outline"
              onClick={handleClearLogs}
              disabled={isPending}
              className="text-destructive hover:text-destructive gap-2 text-xs h-9"
            >
              {isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Bersihkan Log
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Highlights */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Aktivitas Tercatat</p>
          <p className="mt-2 text-2xl font-bold">{logs.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Riwayat perubahan sistem</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Staf Terlibat</p>
          <p className="mt-2 text-2xl font-bold text-primary">{adminNames.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Akun admin yang melakukan perubahan</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hasil Filter</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {filteredLogs.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Sesuai pencarian & filter saat ini</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari aktivitas, entitas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {/* Filter by Admin */}
        <select
          value={selectedAdmin}
          onChange={(e) => setSelectedAdmin(e.target.value)}
          aria-label="Filter berdasarkan staf admin"
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">Semua Staf Admin</option>
          {adminNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {/* Filter by Entity */}
        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          aria-label="Filter berdasarkan jenis modul"
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">Semua Modul / Entitas</option>
          <option value="product">Produk</option>
          <option value="category">Kategori</option>
          <option value="brand">Brand</option>
          <option value="order">Pesanan</option>
          <option value="voucher">Voucher / Kupon</option>
          <option value="content">Konten & Toko</option>
          <option value="account">Akun & Staf</option>
          <option value="settings">Pengaturan</option>
        </select>

        {/* Filter by Action */}
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          aria-label="Filter berdasarkan aksi"
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">Semua Aksi</option>
          <option value="create">Penambahan (Create)</option>
          <option value="update">Pengeditan (Update)</option>
          <option value="delete">Penghapusan (Delete)</option>
          <option value="status_change">Perubahan Status</option>
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Audit Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Waktu</TableHead>
              <TableHead className="w-44">Staf Admin</TableHead>
              <TableHead className="w-28">Aksi</TableHead>
              <TableHead className="w-28">Modul</TableHead>
              <TableHead>Rincian Aktivitas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                {/* Waktu */}
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <span>{formatTimestamp(log.created_at)}</span>
                  </div>
                </TableCell>

                {/* Staf Admin */}
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-sm">
                      <span className="size-2 rounded-full bg-primary" />
                      <span>{log.admin_name}</span>
                    </div>
                    <Badge variant={log.admin_role === "super_admin" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                      {log.admin_role === "super_admin" ? "Super Admin" : "Admin"}
                    </Badge>
                  </div>
                </TableCell>

                {/* Aksi */}
                <TableCell>
                  {getActionBadge(log.action)}
                </TableCell>

                {/* Modul */}
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Layers className="size-3.5" />
                    <span>{getEntityLabel(log.entity_type)}</span>
                  </span>
                </TableCell>

                {/* Rincian */}
                <TableCell>
                  <div className="space-y-0.5 max-w-xl">
                    <p className="text-sm font-medium text-foreground">
                      {log.details}
                    </p>
                    {log.entity_name && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Target: {log.entity_name}
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {!filteredLogs.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <History className="size-8 text-muted-foreground/50" />
                    <p>Belum ada log aktivitas yang cocok.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

