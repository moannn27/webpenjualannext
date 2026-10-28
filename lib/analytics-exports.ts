import ExcelJS from "exceljs";
import JSZip from "jszip";
import type { EcommerceReport } from "@/lib/admin-reports";
import type { EnhancedAnalyticsReport } from "@/lib/analytics-reporting";

export function isEnhancedReport(
  report: EcommerceReport | EnhancedAnalyticsReport
): report is EnhancedAnalyticsReport {
  return Boolean(
    report &&
      typeof report === "object" &&
      "traffic" in report &&
      "funnel" in report &&
      "marketing" in report
  );
}

const money = (val: number) => `Rp ${Number(val ?? 0).toLocaleString("id-ID")}`;
const escXml = (str: unknown) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * 1. Multi-sheet Excel (.xlsx) generator using ExcelJS
 */
export async function generateAnalyticsExcel(
  report: EcommerceReport | EnhancedAnalyticsReport
): Promise<Blob> {
  const enhanced = isEnhancedReport(report) ? report : null;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Next Solution Store Analytics";
  workbook.created = new Date();

  // SHEET 1: Ringkasan Eksekutif
  const s1 = workbook.addWorksheet("Ringkasan Eksekutif");
  s1.columns = [
    { header: "Indikator Kinerja (KPI)", key: "kpi", width: 35 },
    { header: "Nilai Periode Terpilih", key: "val", width: 25 },
    { header: "Catatan Operasional", key: "notes", width: 40 },
  ];
  s1.addRow({
    kpi: "Periode Laporan",
    val: `${report.days} Hari Terakhir`,
    notes: `Dibuat pada ${new Date().toLocaleDateString("id-ID")}`,
  });
  s1.addRow({
    kpi: "Total Omzet Selesai",
    val: money(report.summary.completed_sales),
    notes: "Seluruh pesanan berstatus delivered",
  });
  s1.addRow({
    kpi: "Rata-rata Nilai Pesanan (AOV)",
    val: money(report.summary.average_order_value),
    notes: "Per transaksi selesai",
  });
  s1.addRow({
    kpi: "Total Pesanan Selesai",
    val: report.summary.completed_orders,
    notes: `Dari total ${report.summary.total_orders} pesanan`,
  });
  s1.addRow({
    kpi: "Pesanan Menunggu Verifikasi",
    val: report.summary.pending_orders,
    notes: "Follow up melalui WhatsApp admin",
  });
  s1.addRow({
    kpi: "Pesanan Dibatalkan / Refund",
    val: report.summary.cancelled_orders,
    notes: "Batal atau dana dikembalikan",
  });
  s1.addRow({
    kpi: "Pelanggan Unik Membeli",
    val: report.summary.buying_customers,
    notes: "Pelanggan unik dengan transaksi sukses",
  });
  s1.addRow({
    kpi: "Pelanggan Baru",
    val: report.summary.new_customers,
    notes: "Pertama kali bertransaksi di periode ini",
  });
  s1.addRow({
    kpi: "Pelanggan Berulang (Repeat)",
    val: report.summary.repeat_customers,
    notes: "Membeli lebih dari satu kali",
  });

  if (enhanced) {
    s1.addRow({
      kpi: "Pertumbuhan Omzet vs Periode Sebelumnya",
      val:
        enhanced.comparison.sales_growth_pct !== null
          ? `${enhanced.comparison.sales_growth_pct > 0 ? "+" : ""}${enhanced.comparison.sales_growth_pct}%`
          : "N/A",
      notes: `Omzet periode sebelumnya: ${money(enhanced.comparison.prior_sales)}`,
    });
    s1.addRow({
      kpi: "Pengunjung Unik Toko",
      val: enhanced.traffic.unique_visitors,
      notes: enhanced.traffic.tracking_active
        ? "First-party anonymous telemetry"
        : "Menanti pengumpulan telemetri",
    });
  }

  // SHEET 2: Penjualan Harian
  const s2 = workbook.addWorksheet("Penjualan Harian");
  s2.columns = [
    { header: "Tanggal", key: "day", width: 18 },
    { header: "Pesanan Selesai", key: "orders", width: 18 },
    { header: "Nilai Omzet (Rp)", key: "revenue", width: 22 },
  ];
  report.daily.forEach((d) => {
    s2.addRow({ day: d.day, orders: d.orders, revenue: d.revenue });
  });

  // SHEET 3: Produk Terlaris & Kurang Laris
  const s3 = workbook.addWorksheet("Performa Produk");
  s3.columns = [
    { header: "Kategori Produk", key: "group", width: 22 },
    { header: "Nama Produk", key: "name", width: 45 },
    { header: "Unit Terjual", key: "units", width: 15 },
    { header: "Jumlah Pesanan", key: "orders", width: 15 },
    { header: "Total Nilai Barang (Rp)", key: "revenue", width: 25 },
  ];
  report.best_products.forEach((p) => {
    s3.addRow({
      group: "Terlaris (Top Seller)",
      name: p.name,
      units: p.units_sold,
      orders: p.order_count,
      revenue: p.item_revenue,
    });
  });
  report.least_products.forEach((p) => {
    s3.addRow({
      group: "Perlu Promosi",
      name: p.name,
      units: p.units_sold,
      orders: p.order_count,
      revenue: p.item_revenue,
    });
  });

  // SHEET 4: Pelanggan Belanja Tertinggi
  const s4 = workbook.addWorksheet("Pelanggan Teratas");
  s4.columns = [
    { header: "Nama Pelanggan", key: "name", width: 30 },
    { header: "No. HP / WhatsApp", key: "phone", width: 20 },
    { header: "Pesanan Selesai", key: "orders", width: 18 },
    { header: "Total Belanja (Rp)", key: "spend", width: 22 },
    { header: "Pesanan Terakhir", key: "last_order", width: 20 },
  ];
  report.top_customers.forEach((c) => {
    s4.addRow({
      name: c.name,
      phone: c.phone || "-",
      orders: c.completed_orders,
      spend: c.spend,
      last_order: c.last_order_day || "-",
    });
  });

  // SHEET 5 & 6 (if Enhanced Analytics available)
  if (enhanced) {
    // Sheet 5: Corong Konversi
    const s5 = workbook.addWorksheet("Corong Konversi");
    s5.columns = [
      { header: "Tahap Corong", key: "stage", width: 30 },
      { header: "Jumlah Pengguna", key: "count", width: 20 },
      { header: "Konversi Tahap (%)", key: "conv", width: 22 },
      { header: "Drop-off (%)", key: "drop", width: 18 },
    ];
    enhanced.funnel.stages.forEach((st) => {
      s5.addRow({
        stage: st.label,
        count: st.count,
        conv: `${st.conversion_pct}%`,
        drop: `${st.dropoff_pct}%`,
      });
    });

    // Sheet 6: Voucher & Marketing
    const s6 = workbook.addWorksheet("Voucher & Marketing");
    s6.columns = [
      { header: "Kode Voucher", key: "code", width: 25 },
      { header: "Penggunaan Selesai", key: "count", width: 22 },
      { header: "Total Diskon (Rp)", key: "discount", width: 22 },
    ];
    enhanced.marketing.voucher_usage_list.forEach((v) => {
      s6.addRow({ code: v.code, count: v.count, discount: v.discount });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * 2. Formatted Word (.docx) generator using JSZip
 */
export async function generateAnalyticsWord(
  report: EcommerceReport | EnhancedAnalyticsReport
): Promise<Blob> {
  const enhanced = isEnhancedReport(report) ? report : null;
  const zip = new JSZip();

  // Build document body paragraphs
  let bodyXml = `
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="1E3A8A"/></w:rPr><w:t>LAPORAN ANALITIK PENJUALAN</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:color w:val="64748B"/></w:rPr><w:t>Next Solution Store · Periode ${report.days} Hari Terakhir</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="0F172A"/></w:rPr><w:t>1. Ringkasan Finansial &amp; Operasional</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Total Nilai Penjualan Selesai: ${money(report.summary.completed_sales)}</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Rata-rata Nilai Pesanan (AOV): ${money(report.summary.average_order_value)}</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Pesanan Selesai: ${report.summary.completed_orders} pesanan (dari ${report.summary.total_orders} total)</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Pesanan Menunggu Pembayaran: ${report.summary.pending_orders} pesanan</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Pesanan Dibatalkan / Refund: ${report.summary.cancelled_orders} pesanan</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Pelanggan yang Berbelanja: ${report.summary.buying_customers} pelanggan</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Pelanggan Baru: ${report.summary.new_customers} orang</w:t></w:r></w:p>
    <w:p><w:r><w:t>• Pelanggan Berulang: ${report.summary.repeat_customers} orang</w:t></w:r></w:p>
  `;

  if (enhanced) {
    bodyXml += `
      <w:p><w:r><w:t></w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="0F172A"/></w:rPr><w:t>2. Kinerja Lalu Lintas &amp; Corong Konversi</w:t></w:r></w:p>
      <w:p><w:r><w:t>• Pengunjung Unik: ${enhanced.traffic.unique_visitors} pengunjung</w:t></w:r></w:p>
      <w:p><w:r><w:t>• Total Sesi Kunjungan: ${enhanced.traffic.total_sessions} sesi</w:t></w:r></w:p>
      <w:p><w:r><w:t>• Total Tayangan Halaman (Pageviews): ${enhanced.traffic.total_pageviews} tayangan</w:t></w:r></w:p>
    `;
    enhanced.funnel.stages.forEach((st) => {
      bodyXml += `<w:p><w:r><w:t>  - ${escXml(st.label)}: ${st.count} (${st.conversion_pct}%)</w:t></w:r></w:p>`;
    });
  }

  bodyXml += `
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="0F172A"/></w:rPr><w:t>3. Produk Terlaris (Top Selling)</w:t></w:r></w:p>
  `;
  report.best_products.slice(0, 5).forEach((p, i) => {
    bodyXml += `<w:p><w:r><w:t>${i + 1}. ${escXml(p.name)} — ${p.units_sold} unit (${money(p.item_revenue)})</w:t></w:r></w:p>`;
  });

  bodyXml += `
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="0F172A"/></w:rPr><w:t>4. Pelanggan Belanja Tertinggi</w:t></w:r></w:p>
  `;
  report.top_customers.slice(0, 5).forEach((c, i) => {
    bodyXml += `<w:p><w:r><w:t>${i + 1}. ${escXml(c.name)} (${c.phone || "-"}) — ${money(c.spend)} [${c.completed_orders} pesanan]</w:t></w:r></w:p>`;
  });

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
  </w:body>
</w:document>`;

  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("word/document.xml", documentXml);

  const buffer = await zip.generateAsync({ type: "blob" });
  return buffer;
}

/**
 * 3. Multi-slide PowerPoint (.pptx) generator using JSZip
 */
export async function generateAnalyticsPowerPoint(
  report: EcommerceReport | EnhancedAnalyticsReport
): Promise<Blob> {
  const enhanced = isEnhancedReport(report) ? report : null;
  const zip = new JSZip();

  const dailyAvg = Math.round(report.summary.completed_sales / Math.max(1, report.days));

  // Prepare 6 strategic slides
  const slides = [
    {
      title: "Laporan Kinerja E-Commerce",
      lines: [
        "Next Solution Store Analytics Dashboard",
        `Periode Evaluasi: ${report.days} Hari Terakhir`,
        `Tanggal Pembuatan: ${new Date().toLocaleDateString("id-ID")}`,
        "Dokumen Resmi Manajemen Penjualan & Operasional Toko",
      ],
    },
    {
      title: "1. Ringkasan Finansial & KPI Utama",
      lines: [
        `• Total Omzet Selesai: ${money(report.summary.completed_sales)}`,
        `• Rata-rata Nilai Pesanan (AOV): ${money(report.summary.average_order_value)}`,
        `• Tingkat Penyelesaian Pesanan: ${report.summary.total_orders > 0 ? ((report.summary.completed_orders / report.summary.total_orders) * 100).toFixed(1) : 0}%`,
        `• Pertumbuhan vs Periode Sebelumnya: ${enhanced?.comparison.sales_growth_pct !== null && enhanced?.comparison.sales_growth_pct !== undefined ? `${enhanced.comparison.sales_growth_pct > 0 ? "+" : ""}${enhanced.comparison.sales_growth_pct}%` : "Stabil"}`,
        `• Rata-rata Run-Rate Omzet Harian: ${money(dailyAvg)} / hari`,
      ],
    },
    {
      title: "2. Kinerja Lalu Lintas & Pengunjung",
      lines: [
        `• Pengunjung Unik: ${enhanced ? enhanced.traffic.unique_visitors : "Telemetri First-Party Standby"}`,
        `• Total Sesi Kunjungan: ${enhanced ? enhanced.traffic.total_sessions : "-"}`,
        `• Total Tayangan Halaman (Pageviews): ${enhanced ? enhanced.traffic.total_pageviews : "-"}`,
        `• Sumber Utama: ${enhanced?.traffic.sources[0]?.source || "Langsung / Direct"}`,
        `• Perangkat Dominan: ${enhanced?.traffic.devices[0]?.device || "Desktop"}`,
      ],
    },
    {
      title: "3. Performa Produk Terlaris & Stok",
      lines: [
        `• Produk Terlaris #1: ${report.best_products[0]?.name || "Belum ada produk"} (${report.best_products[0]?.units_sold || 0} unit)`,
        `• Produk Terlaris #2: ${report.best_products[1]?.name || "-"} (${report.best_products[1]?.units_sold || 0} unit)`,
        `• Produk Terlaris #3: ${report.best_products[2]?.name || "-"} (${report.best_products[2]?.units_sold || 0} unit)`,
        `• Produk Stok Rendah (< 5): ${enhanced ? enhanced.health.low_stock_products.length : 0} item perlu restock`,
        `• Produk Habis (Out of Stock): ${enhanced ? enhanced.health.out_of_stock_products.length : 0} item`,
      ],
    },
    {
      title: "4. Corong Konversi & Retensi Pelanggan",
      lines: [
        `• Pelanggan Baru: ${report.summary.new_customers} orang`,
        `• Pelanggan Berulang (Repeat): ${report.summary.repeat_customers} orang`,
        `• Retensi Pembeli: ${report.summary.buying_customers > 0 ? ((report.summary.repeat_customers / report.summary.buying_customers) * 100).toFixed(0) : 0}%`,
        `• Pemanfaatan Voucher: ${enhanced ? enhanced.marketing.vouchers_used_count : 0} pesanan`,
        `• Total Diskon Diberikan: ${enhanced ? money(enhanced.marketing.total_voucher_discount) : "Rp 0"}`,
      ],
    },
    {
      title: "5. Rekomendasi Strategis Sales",
      lines: [
        `• Prioritas Follow-Up: Segera hubungi ${report.summary.pending_orders} pesanan menunggu pembayaran`,
        "• Buffer Stock: Amankan kuota pasokan distributor untuk produk terlaris",
        "• Promosi Bundling: Berikan paket kombo atau bonus aksesoris untuk unit lambat berputar",
        "• Retensi VIP: Berikan apresiasi voucher eksklusif kepada pembeli belanja tertinggi",
      ],
    },
  ];

  let contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>`;

  let presentationRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;

  let sldIdLst = "";

  slides.forEach((slide, idx) => {
    const sldNum = idx + 1;
    const rId = `rId${sldNum}`;
    contentTypes += `\n  <Override PartName="/ppt/slides/slide${sldNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    presentationRels += `\n  <Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${sldNum}.xml"/>`;
    sldIdLst += `\n    <p:sldId id="${255 + sldNum}" r:id="${rId}"/>`;

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm>
      </p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="685800" y="457200"/><a:ext cx="7772400" cy="800000"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="id-ID" sz="2600" b="1"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill></a:rPr>
              <a:t>${escXml(slide.title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Content"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="685800" y="1500000"/><a:ext cx="7772400" cy="3200000"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          ${slide.lines
            .map(
              (line) => `
          <a:p>
            <a:r>
              <a:rPr lang="id-ID" sz="1500"><a:solidFill><a:srgbClr val="334155"/></a:solidFill></a:rPr>
              <a:t>${escXml(line)}</a:t>
            </a:r>
          </a:p>`
            )
            .join("")}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

    zip.file(`ppt/slides/slide${sldNum}.xml`, slideXml);
  });

  contentTypes += "\n</Types>";
  presentationRels += "\n</Relationships>";

  zip.file("[Content_Types].xml", contentTypes);
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`
  );
  zip.file("ppt/_rels/presentation.xml.rels", presentationRels);
  zip.file(
    "ppt/presentation.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>${sldIdLst}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="5143500" type="screen16x9"/>
</p:presentation>`
  );

  const buffer = await zip.generateAsync({ type: "blob" });
  return buffer;
}

