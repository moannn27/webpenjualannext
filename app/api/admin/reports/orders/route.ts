import { getAdminAccess } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 500;

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
  const days = Number(url.searchParams.get("days") ?? 30);
  if (![7, 30, 90, 365].includes(days)) return Response.json({ error: "Invalid report period" }, { status: 400 });
  const start = new Date(Date.now() - (days - 1) * 86_400_000);
  const startLocal = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(start);
  const startIso = new Date(`${startLocal}T00:00:00+07:00`).toISOString();
  const exportUntil = new Date().toISOString();
  const supabase = await createClient();
  const encoder = new TextEncoder();
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`\uFEFF${["nomor_pesanan", "tanggal_waktu_wib", "status", "pelanggan", "telepon", "total_rupiah"].map(csvCell).join(",")}\r\n`));
    },
    async pull(controller) {
        const { data, error } = await supabase.from("orders")
          .select("id, order_number, status, grand_total, created_at, users(full_name, phone)")
          .gte("created_at", startIso)
          .lte("created_at", exportUntil)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) { controller.error(error); return; }
        const lines = (data ?? []).map((row) => {
          const profile = Array.isArray(row.users) ? row.users[0] : row.users;
          const cells = [row.order_number, new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(row.created_at)), row.status, profile?.full_name ?? "Pelanggan", profile?.phone ?? "", row.grand_total];
          return cells.map(csvCell).join(",");
        });
        offset += data?.length ?? 0;
        if (lines.length) controller.enqueue(encoder.encode(`${lines.join("\r\n")}\r\n`));
        if (!data || data.length < PAGE_SIZE) controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transaksi-${days}-hari.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
