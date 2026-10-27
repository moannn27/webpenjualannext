"use client";

import { useState } from "react";
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
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  isSuperAdmin = false,
}: ManualInvoiceManagerProps) {
  // Store details
  const [storeName, setStoreName] = useState(
    storeSettings?.store_name || "Next Solution Store"
  );
  const [storeAddress, setStoreAddress] = useState(
    storeSettings?.store_address || "Jl. Pajajaran No. 42, Kota Bandung, Jawa Barat"
  );
  const [storePhone, setStorePhone] = useState(
    storeSettings?.contact_whatsapp || storeSettings?.contact_phone || "+62 811-2238-310"
  );

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
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending" | "cancelled">("paid");
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
  const grandTotal = Math.max(0, subtotal - (Number(discountAmount) || 0) + (Number(shippingAmount) || 0));

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
    setStoreName(storeSettings?.store_name || "Next Solution Store");
    setStoreAddress(storeSettings?.store_address || "Jl. Pajajaran No. 42, Kota Bandung");
    setStorePhone(storeSettings?.contact_whatsapp || "+62 811-2238-310");
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
  };

  const handlePrint = () => {
    window.print();
  };

  // Format date display
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(invoiceDate || Date.now()));

  return (
    <>
      {/* Print-specific style */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-invoice-area,
          #print-invoice-area * {
            visibility: visible;
          }
          #print-invoice-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 16px;
            box-shadow: none !important;
            border: none !important;
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
              Buat faktur penjualan offline atau kustom mandiri dengan memasukkan nama customer, toko, nomor telepon, dan nomor faktur.
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
              className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold gap-1.5 h-9 shadow-sm"
              title="Cetak faktur atau simpan sebagai PDF"
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
                      Nama Toko / Cabang
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Next Solution Store"
                      className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      No. Telp Toko / Admin
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-foreground">
                        Nomor Faktur / Order
                      </label>
                      <button
                        type="button"
                        onClick={() => setInvoiceNumber(generateInvoiceNumber())}
                        className="text-[10px] text-[#2563EB] hover:underline font-bold"
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
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
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
                    >
                    </input>
                  </div>

                  <div>
                    <label className="block font-semibold text-foreground mb-1">
                      Penerimaan
                    </label>
                    <select
                      value={fulfillmentType}
                      onChange={(e) => setFulfillmentType(e.target.value as any)}
                      className="w-full h-8 px-2 rounded-lg border border-input bg-background text-foreground text-xs font-medium"
                    >
                      <option value="pickup">Ambil di Toko</option>
                      <option value="delivery">Kirim Kurir</option>
                    </select>
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
                  className="h-7 text-xs font-bold gap-1 rounded-lg text-[#2563EB] border-blue-200 hover:bg-blue-50"
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
                        onChange={(e) => handleUpdateItem(it.id, "name", e.target.value)}
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
                          onChange={(e) => handleUpdateItem(it.id, "sku", e.target.value)}
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
                            handleUpdateItem(it.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))
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
                            handleUpdateItem(it.id, "price", Math.max(0, parseInt(e.target.value) || 0))
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
                    onChange={(e) => setDiscountAmount(Math.max(0, parseInt(e.target.value) || 0))}
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
                    onChange={(e) => setShippingAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-8 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1 text-xs">
                  Catatan Garansi / Syarat Faktur
                </label>
                <textarea
                  rows={2}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Keterangan garansi, ketentuan servis, atau pesan toko..."
                  className="w-full p-2 rounded-lg border border-input bg-background text-foreground text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE PREVIEW & PRINT CANVAS */}
          <div className="lg:col-span-7">
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-2 text-xs font-bold text-muted-foreground no-print px-1">
                <span>Pratinjau Langsung Faktur (Siap Cetak / PDF)</span>
                <span className="text-[#2563EB]">Format Resmi Next Solution</span>
              </div>

              {/* PRINT INVOICE CONTAINER */}
              <div
                id="print-invoice-area"
                className="bg-white text-slate-900 border border-slate-200/90 rounded-[24px] p-6 sm:p-8 shadow-md"
              >
                {/* 1. Header Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-[#2563EB] tracking-tight">
                      {storeName}
                    </h2>
                    <p className="text-xs text-slate-600 font-medium max-w-sm">
                      {storeAddress}
                    </p>
                    <p className="text-xs text-slate-700 font-semibold pt-0.5">
                      Telp / WA: {storePhone}
                    </p>
                  </div>

                  <div className="sm:text-right space-y-1">
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                      FAKTUR PENJUALAN
                    </span>
                    <p className="text-lg font-mono font-black text-slate-900 tracking-tight">
                      {invoiceNumber || "INV-XXXX"}
                    </p>
                    <p className="text-xs text-slate-600 font-medium">
                      Tanggal: <span className="font-semibold text-slate-900">{formattedDate}</span>
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
                        {fulfillmentType === "pickup" ? "AMBIL DI TOKO" : "KIRIM KURIR"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Customer & Payment Details */}
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
                      Pembayaran: <span className="font-bold">{paymentMethod}</span>
                    </p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      Penerimaan:{" "}
                      <span className="font-bold">
                        {fulfillmentType === "pickup" ? "Ambil Sendiri di Gerai Toko" : "Pengiriman ke Alamat"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* 3. Items Table */}
                <div className="mt-4">
                  {/* Table Header */}
                  <div className="bg-[#3730A3] text-white rounded-t-lg px-4 py-2.5 grid grid-cols-[minmax(0,1fr)_6rem_3rem_6.5rem] sm:grid-cols-[minmax(0,1fr)_8rem_4rem_8rem] gap-2 items-center text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                    <div>Produk &amp; Spesifikasi</div>
                    <div className="text-right">Harga Satuan</div>
                    <div className="text-center">Jml</div>
                    <div className="text-right">Total</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-slate-200 border-x border-b border-slate-200 rounded-b-lg overflow-hidden text-xs">
                    {items.map((it, idx) => {
                      const rowTotal = (Number(it.price) || 0) * (Number(it.quantity) || 0);
                      return (
                        <div
                          key={it.id}
                          className="px-4 py-3 grid grid-cols-[minmax(0,1fr)_6rem_3rem_6.5rem] sm:grid-cols-[minmax(0,1fr)_8rem_4rem_8rem] gap-2 items-center"
                        >
                          <div>
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

                {/* 4. Notes & Summary Calculation */}
                <div className="mt-5 flex flex-col sm:flex-row justify-between items-start gap-5">
                  {/* Notes / Terms */}
                  <div className="w-full sm:w-1/2 rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-600 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      CATATAN / KETENTUAN GARANSI:
                    </span>
                    <p className="leading-relaxed">
                      {invoiceNotes || "Terima kasih telah berbelanja di Next Solution Store."}
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="w-full sm:w-72 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">SUBTOTAL :</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(subtotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-emerald-700">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">DISKON :</span>
                        <span className="font-mono font-bold">-{formatRupiah(discountAmount)}</span>
                      </div>
                    )}

                    {shippingAmount > 0 && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">ONGKIR / LAINNYA :</span>
                        <span className="font-mono font-bold text-slate-900">{formatRupiah(shippingAmount)}</span>
                      </div>
                    )}

                    {/* Solid Indigo TOTAL DUE Box */}
                    <div className="bg-[#3730A3] text-white px-4 py-2.5 rounded-lg flex items-center justify-between font-bold shadow-xs">
                      <span className="uppercase tracking-wider text-[11px]">TOTAL AKHIR :</span>
                      <span className="font-black text-base font-mono">{formatRupiah(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Footer Signatures & Closing */}
                <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
                  <div>
                    <p className="font-bold text-[#3730A3]">Next Solution Store</p>
                    <p className="text-[10px]">Solusi Belanja Laptop &amp; Gadget Terpercaya</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Dicetak melalui Admin Panel</p>
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

