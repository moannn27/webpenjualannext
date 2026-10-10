import { getAdminAccess } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeStorefrontSettings, type AdminAuditLog } from "@/lib/storefront-settings";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+@-]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const { user, isAdmin } = await getAdminAccess();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "csv";

  const supabase = await createClient();
  const { data } = await supabase
    .from("storefront_settings")
    .select("settings")
    .eq("id", "main")
    .maybeSingle();

  const settings = normalizeStorefrontSettings(data?.settings ?? {});
  const logs: AdminAuditLog[] = Array.isArray(settings.admin_audit_logs)
    ? settings.admin_audit_logs
    : [];

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  // 1. FORMAT EXCEL / CSV
  if (format === "csv") {
    const headers = [
      "ID Log",
      "Waktu (WIB)",
      "Staf Admin",
      "Role",
      "Jenis Aksi",
      "Modul",
      "Target Entitas",
      "Rincian Aktivitas",
    ];

    const rows = logs.map((log) => [
      log.id,
      new Intl.DateTimeFormat("id-ID", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "Asia/Jakarta",
      }).format(new Date(log.created_at)),
      log.admin_name || "Admin",
      log.admin_role || "admin",
      log.action,
      log.entity_type,
      log.entity_name,
      log.details,
    ]);

    const csvContent =
      "\uFEFF" +
      headers.map(csvCell).join(",") +
      "\r\n" +
      rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="log-aktivitas-${dateStr}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // 2. FORMAT WORD (.doc)
  if (format === "doc") {
    const rowsHtml = logs
      .map(
        (log, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
          <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px; white-space: nowrap;">
            ${new Intl.DateTimeFormat("id-ID", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Asia/Jakarta",
            }).format(new Date(log.created_at))}
          </td>
          <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px; font-weight: bold;">
            ${log.admin_name || "Admin"}
            <span style="font-size: 10px; color: #64748b; display: block; font-weight: normal;">(${log.admin_role})</span>
          </td>
          <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px;">
            <b style="text-transform: uppercase;">${log.action}</b>
          </td>
          <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px;">
            ${log.entity_type}: ${log.entity_name}
          </td>
          <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px;">
            ${log.details}
          </td>
        </tr>
      `
      )
      .join("");

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Laporan Log Aktivitas & Kejadian</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; margin: 20px; color: #0f172a; }
          h1 { color: #0284c7; font-size: 20px; margin-bottom: 4px; }
          .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #0284c7; color: white; padding: 10px; border: 1px solid #0284c7; font-size: 11px; text-align: left; }
        </style>
      </head>
      <body>
        <h1>LAPORAN LOG AKTIVITAS & AUDIT TOKO</h1>
        <p class="meta">
          Next Solution Store &bull; Diekspor pada: ${new Intl.DateTimeFormat("id-ID", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone: "Asia/Jakarta",
          }).format(now)} &bull; Total Riwayat: ${logs.length} kejadian
        </p>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th style="width: 110px;">Waktu (WIB)</th>
              <th style="width: 120px;">Staf Admin</th>
              <th style="width: 70px;">Aksi</th>
              <th style="width: 140px;">Modul / Target</th>
              <th>Rincian Kejadian</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || "<tr><td colspan='6' style='text-align:center; padding: 20px;'>Belum ada aktivitas tercatat.</td></tr>"}
          </tbody>
        </table>
      </body>
      </html>
    `;

    return new Response(wordHtml, {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-log-aktivitas-${dateStr}.doc"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // 3. FORMAT PRINT / PDF-READY HTML
  const rowsPrintHtml = logs
    .map(
      (log, idx) => `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="nowrap">
          ${new Intl.DateTimeFormat("id-ID", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "Asia/Jakarta",
          }).format(new Date(log.created_at))}
        </td>
        <td>
          <strong>${log.admin_name || "Admin"}</strong>
          <small class="block">(${log.admin_role})</small>
        </td>
        <td><span class="badge ${log.action}">${log.action}</span></td>
        <td><strong>${log.entity_type}</strong>: ${log.entity_name}</td>
        <td>${log.details}</td>
      </tr>
    `
    )
    .join("");

  const printHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Laporan Log Aktivitas & Audit - Next Solution</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 30px; color: #1e293b; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
        .title h1 { margin: 0; font-size: 22px; color: #0284c7; }
        .title p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
        .print-btn { background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f1f5f9; color: #334155; padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; }
        td { padding: 8px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
        tr:nth-child(even) { background: #f8fafc; }
        .center { text-align: center; }
        .nowrap { white-space: nowrap; }
        .block { display: block; color: #64748b; font-size: 10px; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; background: #e2e8f0; }
        .badge.create { background: #dcfce7; color: #166534; }
        .badge.update { background: #dbeafe; color: #1e40af; }
        .badge.delete { background: #fee2e2; color: #991b1b; }
        .badge.status_change { background: #fef3c7; color: #92400e; }
        @media print {
          .print-btn { display: none; }
          body { margin: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">
          <h1>LAPORAN LOG AKTIVITAS & AUDIT TRAIL</h1>
          <p>Next Solution Toko Elektronik &bull; Tanggal Cetak: ${new Intl.DateTimeFormat("id-ID", {
            dateStyle: "full",
            timeStyle: "medium",
            timeZone: "Asia/Jakarta",
          }).format(now)} &bull; Total: ${logs.length} kejadian</p>
        </div>
        <button class="print-btn" onclick="window.print()">Cetak / Simpan PDF</button>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">No</th>
            <th style="width: 110px;">Waktu</th>
            <th style="width: 120px;">Staf Admin</th>
            <th style="width: 70px;">Aksi</th>
            <th style="width: 140px;">Modul / Target</th>
            <th>Rincian Kejadian</th>
          </tr>
        </thead>
        <tbody>
          ${rowsPrintHtml || "<tr><td colspan='6' class='center'>Belum ada aktivitas tercatat.</td></tr>"}
        </tbody>
      </table>
    </body>
    </html>
  `;

  return new Response(printHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

