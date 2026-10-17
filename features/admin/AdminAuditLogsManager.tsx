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
  Clock,
  FileSpreadsheet,
  FileText,
  History,
  Layers,
  LoaderCircle,
  Printer,
  Search,
  Trash2,
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
        return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-400">Tambah</span>;
      case "update":
        return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-400">Ubah</span>;
      case "delete":
        return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-400">Hapus</span>;
      case "status_change":
        return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-400">Status</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/5 dark:text-slate-300">{action}</span>;
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
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Log Aktivitas & Audit</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pantau seluruh aktivitas penambahan, pengeditan, dan penghapusan data oleh staf admin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Unduh Laporan Log (Excel, Word, PDF) */}
          <div className="flex items-center gap-1 rounded-full border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#1E2028] p-1 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 px-2 hidden sm:inline">
              Unduh:
            </span>
            <a
              href="/api/admin/reports/logs?format=csv"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Unduh laporan log ke Microsoft Excel / CSV"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              Excel (CSV)
            </a>
            <a
              href="/api/admin/reports/logs?format=doc"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Unduh laporan log ke Microsoft Word (.doc)"
            >
              <FileText className="size-3.5 text-blue-600" />
              Word (.doc)
            </a>
            <a
              href="/api/admin/reports/logs?format=html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
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
              className="rounded-full text-destructive hover:text-destructive gap-2 text-xs h-9"
            >
              {isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Bersihkan Log
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Highlights - 3 Pastel Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-200/70 bg-[#EFF6FF] dark:border-blue-900/40 dark:bg-blue-950/20 p-4 shadow-xs">
          <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Total Aktivitas Tercatat</p>
          <p className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{logs.length}</p>
          <p className="mt-1 text-xs text-blue-600/80 dark:text-blue-400/80">Riwayat perubahan sistem</p>
        </div>
        <div className="rounded-2xl border border-purple-200/70 bg-[#F5F3FF] dark:border-purple-900/40 dark:bg-purple-950/20 p-4 shadow-xs">
          <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Staf Terlibat</p>
          <p className="mt-1.5 text-2xl font-black tracking-tight text-purple-700 dark:text-purple-300">{adminNames.length}</p>
          <p className="mt-1 text-xs text-purple-600/80 dark:text-purple-400/80">Akun admin yang melakukan perubahan</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/70 bg-[#ECFDF5] dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Hasil Filter</p>
          <p className="mt-1.5 text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
            {filteredLogs.length}
          </p>
          <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-400/80">Sesuai pencarian & filter saat ini</p>
        </div>
      </div>

      {/* Table & Filter Container */}
      <div className="rounded-[28px] sm:rounded-[34px] border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028] shadow-sm p-4 sm:p-6 space-y-4">
        {/* Filter and Search Bar */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
            <Input
              placeholder="Cari aktivitas, entitas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-full border-slate-200/90 dark:border-white/10 bg-slate-50/60 dark:bg-[#18191E] pl-9 text-xs focus-visible:ring-[#2563EB]/30"
            />
          </div>

          {/* Filter by Admin */}
          <select
            value={selectedAdmin}
            onChange={(e) => setSelectedAdmin(e.target.value)}
            aria-label="Filter berdasarkan staf admin"
            className="h-9 rounded-full border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#23252C] px-3.5 text-xs font-medium text-slate-700 dark:text-slate-200"
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
            className="h-9 rounded-full border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#23252C] px-3.5 text-xs font-medium text-slate-700 dark:text-slate-200"
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
          className="h-9 rounded-full border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#23252C] px-3.5 text-xs font-medium text-slate-700 dark:text-slate-200"
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
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2028]">
        <Table className="min-w-[760px]">
          <TableHeader className="bg-slate-50/75 dark:bg-white/[0.02]">
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
                      <span className="size-2 rounded-full bg-[#2563EB]" />
                      <span>{log.admin_name}</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10px] font-semibold ${
                        log.admin_role === "super_admin"
                          ? "bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] dark:bg-purple-950/40 dark:text-purple-300"
                          : "bg-[#EFF6FF] text-[#2563EB] border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                      }`}
                    >
                      {log.admin_role === "super_admin" ? "Super Admin" : "Admin"}
                    </span>
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
    </div>
  </section>
);
}

