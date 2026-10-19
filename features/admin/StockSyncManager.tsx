"use client";

import { useState, useRef, useTransition } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  User,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  RotateCcw,
  Boxes,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  type StockSyncPreviewResult,
  type StockSyncPreviewItem,
  type DuplicateConflictResolution,
} from "@/lib/stock-sync";
import {
  applyStockSyncAction,
  type StockSyncHistoryRecord,
  type ApplyStockItemInput,
} from "@/actions/stock-sync";

export function StockSyncManager({
  initialHistory = [],
}: {
  initialHistory?: StockSyncHistoryRecord[];
}) {
  const [activeTab, setActiveTab] = useState<"sync" | "history">("sync");
  const [files, setFiles] = useState<File[]>([]);
  const [stockSourceMode, setStockSourceMode] = useState<"main_only" | "combined" | "external_only">("main_only");
  const [onlineOrdersAccounted, setOnlineOrdersAccounted] = useState(false);
  const [duplicateResolutions, setDuplicateResolutions] = useState<
    Record<string, { resolution: DuplicateConflictResolution; customStock?: number }>
  >({});
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<StockSyncPreviewResult | null>(null);
  const [previewFilter, setPreviewFilter] = useState<"all" | "match" | "conflict" | "review" | "not_found">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const [isApplying, startApplyTransition] = useTransition();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [applyResult, setApplyResult] = useState<{ success: boolean; count: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [historyList, setHistoryList] = useState<StockSyncHistoryRecord[]>(initialHistory);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles(selected);
      setPreviewData(null);
      setSelectedItemIds(new Set());
      setDuplicateResolutions({});
      setErrorMessage(null);
      setApplyResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.match(/\.(xlsx|xls)$/i)
      );
      if (dropped.length > 0) {
        setFiles(dropped);
        setPreviewData(null);
        setSelectedItemIds(new Set());
        setDuplicateResolutions({});
        setErrorMessage(null);
        setApplyResult(null);
      }
    }
  };

  // Generate / reload preview
  const fetchPreview = async (
    overrideResolutions?: Record<string, { resolution: DuplicateConflictResolution; customStock?: number }>,
    overrideSourceMode?: "main_only" | "combined" | "external_only",
    overrideOnlineAccounted?: boolean
  ) => {
    if (files.length === 0) return;
    setIsLoadingPreview(true);
    setErrorMessage(null);

    const activeMode = overrideSourceMode ?? stockSourceMode;
    const activeAccounted = overrideOnlineAccounted ?? onlineOrdersAccounted;

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      formData.set("onlineOrdersAccounted", String(activeAccounted));
      formData.set("includeExternalWarehouse", String(activeMode === "combined"));
      formData.set("stockSourceMode", activeMode);

      const resolutionsToUse = overrideResolutions ?? duplicateResolutions;
      if (Object.keys(resolutionsToUse).length > 0) {
        formData.set("duplicateResolutions", JSON.stringify(resolutionsToUse));
      }

      const res = await fetch("/api/admin/stock-sync/preview", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal memproses file stok.");
      }

      setPreviewData(json.data);
      // Auto-select all matched items
      const initialSelected = new Set<string>();
      for (const item of (json.data.items || [])) {
        if (item.status === "match" && item.targetId) {
          initialSelected.add(item.id);
        }
      }
      setSelectedItemIds(initialSelected);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat preview.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Handle conflict resolution change for an item
  const handleResolutionChange = (sku: string, resolution: DuplicateConflictResolution) => {
    const updated = {
      ...duplicateResolutions,
      [sku.toUpperCase()]: { resolution },
    };
    setDuplicateResolutions(updated);
    fetchPreview(updated);
  };

  // Batch resolve all conflicts
  const handleBatchResolveConflicts = (resolution: DuplicateConflictResolution) => {
    if (!previewData) return;
    const updated = { ...duplicateResolutions };
    for (const item of previewData.items) {
      if (item.status === "duplicate_conflict" || item.conflictDetails?.hasConflict) {
        updated[item.sku.toUpperCase()] = { resolution };
      }
    }
    setDuplicateResolutions(updated);
    fetchPreview(updated);
  };

  // Selection handlers
  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allMatchedItems = (previewData?.items || []).filter((i) => i.status === "match" && i.targetId);
  const allMatchedSelected = allMatchedItems.length > 0 && allMatchedItems.every((i) => selectedItemIds.has(i.id));

  const toggleSelectAll = () => {
    if (allMatchedSelected) {
      setSelectedItemIds(new Set());
    } else {
      const allIds = new Set<string>();
      for (const item of allMatchedItems) {
        allIds.add(item.id);
      }
      setSelectedItemIds(allIds);
    }
  };

  // Apply changes to database
  const handleConfirmApply = () => {
    if (!previewData) return;

    // Filter items that are matched, safe to apply, and selected by admin
    const validItems: ApplyStockItemInput[] = previewData.items
      .filter((item) => item.status === "match" && item.targetId && item.targetType && selectedItemIds.has(item.id))
      .map((item) => ({
        sku: item.sku,
        targetId: item.targetId!,
        targetType: item.targetType!,
        parentProductId: item.parentProductId,
        finalStock: item.finalStock,
        previousStock: item.currentWebStock,
        excelStock: item.excelStock,
        externalWarehouseStock: item.externalWarehouseStock,
        webReconciledQty: item.unreconciledWebQuantity,
        name: item.matchedName || item.sourceTitle,
      }));

    if (validItems.length === 0) {
      setErrorMessage("Tidak ada item yang dipilih untuk diterapkan. Centang minimal satu barang yang cocok.");
      setShowConfirmModal(false);
      return;
    }

    startApplyTransition(async () => {
      try {
        const result = await applyStockSyncAction({
          items: validItems,
          filename: previewData.fileNames.join(", "),
          includeExternalWarehouse: stockSourceMode === "combined",
          onlineOrdersAccounted,
          totalRows: previewData.totalRows,
          matchedCount: previewData.summary.matched,
          unmatchedCount: previewData.summary.notFound,
          conflictCount: previewData.summary.conflicts,
        });

        setApplyResult({ success: true, count: result.appliedCount });
        setShowConfirmModal(false);

        // Refresh preview after application
        await fetchPreview();

        // Update history view
        const newHistItem: StockSyncHistoryRecord = {
          id: result.historyId || `hist-${Date.now()}`,
          filename: previewData.fileNames.join(", "),
          file_hash: null,
          admin_id: null,
          admin_name: "Admin",
          total_rows: previewData.totalRows,
          matched_count: previewData.summary.matched,
          unmatched_count: previewData.summary.notFound,
          conflict_count: previewData.summary.conflicts,
          applied_count: result.appliedCount,
          include_external_warehouse: stockSourceMode === "combined",
          online_orders_accounted: onlineOrdersAccounted,
          summary: {},
          created_at: new Date().toISOString(),
        };
        setHistoryList((prev) => [newHistItem, ...prev]);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Gagal menerapkan pembaruan stok.");
        setShowConfirmModal(false);
      }
    });
  };

  // Filter items in preview
  const filteredItems = (previewData?.items || []).filter((item) => {
    // Status filter
    if (previewFilter === "match" && item.status !== "match") return false;
    if (previewFilter === "conflict" && item.status !== "duplicate_conflict") return false;
    if (previewFilter === "review" && item.status !== "needs_review" && item.status !== "ambiguous" && item.status !== "invalid") return false;
    if (previewFilter === "not_found" && item.status !== "not_found") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchTitle = item.sourceTitle.toLowerCase().includes(q);
      const matchDb = item.matchedName?.toLowerCase().includes(q);
      return matchSku || matchTitle || Boolean(matchDb);
    }
    return true;
  });

  const unresolvedConflictsCount = (previewData?.items || []).filter(
    (i) => i.status === "duplicate_conflict"
  ).length;

  const selectedMatchedCount = previewData?.items.filter(
    (i) => i.status === "match" && i.targetId && selectedItemIds.has(i.id)
  ).length ?? 0;

  return (
    <div className="space-y-6">
      {/* 1. Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Sinkronisasi Stok Offline
            </h1>
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800">
              Multi-Vendor Excel
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Unggah rekapan stok Excel dari server kantor (`cpu stock all.xlsx`, `notebook stock all.xlsx`, atau template resmi), rekonsiliasikan dengan transaksi online toko secara aman, dan terapkan pembaruan tanpa risiko oversell.
          </p>
        </div>

        {/* Quick Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/admin/stock-sync/template?type=empty"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-2xs"
          >
            <Download className="size-3.5 text-purple-600 dark:text-purple-400" />
            Template Kosong (.xlsx)
          </a>
          <a
            href="/api/admin/stock-sync/template?type=dummy"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2028] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-2xs"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            Contoh File Dummy (.xlsx)
          </a>
        </div>
      </div>

      {/* 2. Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("sync")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "sync"
              ? "bg-[#7C5CFC] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <UploadCloud className="size-4" />
          Sinkronisasi & Preview
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "history"
              ? "bg-[#7C5CFC] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Clock className="size-4" />
          Riwayat Sinkronisasi ({historyList.length})
        </button>
      </div>

      {/* 3. TAB 1: SYNC & PREVIEW */}
      {activeTab === "sync" && (
        <div className="space-y-6">
          {/* Collapsible Format Guide */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E2028] p-4 shadow-2xs">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="size-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Panduan Kolom & Format Excel Sumber Kantor
                </span>
              </div>
              {showGuide ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
            </button>

            {showGuide && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <p>
                  Sistem mendukung dua format file:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>
                    <strong>Format Server Kantor Asli (`cpu stock all.xlsx` & `notebook stock all.xlsx`):</strong> Memiliki kolom <code>IdBarang</code>, <code>Kategori</code>, <code>Merk</code>, <code>Tipe</code>, <code>Stok</code>, <code>GudangLuar</code>, dan <code>TglBeli</code>. Kode SKU/MTM produk diambil otomatis dari kode di dalam tanda kurung pada kolom <code>Tipe</code> (misal: <code>(82X6006FID)</code>, <code>(UD.BPDSD.006)</code>, atau <code>(90PT03XA-M099S0)</code>).
                  </li>
                  <li>
                    <strong>Template Resmi Toko:</strong> Memiliki kolom <code>SKU/MTM</code> eksplisit, <code>Nama Produk</code>, <code>Stok</code>, <code>GudangLuar</code>, dan <code>Catatan</code>.
                  </li>
                  <li>
                    <strong>Penting:</strong> <code>IdBarang</code> dianggap sebagai ID sistem internal sumber, bukan sebagai SKU katalog web.
                  </li>
                  <li>
                    <strong>Perlindungan Transaksi Online:</strong> Pesanan berstatus <em>pending, processing, ready_for_pickup,</em> dan <em>shipped</em> secara otomatis dikurangkan dari stok offline jika opsi rekonsiliasi aktif, mencegah barang terjual ganda.
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Upload Card & Mode Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Zone */}
            <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-white dark:bg-[#1E2028] p-6 text-center hover:border-purple-400 dark:hover:border-purple-500 transition-colors shadow-2xs">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
                id="stock-file-input"
              />

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer flex flex-col items-center justify-center space-y-3 py-6"
              >
                <div className="size-14 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 grid place-items-center">
                  <UploadCloud className="size-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pilih atau Tarik File Excel Stok ke Sini
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Mendukung satu atau beberapa file sekaligus (.xlsx, .xls)
                  </p>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {files.map((f, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100/70 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold"
                      >
                        <FileSpreadsheet className="size-3.5" />
                        {f.name} ({(f.size / 1024).toFixed(0)} KB)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reconciliation Options Card */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E2028] p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="size-4 text-purple-600 dark:text-purple-400" />
                    Pilihan Sumber & Hitungan Stok
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pilih stok mana yang mau diambil dan bagaimana perhitungannya dengan order web.
                  </p>
                </div>

                {/* Option A: Which stock columns to take? */}
                <div className="space-y-2 text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                    1. Stok mana yang mau diambil untuk jualan?
                  </label>
                  <div className="space-y-1.5">
                    <label
                      onClick={() => setStockSourceMode("main_only")}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        stockSourceMode === "main_only"
                          ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-slate-900 dark:text-white"
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="stock-source-mode"
                        checked={stockSourceMode === "main_only"}
                        onChange={() => setStockSourceMode("main_only")}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-bold block">Hanya Stok Gudang Kantor Saja</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          (Paling umum & aman) Mengambil angka dari kolom <code>Stok</code> utama di Excel.
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setStockSourceMode("combined")}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        stockSourceMode === "combined"
                          ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-slate-900 dark:text-white"
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="stock-source-mode"
                        checked={stockSourceMode === "combined"}
                        onChange={() => setStockSourceMode("combined")}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-bold block">Gabung Stok Kantor + Gudang Luar</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Total <code>Stok + GudangLuar</code> dijumlahkan agar pembeli web bisa langsung pesan.
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setStockSourceMode("external_only")}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        stockSourceMode === "external_only"
                          ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-slate-900 dark:text-white"
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="stock-source-mode"
                        checked={stockSourceMode === "external_only"}
                        onChange={() => setStockSourceMode("external_only")}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-bold block">Hanya Stok Gudang Luar Saja</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Khusus mengambil angka persediaan dari kolom <code>GudangLuar</code>.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Option B: Online Orders Reconciliation Mode */}
                <div className="space-y-2 text-xs pt-1 border-t border-slate-100 dark:border-white/5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                    2. Apakah Excel sudah memperhitungkan pesanan web?
                  </label>

                  <div className="space-y-1.5">
                    <label
                      onClick={() => setOnlineOrdersAccounted(false)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        !onlineOrdersAccounted
                          ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-slate-900 dark:text-white"
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reconcile-mode"
                        checked={!onlineOrdersAccounted}
                        onChange={() => setOnlineOrdersAccounted(false)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-bold block">Belum, Ini Stok Fisik Murni (Disarankan)</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Sistem otomatis menyisihkan stok untuk pesanan pembeli web yang masih berjalan (pending/dikemas/dikirim) agar tidak kejual dobel.
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setOnlineOrdersAccounted(true)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        onlineOrdersAccounted
                          ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-slate-900 dark:text-white"
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reconcile-mode"
                        checked={onlineOrdersAccounted}
                        onChange={() => setOnlineOrdersAccounted(true)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-bold block">Sudah Bersih (Sudah Potong Order Web)</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Tim kantor sudah memotong semua order web ke Excel. Sistem langsung pasang angka di Excel apa adanya.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Button: Generate Preview */}
              <Button
                onClick={() => fetchPreview()}
                disabled={files.length === 0 || isLoadingPreview}
                className="w-full bg-[#7C5CFC] hover:bg-[#6A48F3] text-white text-xs font-bold py-2.5 rounded-xl shadow-xs"
              >
                {isLoadingPreview ? (
                  <>
                    <RefreshCw className="size-4 animate-spin mr-2" />
                    Membaca & Mencocokkan Stok...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="size-4 mr-2" />
                    Cek & Cocokkan Stok Excel
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Feedback & Error Alerts */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0 text-rose-500" />
              <div>
                <p className="font-bold">Gagal Memproses:</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {applyResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold">Sinkronisasi Berhasil Diterapkan!</p>
                <p className="mt-0.5">
                  Berhasil memperbarui stok untuk {applyResult.count} item produk/varian di database.
                </p>
              </div>
            </div>
          )}

          {/* 4. PREVIEW HASIL PENCOCOKAN STOK */}
          {previewData && (
            <div className="space-y-4 pt-2">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1E2028]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Total Data Excel</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {previewData.totalRows}
                  </p>
                  <span className="text-[10px] text-slate-400">Dari {previewData.fileNames.length} file</span>
                </div>

                <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Siap Update ke Web</span>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                    {previewData.summary.matched}
                  </p>
                  <span className="text-[10px] text-emerald-600/80">Cocok dengan katalog toko</span>
                </div>

                <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20">
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">SKU Dobel di Excel</span>
                  <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">
                    {previewData.summary.conflicts}
                  </p>
                  <span className="text-[10px] text-amber-600/80">Muncul berulang kali</span>
                </div>

                <div className="p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20">
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">Perlu Dicek Dulu</span>
                  <p className="text-xl font-black text-rose-700 dark:text-rose-300 mt-1">
                    {previewData.summary.needsReview}
                  </p>
                  <span className="text-[10px] text-rose-600/80">Stok minus / pilih varian</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1E2028]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Belum Ada di Toko</span>
                  <p className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">
                    {previewData.summary.notFound}
                  </p>
                  <span className="text-[10px] text-slate-400">Tidak ada SKU yang cocok</span>
                </div>
              </div>

              {/* Conflict Batch Action Banner if conflicts exist */}
              {unresolvedConflictsCount > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="size-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Perhatian: Ada {unresolvedConflictsCount} SKU yang dobel (muncul berulang) di file Excel!
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                        Pilih stok mana yang mau dipakai untuk masing-masing barang, atau pakai tombol praktis di samping:
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBatchResolveConflicts("sum")}
                      className="text-xs h-8 border-amber-300 text-amber-900 dark:text-amber-100 bg-white dark:bg-amber-900/30 hover:bg-amber-100"
                    >
                      Total Semua Baris
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBatchResolveConflicts("keep_last")}
                      className="text-xs h-8 border-amber-300 text-amber-900 dark:text-amber-100 bg-white dark:bg-amber-900/30 hover:bg-amber-100"
                    >
                      Pakai Baris Terakhir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBatchResolveConflicts("max")}
                      className="text-xs h-8 border-amber-300 text-amber-900 dark:text-amber-100 bg-white dark:bg-amber-900/30 hover:bg-amber-100"
                    >
                      Pakai Stok Terbanyak
                    </Button>
                  </div>
                </div>
              )}

              {/* Filters and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setPreviewFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      previewFilter === "all"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    Semua ({previewData.items.length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter("match")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      previewFilter === "match"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
                    }`}
                  >
                    Siap Update ({previewData.summary.matched})
                  </button>
                  <button
                    onClick={() => setPreviewFilter("conflict")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      previewFilter === "conflict"
                        ? "bg-amber-600 text-white"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    SKU Dobel ({previewData.summary.conflicts})
                  </button>
                  <button
                    onClick={() => setPreviewFilter("review")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      previewFilter === "review"
                        ? "bg-rose-600 text-white"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100"
                    }`}
                  >
                    Perlu Dicek ({previewData.summary.needsReview})
                  </button>
                  <button
                    onClick={() => setPreviewFilter("not_found")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      previewFilter === "not_found"
                        ? "bg-slate-600 text-white"
                        : "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    Belum Ada ({previewData.summary.notFound})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Cari SKU atau nama..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-white dark:bg-[#1E2028]"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E2028] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-white/10">
                      <tr>
                        <th className="py-3 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={allMatchedSelected}
                            onChange={toggleSelectAll}
                            title="Centang/Lepas Semua Barang yang Cocok"
                            className="size-4 rounded border-slate-300 text-[#7C5CFC] focus:ring-[#7C5CFC] cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">SKU / Kode Barang</th>
                        <th className="py-3 px-3 min-w-[200px]">Nama Barang di Web & Excel</th>
                        <th className="py-3 px-3 text-center">Stok Web Sekarang</th>
                        <th className="py-3 px-3 text-center">Stok di Excel</th>
                        <th className="py-3 px-3 text-center">Gudang Luar</th>
                        {!onlineOrdersAccounted && (
                          <th className="py-3 px-3 text-center text-purple-600 dark:text-purple-400" title="Pesanan pembeli di web yang masih diproses/belum selesai">
                            Order Web Tertahan
                          </th>
                        )}
                        <th className="py-3 px-3 text-center">Perubahan (+/-)</th>
                        <th className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">Stok Siap Jual Baru</th>
                        <th className="py-3 px-4 min-w-[180px]">Pilihan Aksi / Info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredItems.map((item) => {
                        const isConflict = item.status === "duplicate_conflict" || item.conflictDetails?.hasConflict;
                        const isNegative = item.finalStock < 0;
                        const isMatch = item.status === "match" && Boolean(item.targetId);
                        const isSelected = selectedItemIds.has(item.id);

                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-white/5 ${
                              isConflict
                                ? "bg-amber-50/30 dark:bg-amber-950/10"
                                : isNegative
                                ? "bg-rose-50/30 dark:bg-rose-950/10"
                                : !isSelected && isMatch
                                ? "opacity-60 bg-slate-50/40 dark:bg-white/2"
                                : ""
                            }`}
                          >
                            {/* Checkbox Pilih / Lewati Baris */}
                            <td className="py-3 px-3 text-center">
                              {isMatch ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectItem(item.id)}
                                  className="size-4 rounded border-slate-300 text-[#7C5CFC] focus:ring-[#7C5CFC] cursor-pointer"
                                  title={isSelected ? "Barang ini akan di-update ke toko web" : "Barang ini dilewati (tidak diubah)"}
                                />
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3">
                              {item.status === "match" && (
                                <Badge className="bg-emerald-500 text-white text-[10px] font-bold">
                                  Siap Update
                                </Badge>
                              )}
                              {item.status === "duplicate_conflict" && (
                                <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                                  SKU Dobel
                                </Badge>
                              )}
                              {item.status === "needs_review" && (
                                <Badge className="bg-rose-500 text-white text-[10px] font-bold">
                                  Cek Dulu
                                </Badge>
                              )}
                              {item.status === "ambiguous" && (
                                <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                                  Pilih Varian
                                </Badge>
                              )}
                              {item.status === "not_found" && (
                                <Badge variant="outline" className="text-slate-500 text-[10px]">
                                  Belum Ada
                                </Badge>
                              )}
                              {item.status === "invalid" && (
                                <Badge className="bg-slate-400 text-white text-[10px]">
                                  Data Kurang
                                </Badge>
                              )}
                            </td>

                            {/* SKU / MTM */}
                            <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                              {item.sku}
                            </td>

                            {/* Item & Source Details */}
                            <td className="py-3 px-3">
                              {item.matchedName ? (
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-white">
                                    {item.matchedName}
                                  </p>
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={item.sourceTitle}>
                                    Sumber Excel: {item.sourceBrand} · {item.sourceTitle}
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-medium text-slate-700 dark:text-slate-300">
                                    {item.sourceTitle}
                                  </p>
                                  <span className="text-[10px] text-slate-400">
                                    Brand: {item.sourceBrand} · Kategori: {item.sourceCategory}
                                  </span>
                                </div>
                              )}
                              {item.sourceRows.length > 1 && (
                                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                                  Ada {item.sourceRows.length} baris dengan SKU ini di Excel
                                </p>
                              )}
                            </td>

                            {/* Current Web Stock */}
                            <td className="py-3 px-3 text-center tabular-nums text-slate-600 dark:text-slate-300">
                              {item.targetId ? item.currentWebStock : "—"}
                            </td>

                            {/* Excel Stock */}
                            <td className="py-3 px-3 text-center tabular-nums font-semibold text-slate-900 dark:text-white">
                              {item.excelStock}
                            </td>

                            {/* External Warehouse */}
                            <td className="py-3 px-3 text-center tabular-nums text-slate-500">
                              {item.externalWarehouseStock > 0 ? (
                                <span className={stockSourceMode === "combined" ? "text-emerald-600 font-semibold" : ""}>
                                  {item.externalWarehouseStock}
                                </span>
                              ) : (
                                0
                              )}
                            </td>

                            {/* Web Committed Orders */}
                            {!onlineOrdersAccounted && (
                              <td className="py-3 px-3 text-center tabular-nums">
                                {item.unreconciledWebQuantity > 0 ? (
                                  <span
                                    title={item.activeWebOrders.map((o) => `#${o.orderNumber} (${o.quantity} unit, ${o.status})`).join(", ")}
                                    className="inline-flex items-center gap-1 font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full cursor-help"
                                  >
                                    -{item.unreconciledWebQuantity}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">0</span>
                                )}
                              </td>
                            )}

                            {/* Difference */}
                            <td className="py-3 px-3 text-center tabular-nums">
                              {item.targetId ? (
                                <span
                                  className={`font-semibold ${
                                    item.diff > 0
                                      ? "text-emerald-600"
                                      : item.diff < 0
                                      ? "text-rose-600"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {item.diff > 0 ? `+${item.diff}` : item.diff}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            {/* Final Stock */}
                            <td className="py-3 px-3 text-center tabular-nums font-black text-sm">
                              {item.targetId ? (
                                <span className={isNegative ? "text-rose-600" : isSelected ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}>
                                  {item.finalStock}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            {/* Conflict Resolution Selector or Action Status */}
                            <td className="py-3 px-4">
                              {item.conflictDetails?.hasConflict ? (
                                <div className="space-y-1">
                                  <select
                                    value={item.conflictDetails.selectedResolution}
                                    onChange={(e) =>
                                      handleResolutionChange(item.sku, e.target.value as DuplicateConflictResolution)
                                    }
                                    className="w-full text-xs rounded-lg border border-amber-300 bg-white dark:bg-[#1E2028] p-1.5 text-slate-800 dark:text-slate-200"
                                  >
                                    {item.conflictDetails.options.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : isMatch ? (
                                <div className="flex items-center gap-1.5">
                                  {isSelected ? (
                                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      ✓ Siap di-update
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">
                                      Dilewati (tidak diubah)
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectItem(item.id)}
                                    className="text-[10px] text-purple-600 hover:underline ml-auto"
                                  >
                                    {isSelected ? "Lewati" : "Pilih"}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 line-clamp-2" title={item.statusMessage}>
                                  {item.statusMessage}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-xs text-slate-400">
                            Tidak ada data yang sesuai filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Action Footer */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-white">{selectedMatchedCount}</span> dari {previewData.summary.matched} barang cocok dipilih untuk di-update ke web.
                    {unresolvedConflictsCount > 0 && (
                      <span className="text-amber-600 font-bold ml-2">
                        (Ada {unresolvedConflictsCount} SKU dobel yang harus dipilih tindakannya dulu)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPreviewData(null)}
                      className="text-xs h-9 rounded-xl"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={selectedMatchedCount === 0 || unresolvedConflictsCount > 0 || isApplying}
                      className="bg-[#7C5CFC] hover:bg-[#6A48F3] text-white text-xs font-bold h-9 px-5 rounded-xl shadow-xs"
                    >
                      Update Stok ke Web ({selectedMatchedCount} Barang)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. CONFIRMATION MODAL */}
          {showConfirmModal && previewData && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-[#1E2028] rounded-2xl border border-slate-200 dark:border-white/10 p-6 max-w-lg w-full space-y-4 shadow-xl">
                <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
                  <div className="size-10 rounded-full bg-purple-50 dark:bg-purple-950/40 grid place-items-center">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Konfirmasi Update Stok ke Toko Web
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cek ringkasan di bawah ini sebelum stok di web resmi diperbarui.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-4 text-xs space-y-2.5 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>Barang yang Di-update:</span>
                    <strong className="text-slate-900 dark:text-white">{selectedMatchedCount} produk / varian</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>File Sumber Excel:</span>
                    <span className="font-mono text-[11px]">{previewData.fileNames.join(", ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sumber Stok Excel:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {stockSourceMode === "main_only"
                        ? "Hanya Stok Kantor"
                        : stockSourceMode === "combined"
                        ? "Gabungan Kantor + Gudang Luar"
                        : "Hanya Gudang Luar"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Perhitungan Order Online:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {onlineOrdersAccounted
                        ? "File Excel sudah potong order web"
                        : "Otomatis diamankan (dikurangi pesanan web yang masih aktif)"}
                    </strong>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Setelah tombol konfirmasi ditekan, stok produk di web langsung diperbarui sesuai angka <strong>Stok Siap Jual Baru</strong> dan pembeli bisa langsung melihat stok terbarunya.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isApplying}
                    className="text-xs h-9 rounded-xl"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleConfirmApply}
                    disabled={isApplying}
                    className="bg-[#7C5CFC] hover:bg-[#6A48F3] text-white text-xs font-bold h-9 px-4 rounded-xl shadow-xs"
                  >
                    {isApplying ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin mr-1.5" />
                        Menyimpan ke Database...
                      </>
                    ) : (
                      `Ya, Update ${selectedMatchedCount} Barang Sekarang`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 2: SYNC HISTORY */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E2028] overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Riwayat Sesi Sinkronisasi Stok
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Catatan waktu, admin pelaksana, dan ringkasan eksekusi impor stok offline sebelumnya.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-white/10">
                <tr>
                  <th className="py-3 px-4">Waktu Eksekusi</th>
                  <th className="py-3 px-3">Nama File Excel</th>
                  <th className="py-3 px-3">Admin</th>
                  <th className="py-3 px-3 text-center">Total Baris</th>
                  <th className="py-3 px-3 text-center">Diterapkan</th>
                  <th className="py-3 px-3 text-center">Gudang Luar</th>
                  <th className="py-3 px-4">Mode Transaksi Web</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {historyList.map((hist) => {
                  const dateStr = new Date(hist.created_at).toLocaleString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

                  return (
                    <tr key={hist.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5">
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {dateStr} WIB
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                        {hist.filename}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                          <User className="size-3 text-slate-400" />
                          {hist.admin_name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums text-slate-600">
                        {hist.total_rows}
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        {hist.applied_count} item
                      </td>
                      <td className="py-3 px-3 text-center">
                        {hist.include_external_warehouse ? (
                          <Badge variant="outline" className="text-emerald-600 text-[10px]">
                            Disertakan
                          </Badge>
                        ) : (
                          <span className="text-slate-400">Tidak</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {hist.online_orders_accounted ? (
                          <span className="text-slate-600">Sudah dihitung di file</span>
                        ) : (
                          <span className="text-purple-600 font-medium">Rekonsiliasi otomatis web</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {historyList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      Belum ada riwayat sinkronisasi stok offline.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
