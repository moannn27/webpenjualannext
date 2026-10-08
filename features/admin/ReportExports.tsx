"use client";

import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import type { EcommerceReport } from "@/lib/admin-reports";
import { Button } from "@/components/ui/button";

const money = (amount: number) => `Rp ${Number(amount).toLocaleString("id-ID")}`;
const date = (value: string | null) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${value.slice(0, 10)}T12:00:00+07:00`)) : "-";
const esc = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export function ReportExports({ report }: { report: EcommerceReport }) {
  const download = (content: BlobPart, mime: string, extension: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-ecommerce-${report.days}-hari-${new Date().toISOString().slice(0, 10)}.${extension}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [["bagian", "tanggal", "nama", "jumlah_pesanan", "unit_terjual", "nilai_rupiah", "telepon"]];
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
    rows.push(["ringkasan", `${report.days} hari`, "Pesanan dibatalkan", report.summary.cancelled_orders, "", "", ""]);
    rows.push(...report.daily.map((item) => ["harian", item.day, "Penjualan selesai", item.orders, "", item.revenue, ""]));
    rows.push(...report.best_products.map((item) => ["produk_terlaris", "", item.name, item.order_count, item.units_sold, item.item_revenue, ""]));
    rows.push(...report.least_products.map((item) => ["produk_penjualan_terendah", "", item.name, item.order_count, item.units_sold, item.item_revenue, ""]));
    rows.push(...report.top_customers.map((item) => ["pelanggan", date(item.last_order_day), item.name, item.completed_orders, "", item.spend, item.phone ?? ""]));
    const csv = rows.map((row) => row.map((value) => {
      const raw = String(value);
      const safe = typeof value === "string" && /^[=+@-]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replaceAll('"', '""')}"`;
    }).join(",")).join("\r\n");
    download(`\uFEFF${csv}`, "text/csv;charset=utf-8", "csv");
  };

  const exportWord = () => {
    const table = (headers: string[], rows: (string | number)[][]) => `<table><thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${esc(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const summaryRows = [
      ["Total pesanan", report.summary.total_orders], ["Menunggu", report.summary.pending_orders], ["Diproses/dikirim", report.summary.active_orders],
      ["Selesai", report.summary.completed_orders], ["Dibatalkan", report.summary.cancelled_orders], ["Nilai pesanan selesai", money(report.summary.completed_sales)],
      ["Rata-rata pesanan selesai", money(report.summary.average_order_value)], ["Pelanggan baru", report.summary.new_customers],
      ["Pelanggan yang membeli", report.summary.buying_customers], ["Pelanggan berulang", report.summary.repeat_customers],
      ["Pembayaran sukses", report.summary.successful_payment_orders], ["Pembayaran gagal/kedaluwarsa", report.summary.failed_payment_orders], ["Pembayaran dikembalikan", report.summary.refunded_orders],
      ["Pembayaran tertunda", report.summary.pending_payment_orders],
    ];
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Laporan Ecommerce</title><style>body{font:11pt Arial;color:#172033}h1,h2{color:#164e9b}table{border-collapse:collapse;width:100%;margin:10px 0 24px}th,td{border:1px solid #aab4c4;padding:6px;text-align:left}th{background:#e8eef8}p{color:#5d687a}</style></head><body><h1>Laporan Ecommerce</h1><p>Periode ${report.days} hari · dibuat ${new Date().toLocaleDateString("id-ID")}</p><h2>Ringkasan</h2>${table(["Metrik", "Nilai"], summaryRows)}<h2>Penjualan harian</h2>${table(["Tanggal", "Pesanan selesai", "Nilai penjualan"], report.daily.map((row) => [date(row.day), row.orders, money(row.revenue)]))}<h2>Produk terlaris</h2>${table(["Produk", "Unit", "Pesanan", "Nilai barang"], report.best_products.map((row) => [row.name, row.units_sold, row.order_count, money(row.item_revenue)]))}<h2>Produk penjualan terendah</h2>${table(["Produk", "Unit", "Pesanan"], report.least_products.map((row) => [row.name, row.units_sold, row.order_count]))}<h2>Pelanggan dengan belanja tertinggi</h2>${table(["Pelanggan", "Telepon", "Pesanan selesai", "Belanja", "Pesanan terakhir"], report.top_customers.map((row) => [row.name, row.phone ?? "-", row.completed_orders, money(row.spend), date(row.last_order_day)]))}</body></html>`;
    download(`\ufeff${html}`, "application/msword;charset=utf-8", "doc");
  };

  return <div className="no-print flex flex-wrap gap-2">
    <Button variant="outline" onClick={exportCsv}><FileSpreadsheet className="mr-2 size-4" />Unduh CSV</Button>
    <a href={`/api/admin/reports/orders?days=${report.days}`} className="inline-flex h-10 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium hover:bg-muted"><Download className="mr-2 size-4" />Transaksi lengkap CSV</a>
    <Button variant="outline" onClick={exportWord}><FileText className="mr-2 size-4" />Unduh Word (.doc)</Button>
    <Button onClick={() => window.print()}><Printer className="mr-2 size-4" />Cetak / Simpan PDF</Button>
  </div>;
}
