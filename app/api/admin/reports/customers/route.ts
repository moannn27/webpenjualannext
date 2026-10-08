import { getAdminAccess } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 500;

function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+@-]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET() {
  const { user, isAdmin } = await getAdminAccess();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const encoder = new TextEncoder();
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`\uFEFF${["nama", "telepon", "tanggal_daftar", "total_pesanan", "pesanan_selesai", "nilai_pesanan_selesai_rp", "pesanan_terakhir"].map(csvCell).join(",")}\r\n`));
    },
    async pull(controller) {
      const { data, error } = await supabase.rpc("get_admin_customers_report", { p_offset: offset, p_limit: PAGE_SIZE });
      if (error) { controller.error(error); return; }
      const rows = (data ?? []) as { full_name: string | null; phone: string | null; created_at: string; total_orders: number; completed_orders: number; completed_spend: number | string; last_order_at: string | null }[];
      const lines = rows.map((customer) => [
        customer.full_name ?? "Belum mengisi nama",
        customer.phone ?? "",
        new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(customer.created_at)),
        customer.total_orders,
        customer.completed_orders,
        customer.completed_spend,
        customer.last_order_at ? new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(customer.last_order_at)) : "",
      ].map(csvCell).join(","));
      offset += data?.length ?? 0;
      if (lines.length) controller.enqueue(encoder.encode(`${lines.join("\r\n")}\r\n`));
      if (!data || data.length < PAGE_SIZE) controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pelanggan-dan-pembelian.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
