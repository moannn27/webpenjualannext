"use client";

import { useState, useRef, useEffect } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
  Presentation,
  FileCode,
  Loader2,
} from "lucide-react";
import type { EcommerceReport } from "@/lib/admin-reports";
import type { EnhancedAnalyticsReport } from "@/lib/analytics-reporting";
import { Button } from "@/components/ui/button";
import {
  generateAnalyticsExcel,
  generateAnalyticsWord,
  generateAnalyticsPowerPoint,
} from "@/lib/analytics-exports";

const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeZone: "Asia/Jakarta",
      }).format(new Date(`${value.slice(0, 10)}T12:00:00+07:00`))
    : "-";

export function ReportExports({
  report,
}: {
  report: EcommerceReport | EnhancedAnalyticsReport;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const downloadBlob = (blob: Blob, extension: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-ecommerce-${report.days}-hari-${new Date().toISOString().slice(0, 10)}.${extension}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportCsv = () => {
    setIsOpen(false);
    const rows: (string | number)[][] = [
      ["bagian", "tanggal", "nama", "jumlah_pesanan", "unit_terjual", "nilai_rupiah", "telepon"],
    ];
    rows.push(["ringkasan", `${report.days} hari`, "Total pesanan", report.summary.total_orders, "", "", ""]);
    rows.push(["ringkasan", `${report.days} hari`, "Pesanan selesai", report.summary.completed_orders, "", "", ""]);
    rows.push(["ringkasan", `${report.days} hari`, "Pesanan aktif", report.summary.active_orders, "", "", ""]);
    rows.push(["ringkasan", `${report.days} hari`, "Nilai pesanan selesai", "", "", report.summary.completed_sales, ""]);
    rows.push(["ringkasan", `${report.days} hari`, "Pesanan menunggu", report.summary.pending_orders, "", "", ""]);
    rows.push(["ringkasan", `${report.days} hari`, "Pesanan dibatalkan", report.summary.cancelled_orders, "", "", ""]);
    rows.push(["ringkasan", `${report.days} hari`, "Pembayaran sukses", report.summary.successful_payment_orders, "", "", ""]);
    rows.push(["ringkasan", `${report.days} hari`, "Pembayaran tertunda", report.summary.pending_payment_orders, "", "", ""]);
    rows.push(["ringkasan", `${report.days} hari`, "Pembayaran gagal/kedaluwarsa", report.summary.failed_payment_orders, "", "", ""]);
    rows.push(["ringkasan", `${report.days} hari`, "Pelanggan pembeli", report.summary.buying_customers, "", "", ""]);
    rows.push(["ringkasan", `${report.days} hari`, "Pelanggan berulang", report.summary.repeat_customers, "", "", ""]);
    rows.push(["ringkasan", `${report.days} hari`, "Pelanggan baru", report.summary.new_customers, "", "", ""]);
    rows.push(...report.daily.map((item) => ["harian", item.day, "Penjualan selesai", item.orders, "", item.revenue, ""]));
    rows.push(
      ...report.best_products.map((item) => [
        "produk_terlaris",
        "",
        item.name,
        item.order_count,
        item.units_sold,
        item.item_revenue,
        "",
      ])
    );
    rows.push(
      ...report.least_products.map((item) => [
        "produk_penjualan_terendah",
        "",
        item.name,
        item.order_count,
        item.units_sold,
        item.item_revenue,
        "",
      ])
    );
    rows.push(
      ...report.top_customers.map((item) => [
        "pelanggan",
        date(item.last_order_day),
        item.name,
        item.completed_orders,
        "",
        item.spend,
        item.phone ?? "",
      ])
    );
    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const raw = String(value);
            const safe = typeof value === "string" && /^[=+@-]/.test(raw) ? `'${raw}` : raw;
            return `"${safe.replaceAll('"', '""')}"`;
          })
          .join(",")
      )
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, "csv");
  };

  const handleExcelExport = async () => {
    try {
      setIsExporting("excel");
      setIsOpen(false);
      const blob = await generateAnalyticsExcel(report);
      downloadBlob(blob, "xlsx");
    } finally {
      setIsExporting(null);
    }
  };

  const handleWordExport = async () => {
    try {
      setIsExporting("word");
      setIsOpen(false);
      const blob = await generateAnalyticsWord(report);
      downloadBlob(blob, "docx");
    } finally {
      setIsExporting(null);
    }
  };

  const handlePowerPointExport = async () => {
    try {
      setIsExporting("pptx");
      setIsOpen(false);
      const blob = await generateAnalyticsPowerPoint(report);
      downloadBlob(blob, "pptx");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="no-print flex items-center gap-2.5">
      {/* Quick Print Button */}
      <Button
        type="button"
        onClick={() => window.print()}
        className="gap-2 rounded-xl h-10 px-4 font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Printer className="size-4" />
        Cetak / PDF
      </Button>

      {/* Unified Export Dropdown Options */}
      <div className="relative" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={Boolean(isExporting)}
          className="gap-2 rounded-xl h-10 px-3.5 font-semibold border-border shadow-xs hover:bg-muted"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <Download className="size-4 text-muted-foreground" />
          )}
          <span>{isExporting ? "Membuat Berkas..." : "Opsi Ekspor Laporan"}</span>
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </Button>

        {isOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-border bg-popover p-1.5 shadow-xl text-popover-foreground animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <div className="px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border/50 mb-1">
              PILIH FORMAT EKSPOR ({report.days} HARI)
            </div>

            {/* 1. Excel (.xlsx) Multi-Sheet */}
            <button
              type="button"
              role="menuitem"
              onClick={handleExcelExport}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-left font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Microsoft Excel (.xlsx)</p>
                <p className="text-[10.5px] text-muted-foreground">Multi-sheet: Omzet, Traffic, Produk</p>
              </div>
            </button>

            {/* 2. Word (.docx) Document */}
            <button
              type="button"
              role="menuitem"
              onClick={handleWordExport}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-left font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="flex size-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Microsoft Word (.docx)</p>
                <p className="text-[10.5px] text-muted-foreground">Format laporan eksekutif lengkap</p>
              </div>
            </button>

            {/* 3. PowerPoint (.pptx) Presentation */}
            <button
              type="button"
              role="menuitem"
              onClick={handlePowerPointExport}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-left font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="flex size-7 items-center justify-center rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Presentation className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">PowerPoint (.pptx)</p>
                <p className="text-[10.5px] text-muted-foreground">Slide presentasi manajemen (6 slide)</p>
              </div>
            </button>

            <div className="border-t border-border/50 my-1 pt-1" />

            {/* 4. CSV Summary */}
            <button
              type="button"
              role="menuitem"
              onClick={exportCsv}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-left font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="flex size-7 items-center justify-center rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400">
                <FileCode className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Ringkasan Analisis (CSV)</p>
                <p className="text-[10.5px] text-muted-foreground">Omzet, produk &amp; data pelanggan</p>
              </div>
            </button>

            {/* 5. Raw Orders CSV */}
            <a
              role="menuitem"
              href={`/api/admin/reports/orders?days=${report.days}`}
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-left font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="flex size-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Download className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Transaksi Lengkap (CSV)</p>
                <p className="text-[10.5px] text-muted-foreground">Seluruh baris detail pesanan</p>
              </div>
            </a>

            {/* 6. Quick Print / PDF Dialog */}
            <div className="border-t border-border/50 my-1 pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  window.print();
                }}
                className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-left font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground">
                  <Printer className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Cetak Pratinjau (PDF)</p>
                  <p className="text-[10.5px] text-muted-foreground">Buka dialog cetak browser</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
