"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Printer,
  Plus,
  Trash2,
  FileText,
  RotateCcw,
  Sparkles,
  Building2,
  User,
  ShoppingBag,
  Palette,
  Check,
  Stamp,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandText } from "@/components/shared/BrandText";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { cn } from "@/lib/utils";
import type { AdminModuleKey } from "@/types/admin-permissions";

export interface ManualInvoiceItem {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
}

interface ManualInvoiceManagerProps {
  storeSettings?: {
    store_name?: string;
    store_address?: string;
    contact_phone?: string;
    contact_whatsapp?: string;
    logo_url?: string;
    [key: string]: unknown;
  };
  isSuperAdmin?: boolean;
  permissions?: AdminModuleKey[];
}

const COLOR_PRESETS = [
  { name: "Indigo Elegan", hex: "#3730A3" },
  { name: "Biru Next Solution", hex: "#0048BA" },
  { name: "Dark Slate / Monokrom", hex: "#0F172A" },
  { name: "Emerald Green", hex: "#059669" },
  { name: "Crimson Red", hex: "#DC2626" },
  { name: "Royal Purple", hex: "#7C3AED" },
];

const PAYMENT_METHODS = [
  "Transfer Bank BCA",
  "Transfer Bank Mandiri",
  "Transfer Bank BRI / BNI",
  "QRIS (All Payment)",
  "Tunai / Cash di Toko",
  "Kartu Debit / Kredit",
];

const formatRupiah = (num: number) =>
  `Rp ${Number(num ?? 0).toLocaleString("id-ID")}`;

