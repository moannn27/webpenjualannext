import { describe, it, expect, beforeEach } from "vitest";
import {
  cleanIndonesianPhone,
  buildOrderWhatsAppLinks,
} from "@/lib/orders/whatsapp-templates";
import { useAdminSoundStore } from "@/store/useAdminSoundStore";

describe("Order WhatsApp Follow-Up Templates", () => {
  it("cleans Indonesian phone numbers correctly", () => {
    expect(cleanIndonesianPhone("0812-3456-7890")).toBe("6281234567890");
    expect(cleanIndonesianPhone("+62 812-3456-7890")).toBe("6281234567890");
    expect(cleanIndonesianPhone("6281234567890")).toBe("6281234567890");
    expect(cleanIndonesianPhone("")).toBe("");
  });

  it("builds pickup-ready template message with store location and item list", () => {
    const links = buildOrderWhatsAppLinks({
      customerName: "Budi Santoso",
      customerPhone: "081234567890",
      orderNumber: "ORD-20261103-01",
      grandTotal: 13300000,
      isPickup: true,
      items: [
        { name: "Lenovo IdeaPad Slim 3 15", quantity: 1 },
      ],
    });

    expect(links.phone).toBe("6281234567890");
    expect(links.pickup.url).toContain("wa.me/6281234567890");
    expect(links.pickup.message).toContain("Budi Santoso");
    expect(links.pickup.message).toContain("ORD-20261103-01");
    expect(links.pickup.message).toContain("SIAP DIAMBIL");
    expect(links.pickup.message).toContain("Jl. Kartini No. 09, Bandung");
  });

  it("builds payment reminder template message with bank accounts", () => {
    const links = buildOrderWhatsAppLinks({
      customerName: "Siti Rahma",
      customerPhone: "085612345678",
      orderNumber: "ORD-20261103-02",
      grandTotal: 500000,
      items: [{ name: "Logitech Wireless Mouse", quantity: 2 }],
    });

    expect(links.payment.url).toContain("wa.me/6285612345678");
    expect(links.payment.message).toContain("menunggu konfirmasi pembayaran");
    expect(links.payment.message).toContain("BCA: 123-456-7890");
    expect(links.payment.message).toContain("Rp 500.000");
  });

  it("builds shipping update template with courier and tracking number", () => {
    const links = buildOrderWhatsAppLinks({
      customerName: "Andi Wijaya",
      customerPhone: "081398765432",
      orderNumber: "ORD-20261103-03",
      grandTotal: 18500000,
      courier: "jne",
      trackingNumber: "JNE-BDG-998877",
    });

    expect(links.shipping.url).toContain("wa.me/6281398765432");
    expect(links.shipping.message).toContain("SEDANG DALAM PENGIRIMAN");
    expect(links.shipping.message).toContain("JNE");
    expect(links.shipping.message).toContain("JNE-BDG-998877");
  });
});

describe("Admin Realtime Sound Alert Store", () => {
  beforeEach(() => {
    useAdminSoundStore.setState({ soundEnabled: true });
  });

  it("toggles sound alert status", () => {
    expect(useAdminSoundStore.getState().soundEnabled).toBe(true);

    useAdminSoundStore.getState().toggleSound();
    expect(useAdminSoundStore.getState().soundEnabled).toBe(false);

    useAdminSoundStore.getState().toggleSound();
    expect(useAdminSoundStore.getState().soundEnabled).toBe(true);
  });

  it("explicitly sets sound enabled status", () => {
    useAdminSoundStore.getState().setSoundEnabled(false);
    expect(useAdminSoundStore.getState().soundEnabled).toBe(false);

    useAdminSoundStore.getState().setSoundEnabled(true);
    expect(useAdminSoundStore.getState().soundEnabled).toBe(true);
  });
});

