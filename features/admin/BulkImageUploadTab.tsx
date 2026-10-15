/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useMemo } from "react";
import {
  FileArchive,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Search,
  RotateCcw,
  LoaderCircle,
  Eye,
  Check,
  ImageIcon,
  FolderArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { BulkImagePreviewResult } from "@/lib/bulk-image-upload";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface BulkImageUploadTabProps {
  onImagesImported?: () => Promise<void>;
}

export function BulkImageUploadTab({ onImagesImported }: BulkImageUploadTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<BulkImagePreviewResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "product" | "variant" | "review" | "missing">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string } | null>(null);

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Pilih berkas arsip dengan format .zip.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("Ukuran file ZIP melebihi batas maksimal 50 MB.");
      return;
    }

    setError("");
    setSuccessNotice("");
    setSelectedFile(file);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const res = await fetch("/api/admin/products/import/images/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses pratinjau gambar dari file ZIP.");
      }

      setPreviewResult(data as BulkImagePreviewResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat membaca file ZIP.");
      setPreviewResult(null);
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExecuteUpload = async () => {
    if (!selectedFile || !previewResult) return;

    const validCount = previewResult.matchedCount;
    if (validCount === 0) {
      setError("Tidak ada gambar yang cocok dengan SKU produk atau varian untuk diupload.");
      return;
    }

    setError("");
    setSuccessNotice("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("overwriteExisting", String(overwriteExisting));

      const res = await fetch("/api/admin/products/import/images/confirm", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah foto produk ke penyimpanan.");
      }

      setSuccessNotice(
        `Berhasil mengunggah ${data.uploadedCount} foto produk (${data.updatedProductsCount} produk induk, ${data.updatedVariantsCount} varian). Semua data tersimpan aman.`
      );

      // Refresh parent table if callback provided
      if (onImagesImported) {
        await onImagesImported();
      }

      // Reset file and preview
      setSelectedFile(null);
      setPreviewResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah foto.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewResult(null);
    setError("");
    setSuccessNotice("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Filtered preview items
  const filteredItems = useMemo(() => {
    if (!previewResult) return [];

    return previewResult.items.filter((item) => {
      // 1. Status Filter
      if (statusFilter === "product" && item.status !== "matched_product") return false;
      if (statusFilter === "variant" && item.status !== "matched_variant") return false;
      if (
        statusFilter === "review" &&
        item.status !== "unmatched" &&
        item.status !== "duplicate" &&
        item.status !== "ambiguous" &&
        item.status !== "invalid_format"
      ) {
        return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSku = item.extractedSku.toLowerCase().includes(q);
        const matchesName = item.matchedProductName?.toLowerCase().includes(q) ?? false;
        const matchesFile = item.fileName.toLowerCase().includes(q);
        const matchesVar = item.matchedVariantDetails?.toLowerCase().includes(q) ?? false;
        if (!matchesSku && !matchesName && !matchesFile && !matchesVar) return false;
      }

      return true;
    });
  }, [previewResult, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
              <FolderArchive className="size-5 text-primary" />
              Bulk Upload Foto Produk (Arsip ZIP)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Unggah file ZIP yang berisi kumpulan foto produk. Sistem akan mencocokkan nama file foto dengan{" "}
              <strong className="text-foreground">SKU / MTM produk induk</strong> atau{" "}
              <strong className="text-foreground">variant_sku</strong> secara persis (contoh:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground font-mono text-[11px]">F0HN00Q3ID.jpg</code>
              ).
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
              Maks. 50 MB / ZIP
            </Badge>
          </div>
        </div>
      </div>

      {/* Success & Error alerts */}
      {successNotice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Upload Berhasil!</p>
            <p className="text-xs">{successNotice}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Terjadi Kesalahan</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* File Upload Dropzone (When no preview is active) */}
      {!previewResult && !isAnalyzing && (
        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center hover:border-primary/50 transition-colors bg-card">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <UploadCloud className="size-7" />
          </div>
          <h4 className="text-base font-semibold text-foreground">Pilih Berkas ZIP Foto Produk</h4>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            Pastikan foto di dalam ZIP diberi nama sesuai SKU/MTM produk (misal:{" "}
            <span className="font-mono text-foreground font-medium">F0HN00Q3ID.jpg</span> atau{" "}
            <span className="font-mono text-foreground font-medium">83HX001AID.png</span>). Format didukung: JPG, PNG,
            WebP, AVIF.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="sr-only"
              id="bulk-zip-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                void handleFileSelect(file);
              }}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 cursor-pointer"
            >
              <FileArchive className="size-4" />
              Pilih Berkas ZIP
            </Button>
          </div>
        </div>
      )}

      {/* Loading state during ZIP extraction */}
      {isAnalyzing && (
        <div className="rounded-2xl border border-border p-12 text-center bg-card space-y-3">
          <LoaderCircle className="size-8 animate-spin mx-auto text-primary" />
          <h4 className="text-base font-semibold text-foreground">Sedang Mengekstrak &amp; Menganalisis ZIP...</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Sistem sedang memeriksa integritas berkas, mengekstrak pratinjau thumbnail, dan mencocokkan SKU dengan katalog produk &amp; varian.
          </p>
        </div>
      )}

      {/* Preview Section (Once ZIP is loaded and parsed) */}
      {previewResult && !isAnalyzing && (
        <div className="space-y-6">
          {/* Top Info & Overwrite Policy Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileArchive className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{selectedFile?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : 0} MB · {previewResult.totalZipFiles}{" "}
                  berkas foto terdeteksi
                </p>
              </div>
            </div>

            {/* Overwrite Toggle */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="size-4 rounded border-input accent-primary"
                />
                <span>Ganti / Timpa foto lama jika sudah ada (Overwrite)</span>
              </label>
              <Button type="button" variant="outline" size="sm" onClick={handleReset} className="h-8 text-xs">
                <RotateCcw className="size-3.5 mr-1" />
                Ganti ZIP
              </Button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border bg-card p-3.5 text-center">
              <p className="text-xs text-muted-foreground font-medium">Total Berkas ZIP</p>
              <p className="mt-1 text-2xl font-bold">{previewResult.totalZipFiles}</p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-center">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Cocok Produk Induk</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {previewResult.matchedProductCount}
              </p>
            </div>

            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5 text-center">
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Cocok Varian</p>
              <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {previewResult.matchedVariantCount}
              </p>
            </div>

            <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-3.5 text-center">
              <p className="text-xs text-teal-700 dark:text-teal-400 font-medium">Penghematan WebP</p>
              <p className="mt-1 text-2xl font-bold text-teal-600 dark:text-teal-400">
                {previewResult.totalSavingsPercent > 0 ? `-${previewResult.totalSavingsPercent}%` : "0%"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate" title={`${formatBytes(previewResult.totalOriginalBytes)} → ${formatBytes(previewResult.totalOptimizedBytes)}`}>
                Hemat {formatBytes(previewResult.totalSavingsBytes)}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-center">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Perlu Review / Error</p>
              <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {previewResult.unmatchedCount + previewResult.duplicateCount + previewResult.invalidCount + previewResult.ambiguousCount}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5 text-center">
              <p className="text-xs text-muted-foreground font-medium">Katalog Tanpa Foto</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {previewResult.productsWithoutImagesCount}
              </p>
            </div>
          </div>

          {/* Warning banner if optimization errors exist */}
          {previewResult.hasOptimizationErrors && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-destructive flex items-start gap-2.5 text-xs animate-in fade-in">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Peringatan: Terdapat gambar yang gagal dioptimasi (rusak/melebihi batas piksel)</p>
                <p className="mt-0.5 opacity-90">
                  Gambar yang gagal telah ditandai error dan diblokir dari proses konfirmasi agar tidak tersimpan sebagai gambar mentah.
                </p>
              </div>
            </div>
          )}

          {/* Action Bar (Upload Trigger) */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-foreground">
                  Siap Menyimpan {previewResult.matchedCount} Foto yang Cocok
                </p>
                {previewResult.totalSavingsBytes > 0 && (
                  <Badge variant="outline" className="border-teal-500/30 text-teal-600 dark:text-teal-400 text-[10px] font-medium">
                    Hemat {formatBytes(previewResult.totalSavingsBytes)} (-{previewResult.totalSavingsPercent}%)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Semua foto dikonversi ke WebP kualitas ~82 (maks. 1600×1600 px).{" "}
                {overwriteExisting
                  ? "Kebijakan: Foto lama yang sudah ada akan diganti dengan foto baru dari ZIP."
                  : "Kebijakan: Foto lama dipertahankan, foto baru ditambahkan ke galeri produk."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleExecuteUpload}
                disabled={isUploading || previewResult.matchedCount === 0}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Mengunggah ke Storage...
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4" />
                    Konfirmasi &amp; Simpan ke Storage
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Semua ({previewResult.items.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("product")}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  statusFilter === "product"
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Cocok Produk ({previewResult.matchedProductCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("variant")}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  statusFilter === "variant"
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Cocok Varian ({previewResult.matchedVariantCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("review")}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  statusFilter === "review"
                    ? "bg-amber-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Perlu Review ({previewResult.unmatchedCount + previewResult.duplicateCount + previewResult.invalidCount + previewResult.ambiguousCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("missing")}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  statusFilter === "missing"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Katalog Tanpa Foto ({previewResult.productsWithoutImagesCount})
              </button>
            </div>

            {statusFilter !== "missing" && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari SKU atau nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            )}
          </div>

          {/* Missing Photos in Catalog Tab */}
          {statusFilter === "missing" && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div>
                <h4 className="font-semibold text-sm">Produk &amp; Varian yang Belum Memiliki Foto di Database</h4>
                <p className="text-xs text-muted-foreground">
                  Daftar item berikut belum memiliki foto di katalog dan belum disertakan dalam berkas ZIP ini.
                </p>
              </div>

              {previewResult.productsWithoutImages.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Hebat! Seluruh produk dan varian katalog sudah memiliki foto.
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y text-xs">
                  {previewResult.productsWithoutImages.map((p, idx) => (
                    <div key={`${p.id}-${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-muted-foreground">
                          {p.isVariant ? `Varian: ${p.variantDetails || "Spesifikasi varian"}` : "Produk Induk"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-mono bg-muted px-2 py-0.5 rounded text-[11px] font-medium">
                          {p.sku}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Main Preview Table of ZIP items */}
          {statusFilter !== "missing" && (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-xs text-left">
                <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3 w-16 text-center">Foto</th>
                    <th className="py-2.5 px-3">Nama Berkas</th>
                    <th className="py-2.5 px-3">Ukuran &amp; Format</th>
                    <th className="py-2.5 px-3 font-mono">SKU Terdeteksi</th>
                    <th className="py-2.5 px-3">Target Database</th>
                    <th className="py-2.5 px-3">Status Pencocokan</th>
                    <th className="py-2.5 px-3">Foto Saat Ini</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredItems.map((item, idx) => {
                    const isMatchedProduct = item.status === "matched_product";
                    const isMatchedVariant = item.status === "matched_variant";
                    const isDuplicate = item.status === "duplicate";
                    const isUnmatched = item.status === "unmatched";
                    const isAmbiguous = item.status === "ambiguous";
                    const isInvalid = item.status === "invalid_format";

                    return (
                      <tr
                        key={`${item.fileName}-${idx}`}
                        className={`hover:bg-muted/20 transition-colors ${
                          isInvalid
                            ? "bg-destructive/10"
                            : isUnmatched
                            ? "bg-amber-500/5"
                            : isDuplicate
                            ? "bg-destructive/5"
                            : isAmbiguous
                            ? "bg-purple-500/5"
                            : ""
                        }`}
                      >
                        {/* Thumbnail */}
                        <td className="py-2.5 px-3 text-center">
                          {item.previewDataUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewModalImage({
                                  url: item.previewDataUrl!,
                                  title: `${item.fileName} (${item.extractedSku})`,
                                })
                              }
                              className="group relative size-10 rounded-lg overflow-hidden border bg-muted mx-auto inline-block focus:outline-none focus:ring-2 focus:ring-primary"
                              title="Klik untuk memperbesar"
                            >
                              <img
                                src={item.previewDataUrl}
                                alt={item.fileName}
                                className="size-full object-cover group-hover:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="size-3.5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="size-10 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground mx-auto">
                              <ImageIcon className="size-4" />
                            </div>
                          )}
                        </td>

                        {/* File Name */}
                        <td className="py-2.5 px-3 font-medium">
                          <p className="truncate max-w-[180px]" title={item.fileName}>
                            {item.fileName}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {formatBytes(item.fileSize)}
                          </span>
                        </td>

                        {/* Ukuran & Format (Before -> After WebP) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {item.optimizedSize != null ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-medium">
                                <span className="text-muted-foreground line-through text-[10px]">
                                  {formatBytes(item.fileSize)}
                                </span>
                                <span className="text-foreground">→</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {formatBytes(item.optimizedSize)}
                                </span>
                                {item.savingsPercent ? (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded font-bold">
                                    -{item.savingsPercent}%
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {item.width && item.height ? `${item.width}×${item.height} · ` : ""}WebP
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">{formatBytes(item.fileSize)}</span>
                          )}
                        </td>

                        {/* Extracted SKU */}
                        <td className="py-2.5 px-3 font-mono font-semibold">
                          <span className="rounded bg-muted px-1.5 py-0.5">{item.extractedSku || "—"}</span>
                        </td>

                        {/* Database Target */}
                        <td className="py-2.5 px-3">
                          {item.matchedProductName ? (
                            <div className="space-y-0.5 max-w-xs">
                              <p className="font-semibold text-foreground truncate" title={item.matchedProductName}>
                                {item.matchedProductName}
                              </p>
                              {item.matchedVariantDetails && (
                                <p className="text-[11px] text-muted-foreground">
                                  Varian: {item.matchedVariantDetails}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">
                              {item.statusMessage || "Tidak ada produk cocok"}
                            </span>
                          )}
                        </td>

                        {/* Match Status Badge */}
                        <td className="py-2.5 px-3">
                          {isMatchedProduct && (
                            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
                              <Check className="size-3" />
                              Produk Induk
                            </Badge>
                          )}
                          {isMatchedVariant && (
                            <Badge variant="secondary" className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 text-[11px]">
                              <Check className="size-3" />
                              Varian Produk
                            </Badge>
                          )}
                          {isUnmatched && (
                            <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px]">
                              <AlertTriangle className="size-3" />
                              SKU Tidak Ada (Review)
                            </Badge>
                          )}
                          {isDuplicate && (
                            <Badge variant="destructive" className="gap-1 text-[11px]">
                              <XCircle className="size-3" />
                              Duplikat di ZIP
                            </Badge>
                          )}
                          {isAmbiguous && (
                            <Badge variant="secondary" className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 gap-1 text-[11px]">
                              <AlertCircle className="size-3" />
                              Ambigu (Review)
                            </Badge>
                          )}
                          {isInvalid && (
                            <Badge variant="destructive" className="gap-1 text-[11px]">
                              <XCircle className="size-3" />
                              Gagal Optimasi
                            </Badge>
                          )}
                        </td>

                        {/* Existing image status */}
                        <td className="py-2.5 px-3">
                          {item.hasExistingImage ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                              {overwriteExisting ? "Akan ditimpa" : "Sudah ada foto"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                              <span className="size-1.5 rounded-full bg-amber-500 inline-block" />
                              Belum ada foto
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Tidak ada berkas yang sesuai dengan filter atau kata kunci pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Lightbox / Enlarged Image Preview Modal */}
      {previewModalImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="max-w-md w-full bg-card rounded-2xl overflow-hidden shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b">
              <p className="font-semibold text-xs truncate">{previewModalImage.title}</p>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                ✕ Tutup
              </button>
            </div>
            <div className="p-4 bg-muted/20 flex items-center justify-center">
              <img
                src={previewModalImage.url}
                alt={previewModalImage.title}
                className="max-h-80 max-w-full rounded-lg object-contain shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