const generateInvoiceNumber = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yyyy}${mm}${dd}-${rand}`;
};

export function ManualInvoiceManager({
  storeSettings,
}: ManualInvoiceManagerProps) {
  // Theme & Styling
  const [accentColor, setAccentColor] = useState("#0048BA");
  const [useOfficialBrandColor, setUseOfficialBrandColor] = useState(true);

  // Store brand words & colors
  const [storeWord1, setStoreWord1] = useState(() => {
    return typeof storeSettings?.brand_word1 === "string" && storeSettings.brand_word1
      ? storeSettings.brand_word1
      : "NEXT";
  });
  const [storeWord1Color, setStoreWord1Color] = useState(() => {
    return typeof storeSettings?.brand_word1_color === "string" && storeSettings.brand_word1_color
      ? storeSettings.brand_word1_color
      : "#DC2626";
  });
  const [storeWord2, setStoreWord2] = useState(() => {
    return typeof storeSettings?.brand_word2 === "string" && storeSettings.brand_word2
      ? storeSettings.brand_word2
      : "SOLUTION";
  });
  const [storeWord2Color, setStoreWord2Color] = useState(() => {
    return typeof storeSettings?.brand_word2_color === "string" && storeSettings.brand_word2_color
      ? storeSettings.brand_word2_color
      : "#0048BA";
  });
  const [showStoreLogoSymbol, setShowStoreLogoSymbol] = useState(true);

  // Store details
  const [storeName, setStoreName] = useState(() => {
    if (storeSettings?.store_name) {
      return storeSettings.store_name.replace(/Store$/i, "").trim();
    }
    return "Next Solution";
  });
  const [storeSlogan, setStoreSlogan] = useState(
    "Solusi Belanja Laptop & Gadget Terpercaya"
  );
  const [storeAddress, setStoreAddress] = useState(
    storeSettings?.store_address ||
      "Jl. Pajajaran No. 42, Kota Bandung, Jawa Barat"
  );
  const [storePhone, setStorePhone] = useState(
    storeSettings?.contact_whatsapp ||
      storeSettings?.contact_phone ||
      "+62 811-2238-310"
  );
  const [customFooterNote, setCustomFooterNote] = useState("");

  // Signature & Stamp
  const [showStamp, setShowStamp] = useState(true);
  const [signatureTitle, setSignatureTitle] = useState("Hormat Kami,");
  const [signerName, setSignerName] = useState("Virga Pratama");
  const [signerRole, setSignerRole] = useState("Admin Next Solution");

  // Invoice & Customer metadata
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber);
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [customerName, setCustomerName] = useState("Virga Pratama");
  const [customerPhone, setCustomerPhone] = useState("081234567890");
  const [customerAddress, setCustomerAddress] = useState(
    "Jl. Merdeka No. 15, Bandung"
  );
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">(
    "pickup"
  );
  const [paymentStatus, setPaymentStatus] = useState<
    "paid" | "pending" | "cancelled"
  >("paid");
  const [paymentMethod, setPaymentMethod] = useState("Transfer Bank BCA");

  // Items
  const [items, setItems] = useState<ManualInvoiceItem[]>([
    {
      id: "1",
      name: "Lenovo LOQ 15IRH8 (Intel Core i5-13420H / RTX 4050 6GB / 16GB DDR5 / 512GB SSD NVMe)",
      sku: "LNV-LOQ-4050",
      quantity: 1,
      price: 13999000,
    },
    {
      id: "2",
      name: "Mouse Wireless Logitech M330 Silent Plus (Black)",
      sku: "LOGI-M330-BLK",
      quantity: 1,
      price: 225000,
    },
  ]);

  // Adjustments
  const [discountAmount, setDiscountAmount] = useState<number>(200000);
  const [shippingAmount, setShippingAmount] = useState<number>(0);
  const [invoiceNotes, setInvoiceNotes] = useState(
    "Garansi Resmi Distributor 2 Tahun & Garansi Toko 14 Hari ganti unit baru bila ada kendala cacat pabrik. Segel unit dan nota asli wajib disertakan saat klaim."
  );

  // Computed totals
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
    0
  );
  const grandTotal = Math.max(
    0,
    subtotal - (Number(discountAmount) || 0) + (Number(shippingAmount) || 0)
  );

  // Item helpers
  const handleAddItem = () => {
    const newItem: ManualInvoiceItem = {
      id: String(Date.now()),
      name: "",
      sku: "",
      quantity: 1,
      price: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (
    id: string,
    field: keyof ManualInvoiceItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleLoadSample = () => {
    setAccentColor("#0048BA");
    setUseOfficialBrandColor(true);
    setStoreWord1("NEXT");
    setStoreWord1Color("#DC2626");
    setStoreWord2("SOLUTION");
    setStoreWord2Color("#0048BA");
    setShowStoreLogoSymbol(true);
    setStoreName("Next Solution");
    setStoreSlogan("Solusi Belanja Laptop & Gadget Terpercaya");
    setStoreAddress(
      storeSettings?.store_address ||
        "Jl. Pajajaran No. 42, Kota Bandung, Jawa Barat"
    );
    setStorePhone(storeSettings?.contact_whatsapp || "+62 811-2238-310");
    setCustomFooterNote("");
    setShowStamp(true);
    setSignatureTitle("Hormat Kami,");
    setSignerName("Virga Pratama");
    setSignerRole("Admin Kasir");
    setInvoiceNumber(generateInvoiceNumber());
    setCustomerName("Ahmad Fauzi");
    setCustomerPhone("085212345678");
    setCustomerAddress("Jl. Cihampelas No. 88, Bandung");
    setFulfillmentType("delivery");
    setPaymentStatus("paid");
    setPaymentMethod("Transfer Bank BCA");
    setItems([
      {
        id: "sample-1",
        name: "ASUS TUF Gaming A15 (AMD Ryzen 7 7735HS / RTX 4060 8GB / 16GB / 512GB SSD)",
        sku: "ASUS-FA507NV",
        quantity: 1,
        price: 16499000,
      },
      {
        id: "sample-2",
        name: "Backpack Gaming ASUS ROG Ranger BP1500",
        sku: "ROG-BP1500",
        quantity: 1,
        price: 450000,
      },
    ]);
    setDiscountAmount(500000);
    setShippingAmount(50000);
    setInvoiceNotes(
      "Garansi Resmi ASUS Indonesia 2 Tahun. Pembelian mencakup perlindungan garansi kerusakan fisik tak disengaja tahun pertama (Accidental Damage Protection)."
    );
  };

  const handleReset = () => {
    setInvoiceNumber(generateInvoiceNumber());
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setItems([
      {
        id: "default-1",
        name: "",
        sku: "",
        quantity: 1,
        price: 0,
      },
    ]);
    setDiscountAmount(0);
    setShippingAmount(0);
    setInvoiceNotes("");
    setCustomFooterNote("");
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    // Set document title kosong saat print agar browser tidak mencetak judul halaman atau URL di header
    document.title = "";
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  // Format date display
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(invoiceDate || "1970-01-01"));

  return (
    <>
      {/* Print-specific style: Menghilangkan header & footer browser secara tuntas */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
          html,
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #print-invoice-area,
          #print-invoice-area * {
            visibility: visible !important;
          }
          #print-invoice-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Content */}
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5 no-print">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
                <FileText className="size-7 text-[#2563EB]" />
                Faktur &amp; Invoice Manual
              </h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                Fitur Mandiri
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Buat faktur penjualan offline atau kustom mandiri dengan memasukkan nama customer, toko, tanda tangan, stempel resmi, dan warna tema.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSample}
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
              title="Muat data contoh faktur laptop"
            >
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Contoh Data</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 text-muted-foreground hover:text-foreground"
              title="Kosongkan formulir"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset</span>
            </Button>

            <Button
              type="button"
              onClick={handlePrint}
              size="sm"
              className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold gap-1.5 h-9 shadow-sm cursor-pointer"
              title="Cetak faktur atau simpan sebagai PDF bersih tanpa header browser"
            >
              <Printer className="size-4" />
              <span>Cetak / Simpan PDF</span>
            </Button>
          </div>
        </div>

        {/* 2-Column Layout: Form on Left, Live Preview on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: FORM CONTROLS (no-print) */}
          <div className="lg:col-span-5 space-y-5 no-print">
            {/* Section 0: Color & Brand Customization */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b border-border pb-2.5">
                <Palette className="size-4 text-[#2563EB]" />
                <span>Warna Tema &amp; Identitas Brand</span>
              </div>

              <div className="space-y-3">
                {/* Brand Color Mode Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/30">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="brandColorToggle"
                      className="text-xs font-bold text-foreground cursor-pointer block"
                    >
                      Warna Brand Asli (NEXT Merah &amp; SOLUTION Biru)
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Tampilkan logo dan nama toko sesuai warna logo resmi.
                    </p>
                  </div>
                  <input
                    id="brandColorToggle"
                    type="checkbox"
                    checked={useOfficialBrandColor}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseOfficialBrandColor(checked);
                      if (checked) {
                        setStoreWord1("NEXT");
                        setStoreWord1Color("#DC2626");
                        setStoreWord2("SOLUTION");
                        setStoreWord2Color("#0048BA");
                      }
                    }}
                    className="size-4 rounded border-input accent-primary cursor-pointer"
                  />
                </div>

                {/* Kustomisasi Per Kata */}
                <div className="space-y-2.5 p-3 rounded-xl border border-border/70 bg-background/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Nama Toko &amp; Warna Per Kata:
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showStoreLogoSymbol}
                        onChange={(e) => setShowStoreLogoSymbol(e.target.checked)}
                        className="size-3.5 rounded border-input accent-primary"
                      />
                      <span>Tampilkan Lambang Logo S</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Kata 1 (Teks &amp; Warna)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={storeWord1}
                          onChange={(e) => {
                            setStoreWord1(e.target.value);
                            setStoreName(`${e.target.value} ${storeWord2}`.trim());
                          }}
                          placeholder="NEXT"
                          className="flex-1 h-8 px-2.5 rounded-lg border border-input bg-background text-foreground text-xs font-bold"
                        />
                        <input
                          type="color"
                          value={storeWord1Color}
                          onChange={(e) => setStoreWord1Color(e.target.value)}
                          className="size-8 rounded cursor-pointer border border-border p-0.5 shrink-0"
                          title="Pilih Warna Kata 1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Kata 2 (Teks &amp; Warna)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={storeWord2}
                          onChange={(e) => {
                            setStoreWord2(e.target.value);
                            setStoreName(`${storeWord1} ${e.target.value}`.trim());
                          }}
                          placeholder="SOLUTION"
                          className="flex-1 h-8 px-2.5 rounded-lg border border-input bg-background text-foreground text-xs font-bold"
                        />
                        <input
                          type="color"
                          value={storeWord2Color}
                          onChange={(e) => setStoreWord2Color(e.target.value)}
                          className="size-8 rounded cursor-pointer border border-border p-0.5 shrink-0"
                          title="Pilih Warna Kata 2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                    Warna Aksen Tabel &amp; Total:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected =
                        accentColor.toLowerCase() === preset.hex.toLowerCase();
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setAccentColor(preset.hex)}
                          title={preset.name}
                          className={cn(
                            "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                              : "border-border hover:bg-muted text-muted-foreground"
                          )}
                        >
                          <span
                            className="size-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span>{preset.name}</span>
                          {isSelected && (
                            <Check className="size-3 text-primary ml-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                    <span>Pilih Warna Kustom:</span>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="size-8 rounded cursor-pointer border border-border bg-transparent p-0.5"
                    />
                  </div>
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#0048BA"
                    className="w-24 h-8 px-2 rounded-lg border border-input bg-background text-foreground text-xs font-mono font-bold uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Section 0.5: Tanda Tangan & Cap / Stempel Toko */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b border-border pb-2.5">
                <Stamp className="size-4 text-[#DC2626]" />
                <span>Tanda Tangan &amp; Cap Toko</span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Stamp Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-red-50/30 dark:bg-red-950/20">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="stampToggle"
                      className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5"
                    >
                      <Stamp className="size-3.5 text-[#DC2626]" />
                      <span>Aktifkan Cap / Stempel Toko</span>
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Menampilkan stempel resmi berlogo Next Solution (Logo &bull; NEXT &bull; SOLUTION).
                    </p>
                  </div>
                  <input
                    id="stampToggle"
                    type="checkbox"
                    checked={showStamp}
                    onChange={(e) => setShowStamp(e.target.checked)}
                    className="size-4 rounded border-input accent-red-600 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Judul Penutup
                    </label>
                    <input
                      type="text"
                      value={signatureTitle}
                      onChange={(e) => setSignatureTitle(e.target.value)}
                      placeholder="Hormat Kami,"
                      className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Nama Penandatangan
                    </label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Virga Pratama"
                      className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Jabatan / Keterangan Penandatangan
                  </label>
                  <input
                    type="text"
                    value={signerRole}
                    onChange={(e) => setSignerRole(e.target.value)}
                    placeholder="Admin Next Solution / Kasir"
                    className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 1: Customer Info */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b border-border pb-2.5">
                <User className="size-4 text-[#2563EB]" />
                <span>Informasi Customer / Pelanggan</span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Nama Customer <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Virga Pratama"
                    className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Nomor Telepon / WhatsApp <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Alamat Pelanggan (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Alamat rumah, kantor, atau jalan..."
                    className="w-full p-2 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Store & Invoice Info */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b border-border pb-2.5">
                <Building2 className="size-4 text-[#2563EB]" />
                <span>Informasi Toko &amp; Nomor Faktur</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Nama Toko
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Next Solution"
                      className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Slogan / Keterangan Toko
                    </label>
                    <input
                      type="text"
                      value={storeSlogan}
                      onChange={(e) => setStoreSlogan(e.target.value)}
                      placeholder="Solusi Belanja Laptop & Gadget Terpercaya"
                      className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Alamat Lengkap Toko
                    </label>
                    <input
                      type="text"
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      placeholder="Alamat gerai toko..."
                      className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      No. Telp / WA Toko
                    </label>
                    <input
                      type="text"
                      value={storePhone}
                      onChange={(e) => setStorePhone(e.target.value)}
                      placeholder="+62 811-2238-310"
                      className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-foreground">
                        Nomor Faktur / Order
                      </label>
                      <button
                        type="button"
                        onClick={() => setInvoiceNumber(generateInvoiceNumber())}
                        className="text-[10px] text-[#2563EB] hover:underline font-bold cursor-pointer"
                      >
                        Acak Baru
                      </button>
                    </div>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="INV-..."
                      className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-mono font-medium focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Tanggal Faktur
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Status Bayar
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) =>
                        setPaymentStatus(
                          e.target.value as "paid" | "pending" | "cancelled"
                        )
                      }
                      className="w-full h-8 px-2 rounded-lg border border-input bg-background text-foreground text-xs font-medium"
                    >
                      <option value="paid">LUNAS</option>
                      <option value="pending">PENDING</option>
                      <option value="cancelled">DIBATALKAN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Metode Bayar
                    </label>
                    <input
                      type="text"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      placeholder="Transfer Bank BCA"
                      className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-foreground text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Penerimaan
                    </label>
                    <select
                      value={fulfillmentType}
                      onChange={(e) =>
                        setFulfillmentType(
                          e.target.value as "pickup" | "delivery"
                        )
                      }
                      className="w-full h-8 px-2 rounded-lg border border-input bg-background text-foreground text-xs font-medium"
                    >
                      <option value="pickup">Ambil di Toko</option>
                      <option value="delivery">Kirim Kurir</option>
                    </select>
                  </div>
                </div>

                {/* Quick Payment Method Pills */}
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                    Pilihan Cepat Metode:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer",
                          paymentMethod === method
                            ? "bg-primary/10 border-primary text-primary font-bold"
                            : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Item Rows */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <ShoppingBag className="size-4 text-[#2563EB]" />
                  <span>Daftar Barang ({items.length})</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-7 text-xs font-bold gap-1 rounded-lg text-[#2563EB] border-blue-200 hover:bg-blue-50 cursor-pointer"
                >
                  <Plus className="size-3" />
                  <span>Tambah Baris</span>
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={it.id}
                    className="p-3 rounded-xl border border-border bg-muted/20 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">
                        Item #{idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.id)}
                          className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) =>
                          handleUpdateItem(it.id, "name", e.target.value)
                        }
                        placeholder="Nama Produk & Spesifikasi (Contoh: Lenovo LOQ 15IRH8 / RTX 4050)"
                        className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-foreground text-xs font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">
                          SKU / Kode (opsional)
                        </label>
                        <input
                          type="text"
                          value={it.sku || ""}
                          onChange={(e) =>
                            handleUpdateItem(it.id, "sku", e.target.value)
                          }
                          placeholder="SKU-..."
                          className="w-full h-7 px-2 rounded-lg border border-input bg-background text-foreground text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">
                          Kuantitas (Qty)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) =>
                            handleUpdateItem(
                              it.id,
                              "quantity",
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-full h-7 px-2 rounded-lg border border-input bg-background text-foreground text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">
                          Harga Satuan (Rp)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={it.price}
                          onChange={(e) =>
                            handleUpdateItem(
                              it.id,
                              "price",
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                          className="w-full h-7 px-2 rounded-lg border border-input bg-background text-foreground text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Adjustments: Discount & Shipping */}
              <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Potongan / Diskon (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={discountAmount}
                    onChange={(e) =>
                      setDiscountAmount(
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Ongkir / Biaya Tambahan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={shippingAmount}
                    onChange={(e) =>
                      setShippingAmount(
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1 text-xs">
                  Catatan Garansi / Ketentuan Faktur
                </label>
                <textarea
                  rows={2}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Keterangan garansi, ketentuan servis, atau pesan toko..."
                  className="w-full p-2 rounded-lg border border-input bg-background text-foreground text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1 text-xs">
                  Catatan Kaki Bawah Faktur (Opsional)
                </label>
                <input
                  type="text"
                  value={customFooterNote}
                  onChange={(e) => setCustomFooterNote(e.target.value)}
                  placeholder="Contoh: Simpan nota ini sebagai bukti garansi resmi"
                  className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE PREVIEW & PRINT CANVAS */}
          <div className="lg:col-span-7">
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-2 text-xs font-bold text-muted-foreground no-print px-1">
                <span>Pratinjau Langsung Faktur (Siap Cetak / PDF)</span>
                <span className="text-[#0048BA] font-extrabold">
                  Format Resmi {storeName}
                </span>
              </div>

              {/* PRINT INVOICE CONTAINER */}
              <div
                id="print-invoice-area"
                className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-sm"
              >
                {/* 1. Header Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      {showStoreLogoSymbol && (
                        <Image
                          src="/brand/next-solution-symbol.png"
                          alt="Logo Toko"
                          width={40}
                          height={40}
                          unoptimized
                          className="size-10 object-contain shrink-0"
                        />
                      )}
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
                        <span style={{ color: storeWord1Color }}>{storeWord1}</span>
                        {storeWord2 && (
                          <>
                            {" "}
                            <span style={{ color: storeWord2Color }}>{storeWord2}</span>
                          </>
                        )}
                      </h2>
                    </div>

                    {storeSlogan && (
                      <p className="text-xs font-semibold text-slate-500 pt-0.5">
                        {storeSlogan}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 font-medium max-w-sm">
                      {storeAddress}
                    </p>
                    <p className="text-xs text-slate-700 font-semibold">
                      Telp / WA: {storePhone}
                    </p>
                  </div>

                  <div className="sm:text-right space-y-1">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                      style={{
                        color: accentColor,
                        borderColor: `${accentColor}40`,
                        backgroundColor: `${accentColor}12`,
                      }}
                    >
                      FAKTUR PENJUALAN
                    </span>
                    <p className="text-lg font-mono font-black text-slate-900 tracking-tight">
                      {invoiceNumber || "INV-XXXX"}
                    </p>
                    <p className="text-xs text-slate-600 font-medium">
                      Tanggal:{" "}
                      <span className="font-semibold text-slate-900">
                        {formattedDate}
                      </span>
                    </p>
                    <div className="pt-1 flex flex-wrap sm:justify-end gap-1.5">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                          paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : paymentStatus === "pending"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : "bg-rose-50 text-rose-800 border-rose-300"
                        )}
                      >
                        {paymentStatus === "paid"
                          ? "LUNAS"
                          : paymentStatus === "pending"
                          ? "MENUNGGU BAYAR"
                          : "DIBATALKAN"}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {fulfillmentType === "pickup"
                          ? "AMBIL DI TOKO"
                          : "KIRIM KURIR"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Customer & Transaction Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      DITUJUKAN KEPADA:
                    </span>
                    <p className="text-sm font-bold text-slate-900">
                      {customerName || "(Nama Belum Diisi)"}
                    </p>
                    <p className="text-slate-600 font-medium mt-0.5">
                      No. Telp / WA: {customerPhone || "-"}
                    </p>
                    {customerAddress && (
                      <p className="text-slate-500 mt-1 leading-relaxed">
                        Alamat: {customerAddress}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      METODE TRANSAKSI:
                    </span>
                    <p className="text-xs font-semibold text-slate-800">
                      Pembayaran:{" "}
                      <span className="font-bold text-slate-950">
                        {paymentMethod}
                      </span>
                    </p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      Penerimaan:{" "}
                      <span className="font-bold text-slate-950">
                        {fulfillmentType === "pickup"
                          ? "Ambil Sendiri di Gerai Toko"
                          : "Pengiriman ke Alamat"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* 3. Items Table (Unified clean border container & exact column widths) */}
                <div className="mt-4 border border-slate-300 rounded-lg overflow-hidden">
                  {/* Table Header */}
                  <div
                    className="text-white px-4 py-2.5 grid grid-cols-[1fr_110px_50px_125px] gap-2 items-center text-[10px] sm:text-xs font-bold uppercase tracking-wide"
                    style={{ backgroundColor: accentColor }}
                  >
                    <div>Produk &amp; Spesifikasi</div>
                    <div className="text-right">Harga Satuan</div>
                    <div className="text-center">Jml</div>
                    <div className="text-right">Total</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-slate-200 bg-white text-xs">
                    {items.map((it, idx) => {
                      const rowTotal =
                        (Number(it.price) || 0) * (Number(it.quantity) || 0);
                      return (
                        <div
                          key={it.id}
                          className="px-4 py-3 grid grid-cols-[1fr_110px_50px_125px] gap-2 items-center"
                        >
                          <div className="pr-2">
                            <p className="font-bold text-slate-900 leading-snug">
                              {it.name || `Barang #${idx + 1}`}
                            </p>
                            {it.sku && (
                              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                SKU: {it.sku}
                              </p>
                            )}
                          </div>
                          <div className="text-right font-mono text-slate-700">
                            {formatRupiah(it.price)}
                          </div>
                          <div className="text-center font-bold text-slate-800">
                            {it.quantity}x
                          </div>
                          <div className="text-right font-mono font-bold text-slate-900">
                            {formatRupiah(rowTotal)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Notes & Summary Calculation (Perfect Vertical Alignment) */}
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                  {/* Notes / Terms */}
                  <div className="w-full sm:w-[52%] rounded-lg bg-slate-50 border border-slate-300 p-3.5 text-xs text-slate-600 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      CATATAN / KETENTUAN GARANSI:
                    </span>
                    <p className="leading-relaxed whitespace-pre-line">
                      {invoiceNotes ||
                        `Terima kasih telah berbelanja di ${storeName}.`}
                    </p>
                  </div>

                  {/* Summary Box (Garis, padding, dan teks terhubung sejajar) */}
                  <div className="w-full sm:w-[45%] ml-auto border border-slate-300 rounded-lg overflow-hidden divide-y divide-slate-200 bg-white shadow-2xs">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center px-4 py-2 bg-slate-50/70 text-slate-700">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">
                        SUBTOTAL :
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {formatRupiah(subtotal)}
                      </span>
                    </div>

                    {/* Diskon (bila ada) */}
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center px-4 py-2 bg-slate-50/70 text-emerald-700">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">
                          DISKON :
                        </span>
                        <span className="font-mono font-bold text-xs text-emerald-700">
                          -{formatRupiah(discountAmount)}
                        </span>
                      </div>
                    )}

                    {/* Ongkir (bila ada) */}
                    {shippingAmount > 0 && (
                      <div className="flex justify-between items-center px-4 py-2 bg-slate-50/70 text-slate-700">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">
                          ONGKIR :
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {formatRupiah(shippingAmount)}
                        </span>
                      </div>
                    )}

                    {/* Total Akhir (Sejajar sempurna dengan padding px-4 yang sama) */}
                    <div
                      className="flex justify-between items-center px-4 py-2.5 text-white font-bold"
                      style={{ backgroundColor: accentColor }}
                    >
                      <span className="uppercase tracking-wider text-[11px]">
                        TOTAL AKHIR :
                      </span>
                      <span className="font-black text-base font-mono">
                        {formatRupiah(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Signature & Official Stamp Section (Posisi persis kotak merah permintaan user) */}
                <div className="mt-6 pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-slate-600">
                  {/* Left: Store identity / tagline / notes */}
                  <div className="space-y-1 max-w-sm">
                    <div className="flex items-center gap-2">
                      {showStoreLogoSymbol && (
                        <Image
                          src="/brand/next-solution-symbol.png"
                          alt="Logo Toko"
                          width={20}
                          height={20}
                          unoptimized
                          className="size-5 object-contain shrink-0"
                        />
                      )}
                      <span className="font-bold text-base leading-none">
                        <span style={{ color: storeWord1Color }}>{storeWord1}</span>
                        {storeWord2 && (
                          <>
                            {" "}
                            <span style={{ color: storeWord2Color }}>{storeWord2}</span>
                          </>
                        )}
                      </span>
                    </div>
                    {storeSlogan && (
                      <p className="text-[10px] text-slate-500">{storeSlogan}</p>
                    )}
                    {customFooterNote && (
                      <p className="text-[10px] text-slate-500 italic pt-0.5">
                        {customFooterNote}
                      </p>
                    )}
                  </div>

                  {/* Right: Signature & Stamp Box */}
                  <div className="relative text-center w-56 shrink-0 pb-1">
                    <p className="text-xs font-semibold text-slate-700 mb-0.5">
                      {signatureTitle || "Hormat Kami,"}
                    </p>

                    {/* Signature Space with Official Stamp Overlay */}
                    <div className="relative h-20 flex items-center justify-center">
                      {showStamp && (
                        <div
                          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none -rotate-6"
                          title="Cap / Stempel Resmi Next Solution"
                        >
                          {/* Stempel Toko: Lingkaran Ganda dengan Logo S + NEXT Merah + SOLUTION Biru */}
                          <div className="relative rounded-full border-2 border-dashed border-[#DC2626]/80 p-1.5 bg-red-50/30 shadow-2xs flex flex-col items-center justify-center size-20">
                            {/* 1. Logo S */}
                            <Image
                              src="/brand/next-solution-symbol.png"
                              alt="Logo Stempel"
                              width={26}
                              height={26}
                              unoptimized
                              className="object-contain"
                            />
                            {/* 2. NEXT (Merah) & 3. SOLUTION (Biru) */}
                            <div className="flex flex-col items-center leading-none mt-0.5">
                              <span
                                className="text-[9px] font-black italic tracking-wider"
                                style={{ color: storeWord1Color }}
                              >
                                {storeWord1 || "NEXT"}
                              </span>
                              <span
                                className="text-[8.5px] font-black italic tracking-wider"
                                style={{ color: storeWord2Color }}
                              >
                                {storeWord2 || "SOLUTION"}
                              </span>
                            </div>
                            <span className="text-[6px] font-bold text-slate-700 uppercase tracking-widest mt-0.5">
                              OFFICIAL STORE
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Line for physical signature */}
                    <div className="border-b border-slate-400 w-44 mx-auto" />
                    <p className="text-xs font-bold text-slate-900 mt-1">
                      {signerName || "(.................................)"}
                    </p>
                    {signerRole && (
                      <p className="text-[10px] text-slate-500 font-medium">
                        {signerRole}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
