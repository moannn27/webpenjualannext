"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  saveAdminVoucherAction,
  toggleAdminVoucherAction,
  deleteAdminVoucherAction,
} from "@/actions/voucher";
import {
  type Voucher,
  type VoucherDiscountType,
  type VoucherTargetScope,
  type VoucherMatchCriteria,
} from "@/types/voucher";
import { formatVoucherCurrency, formatVoucherLabel, parseVoucherDate } from "@/lib/voucher";

function toLocalDateInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calendar,
  Check,
  CheckSquare,
  Copy,
  Edit2,
  Filter,
  Layers,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Square,
  Tag,
  TicketPercent,
  Trash2,
  TrendingUp,
} from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
}

interface BrandOption {
  id: string;
  name: string;
}

interface VoucherManagerProps {
  vouchers: Voucher[];
  canManage: boolean;
  categories?: CategoryOption[];
  brands?: BrandOption[];
}

export function VoucherManager({
  vouchers,
  canManage,
  categories = [],
  brands = [],
}: VoucherManagerProps) {
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [openModal, setOpenModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [discountType, setDiscountType] = useState<VoucherDiscountType>("percentage");
  const [targetScope, setTargetScope] = useState<VoucherTargetScope>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [matchCriteria, setMatchCriteria] = useState<VoucherMatchCriteria>("all");
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredVouchers = vouchers.filter((v) => {
    const q = search.toLowerCase();
    const matchesQuery =
      v.code.toLowerCase().includes(q) ||
      (v.description && v.description.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (scopeFilter === "all_products") {
      return !v.target_scope || v.target_scope === "all";
    }
    if (scopeFilter === "category") {
      return (
        v.target_scope === "category" ||
        (Boolean(v.applicable_categories?.length) && !v.applicable_brands?.length)
      );
    }
    if (scopeFilter === "brand") {
      return (
        v.target_scope === "brand" ||
        (Boolean(v.applicable_brands?.length) && !v.applicable_categories?.length)
      );
    }
    if (scopeFilter === "combination") {
      return (
        v.target_scope === "category_and_brand" ||
        (Boolean(v.applicable_categories?.length) && Boolean(v.applicable_brands?.length))
      );
    }

    if (scopeFilter === "new_customer") {
      return Boolean(v.is_new_customer_only);
    }

    return true;
  });

  const handleOpenCreate = () => {
    setEditingVoucher(null);
    setDiscountType("percentage");
    setTargetScope("all");
    setSelectedCategories([]);
    setSelectedBrands([]);
    setMatchCriteria("all");
    setError("");
    setOpenModal(true);
  };

  const handleOpenEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setDiscountType(voucher.discount_type);
    const resolvedScope: VoucherTargetScope =
      voucher.target_scope ||
      (voucher.applicable_categories?.length && voucher.applicable_brands?.length
        ? "category_and_brand"
        : voucher.applicable_categories?.length
        ? "category"
        : voucher.applicable_brands?.length
        ? "brand"
        : "all");
    setTargetScope(resolvedScope);
    setSelectedCategories(voucher.applicable_categories || []);
    setSelectedBrands(voucher.applicable_brands || []);
    setMatchCriteria(voucher.match_criteria || "all");
    setError("");
    setOpenModal(true);
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleBrand = (id: string) => {
    setSelectedBrands((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (targetScope === "category" && selectedCategories.length === 0) {
      setError("Pilih minimal satu kategori produk untuk voucher khusus kategori ini.");
      return;
    }
    if (targetScope === "brand" && selectedBrands.length === 0) {
      setError("Pilih minimal satu merk/brand untuk voucher khusus brand ini.");
      return;
    }
    if (
      targetScope === "category_and_brand" &&
      (selectedCategories.length === 0 || selectedBrands.length === 0)
    ) {
      setError("Pilih minimal satu kategori dan satu merk untuk voucher kombinasi.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveAdminVoucherAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpenModal(false);
        router.refresh();
      }
    });
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleAdminVoucherAction(id, !currentStatus);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengubah status voucher.");
      }
    });
  };

  const handleDelete = (id: string, code: string) => {
    if (!confirm(`Hapus kupon voucher "${code}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteAdminVoucherAction(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menghapus voucher.");
      }
    });
  };

  // Metrics
  const activeCount = vouchers.filter((v) => v.is_active).length;
  const totalUses = vouchers.reduce((acc, v) => acc + (v.usage_count || 0), 0);

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kupon & Voucher</h1>
          <p className="mt-1 text-muted-foreground">
            Buat dan atur kode promo diskon untuk pembelian checkout web.
          </p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="size-4" />
            Tambah Voucher
          </Button>
        )}
      </div>

      {/* Metrics Highlights */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Voucher</p>
          <p className="mt-2 text-2xl font-bold">{vouchers.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{activeCount} voucher aktif saat ini</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voucher Aktif</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Dapat dipakai di checkout web</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Klaim / Penggunaan</p>
          <p className="mt-2 text-2xl font-bold text-primary">{totalUses}</p>
          <p className="mt-1 text-xs text-muted-foreground">Transaksi yang menggunakan voucher</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari kode atau deskripsi voucher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-xs sm:text-sm font-medium"
          >
            <option value="all">Semua Sasaran Voucher</option>
            <option value="all_products">Semua Produk (Umum)</option>
            <option value="new_customer">Khusus Pengguna Baru</option>
            <option value="category">Khusus Kategori</option>
            <option value="brand">Khusus Merk / Brand</option>
            <option value="combination">Kombinasi (Kategori & Merk)</option>
          </select>
        </div>
      </div>

      {error && !openModal && (
        <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Vouchers Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table className="min-w-[850px]">
          <TableHeader>
            <TableRow>
              <TableHead>Kode & Deskripsi</TableHead>
              <TableHead>Cakupan Produk</TableHead>
              <TableHead>Tipe & Diskon</TableHead>
              <TableHead>Syarat Pembelian</TableHead>
              <TableHead>Penggunaan</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVouchers.map((voucher) => {
              const parsedEndDate = parseVoucherDate(voucher.end_date, true);
              const isExpired = Boolean(parsedEndDate && new Date() > parsedEndDate);
              const isLimitReached = voucher.usage_limit && voucher.usage_count >= voucher.usage_limit;

              return (
                <TableRow key={voucher.id}>
                  {/* Kode & Deskripsi */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary tracking-wider">
                          {voucher.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(voucher.code)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Salin kode"
                        >
                          {copiedCode === voucher.code ? (
                            <Check className="size-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground max-w-xs truncate">
                        {voucher.description || "—"}
                      </p>
                      {voucher.is_new_customer_only && (
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-semibold flex items-center gap-1 w-fit mt-1">
                          <Sparkles className="size-2.5" /> Pembeli Baru
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Cakupan Produk */}
                  <TableCell>
                    <div className="space-y-1">
                      {voucher.target_scope === "category" || (voucher.applicable_categories?.length && !voucher.applicable_brands?.length) ? (
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-semibold">
                            Kategori Tertentu
                          </Badge>
                          <p className="text-xs text-muted-foreground font-medium truncate max-w-[150px]" title={voucher.applicable_category_names?.join(", ")}>
                            {voucher.applicable_category_names?.join(", ") || `${voucher.applicable_categories?.length} Kategori`}
                          </p>
                        </div>
                      ) : voucher.target_scope === "brand" || (voucher.applicable_brands?.length && !voucher.applicable_categories?.length) ? (
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] font-semibold">
                            Merk Tertentu
                          </Badge>
                          <p className="text-xs text-muted-foreground font-medium truncate max-w-[150px]" title={voucher.applicable_brand_names?.join(", ")}>
                            {voucher.applicable_brand_names?.join(", ") || `${voucher.applicable_brands?.length} Merk`}
                          </p>
                        </div>
                      ) : voucher.target_scope === "category_and_brand" || (voucher.applicable_categories?.length && voucher.applicable_brands?.length) ? (
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
                            Kombinasi {voucher.match_criteria === "any" ? "(ATAU)" : "(DAN)"}
                          </Badge>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[160px]" title={`Kategori: ${voucher.applicable_category_names?.join(", ")} | Merk: ${voucher.applicable_brand_names?.join(", ")}`}>
                            {voucher.applicable_category_names?.join(", ")} + {voucher.applicable_brand_names?.join(", ")}
                          </p>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-normal">
                          Semua Produk
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Tipe & Diskon */}
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <Badge variant={voucher.discount_type === "percentage" ? "default" : "secondary"}>
                        {voucher.discount_type === "percentage" ? "Persentase" : "Nominal Tetap"}
                      </Badge>
                      <p className="font-semibold text-foreground">
                        {voucher.discount_type === "percentage"
                          ? `${voucher.discount_value}%`
                          : formatVoucherCurrency(voucher.discount_value)}
                      </p>
                      {voucher.discount_type === "percentage" && voucher.max_discount && voucher.max_discount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Maks. {formatVoucherCurrency(voucher.max_discount)}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Syarat Pembelian */}
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <p>
                        Min. Belanja:{" "}
                        <span className="font-semibold">
                          {voucher.min_purchase && voucher.min_purchase > 0
                            ? formatVoucherCurrency(voucher.min_purchase)
                            : "Tanpa minimum"}
                        </span>
                      </p>
                    </div>
                  </TableCell>

                  {/* Penggunaan */}
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <p className="font-medium">
                        {voucher.usage_count}{" "}
                        <span className="text-muted-foreground">
                          / {voucher.usage_limit ? voucher.usage_limit : "∞"} dipakai
                        </span>
                      </p>
                      {isLimitReached && (
                        <span className="text-[10px] text-amber-600 font-semibold block">
                          Kuota Habis
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Periode */}
                  <TableCell>
                    <div className="text-xs space-y-0.5 text-muted-foreground">
                      {voucher.start_date && (
                        <p>
                          Mulai:{" "}
                          {new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "short",
                            timeZone: "Asia/Jakarta",
                          }).format(new Date(voucher.start_date))}
                        </p>
                      )}
                      {voucher.end_date ? (
                        <p className={isExpired ? "text-destructive font-medium" : ""}>
                          Berakhir:{" "}
                          {new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "short",
                            timeZone: "Asia/Jakarta",
                          }).format(new Date(voucher.end_date))}
                          {isExpired && " (Kadaluarsa)"}
                        </p>
                      ) : (
                        <p>Selamanya</p>
                      )}
                    </div>
                  </TableCell>

                  {/* Status Toggle */}
                  <TableCell>
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => handleToggle(voucher.id, voucher.is_active)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                          voucher.is_active
                            ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        <span className={`size-1.5 rounded-full ${voucher.is_active ? "bg-emerald-600" : "bg-muted-foreground"}`} />
                        {voucher.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    ) : (
                      <Badge variant={voucher.is_active ? "default" : "outline"}>
                        {voucher.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Aksi */}
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(voucher)}
                          disabled={isPending}
                          title="Edit voucher"
                          className="size-8"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(voucher.id, voucher.code)}
                          disabled={isPending}
                          title="Hapus voucher"
                          className="size-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}

            {!filteredVouchers.length && (
              <TableRow>
                <TableCell colSpan={canManage ? 8 : 7} className="py-12 text-center text-muted-foreground">
                  Belum ada voucher yang cocok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Buat / Edit Voucher */}
      {openModal && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="voucher-dialog-title"
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-card p-6 shadow-xl"
          >
            <div>
              <h2 id="voucher-dialog-title" className="text-xl font-bold">
                {editingVoucher ? "Edit Voucher" : "Buat Voucher Baru"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tentukan kode, cakupan merk/kategori, potongan harga, batas maksimal diskon, dan minimal pembelian.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {editingVoucher && <input type="hidden" name="id" value={editingVoucher.id} />}

              {/* Kode Voucher */}
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Kode Kupon / Voucher</span>
                <Input
                  name="code"
                  defaultValue={editingVoucher?.code ?? ""}
                  placeholder="Contoh: DISKON20, HEMAT50K"
                  className="uppercase font-mono tracking-wider"
                  required
                  minLength={2}
                  maxLength={30}
                />
                <span className="text-xs text-muted-foreground">
                  Hanya huruf besar, angka, dan tanda hubung (- atau _).
                </span>
              </label>

              {/* Deskripsi */}
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Deskripsi Promo</span>
                <Input
                  name="description"
                  defaultValue={editingVoucher?.description ?? ""}
                  placeholder="Contoh: Diskon 20% khusus Laptop & Tablet"
                />
              </label>

              {/* Cakupan / Sasaran Produk */}
              <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="size-4 text-primary" />
                    Cakupan Produk yang Berlaku
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {targetScope === "all"
                      ? "Semua Produk"
                      : targetScope === "category"
                      ? `${selectedCategories.length} Kategori Dipilih`
                      : targetScope === "brand"
                      ? `${selectedBrands.length} Merk Dipilih`
                      : `${selectedCategories.length} Kat. + ${selectedBrands.length} Merk`}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                  {[
                    { id: "all", label: "Semua Produk", desc: "Berlaku umum" },
                    { id: "category", label: "Khusus Kategori", desc: "Laptop, Tablet, dll" },
                    { id: "brand", label: "Khusus Merk", desc: "Asus, Apple, dll" },
                    { id: "category_and_brand", label: "Kombinasi", desc: "Kategori + Merk" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTargetScope(option.id as VoucherTargetScope)}
                      className={`flex flex-col items-start rounded-lg border p-2 text-left transition-all ${
                        targetScope === option.id
                          ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                          : "border-border bg-background hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight">{option.label}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{option.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Pemilihan Kategori */}
                {(targetScope === "category" || targetScope === "category_and_brand") && (
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Pilih Kategori Produk:
                      </span>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSelectedCategories(categories.map((c) => c.id))}
                          className="text-primary hover:underline"
                        >
                          Pilih Semua
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCategories([])}
                          className="text-muted-foreground hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-lg border border-border/50 bg-background">
                      {categories.map((cat) => {
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground font-medium"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {isSelected ? <Check className="size-3" /> : null}
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}
                      {!categories.length && (
                        <p className="p-2 text-xs text-muted-foreground">Tidak ada kategori ditemukan.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Pemilihan Merk / Brand */}
                {(targetScope === "brand" || targetScope === "category_and_brand") && (
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Pilih Merk / Brand:
                      </span>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSelectedBrands(brands.map((b) => b.id))}
                          className="text-primary hover:underline"
                        >
                          Pilih Semua
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedBrands([])}
                          className="text-muted-foreground hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-lg border border-border/50 bg-background">
                      {brands.map((b) => {
                        const isSelected = selectedBrands.includes(b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => toggleBrand(b.id)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
                              isSelected
                                ? "bg-indigo-600 text-white font-medium"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {isSelected ? <Check className="size-3" /> : null}
                            <span>{b.name}</span>
                          </button>
                        );
                      })}
                      {!brands.length && (
                        <p className="p-2 text-xs text-muted-foreground">Tidak ada merk ditemukan.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Kriteria Kombinasi */}
                {targetScope === "category_and_brand" && (
                  <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs">
                    <span className="font-semibold text-foreground">Aturan Hubungan Kombinasi:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer ${matchCriteria === "all" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                        <input
                          type="radio"
                          name="_match_ui"
                          checked={matchCriteria === "all"}
                          onChange={() => setMatchCriteria("all")}
                          className="mt-0.5 accent-primary"
                        />
                        <span className="text-[11px] leading-snug">
                          <strong>Keduanya (DAN)</strong>
                          <span className="block text-[10px] text-muted-foreground">Harus cocok Kategori DAN Merk</span>
                        </span>
                      </label>
                      <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer ${matchCriteria === "any" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                        <input
                          type="radio"
                          name="_match_ui"
                          checked={matchCriteria === "any"}
                          onChange={() => setMatchCriteria("any")}
                          className="mt-0.5 accent-primary"
                        />
                        <span className="text-[11px] leading-snug">
                          <strong>Salah Satu (ATAU)</strong>
                          <span className="block text-[10px] text-muted-foreground">Cocok Kategori ATAU Merk</span>
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Hidden input tags for Form submission */}
                <input type="hidden" name="target_scope" value={targetScope} />
                {targetScope === "category_and_brand" && (
                  <input type="hidden" name="match_criteria" value={matchCriteria} />
                )}

                {selectedCategories.map((catId) => {
                  const cat = categories.find((c) => c.id === catId);
                  return (
                    <div key={catId} className="hidden">
                      <input type="hidden" name="category_ids" value={catId} />
                      {cat && <input type="hidden" name="category_names" value={cat.name} />}
                    </div>
                  );
                })}

                {selectedBrands.map((brandId) => {
                  const b = brands.find((brand) => brand.id === brandId);
                  return (
                    <div key={brandId} className="hidden">
                      <input type="hidden" name="brand_ids" value={brandId} />
                      {b && <input type="hidden" name="brand_names" value={b.name} />}
                    </div>
                  );
                })}
              </div>

              {/* Tipe Diskon & Nilai */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Tipe Diskon</span>
                  <select
                    name="discount_type"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as VoucherDiscountType)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed_amount">Nominal Tetap (Rp)</option>
                  </select>
                </label>

                <label className="block space-y-1 text-sm">
                  <span className="font-medium">
                    {discountType === "percentage" ? "Nilai Diskon (%)" : "Potongan Harga (Rp)"}
                  </span>
                  <Input
                    name="discount_value"
                    type="number"
                    min={1}
                    max={discountType === "percentage" ? 100 : undefined}
                    defaultValue={editingVoucher?.discount_value ?? ""}
                    placeholder={discountType === "percentage" ? "Contoh: 20" : "Contoh: 50000"}
                    required
                  />
                </label>
              </div>

              {/* Maksimal Diskon (Hanya untuk persentase) */}
              {discountType === "percentage" && (
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Maksimal Potongan Diskon (Rp, opsional)</span>
                  <Input
                    name="max_discount"
                    type="number"
                    min={0}
                    defaultValue={editingVoucher?.max_discount ?? ""}
                    placeholder="Contoh: 300000 (Kosongkan jika tanpa batas maksimal)"
                  />
                  <span className="text-xs text-muted-foreground">
                    Contoh: Diskon 20% maksimal potongan Rp 300.000.
                  </span>
                </label>
              )}

              {/* Minimal Pembelian & Batas Kuota */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Min. Pembelian (Rp)</span>
                  <Input
                    name="min_purchase"
                    type="number"
                    min={0}
                    defaultValue={editingVoucher?.min_purchase ?? 0}
                    placeholder="Contoh: 100000"
                  />
                  <span className="text-xs text-muted-foreground">0 jika tanpa syarat belanja</span>
                </label>

                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Batas Kuota Pemakaian</span>
                  <Input
                    name="usage_limit"
                    type="number"
                    min={1}
                    defaultValue={editingVoucher?.usage_limit ?? ""}
                    placeholder="Kosongkan jika tanpa batas"
                  />
                </label>
              </div>

              {/* Tanggal Mulai & Berakhir */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Tanggal Mulai (opsional)</span>
                  <Input
                    name="start_date"
                    type="date"
                    defaultValue={toLocalDateInput(editingVoucher?.start_date)}
                  />
                </label>

                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Tanggal Berakhir (opsional)</span>
                  <Input
                    name="end_date"
                    type="date"
                    defaultValue={toLocalDateInput(editingVoucher?.end_date)}
                  />
                </label>
              </div>

              {/* Khusus Pengguna Baru / Transaksi Pertama */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_new_customer_only"
                    value="true"
                    defaultChecked={editingVoucher ? Boolean(editingVoucher.is_new_customer_only) : false}
                    className="size-4 mt-0.5 rounded accent-primary"
                  />
                  <div>
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-4 text-primary" />
                      Khusus Pengguna Baru / Transaksi Pertama
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Voucher hanya berlaku 1 kali untuk pelanggan yang belum pernah bertransaksi.
                      Sistem memverifikasi riwayat pesanan akun dan nomor WhatsApp/HP untuk mencegah manipulasi akun duplikat.
                    </span>
                  </div>
                </label>
              </div>

              {/* Status Aktif */}
              <label className="flex items-center gap-2 text-sm pt-1">
                <input
                  type="checkbox"
                  name="is_active"
                  value="true"
                  defaultChecked={editingVoucher ? editingVoucher.is_active : true}
                  className="size-4 rounded accent-primary"
                />
                <span className="font-medium">Aktifkan voucher ini segera</span>
              </label>

              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenModal(false)}
                  disabled={isPending}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : editingVoucher ? (
                    "Simpan Perubahan"
                  ) : (
                    "Buat Voucher"
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

