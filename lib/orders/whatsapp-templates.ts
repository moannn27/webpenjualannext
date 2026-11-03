export interface OrderWhatsAppPayload {
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  grandTotal: number;
  isPickup?: boolean;
  courier?: string | null;
  trackingNumber?: string | null;
  items?: Array<{ name: string; quantity: number }>;
  storeName?: string;
  storeAddress?: string;
}

export function formatIdrMoney(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\u00a0/g, " ");
}

export function cleanIndonesianPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return "62" + digits;
}

export function buildOrderWhatsAppLinks(payload: OrderWhatsAppPayload) {
  const phone = cleanIndonesianPhone(payload.customerPhone);
  const store = payload.storeName || "Next Solution Store";
  const address = payload.storeAddress || "Jl. Kartini No. 09, Bandung";
  const totalFormatted = formatIdrMoney(payload.grandTotal);

  const itemsSummary = (payload.items ?? [])
    .slice(0, 4)
    .map((item) => `• ${item.name} (${item.quantity}x)`)
    .join("\n");
  const moreItems =
    payload.items && payload.items.length > 4
      ? `\n• ...dan ${payload.items.length - 4} barang lainnya`
      : "";

  // 1. Template: Siap Diambil di Gerai (Pick-up)
  const pickupMessage =
    `Halo Kak *${payload.customerName}*,\n\n` +
    `Kabar baik dari *${store}*, pesanan Anda dengan No. Faktur *#${payload.orderNumber}* sudah selesai disiapkan dan *SIAP DIAMBIL* di gerai kami.\n\n` +
    `*Rincian Pesanan:*\n${itemsSummary}${moreItems}\n` +
    `Total: *${totalFormatted}*\n\n` +
    `*Lokasi Pengambilan (Gerai):*\n` +
    `${store}\n${address}\n` +
    `Jam Operasional: Senin - Sabtu (09.00 - 18.00 WIB)\n\n` +
    `Silakan tunjukkan pesan ini atau sebutkan nomor pesanan kepada staf kasir kami saat pengambilan. Terima kasih.`;

  // 2. Template: Konfirmasi Pembayaran (Payment Reminder)
  const paymentMessage =
    `Halo Kak *${payload.customerName}*! 👋\n\n` +
    `Terima kasih telah berbelanja di *${store}*.\n` +
    `Pesanan Anda *#${payload.orderNumber}* saat ini tercatat menunggu konfirmasi pembayaran.\n\n` +
    `*Total Tagihan:* *${totalFormatted}*\n` +
    `*Barang:* ${payload.items?.[0]?.name || "Produk pesanan"}\n\n` +
    `Pembayaran dapat ditransfer ke rekening resmi toko:\n` +
    `• BCA: 123-456-7890 a/n Next Solution\n` +
    `• Mandiri: 987-654-3210 a/n Next Solution\n\n` +
    `Setelah melakukan transfer, mohon kirimkan bukti foto/screenshot transfer ke chat ini agar pesanan dapat segera diproses. Terima kasih.`;

  // 3. Template: Pesanan Sedang Dikirim / Ekspedisi
  const courierName = payload.courier ? payload.courier.toUpperCase() : "Ekspedisi";
  const resiText = payload.trackingNumber
    ? `\nNo. Resi Pengiriman: *${payload.trackingNumber}*`
    : "";
  const shippingMessage =
    `Halo Kak *${payload.customerName}*,\n\n` +
    `Pesanan Anda *#${payload.orderNumber}* dari *${store}* telah kami serahkan ke pihak jasa kirim dan saat ini *SEDANG DALAM PENGIRIMAN*.\n\n` +
    `*Ekspedisi:* ${courierName}${resiText}\n` +
    `Total: *${totalFormatted}*\n\n` +
    `Harap rekam video unboxing saat paket diterima untuk kemudahan klaim garansi resmi jika diperlukan. Terima kasih atas kepercayaan Anda.`;

  // 4. Template: Tanya Kabar / Bantuan CS
  const supportMessage =
    `Halo Kak *${payload.customerName}*,\n` +
    `Kami dari Layanan Pelanggan *${store}* terkait pesanan *#${payload.orderNumber}*.\n` +
    `Apakah ada kendala atau informasi pesanan yang bisa kami bantu?`;

  const baseUrl = phone ? `https://wa.me/${phone}` : "";

  return {
    phone,
    pickup: {
      title: "Siap Diambil di Gerai (Pick-up)",
      message: pickupMessage,
      url: phone ? `${baseUrl}?text=${encodeURIComponent(pickupMessage)}` : null,
    },
    payment: {
      title: "Pengingat / Rincian Pembayaran",
      message: paymentMessage,
      url: phone ? `${baseUrl}?text=${encodeURIComponent(paymentMessage)}` : null,
    },
    shipping: {
      title: "Update Pengiriman & Resi",
      message: shippingMessage,
      url: phone ? `${baseUrl}?text=${encodeURIComponent(shippingMessage)}` : null,
    },
    support: {
      title: "Layanan Pelanggan Umum",
      message: supportMessage,
      url: phone ? `${baseUrl}?text=${encodeURIComponent(supportMessage)}` : null,
    },
  };
}
